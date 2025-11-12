"""
Nexus - Report Management System
Browse, search, export, and delete cached OSINT reports
"""
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import sys
import os
import io
import json
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from redis_helper import redis_helper

# PDF generation
try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_LEFT, TA_CENTER
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

router = APIRouter(prefix="/api/nexus", tags=["nexus"])


class ReportListItem(BaseModel):
    aggregation_id: str
    username: str
    created_at: str
    total_profiles: int
    unique_sites: int
    has_visualization: bool


class ReportSearchRequest(BaseModel):
    username: str


@router.get("/reports")
async def list_reports(limit: int = 100, offset: int = 0):
    """
    List all cached reports

    Args:
        limit: Maximum number of reports to return
        offset: Offset for pagination

    Returns:
        List of report summaries
    """
    reports = redis_helper.list_reports(limit, offset)
    stats = redis_helper.get_stats()

    return {
        "status": "success",
        "reports": reports,
        "total": stats["total_reports"],
        "stats": stats
    }


@router.get("/report/{aggregation_id}")
async def get_report(aggregation_id: str):
    """
    Get full report by aggregation ID

    Args:
        aggregation_id: Report identifier

    Returns:
        Full report data including visualization if available
    """
    report = redis_helper.get_report(aggregation_id)

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    return {
        "status": "success",
        "report": report
    }


@router.post("/search")
async def search_reports(request: ReportSearchRequest):
    """
    Search reports by username

    Args:
        request: Search request with username

    Returns:
        List of reports for the specified username
    """
    reports = redis_helper.search_reports_by_username(request.username)

    return {
        "status": "success",
        "username": request.username,
        "reports": reports,
        "count": len(reports)
    }


@router.delete("/report/{aggregation_id}")
async def delete_report(aggregation_id: str):
    """
    Delete report from cache

    Args:
        aggregation_id: Report identifier

    Returns:
        Success status
    """
    success = redis_helper.delete_report(aggregation_id)

    if not success:
        raise HTTPException(status_code=404, detail="Report not found or could not be deleted")

    return {
        "status": "success",
        "message": f"Report {aggregation_id} deleted"
    }


@router.get("/export/json/{aggregation_id}")
async def export_json(aggregation_id: str):
    """
    Export report as JSON file

    Args:
        aggregation_id: Report identifier

    Returns:
        JSON file download
    """
    report = redis_helper.get_report(aggregation_id)

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Create JSON string
    json_str = json.dumps(report, indent=2)

    # Create filename
    username = report["username"]
    timestamp = report["created_at"].replace(":", "-").split(".")[0]
    filename = f"obscura_report_{username}_{timestamp}.json"

    return Response(
        content=json_str,
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/export/pdf/{aggregation_id}")
async def export_pdf(aggregation_id: str):
    """
    Export report as PDF file

    Args:
        aggregation_id: Report identifier

    Returns:
        PDF file download
    """
    if not PDF_AVAILABLE:
        raise HTTPException(status_code=501, detail="PDF export not available (reportlab not installed)")

    report = redis_helper.get_report(aggregation_id)

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Create PDF in memory
    buffer = io.BytesIO()

    # Create the PDF
    doc = SimpleDocTemplate(buffer, pagesize=letter,
                          rightMargin=72, leftMargin=72,
                          topMargin=72, bottomMargin=18)

    # Container for PDF elements
    elements = []

    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#ff3300'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#ff3300'),
        spaceAfter=12
    )
    normal_style = styles['Normal']

    # Title
    elements.append(Paragraph(f"OBSCURA OSINT REPORT", title_style))
    elements.append(Spacer(1, 12))

    # Metadata
    username = report["username"]
    created_at = datetime.fromisoformat(report["created_at"]).strftime("%Y-%m-%d %H:%M:%S")

    elements.append(Paragraph(f"<b>Username:</b> {username}", normal_style))
    elements.append(Paragraph(f"<b>Generated:</b> {created_at}", normal_style))
    elements.append(Paragraph(f"<b>Report ID:</b> {report['aggregation_id']}", normal_style))
    elements.append(Spacer(1, 20))

    # Summary
    elements.append(Paragraph("SUMMARY", heading_style))
    summary = report["report"]["summary"]
    elements.append(Paragraph(f"Total Profiles Found: <b>{summary['total_profiles_found']}</b>", normal_style))
    elements.append(Paragraph(f"Unique Sites: <b>{summary['unique_sites']}</b>", normal_style))
    elements.append(Paragraph(f"Tools Run: {summary['tools_run']}", normal_style))
    elements.append(Paragraph(f"Tools with Results: {summary['tools_with_results']}", normal_style))
    elements.append(Spacer(1, 20))

    # Results by Tool
    elements.append(Paragraph("RESULTS BY TOOL", heading_style))
    for tool_result in report["report"]["by_tool"]:
        elements.append(Paragraph(f"[{tool_result['tool']}] Found: <b>{tool_result['found']}</b>", normal_style))
    elements.append(Spacer(1, 20))

    # Found Profiles
    if report["report"]["all_profiles"]:
        elements.append(Paragraph(f"FOUND PROFILES ({len(report['report']['all_profiles'])})", heading_style))
        elements.append(Spacer(1, 12))

        for site, profiles in report["report"]["by_site"].items():
            elements.append(Paragraph(f"<b>[{site}]</b>", normal_style))

            for profile in profiles:
                elements.append(Paragraph(f"• {profile['url']}", normal_style))

                # Add metadata if available
                if profile.get("metadata"):
                    for key, value in profile["metadata"].items():
                        elements.append(Paragraph(f"  {key}: {value}", normal_style))

            elements.append(Spacer(1, 12))

    # Build PDF
    doc.build(elements)

    # Get PDF data
    buffer.seek(0)
    pdf_data = buffer.getvalue()
    buffer.close()

    # Create filename
    timestamp = created_at.replace(":", "-").replace(" ", "_")
    filename = f"obscura_report_{username}_{timestamp}.pdf"

    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/stats")
async def get_stats():
    """
    Get Nexus statistics

    Returns:
        Statistics about cached reports
    """
    stats = redis_helper.get_stats()

    return {
        "status": "success",
        "stats": stats
    }
