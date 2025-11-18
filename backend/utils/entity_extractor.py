"""
Entity Extractor - Modular entity extraction from OSINT reports
Extracts people, organizations, emails, domains, locations, and other entities
from enriched report data for knowledge graph construction.
"""
import re
import hashlib
from typing import Dict, List, Set, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class EntityExtractor:
    """
    Extracts entities from OSINT reports to enable cross-report linking
    and investigation graph construction.
    """

    # Regex patterns for entity extraction
    EMAIL_PATTERN = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
    URL_PATTERN = re.compile(r'https?://(?:www\.)?([^/\s]+)')
    PHONE_PATTERN = re.compile(r'[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}')
    TWITTER_HANDLE = re.compile(r'@([A-Za-z0-9_]{1,15})\b')

    def __init__(self):
        self.extracted_entities = {
            "people": [],
            "organizations": [],
            "emails": [],
            "domains": [],
            "locations": [],
            "social_handles": [],
            "phones": [],
            "events": [],
            "keywords": []
        }

    def extract_from_report(self, report: Dict) -> Dict:
        """
        Extract all entities from a complete report

        Args:
            report: Complete report dict from Redis

        Returns:
            Dict with categorized entities
        """
        self.extracted_entities = {
            "people": [],
            "organizations": [],
            "emails": [],
            "domains": [],
            "locations": [],
            "social_handles": [],
            "phones": [],
            "events": [],
            "keywords": []
        }

        report_data = report.get("report", {})
        username = report.get("username", "")

        # Extract from all profiles
        for profile in report_data.get("all_profiles", []):
            self._extract_from_profile(profile, username)

        # Extract from enrichment data if available
        if "intelligence" in report:
            self._extract_from_intelligence(report["intelligence"])

        # Deduplicate entities
        self._deduplicate_entities()

        logger.info(f"Extracted {sum(len(v) for v in self.extracted_entities.values())} entities from report")

        return self.extracted_entities

    def _extract_from_profile(self, profile: Dict, username: str):
        """Extract entities from a single profile"""
        site = profile.get("site", "")
        url = profile.get("url", "")
        metadata = profile.get("metadata", {})
        enrichment = profile.get("enrichment", {})

        # Extract domain from URL
        domain_match = self.URL_PATTERN.search(url)
        if domain_match:
            domain = domain_match.group(1)
            self.extracted_entities["domains"].append({
                "domain": domain,
                "url": url,
                "source": f"{site} profile",
                "confidence": 0.9
            })

        # Extract social handles
        if url and any(platform in url.lower() for platform in ['twitter', 'instagram', 'facebook', 'linkedin', 'github']):
            self.extracted_entities["social_handles"].append({
                "platform": site,
                "url": url,
                "username": username,
                "source": "profile_url",
                "confidence": 1.0
            })

        # Extract from enrichment data
        if enrichment:
            self._extract_from_enrichment(enrichment, site)

    def _extract_from_enrichment(self, enrichment: Dict, source: str):
        """Extract entities from enrichment data"""
        profile_data = enrichment.get("profile_data", {})

        # Extract organization/company names
        for field in ["company", "organization", "employer", "workplace"]:
            if field in profile_data and profile_data[field]:
                self.extracted_entities["organizations"].append({
                    "name": profile_data[field],
                    "type": "employer",
                    "source": f"{source} - {field}",
                    "confidence": 0.85
                })

        # Extract person names
        for field in ["full_name", "display_name", "name"]:
            if field in profile_data and profile_data[field]:
                name = profile_data[field]
                # Skip if it looks like an organization (contains keywords)
                if not any(org_word in name.lower() for org_word in ['federation', 'company', 'corp', 'inc', 'ltd']):
                    self.extracted_entities["people"].append({
                        "name": name,
                        "source": f"{source} - {field}",
                        "confidence": 0.80
                    })

        # Extract locations
        for field in ["location", "city", "address", "headquarters"]:
            if field in profile_data and profile_data[field]:
                self.extracted_entities["locations"].append({
                    "location": profile_data[field],
                    "type": field,
                    "source": f"{source} - {field}",
                    "confidence": 0.75
                })

        # Extract bio/description text for additional entities
        for field in ["bio", "description", "about"]:
            if field in profile_data and profile_data[field]:
                text = profile_data[field]

                # Extract emails from text
                emails = self.EMAIL_PATTERN.findall(text)
                for email in emails:
                    self.extracted_entities["emails"].append({
                        "address": email.lower(),
                        "source": f"{source} - {field}",
                        "type": "found_in_text",
                        "confidence": 0.95
                    })

                # Extract Twitter handles
                handles = self.TWITTER_HANDLE.findall(text)
                for handle in handles:
                    self.extracted_entities["social_handles"].append({
                        "platform": "Twitter",
                        "handle": f"@{handle}",
                        "username": handle,
                        "source": f"{source} - mentioned in {field}",
                        "confidence": 0.85
                    })

        # Extract contact info
        contact_info = enrichment.get("contact_info", {})
        if contact_info:
            # Emails
            for email in contact_info.get("emails", []):
                email_addr = email if isinstance(email, str) else email.get("value", "")
                if email_addr:
                    self.extracted_entities["emails"].append({
                        "address": email_addr.lower(),
                        "source": f"{source} - contact_info",
                        "type": "contact",
                        "confidence": 1.0
                    })

            # Websites/domains
            for website in contact_info.get("websites", []):
                url = website if isinstance(website, str) else website.get("url", "")
                if url:
                    domain_match = self.URL_PATTERN.search(url)
                    if domain_match:
                        self.extracted_entities["domains"].append({
                            "domain": domain_match.group(1),
                            "url": url,
                            "source": f"{source} - contact_info",
                            "confidence": 1.0
                        })

            # Phones
            for phone in contact_info.get("phones", []):
                phone_num = phone if isinstance(phone, str) else phone.get("value", "")
                if phone_num:
                    self.extracted_entities["phones"].append({
                        "number": phone_num,
                        "source": f"{source} - contact_info",
                        "confidence": 1.0
                    })

        # Extract from employees list (LinkedIn)
        employees = enrichment.get("profile_data", {}).get("employees_found", [])
        if not employees:
            employees = enrichment.get("employees_found", [])

        for employee in employees:
            if isinstance(employee, dict):
                name = employee.get("name", "")
                role = employee.get("position", employee.get("role", ""))
                profile_url = employee.get("profile_url", "")

                if name:
                    self.extracted_entities["people"].append({
                        "name": name,
                        "role": role,
                        "profile_url": profile_url,
                        "source": f"{source} - employees",
                        "confidence": 0.95
                    })

    def _extract_from_intelligence(self, intelligence: Dict):
        """Extract entities from aggregated intelligence section"""

        # Extract from identity
        identity = intelligence.get("identity", {})
        if "official_name" in identity:
            self.extracted_entities["organizations"].append({
                "name": identity["official_name"],
                "type": identity.get("type", "unknown"),
                "source": "intelligence_summary",
                "confidence": 0.98
            })

        if "full_name" in identity:
            self.extracted_entities["people"].append({
                "name": identity["full_name"],
                "source": "intelligence_summary",
                "confidence": 0.98
            })

        # Extract from contact information
        contact = intelligence.get("contact_information", {})
        for email in contact.get("emails", []):
            email_addr = email if isinstance(email, str) else email.get("address", "")
            if email_addr:
                self.extracted_entities["emails"].append({
                    "address": email_addr.lower(),
                    "source": "intelligence_contact",
                    "type": "official",
                    "confidence": 1.0
                })

        for website in contact.get("websites", []):
            url = website if isinstance(website, str) else website.get("url", "")
            if url:
                domain_match = self.URL_PATTERN.search(url)
                if domain_match:
                    self.extracted_entities["domains"].append({
                        "domain": domain_match.group(1),
                        "url": url,
                        "source": "intelligence_contact",
                        "confidence": 1.0
                    })

        # Extract from key personnel
        for person in intelligence.get("key_personnel", []):
            if isinstance(person, dict):
                self.extracted_entities["people"].append({
                    "name": person.get("name", ""),
                    "role": person.get("role", ""),
                    "organization": identity.get("official_name", ""),
                    "source": "intelligence_personnel",
                    "confidence": person.get("confidence", 0.95)
                })

        # Extract from locations
        for location in intelligence.get("geolocation_timeline", []):
            if isinstance(location, dict):
                self.extracted_entities["locations"].append({
                    "location": location.get("location", ""),
                    "coordinates": location.get("coordinates", []),
                    "type": location.get("context", "unknown"),
                    "date": location.get("date", ""),
                    "source": "intelligence_geolocation",
                    "confidence": location.get("confidence", 0.75)
                })

        # Extract from events
        for event in intelligence.get("upcoming_events", []):
            if isinstance(event, dict):
                self.extracted_entities["events"].append({
                    "name": event.get("event", ""),
                    "date": event.get("date", ""),
                    "location": event.get("location", ""),
                    "type": event.get("type", "unknown"),
                    "source": "intelligence_events",
                    "confidence": 0.90
                })

    def _deduplicate_entities(self):
        """Remove duplicate entities within each category"""
        for category in self.extracted_entities:
            if not self.extracted_entities[category]:
                continue

            seen = set()
            unique_entities = []

            for entity in self.extracted_entities[category]:
                # Create a unique key based on the entity's main identifier
                key = self._generate_entity_key(category, entity)

                if key not in seen:
                    seen.add(key)
                    unique_entities.append(entity)

            self.extracted_entities[category] = unique_entities

    def _generate_entity_key(self, category: str, entity: Dict) -> str:
        """Generate a unique key for an entity"""
        if category == "people":
            return entity.get("name", "").lower().strip()
        elif category == "organizations":
            return entity.get("name", "").lower().strip()
        elif category == "emails":
            return entity.get("address", "").lower().strip()
        elif category == "domains":
            return entity.get("domain", "").lower().strip()
        elif category == "locations":
            loc = entity.get("location", "").lower().strip()
            coords = entity.get("coordinates", [])
            return f"{loc}:{coords}"
        elif category == "social_handles":
            platform = entity.get("platform", "").lower()
            username = entity.get("username", "").lower()
            return f"{platform}:{username}"
        elif category == "phones":
            return entity.get("number", "").replace(" ", "").replace("-", "")
        elif category == "events":
            name = entity.get("name", "").lower()
            date = entity.get("date", "")
            return f"{name}:{date}"
        else:
            return str(entity)

    def generate_entity_id(self, category: str, entity: Dict) -> str:
        """
        Generate a stable, unique entity ID for storage

        Args:
            category: Entity category (people, organizations, etc.)
            entity: Entity dict

        Returns:
            Unique entity ID string
        """
        key = self._generate_entity_key(category, entity)
        hash_suffix = hashlib.md5(key.encode()).hexdigest()[:8]

        # Create readable ID: category:hash
        return f"{category}:{hash_suffix}"

    def extract_keywords(self, text: str, min_length: int = 3, max_keywords: int = 20) -> List[str]:
        """
        Extract keywords from text

        Args:
            text: Input text
            min_length: Minimum keyword length
            max_keywords: Maximum number of keywords to return

        Returns:
            List of keywords
        """
        # Simple keyword extraction (can be enhanced with NLP)
        words = re.findall(r'\b\w+\b', text.lower())

        # Remove common stop words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
                      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
                      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
                      'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that'}

        keywords = [w for w in words if len(w) >= min_length and w not in stop_words]

        # Count frequency
        keyword_freq = {}
        for kw in keywords:
            keyword_freq[kw] = keyword_freq.get(kw, 0) + 1

        # Sort by frequency and return top N
        sorted_keywords = sorted(keyword_freq.items(), key=lambda x: x[1], reverse=True)
        return [kw for kw, freq in sorted_keywords[:max_keywords]]


# Singleton instance
entity_extractor = EntityExtractor()
