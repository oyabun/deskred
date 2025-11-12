"""
Redis Helper - Manages Redis connections and caching operations
"""
import redis
import json
import logging
from typing import Optional, Dict, List
from datetime import datetime

logger = logging.getLogger(__name__)

class RedisHelper:
    """Helper class for Redis operations"""

    def __init__(self, host='redis', port=6379, db=0):
        """Initialize Redis connection"""
        try:
            self.redis_client = redis.Redis(
                host=host,
                port=port,
                db=db,
                decode_responses=True,
                socket_connect_timeout=5
            )
            # Test connection
            self.redis_client.ping()
            logger.info(f"Connected to Redis at {host}:{port}")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.redis_client = None

    def is_connected(self) -> bool:
        """Check if Redis is connected"""
        if self.redis_client is None:
            return False
        try:
            self.redis_client.ping()
            return True
        except:
            return False

    def save_report(self, aggregation_id: str, username: str, report_data: Dict,
                   visualization_data: Optional[Dict] = None) -> bool:
        """
        Save Obscura report to Redis

        Args:
            aggregation_id: Unique aggregation identifier
            username: Username that was searched
            report_data: Parsed report data
            visualization_data: Optional Nexus visualization data

        Returns:
            bool: True if saved successfully
        """
        if not self.is_connected():
            logger.warning("Redis not connected, cannot save report")
            return False

        try:
            # Create report object
            report = {
                "aggregation_id": aggregation_id,
                "username": username,
                "created_at": datetime.now().isoformat(),
                "report": report_data,
                "visualization": visualization_data
            }

            # Save to Redis with key pattern: report:{aggregation_id}
            key = f"report:{aggregation_id}"
            self.redis_client.set(key, json.dumps(report))

            # Add to sorted set for listing (score = timestamp)
            timestamp = datetime.now().timestamp()
            self.redis_client.zadd("reports:index", {aggregation_id: timestamp})

            # Add username index
            self.redis_client.sadd(f"reports:username:{username}", aggregation_id)

            logger.info(f"Saved report {aggregation_id} for username {username}")
            return True
        except Exception as e:
            logger.error(f"Error saving report to Redis: {e}")
            return False

    def get_report(self, aggregation_id: str) -> Optional[Dict]:
        """
        Get report by aggregation ID

        Args:
            aggregation_id: Aggregation identifier

        Returns:
            Dict: Report data or None if not found
        """
        if not self.is_connected():
            return None

        try:
            key = f"report:{aggregation_id}"
            data = self.redis_client.get(key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Error getting report from Redis: {e}")
            return None

    def list_reports(self, limit: int = 100, offset: int = 0) -> List[Dict]:
        """
        List all reports sorted by creation time (newest first)

        Args:
            limit: Maximum number of reports to return
            offset: Offset for pagination

        Returns:
            List[Dict]: List of report summaries
        """
        if not self.is_connected():
            return []

        try:
            # Get aggregation IDs from sorted set (newest first)
            aggregation_ids = self.redis_client.zrevrange(
                "reports:index",
                offset,
                offset + limit - 1
            )

            reports = []
            for agg_id in aggregation_ids:
                report = self.get_report(agg_id)
                if report:
                    # Return summary info
                    summary = {
                        "aggregation_id": report["aggregation_id"],
                        "username": report["username"],
                        "created_at": report["created_at"],
                        "total_profiles": report["report"]["summary"]["total_profiles_found"],
                        "unique_sites": report["report"]["summary"]["unique_sites"],
                        "has_visualization": report.get("visualization") is not None
                    }
                    reports.append(summary)

            return reports
        except Exception as e:
            logger.error(f"Error listing reports: {e}")
            return []

    def search_reports_by_username(self, username: str) -> List[Dict]:
        """
        Get all reports for a specific username

        Args:
            username: Username to search for

        Returns:
            List[Dict]: List of reports for this username
        """
        if not self.is_connected():
            return []

        try:
            aggregation_ids = self.redis_client.smembers(f"reports:username:{username}")

            reports = []
            for agg_id in aggregation_ids:
                report = self.get_report(agg_id)
                if report:
                    summary = {
                        "aggregation_id": report["aggregation_id"],
                        "username": report["username"],
                        "created_at": report["created_at"],
                        "total_profiles": report["report"]["summary"]["total_profiles_found"],
                        "unique_sites": report["report"]["summary"]["unique_sites"]
                    }
                    reports.append(summary)

            # Sort by creation time (newest first)
            reports.sort(key=lambda x: x["created_at"], reverse=True)
            return reports
        except Exception as e:
            logger.error(f"Error searching reports: {e}")
            return []

    def delete_report(self, aggregation_id: str) -> bool:
        """
        Delete report from Redis

        Args:
            aggregation_id: Aggregation identifier

        Returns:
            bool: True if deleted successfully
        """
        if not self.is_connected():
            return False

        try:
            # Get report to find username
            report = self.get_report(aggregation_id)
            if not report:
                return False

            username = report["username"]

            # Delete report data
            key = f"report:{aggregation_id}"
            self.redis_client.delete(key)

            # Remove from index
            self.redis_client.zrem("reports:index", aggregation_id)

            # Remove from username index
            self.redis_client.srem(f"reports:username:{username}", aggregation_id)

            logger.info(f"Deleted report {aggregation_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting report: {e}")
            return False

    def get_stats(self) -> Dict:
        """
        Get Redis statistics

        Returns:
            Dict: Statistics about stored reports
        """
        if not self.is_connected():
            return {
                "connected": False,
                "total_reports": 0,
                "total_usernames": 0
            }

        try:
            total_reports = self.redis_client.zcard("reports:index")

            # Count unique usernames
            username_keys = self.redis_client.keys("reports:username:*")
            total_usernames = len(username_keys)

            return {
                "connected": True,
                "total_reports": total_reports,
                "total_usernames": total_usernames
            }
        except Exception as e:
            logger.error(f"Error getting Redis stats: {e}")
            return {
                "connected": False,
                "total_reports": 0,
                "total_usernames": 0
            }


# Global instance
redis_helper = RedisHelper()
