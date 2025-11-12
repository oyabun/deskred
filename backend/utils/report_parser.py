"""
Report Parser - Extracts and aggregates relevant information from OSINT tool outputs
Filters out noise and presents clean, actionable results
"""
import re
from typing import Dict, List, Set
from collections import defaultdict


class ReportParser:
    """Parse and aggregate OSINT tool results into a clean report"""

    @staticmethod
    def parse_maigret(logs: str) -> Dict:
        """Extract found profiles from Maigret output"""
        results = []

        if not logs:
            return {"tool": "Maigret", "found": 0, "profiles": []}

        # Pattern for found profiles: [+] SiteName: URL
        pattern = r'\[\+\]\s+([^:]+):\s+(https?://[^\s]+)'
        matches = re.finditer(pattern, logs)

        for match in matches:
            site = match.group(1).strip()
            url = match.group(2).strip()

            # Try to extract additional info (username, fullname, etc.)
            profile_data = {
                "site": site,
                "url": url,
                "metadata": {}
            }

            # Look for metadata lines after the profile (indented lines)
            pos = match.end()
            metadata_pattern = r'\s+[├└]─(\w+):\s*(.+)'
            for meta_match in re.finditer(metadata_pattern, logs[pos:pos+500]):
                key = meta_match.group(1)
                value = meta_match.group(2).strip()
                profile_data["metadata"][key] = value

            results.append(profile_data)

        return {
            "tool": "Maigret",
            "found": len(results),
            "profiles": results
        }

    @staticmethod
    def parse_sherlock(logs: str) -> Dict:
        """Extract found profiles from Sherlock output"""
        results = []

        if not logs:
            return {"tool": "Sherlock", "found": 0, "profiles": []}

        # Pattern for found profiles: [+] SiteName: URL
        pattern = r'\[\+\]\s+([^:]+):\s+(https?://[^\s]+)'
        matches = re.finditer(pattern, logs)

        for match in matches:
            results.append({
                "site": match.group(1).strip(),
                "url": match.group(2).strip()
            })

        return {
            "tool": "Sherlock",
            "found": len(results),
            "profiles": results
        }

    @staticmethod
    def parse_social_analyzer(logs: str) -> Dict:
        """Extract found profiles from Social Analyzer output"""
        results = []

        if not logs:
            return {"tool": "Social Analyzer", "found": 0, "profiles": []}

        # Social Analyzer output is complex, look for URLs
        # Pattern for URLs in output
        url_pattern = r'https?://(?:www\.)?([^/\s]+)/(?:profile/)?([^\s]+)'
        matches = re.finditer(url_pattern, logs)

        seen_urls = set()
        for match in matches:
            url = match.group(0)
            if url not in seen_urls and 'social' in url.lower():
                domain = match.group(1)
                seen_urls.add(url)
                results.append({
                    "site": domain,
                    "url": url
                })

        return {
            "tool": "Social Analyzer",
            "found": len(results),
            "profiles": results
        }

    @staticmethod
    def parse_digitalfootprint(logs: str) -> Dict:
        """Extract found profiles from Digital Footprint output"""
        results = []

        if not logs:
            return {"tool": "Digital Footprint", "found": 0, "profiles": []}

        # Look for "Found:" or success indicators
        pattern = r'(?:Found|✓|SUCCESS).*?(https?://[^\s]+)'
        matches = re.finditer(pattern, logs, re.IGNORECASE)

        for match in matches:
            url = match.group(1)
            # Extract site name from URL
            site_match = re.search(r'https?://(?:www\.)?([^/]+)', url)
            if site_match:
                results.append({
                    "site": site_match.group(1),
                    "url": url
                })

        return {
            "tool": "Digital Footprint",
            "found": len(results),
            "profiles": results
        }

    @staticmethod
    def parse_gosearch(logs: str) -> Dict:
        """Extract found profiles from GoSearch output"""
        results = []

        if not logs:
            return {"tool": "GoSearch", "found": 0, "profiles": []}

        # GoSearch typically shows [+] or ✓ for found profiles
        pattern = r'[\[+\]|✓]\s*([^:]+):\s*(https?://[^\s]+)'
        matches = re.finditer(pattern, logs)

        for match in matches:
            results.append({
                "site": match.group(1).strip(),
                "url": match.group(2).strip()
            })

        return {
            "tool": "GoSearch",
            "found": len(results),
            "profiles": results
        }

    @classmethod
    def generate_report(cls, tool_logs: Dict[str, Dict]) -> Dict:
        """
        Generate aggregated report from all tool logs

        Args:
            tool_logs: Dict with tool_id as key and log data as value
                      Format: {"maigret": {"logs": "..."}, "sherlock": {...}}

        Returns:
            Aggregated report with unique profiles and statistics
        """
        parsers = {
            "maigret": cls.parse_maigret,
            "sherlock": cls.parse_sherlock,
            "social-analyzer": cls.parse_social_analyzer,
            "digitalfootprint": cls.parse_digitalfootprint,
            "gosearch": cls.parse_gosearch
        }

        tool_results = []
        all_profiles = []
        unique_urls = set()
        profiles_by_site = defaultdict(list)

        # Parse each tool's output
        for tool_id, log_data in tool_logs.items():
            if tool_id in parsers and log_data.get("logs"):
                result = parsers[tool_id](log_data["logs"])
                tool_results.append(result)

                # Aggregate profiles
                for profile in result.get("profiles", []):
                    url = profile.get("url", "")
                    if url and url not in unique_urls:
                        unique_urls.add(url)
                        all_profiles.append(profile)
                        site = profile.get("site", "unknown")
                        profiles_by_site[site].append(profile)

        # Calculate statistics
        total_found = len(all_profiles)
        sites_found = len(profiles_by_site)

        # Sort profiles by site
        sorted_profiles = []
        for site in sorted(profiles_by_site.keys()):
            sorted_profiles.extend(profiles_by_site[site])

        return {
            "summary": {
                "total_profiles_found": total_found,
                "unique_sites": sites_found,
                "tools_run": len(tool_results),
                "tools_with_results": sum(1 for r in tool_results if r["found"] > 0)
            },
            "by_tool": tool_results,
            "all_profiles": sorted_profiles,
            "by_site": dict(profiles_by_site)
        }

    @classmethod
    def format_report_text(cls, report: Dict, username: str) -> str:
        """Format report as readable text"""
        lines = []
        lines.append("=" * 70)
        lines.append(f"ACCOUNT HUNTER REPORT - Username: {username}")
        lines.append("=" * 70)
        lines.append("")

        summary = report["summary"]
        lines.append("SUMMARY:")
        lines.append(f"  Total Profiles Found: {summary['total_profiles_found']}")
        lines.append(f"  Unique Sites: {summary['unique_sites']}")
        lines.append(f"  Tools Run: {summary['tools_run']}")
        lines.append(f"  Tools with Results: {summary['tools_with_results']}")
        lines.append("")

        # Results by tool
        lines.append("RESULTS BY TOOL:")
        for tool_result in report["by_tool"]:
            lines.append(f"  [{tool_result['tool']}] Found: {tool_result['found']}")
        lines.append("")

        # All profiles grouped by site
        if report["all_profiles"]:
            lines.append("FOUND PROFILES:")
            current_site = None
            for profile in report["all_profiles"]:
                site = profile.get("site", "Unknown")
                if site != current_site:
                    lines.append(f"\n  [{site}]")
                    current_site = site

                url = profile.get("url", "")
                lines.append(f"    • {url}")

                # Add metadata if available
                metadata = profile.get("metadata", {})
                if metadata:
                    for key, value in metadata.items():
                        lines.append(f"      {key}: {value}")
        else:
            lines.append("No profiles found.")

        lines.append("")
        lines.append("=" * 70)

        return "\n".join(lines)
