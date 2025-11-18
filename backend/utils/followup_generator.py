"""
Follow-Up Generator - Generates actionable investigation suggestions
Creates targeted follow-up search queries based on extracted entities.
"""
import re
import logging
from typing import Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class FollowUpGenerator:
    """
    Generates follow-up investigation suggestions based on extracted entities.
    Provides actionable next steps for deepening OSINT investigations.
    """

    def __init__(self):
        self.priority_weights = {
            "people": 10,
            "organizations": 8,
            "emails": 9,
            "domains": 7,
            "locations": 5,
            "social_handles": 6,
            "phones": 8,
            "events": 4
        }

    def generate_followups(self, report_id: str, entities: Dict, report_username: str = "") -> List[Dict]:
        """
        Generate follow-up investigation suggestions from entities

        Args:
            report_id: Report aggregation ID
            entities: Extracted entities dict
            report_username: Original username searched

        Returns:
            List of follow-up suggestions with priority and actions
        """
        suggestions = []

        # Generate person investigations
        for person in entities.get("people", []):
            suggestions.extend(self._generate_person_followups(person, report_username))

        # Generate organization investigations
        for org in entities.get("organizations", []):
            suggestions.extend(self._generate_organization_followups(org))

        # Generate email investigations
        for email in entities.get("emails", []):
            suggestions.extend(self._generate_email_followups(email))

        # Generate domain investigations
        for domain in entities.get("domains", []):
            suggestions.extend(self._generate_domain_followups(domain))

        # Generate location investigations
        for location in entities.get("locations", []):
            suggestions.extend(self._generate_location_followups(location))

        # Generate social handle investigations
        for handle in entities.get("social_handles", []):
            suggestions.extend(self._generate_social_followups(handle, report_username))

        # Generate phone investigations
        for phone in entities.get("phones", []):
            suggestions.extend(self._generate_phone_followups(phone))

        # Sort by priority
        suggestions.sort(key=lambda x: self._calculate_priority_score(x), reverse=True)

        # Add unique IDs
        for i, suggestion in enumerate(suggestions):
            suggestion["id"] = f"followup-{i+1}"

        logger.info(f"Generated {len(suggestions)} follow-up suggestions for report {report_id}")

        return suggestions

    def _generate_person_followups(self, person: Dict, report_username: str) -> List[Dict]:
        """Generate follow-ups for a person entity"""
        name = person.get("name", "")
        role = person.get("role", "")

        suggestions = []

        # Generate username variants
        username_variants = self._generate_username_variants(name)

        # Don't suggest searching the original username again
        username_variants = [u for u in username_variants if u != report_username]

        if username_variants:
            suggestions.append({
                "type": "person_investigation",
                "priority": "HIGH",
                "title": f"Investigate {name}",
                "description": f"Search for personal accounts{f' of {role}' if role else ''}",
                "entity_type": "person",
                "entity_data": person,
                "suggested_searches": [
                    {
                        "tool": "Obscura (All Tools)",
                        "query": variant,
                        "reasoning": f"Username variant from name '{name}'"
                    }
                    for variant in username_variants[:3]  # Top 3 variants
                ],
                "one_click_action": {
                    "endpoint": "/api/obscura/search",
                    "method": "POST",
                    "params": {
                        "username": username_variants[0],
                        "tools": ["maigret", "sherlock", "whatsmyname", "blackbird"]
                    },
                    "button_text": f"Search '{username_variants[0]}' →"
                }
            })

        # If person has a profile URL, suggest deep dive
        if person.get("profile_url"):
            suggestions.append({
                "type": "profile_scraping",
                "priority": "MEDIUM",
                "title": f"Profile Deep Dive: {name}",
                "description": "Scrape full profile for connections and content",
                "entity_type": "person",
                "entity_data": person,
                "suggested_searches": [
                    {
                        "tool": "Profile Scraper",
                        "query": person["profile_url"],
                        "reasoning": "Extract detailed information from profile"
                    }
                ],
                "one_click_action": {
                    "endpoint": "/api/enrichment/scrape-profile",
                    "method": "POST",
                    "params": {"url": person["profile_url"]},
                    "button_text": "Scrape Profile →"
                }
            })

        return suggestions

    def _generate_organization_followups(self, org: Dict) -> List[Dict]:
        """Generate follow-ups for an organization entity"""
        name = org.get("name", "")

        suggestions = []

        # Search for organization's social media
        username_variants = self._generate_username_variants(name)

        if username_variants:
            suggestions.append({
                "type": "organization_investigation",
                "priority": "MEDIUM",
                "title": f"Find Social Media: {name}",
                "description": "Search for organization's official accounts",
                "entity_type": "organization",
                "entity_data": org,
                "suggested_searches": [
                    {
                        "tool": "Social Media Search",
                        "query": variant,
                        "reasoning": f"Potential handle for {name}"
                    }
                    for variant in username_variants[:2]
                ],
                "one_click_action": {
                    "endpoint": "/api/obscura/search",
                    "method": "POST",
                    "params": {
                        "username": username_variants[0],
                        "tools": ["maigret", "sherlock"]
                    },
                    "button_text": f"Search '{username_variants[0]}' →"
                }
            })

        return suggestions

    def _generate_email_followups(self, email: Dict) -> List[Dict]:
        """Generate follow-ups for an email entity"""
        address = email.get("address", "")

        suggestions = []

        # Check email in account databases
        suggestions.append({
            "type": "email_investigation",
            "priority": "HIGH",
            "title": f"Check Email: {address}",
            "description": "Find accounts registered with this email",
            "entity_type": "email",
            "entity_data": email,
            "suggested_searches": [
                {
                    "tool": "Holehe",
                    "query": address,
                    "reasoning": "Check which platforms this email is registered on"
                },
                {
                    "tool": "Have I Been Pwned",
                    "query": address,
                    "reasoning": "Check if email appears in data breaches"
                }
            ],
            "one_click_action": {
                "endpoint": "/api/holehe/check",
                "method": "POST",
                "params": {"email": address},
                "button_text": "Check Email →"
            }
        })

        # Extract username from email for searching
        username_part = address.split("@")[0]
        if username_part and not any(c in username_part for c in ['.', '-', '_']):
            # Simple username, worth searching
            suggestions.append({
                "type": "username_investigation",
                "priority": "MEDIUM",
                "title": f"Search Username: {username_part}",
                "description": f"Email username '{username_part}' might be used on social media",
                "entity_type": "email",
                "entity_data": email,
                "suggested_searches": [
                    {
                        "tool": "Username Search",
                        "query": username_part,
                        "reasoning": "Username extracted from email address"
                    }
                ],
                "one_click_action": {
                    "endpoint": "/api/obscura/search",
                    "method": "POST",
                    "params": {"username": username_part, "tools": ["sherlock", "maigret"]},
                    "button_text": f"Search '{username_part}' →"
                }
            })

        return suggestions

    def _generate_domain_followups(self, domain: Dict) -> List[Dict]:
        """Generate follow-ups for a domain entity"""
        domain_name = domain.get("domain", "")

        suggestions = []

        suggestions.append({
            "type": "domain_investigation",
            "priority": "MEDIUM",
            "title": f"Investigate Domain: {domain_name}",
            "description": "Extract emails, subdomains, and infrastructure info",
            "entity_type": "domain",
            "entity_data": domain,
            "suggested_searches": [
                {
                    "tool": "TheHarvester",
                    "query": domain_name,
                    "reasoning": "Gather emails, names, and subdomains from domain"
                },
                {
                    "tool": "WHOIS Lookup",
                    "query": domain_name,
                    "reasoning": "Get registration info and admin contacts"
                },
                {
                    "tool": "DNS Enumeration",
                    "query": domain_name,
                    "reasoning": "Find subdomains and infrastructure"
                }
            ],
            "one_click_action": {
                "endpoint": "/api/theharvester/search",
                "method": "POST",
                "params": {"domain": domain_name},
                "button_text": "Harvest Domain →"
            }
        })

        return suggestions

    def _generate_location_followups(self, location: Dict) -> List[Dict]:
        """Generate follow-ups for a location entity"""
        location_name = location.get("location", "")
        coordinates = location.get("coordinates", [])

        suggestions = []

        if coordinates and len(coordinates) == 2:
            suggestions.append({
                "type": "location_investigation",
                "priority": "LOW",
                "title": f"Investigate Location: {location_name}",
                "description": "Gather geospatial intelligence on this location",
                "entity_type": "location",
                "entity_data": location,
                "suggested_searches": [
                    {
                        "tool": "Google Maps / Street View",
                        "query": f"{coordinates[0]}, {coordinates[1]}",
                        "reasoning": "Visual confirmation and nearby intel"
                    },
                    {
                        "tool": "Geospatial OSINT",
                        "query": location_name,
                        "reasoning": "Find businesses, events, and people at this location"
                    }
                ],
                "one_click_action": {
                    "endpoint": "/api/geoint/location",
                    "method": "POST",
                    "params": {"lat": coordinates[0], "lon": coordinates[1]},
                    "button_text": "Investigate Location →"
                }
            })

        return suggestions

    def _generate_social_followups(self, handle: Dict, report_username: str) -> List[Dict]:
        """Generate follow-ups for a social media handle"""
        platform = handle.get("platform", "")
        username = handle.get("username", "")

        suggestions = []

        # Only suggest if it's a different username than originally searched
        if username and username != report_username:
            suggestions.append({
                "type": "cross_platform_search",
                "priority": "MEDIUM",
                "title": f"Search '{username}' Across Platforms",
                "description": f"Found on {platform}, search other platforms",
                "entity_type": "social_handle",
                "entity_data": handle,
                "suggested_searches": [
                    {
                        "tool": "Cross-Platform Search",
                        "query": username,
                        "reasoning": f"Username found on {platform}, may be used elsewhere"
                    }
                ],
                "one_click_action": {
                    "endpoint": "/api/obscura/search",
                    "method": "POST",
                    "params": {"username": username, "tools": ["all"]},
                    "button_text": f"Search '{username}' →"
                }
            })

        return suggestions

    def _generate_phone_followups(self, phone: Dict) -> List[Dict]:
        """Generate follow-ups for a phone number"""
        number = phone.get("number", "")

        suggestions = []

        suggestions.append({
            "type": "phone_investigation",
            "priority": "MEDIUM",
            "title": f"Investigate Phone: {number}",
            "description": "Look up phone number for owner and carrier info",
            "entity_type": "phone",
            "entity_data": phone,
            "suggested_searches": [
                {
                    "tool": "Phone Lookup",
                    "query": number,
                    "reasoning": "Get carrier, location, and owner information"
                },
                {
                    "tool": "Reverse Phone Search",
                    "query": number,
                    "reasoning": "Find associated accounts and records"
                }
            ],
            "one_click_action": {
                "endpoint": "/api/phone/lookup",
                "method": "POST",
                "params": {"number": number},
                "button_text": "Lookup Phone →"
            }
        })

        return suggestions

    def _generate_username_variants(self, name: str) -> List[str]:
        """
        Generate username variants from a name

        Args:
            name: Person or organization name

        Returns:
            List of potential username variants
        """
        if not name:
            return []

        variants = []

        # Clean the name
        name_clean = re.sub(r'[^\w\s]', '', name.lower())
        parts = name_clean.split()

        if not parts:
            return []

        # Single word names
        if len(parts) == 1:
            variants.append(parts[0])
            return variants

        # Two-part names (most common)
        if len(parts) == 2:
            first, last = parts[0], parts[1]

            # firstname.lastname
            variants.append(f"{first}.{last}")
            # firstnamelastname
            variants.append(f"{first}{last}")
            # firstlast
            if len(first) > 0 and len(last) > 0:
                variants.append(f"{first}{last[0]}")
            # flastname
            if len(first) > 0:
                variants.append(f"{first[0]}{last}")
            # firstname_lastname
            variants.append(f"{first}_{last}")
            # firstname-lastname
            variants.append(f"{first}-{last}")
            # lastnamefirstname (less common but possible)
            variants.append(f"{last}{first}")

        # Three-part names
        elif len(parts) == 3:
            first, middle, last = parts[0], parts[1], parts[2]

            # firstname.lastname (skip middle)
            variants.append(f"{first}.{last}")
            # firstnamelastname
            variants.append(f"{first}{last}")
            # firstmiddlelast
            if len(middle) > 0:
                variants.append(f"{first}{middle[0]}{last}")
            # firstname.middle.lastname
            variants.append(f"{first}.{middle}.{last}")

        # Organization names (multiple words)
        elif len(parts) > 3:
            # Use initials
            initials = ''.join([p[0] for p in parts if p])
            variants.append(initials)

            # Use first and last word
            variants.append(f"{parts[0]}{parts[-1]}")

            # Use full name concatenated
            variants.append(''.join(parts))

        # Remove duplicates while preserving order
        seen = set()
        unique_variants = []
        for v in variants:
            if v not in seen and len(v) >= 3:  # Minimum 3 characters
                seen.add(v)
                unique_variants.append(v)

        return unique_variants[:10]  # Return top 10

    def _calculate_priority_score(self, suggestion: Dict) -> int:
        """Calculate priority score for sorting"""
        priority_map = {"HIGH": 100, "MEDIUM": 50, "LOW": 10}
        base_score = priority_map.get(suggestion.get("priority", "LOW"), 10)

        # Boost score based on entity type
        entity_type = suggestion.get("entity_type", "")
        type_boost = self.priority_weights.get(entity_type, 5)

        # Boost if entity has high confidence
        confidence = suggestion.get("entity_data", {}).get("confidence", 0.5)
        confidence_boost = int(confidence * 20)

        return base_score + type_boost + confidence_boost


# Singleton instance
followup_generator = FollowUpGenerator()
