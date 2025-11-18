"""
Entity Store - Redis-based storage for entity relationships and report linking
Manages entity-to-report mappings for building investigation knowledge graphs.
"""
import json
import logging
from typing import Dict, List, Set, Optional
from datetime import datetime
from redis_helper import redis_helper

logger = logging.getLogger(__name__)


class EntityStore:
    """
    Manages storage and retrieval of entities and their relationships to reports
    in Redis. Enables cross-report linking and investigation graph construction.
    """

    def __init__(self):
        self.redis = redis_helper.redis_client

    def is_available(self) -> bool:
        """Check if Redis is available"""
        return redis_helper.is_connected()

    def store_entities(self, report_id: str, entities: Dict) -> bool:
        """
        Store entities from a report and create bidirectional mappings

        Args:
            report_id: Report aggregation ID
            entities: Dict with categorized entities from EntityExtractor

        Returns:
            bool: Success status
        """
        if not self.is_available():
            logger.warning("Redis not available, cannot store entities")
            return False

        try:
            timestamp = datetime.now().isoformat()

            # Store report → entities mapping (forward index)
            entity_summary = {}
            for category, items in entities.items():
                if items:
                    # Store full entity data for this report
                    key = f"report:{report_id}:entities:{category}"
                    self.redis.set(key, json.dumps(items))

                    # Store entity IDs in summary
                    entity_summary[category] = len(items)

            # Store entity summary
            self.redis.hset(f"report:{report_id}:meta", "entities", json.dumps(entity_summary))
            self.redis.hset(f"report:{report_id}:meta", "entities_extracted_at", timestamp)

            # Create entity → reports mappings (reverse index)
            for category, items in entities.items():
                for entity in items:
                    entity_id = self._generate_stable_id(category, entity)

                    # Add report to entity's report set
                    self.redis.sadd(f"entity:{entity_id}:reports", report_id)

                    # Store entity details (if not already stored)
                    if not self.redis.exists(f"entity:{entity_id}:data"):
                        entity_data = {
                            "category": category,
                            "data": entity,
                            "first_seen": timestamp,
                            "last_updated": timestamp
                        }
                        self.redis.set(f"entity:{entity_id}:data", json.dumps(entity_data))
                    else:
                        # Update last_updated timestamp
                        existing = json.loads(self.redis.get(f"entity:{entity_id}:data"))
                        existing["last_updated"] = timestamp
                        self.redis.set(f"entity:{entity_id}:data", json.dumps(existing))

                    # Add entity to global index by category
                    self.redis.sadd(f"entities:by_category:{category}", entity_id)

            # Add report to global entity-enabled reports set
            self.redis.sadd("reports:with_entities", report_id)

            logger.info(f"Stored {sum(entity_summary.values())} entities for report {report_id}")
            return True

        except Exception as e:
            logger.error(f"Error storing entities: {e}")
            return False

    def get_report_entities(self, report_id: str, category: Optional[str] = None) -> Dict:
        """
        Get all entities extracted from a report

        Args:
            report_id: Report aggregation ID
            category: Optional category filter (people, organizations, etc.)

        Returns:
            Dict with entities by category
        """
        if not self.is_available():
            return {}

        try:
            if category:
                # Get specific category
                key = f"report:{report_id}:entities:{category}"
                data = self.redis.get(key)
                if data:
                    return {category: json.loads(data)}
                return {category: []}
            else:
                # Get all categories
                categories = ["people", "organizations", "emails", "domains",
                              "locations", "social_handles", "phones", "events", "keywords"]
                result = {}

                for cat in categories:
                    key = f"report:{report_id}:entities:{cat}"
                    data = self.redis.get(key)
                    if data:
                        result[cat] = json.loads(data)
                    else:
                        result[cat] = []

                return result

        except Exception as e:
            logger.error(f"Error getting report entities: {e}")
            return {}

    def find_linked_reports(self, report_id: str) -> List[Dict]:
        """
        Find all reports that share entities with the given report

        Args:
            report_id: Report aggregation ID

        Returns:
            List of dicts with linked report info and shared entities
        """
        if not self.is_available():
            return []

        try:
            entities = self.get_report_entities(report_id)
            linked_reports = {}

            # For each entity in this report, find other reports mentioning it
            for category, items in entities.items():
                for entity in items:
                    entity_id = self._generate_stable_id(category, entity)

                    # Get all reports mentioning this entity
                    reports = self.redis.smembers(f"entity:{entity_id}:reports")

                    for other_report_id in reports:
                        if other_report_id != report_id:
                            if other_report_id not in linked_reports:
                                linked_reports[other_report_id] = {
                                    "report_id": other_report_id,
                                    "shared_entities": [],
                                    "connection_strength": 0
                                }

                            linked_reports[other_report_id]["shared_entities"].append({
                                "category": category,
                                "entity_id": entity_id,
                                "entity_data": entity
                            })
                            linked_reports[other_report_id]["connection_strength"] += 1

            # Sort by connection strength (number of shared entities)
            result = sorted(linked_reports.values(),
                            key=lambda x: x["connection_strength"],
                            reverse=True)

            logger.info(f"Found {len(result)} linked reports for {report_id}")
            return result

        except Exception as e:
            logger.error(f"Error finding linked reports: {e}")
            return []

    def get_entity_reports(self, entity_id: str) -> List[str]:
        """
        Get all reports mentioning a specific entity

        Args:
            entity_id: Entity ID

        Returns:
            List of report IDs
        """
        if not self.is_available():
            return []

        try:
            reports = self.redis.smembers(f"entity:{entity_id}:reports")
            return list(reports)
        except Exception as e:
            logger.error(f"Error getting entity reports: {e}")
            return []

    def get_entity_data(self, entity_id: str) -> Optional[Dict]:
        """
        Get stored data for a specific entity

        Args:
            entity_id: Entity ID

        Returns:
            Entity data dict or None
        """
        if not self.is_available():
            return None

        try:
            data = self.redis.get(f"entity:{entity_id}:data")
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Error getting entity data: {e}")
            return None

    def search_entities(self, category: str, search_term: str, limit: int = 50) -> List[Dict]:
        """
        Search for entities by category and term

        Args:
            category: Entity category
            search_term: Search string
            limit: Maximum results

        Returns:
            List of matching entities with their data
        """
        if not self.is_available():
            return []

        try:
            # Get all entity IDs in category
            entity_ids = self.redis.smembers(f"entities:by_category:{category}")

            results = []
            search_lower = search_term.lower()

            for entity_id in entity_ids:
                entity_data = self.get_entity_data(entity_id)
                if entity_data:
                    # Search in entity data
                    entity_str = json.dumps(entity_data.get("data", {})).lower()
                    if search_lower in entity_str:
                        report_count = self.redis.scard(f"entity:{entity_id}:reports")
                        results.append({
                            "entity_id": entity_id,
                            "entity_data": entity_data,
                            "report_count": report_count
                        })

                if len(results) >= limit:
                    break

            return results

        except Exception as e:
            logger.error(f"Error searching entities: {e}")
            return []

    def get_investigation_graph(self, root_report_id: str, max_depth: int = 2) -> Dict:
        """
        Build an investigation graph starting from a root report

        Args:
            root_report_id: Starting report ID
            max_depth: Maximum depth to traverse (default: 2)

        Returns:
            Dict with nodes (reports) and edges (entity connections)
        """
        if not self.is_available():
            return {"nodes": [], "edges": []}

        try:
            visited = set()
            nodes = []
            edges = []

            def traverse(report_id: str, depth: int):
                if depth > max_depth or report_id in visited:
                    return

                visited.add(report_id)

                # Get report info
                report = redis_helper.get_report(report_id)
                if report:
                    nodes.append({
                        "id": report_id,
                        "username": report.get("username", ""),
                        "created_at": report.get("created_at", ""),
                        "depth": depth
                    })

                # Get linked reports
                linked = self.find_linked_reports(report_id)
                for link in linked:
                    linked_id = link["report_id"]

                    # Add edge
                    edges.append({
                        "source": report_id,
                        "target": linked_id,
                        "strength": link["connection_strength"],
                        "shared_entities": len(link["shared_entities"])
                    })

                    # Recursively traverse
                    traverse(linked_id, depth + 1)

            traverse(root_report_id, 0)

            return {
                "nodes": nodes,
                "edges": edges,
                "total_nodes": len(nodes),
                "total_edges": len(edges)
            }

        except Exception as e:
            logger.error(f"Error building investigation graph: {e}")
            return {"nodes": [], "edges": []}

    def get_statistics(self) -> Dict:
        """
        Get statistics about stored entities

        Returns:
            Dict with entity statistics
        """
        if not self.is_available():
            return {}

        try:
            categories = ["people", "organizations", "emails", "domains",
                          "locations", "social_handles", "phones", "events"]

            stats = {
                "total_reports_with_entities": self.redis.scard("reports:with_entities"),
                "entities_by_category": {}
            }

            for category in categories:
                count = self.redis.scard(f"entities:by_category:{category}")
                stats["entities_by_category"][category] = count

            stats["total_entities"] = sum(stats["entities_by_category"].values())

            return stats

        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return {}

    def _generate_stable_id(self, category: str, entity: Dict) -> str:
        """
        Generate a stable ID for an entity (must match EntityExtractor logic)

        Args:
            category: Entity category
            entity: Entity dict

        Returns:
            Stable entity ID
        """
        import hashlib

        if category == "people":
            key = entity.get("name", "").lower().strip()
        elif category == "organizations":
            key = entity.get("name", "").lower().strip()
        elif category == "emails":
            key = entity.get("address", "").lower().strip()
        elif category == "domains":
            key = entity.get("domain", "").lower().strip()
        elif category == "locations":
            loc = entity.get("location", "").lower().strip()
            coords = entity.get("coordinates", [])
            key = f"{loc}:{coords}"
        elif category == "social_handles":
            platform = entity.get("platform", "").lower()
            username = entity.get("username", "").lower()
            key = f"{platform}:{username}"
        elif category == "phones":
            key = entity.get("number", "").replace(" ", "").replace("-", "")
        elif category == "events":
            name = entity.get("name", "").lower()
            date = entity.get("date", "")
            key = f"{name}:{date}"
        else:
            key = str(entity)

        hash_suffix = hashlib.md5(key.encode()).hexdigest()[:8]
        return f"{category}:{hash_suffix}"

    def delete_report_entities(self, report_id: str) -> bool:
        """
        Delete all entity data for a report

        Args:
            report_id: Report aggregation ID

        Returns:
            bool: Success status
        """
        if not self.is_available():
            return False

        try:
            # Get all entities for this report
            entities = self.get_report_entities(report_id)

            # Remove report from entity → reports mappings
            for category, items in entities.items():
                for entity in items:
                    entity_id = self._generate_stable_id(category, entity)
                    self.redis.srem(f"entity:{entity_id}:reports", report_id)

                    # If no more reports reference this entity, delete it
                    if self.redis.scard(f"entity:{entity_id}:reports") == 0:
                        self.redis.delete(f"entity:{entity_id}:data")
                        self.redis.srem(f"entities:by_category:{category}", entity_id)

            # Delete report's entity data
            categories = ["people", "organizations", "emails", "domains",
                          "locations", "social_handles", "phones", "events", "keywords"]

            for category in categories:
                self.redis.delete(f"report:{report_id}:entities:{category}")

            # Remove from global set
            self.redis.srem("reports:with_entities", report_id)

            logger.info(f"Deleted entity data for report {report_id}")
            return True

        except Exception as e:
            logger.error(f"Error deleting report entities: {e}")
            return False


# Singleton instance
entity_store = EntityStore()
