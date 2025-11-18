"""
Entity Management API - Extract, store, and query entities from reports
Enables investigation knowledge graph and follow-up suggestions
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict
import sys
import os
import logging

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.entity_extractor import entity_extractor
from utils.entity_store import entity_store
from utils.followup_generator import followup_generator
from redis_helper import redis_helper

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/entities", tags=["entities"])


class ExtractEntitiesRequest(BaseModel):
    """Request to extract entities from a report"""
    report_id: str
    store_results: bool = True


class SearchEntitiesRequest(BaseModel):
    """Request to search for entities"""
    category: str
    search_term: str
    limit: int = 50


@router.post("/extract/{report_id}")
async def extract_entities(report_id: str, background_tasks: BackgroundTasks):
    """
    Extract entities from a report and store them

    This creates the entity-to-report mappings needed for linking investigations.
    Can be called on existing reports to add entity extraction.

    Args:
        report_id: Report aggregation ID

    Returns:
        Extracted entities with statistics
    """
    try:
        # Get report from Redis
        report = redis_helper.get_report(report_id)

        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        # Extract entities
        entities = entity_extractor.extract_from_report(report)

        # Store entities in background
        background_tasks.add_task(entity_store.store_entities, report_id, entities)

        # Calculate statistics
        stats = {
            "total_entities": sum(len(items) for items in entities.values()),
            "by_category": {cat: len(items) for cat, items in entities.items()}
        }

        return {
            "status": "success",
            "report_id": report_id,
            "entities": entities,
            "statistics": stats,
            "message": "Entities extracted and being stored"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting entities: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/report/{report_id}")
async def get_report_entities(report_id: str, category: Optional[str] = None):
    """
    Get all entities extracted from a report

    Args:
        report_id: Report aggregation ID
        category: Optional category filter (people, organizations, emails, etc.)

    Returns:
        Entities by category
    """
    try:
        entities = entity_store.get_report_entities(report_id, category)

        if not entities or all(not items for items in entities.values()):
            # No entities found, try to extract them
            report = redis_helper.get_report(report_id)

            if not report:
                raise HTTPException(status_code=404, detail="Report not found")

            # Extract and store entities
            entities = entity_extractor.extract_from_report(report)
            entity_store.store_entities(report_id, entities)

        stats = {
            "total_entities": sum(len(items) for items in entities.values()),
            "by_category": {cat: len(items) for cat, items in entities.items() if items}
        }

        return {
            "status": "success",
            "report_id": report_id,
            "entities": entities,
            "statistics": stats
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting report entities: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/report/{report_id}/linked")
async def get_linked_reports(report_id: str):
    """
    Find all reports linked to this report through shared entities

    Args:
        report_id: Report aggregation ID

    Returns:
        List of linked reports with connection details
    """
    try:
        # Check if report exists
        report = redis_helper.get_report(report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        # Get linked reports
        linked = entity_store.find_linked_reports(report_id)

        # Enrich with report metadata
        for link in linked:
            link_report = redis_helper.get_report(link["report_id"])
            if link_report:
                link["username"] = link_report.get("username", "")
                link["created_at"] = link_report.get("created_at", "")
                link["total_profiles"] = link_report.get("report", {}).get("summary", {}).get("total_profiles_found", 0)

        return {
            "status": "success",
            "report_id": report_id,
            "linked_reports": linked,
            "total_linked": len(linked)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting linked reports: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/report/{report_id}/followups")
async def get_followup_suggestions(report_id: str):
    """
    Generate follow-up investigation suggestions for a report

    Based on extracted entities, suggests specific searches and tools
    to deepen the investigation.

    Args:
        report_id: Report aggregation ID

    Returns:
        List of actionable follow-up suggestions
    """
    try:
        # Get report
        report = redis_helper.get_report(report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        username = report.get("username", "")

        # Get entities (extract if needed)
        entities = entity_store.get_report_entities(report_id)

        if not entities or all(not items for items in entities.values()):
            # Extract entities first
            entities = entity_extractor.extract_from_report(report)
            entity_store.store_entities(report_id, entities)

        # Generate follow-up suggestions
        suggestions = followup_generator.generate_followups(report_id, entities, username)

        return {
            "status": "success",
            "report_id": report_id,
            "username": username,
            "suggestions": suggestions,
            "total_suggestions": len(suggestions)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating follow-ups: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/report/{report_id}/graph")
async def get_investigation_graph(report_id: str, max_depth: int = 2):
    """
    Get investigation graph starting from a report

    Returns connected reports as nodes and their relationships as edges,
    forming a knowledge graph of the investigation.

    Args:
        report_id: Root report aggregation ID
        max_depth: Maximum depth to traverse (default: 2)

    Returns:
        Graph with nodes and edges
    """
    try:
        # Check if report exists
        report = redis_helper.get_report(report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        # Build investigation graph
        graph = entity_store.get_investigation_graph(report_id, max_depth)

        return {
            "status": "success",
            "root_report_id": report_id,
            "graph": graph
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error building investigation graph: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/search")
async def search_entities(request: SearchEntitiesRequest):
    """
    Search for entities across all reports

    Args:
        request: Search request with category and term

    Returns:
        List of matching entities with report counts
    """
    try:
        results = entity_store.search_entities(
            request.category,
            request.search_term,
            request.limit
        )

        return {
            "status": "success",
            "category": request.category,
            "search_term": request.search_term,
            "results": results,
            "total_results": len(results)
        }

    except Exception as e:
        logger.error(f"Error searching entities: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/entity/{entity_id}")
async def get_entity_details(entity_id: str):
    """
    Get details about a specific entity

    Args:
        entity_id: Entity ID

    Returns:
        Entity data and associated reports
    """
    try:
        # Get entity data
        entity_data = entity_store.get_entity_data(entity_id)

        if not entity_data:
            raise HTTPException(status_code=404, detail="Entity not found")

        # Get reports mentioning this entity
        report_ids = entity_store.get_entity_reports(entity_id)

        # Enrich with report metadata
        reports = []
        for report_id in report_ids:
            report = redis_helper.get_report(report_id)
            if report:
                reports.append({
                    "report_id": report_id,
                    "username": report.get("username", ""),
                    "created_at": report.get("created_at", "")
                })

        return {
            "status": "success",
            "entity_id": entity_id,
            "entity_data": entity_data,
            "reports": reports,
            "total_reports": len(reports)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting entity details: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/statistics")
async def get_entity_statistics():
    """
    Get statistics about stored entities

    Returns:
        Entity counts by category and total reports
    """
    try:
        stats = entity_store.get_statistics()

        return {
            "status": "success",
            "statistics": stats
        }

    except Exception as e:
        logger.error(f"Error getting entity statistics: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/batch-extract")
async def batch_extract_entities(background_tasks: BackgroundTasks):
    """
    Extract entities from all reports in Nexus

    Runs as a background task to process all existing reports.
    Useful for enabling entity extraction on legacy reports.

    Returns:
        Status message
    """
    try:
        # Get all reports
        reports = redis_helper.list_reports(limit=1000)

        if not reports:
            return {
                "status": "success",
                "message": "No reports found",
                "total_reports": 0
            }

        # Queue extraction for each report
        for report_summary in reports:
            report_id = report_summary["aggregation_id"]
            background_tasks.add_task(_extract_and_store_entities, report_id)

        return {
            "status": "success",
            "message": f"Queued entity extraction for {len(reports)} reports",
            "total_reports": len(reports)
        }

    except Exception as e:
        logger.error(f"Error in batch extraction: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/report/{report_id}")
async def delete_report_entities(report_id: str):
    """
    Delete all entity data for a report

    Args:
        report_id: Report aggregation ID

    Returns:
        Success status
    """
    try:
        success = entity_store.delete_report_entities(report_id)

        if not success:
            raise HTTPException(status_code=404, detail="Report entities not found or could not be deleted")

        return {
            "status": "success",
            "message": f"Deleted entity data for report {report_id}"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting report entities: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# Helper function for background tasks
def _extract_and_store_entities(report_id: str):
    """Background task to extract and store entities"""
    try:
        report = redis_helper.get_report(report_id)
        if report:
            entities = entity_extractor.extract_from_report(report)
            entity_store.store_entities(report_id, entities)
            logger.info(f"Extracted entities for report {report_id}")
    except Exception as e:
        logger.error(f"Error in background entity extraction for {report_id}: {e}")
