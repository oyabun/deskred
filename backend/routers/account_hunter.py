"""
Account Hunter - Meta-tool that aggregates multiple username OSINT tools
Runs Maigret, Sherlock, Social Analyzer, Digital Footprint, and GoSearch in parallel
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional
import asyncio
from datetime import datetime
import sys
import os
import logging

# Add parent directory to path to import docker_helper
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from docker_helper import docker_helper, running_containers
from utils.report_parser import ReportParser
from redis_helper import redis_helper

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/account-hunter", tags=["account-hunter"])

# Track running aggregations
running_aggregations: Dict[str, Dict] = {}


class AccountHunterRequest(BaseModel):
    username: str


class AccountHunterStatus(BaseModel):
    aggregation_id: str
    username: str
    status: str
    started_at: str
    tools: Dict[str, Dict]


@router.post("/search")
async def search_username(request: AccountHunterRequest):
    """
    Run multiple username OSINT tools in parallel
    Returns an aggregation ID to track all running containers
    """
    if not request.username or not request.username.strip():
        raise HTTPException(status_code=400, detail="Username is required")

    username = request.username.strip()
    aggregation_id = f"agg-{datetime.now().strftime('%Y%m%d%H%M%S')}-{username}"

    # Tools to run for username searches
    tools_to_run = [
        {
            "name": "Maigret",
            "id": "maigret",
            "image": "deskred-maigret",
            "command": [username]
        },
        {
            "name": "Sherlock",
            "id": "sherlock",
            "image": "deskred-sherlock",
            "command": [username]
        },
        {
            "name": "Social Analyzer",
            "id": "social-analyzer",
            "image": "deskred-social-analyzer",
            "command": ["--username", username, "--output", "json"]
        },
        {
            "name": "Digital Footprint",
            "id": "digitalfootprint",
            "image": "deskred-digitalfootprint",
            "command": [username]
        },
        {
            "name": "GoSearch",
            "id": "gosearch",
            "image": "deskred-gosearch",
            "command": ["-u", username]
        }
    ]

    # Initialize aggregation tracking
    aggregation_data = {
        "aggregation_id": aggregation_id,
        "username": username,
        "status": "running",
        "started_at": datetime.now().isoformat(),
        "tools": {}
    }

    # Start all containers
    for tool in tools_to_run:
        try:
            result = docker_helper.run_container_async(
                image=tool["image"],
                command=tool["command"],
                timeout=120,
                auto_remove=False  # Keep containers for log retrieval
            )

            if result["status"] == "success":
                aggregation_data["tools"][tool["id"]] = {
                    "name": tool["name"],
                    "container_id": result["container_id"],
                    "container_name": result["container_name"],
                    "status": "running",
                    "started_at": datetime.now().isoformat()
                }
        except Exception as e:
            aggregation_data["tools"][tool["id"]] = {
                "name": tool["name"],
                "status": "error",
                "error": str(e),
                "started_at": datetime.now().isoformat()
            }

    # Store aggregation data
    running_aggregations[aggregation_id] = aggregation_data

    return {
        "status": "success",
        "aggregation_id": aggregation_id,
        "username": username,
        "tools_started": len([t for t in aggregation_data["tools"].values() if "container_id" in t]),
        "tools_failed": len([t for t in aggregation_data["tools"].values() if t["status"] == "error"]),
        "message": f"Started {len(tools_to_run)} tools for username: {username}"
    }


@router.get("/status/{aggregation_id}")
async def get_aggregation_status(aggregation_id: str):
    """
    Get the status of all tools in an aggregation
    """
    if aggregation_id not in running_aggregations:
        raise HTTPException(status_code=404, detail="Aggregation not found")

    aggregation = running_aggregations[aggregation_id]

    # Update status of each tool
    tools_running = 0
    tools_completed = 0
    tools_error = 0

    for tool_id, tool_data in aggregation["tools"].items():
        if "container_id" in tool_data:
            try:
                container = running_containers.get(tool_data["container_id"])
                if container:
                    container_obj = container["container"]
                    container_obj.reload()
                    status = container_obj.status

                    if status in ["exited", "dead"]:
                        tool_data["status"] = "completed"
                        tools_completed += 1
                    else:
                        tool_data["status"] = "running"
                        tools_running += 1
                else:
                    tool_data["status"] = "completed"
                    tools_completed += 1
            except Exception as e:
                tool_data["status"] = "error"
                tool_data["error"] = str(e)
                tools_error += 1
        elif tool_data["status"] == "error":
            tools_error += 1

    # Update overall status
    if tools_running == 0:
        aggregation["status"] = "completed"

    return {
        "status": "success",
        "aggregation": aggregation,
        "summary": {
            "total_tools": len(aggregation["tools"]),
            "running": tools_running,
            "completed": tools_completed,
            "errors": tools_error
        }
    }


@router.get("/logs/{aggregation_id}")
async def get_aggregated_logs(aggregation_id: str):
    """
    Get logs from all tools in an aggregation
    Returns combined logs with tool identification
    """
    if aggregation_id not in running_aggregations:
        raise HTTPException(status_code=404, detail="Aggregation not found")

    aggregation = running_aggregations[aggregation_id]
    all_logs = {}

    for tool_id, tool_data in aggregation["tools"].items():
        if "container_id" in tool_data:
            try:
                logs_result = docker_helper.get_container_logs(tool_data["container_id"])
                all_logs[tool_id] = {
                    "name": tool_data["name"],
                    "status": logs_result.get("container_status", "unknown"),
                    "logs": logs_result.get("logs", "")
                }
            except Exception as e:
                all_logs[tool_id] = {
                    "name": tool_data["name"],
                    "status": "error",
                    "error": str(e)
                }

    return {
        "status": "success",
        "aggregation_id": aggregation_id,
        "username": aggregation["username"],
        "logs": all_logs
    }


@router.get("/list")
async def list_aggregations():
    """
    List all running and recent aggregations
    """
    return {
        "status": "success",
        "aggregations": [
            {
                "aggregation_id": agg_id,
                "username": agg_data["username"],
                "status": agg_data["status"],
                "started_at": agg_data["started_at"],
                "tools_count": len(agg_data["tools"])
            }
            for agg_id, agg_data in running_aggregations.items()
        ]
    }


@router.get("/report/{aggregation_id}")
async def get_aggregation_report(aggregation_id: str, format: str = "json"):
    """
    Generate a parsed report from aggregation results
    Filters out noise and presents only relevant findings

    Args:
        aggregation_id: The aggregation ID
        format: Output format - "json" (default) or "text"
    """
    if aggregation_id not in running_aggregations:
        raise HTTPException(status_code=404, detail="Aggregation not found")

    aggregation = running_aggregations[aggregation_id]

    # Get all tool logs
    all_logs = {}
    for tool_id, tool_data in aggregation["tools"].items():
        if "container_id" in tool_data:
            try:
                logs_result = docker_helper.get_container_logs(tool_data["container_id"])
                all_logs[tool_id] = {
                    "name": tool_data["name"],
                    "status": logs_result.get("container_status", "unknown"),
                    "logs": logs_result.get("logs", "")
                }
            except Exception as e:
                all_logs[tool_id] = {
                    "name": tool_data["name"],
                    "status": "error",
                    "error": str(e),
                    "logs": ""
                }

    # Generate report
    report = ReportParser.generate_report(all_logs)

    # Save report to Redis
    redis_helper.save_report(aggregation_id, aggregation["username"], report)

    if format == "text":
        text_report = ReportParser.format_report_text(report, aggregation["username"])
        return {
            "status": "success",
            "aggregation_id": aggregation_id,
            "username": aggregation["username"],
            "format": "text",
            "report": text_report
        }
    else:
        return {
            "status": "success",
            "aggregation_id": aggregation_id,
            "username": aggregation["username"],
            "format": "json",
            "report": report
        }


@router.get("/visualize/{aggregation_id}")
async def visualize_aggregation(aggregation_id: str):
    """
    Generate interactive visualizations from aggregation report
    Uses Nexus visualization tool to create graphs
    """
    if aggregation_id not in running_aggregations:
        raise HTTPException(status_code=404, detail="Aggregation not found")

    aggregation = running_aggregations[aggregation_id]

    # Get all tool logs
    all_logs = {}
    for tool_id, tool_data in aggregation["tools"].items():
        if "container_id" in tool_data:
            try:
                logs_result = docker_helper.get_container_logs(tool_data["container_id"])
                all_logs[tool_id] = {
                    "name": tool_data["name"],
                    "status": logs_result.get("container_status", "unknown"),
                    "logs": logs_result.get("logs", "")
                }
            except Exception as e:
                all_logs[tool_id] = {
                    "name": tool_data["name"],
                    "status": "error",
                    "error": str(e),
                    "logs": ""
                }

    # Generate report
    report = ReportParser.generate_report(all_logs)

    # Convert report to JSON for passing to Nexus
    import json
    report_json = json.dumps(report)

    # Run Nexus visualization container
    try:
        result = docker_helper.run_container(
            image="deskred-nexus",
            command=[report_json, aggregation["username"]],
            timeout=30
        )

        if result["status"] == "success":
            # Parse the visualization output
            output = result.get("output", "")
            try:
                visualization_data = json.loads(output)

                # Update Redis with visualization data
                cached_report = redis_helper.get_report(aggregation_id)
                if cached_report:
                    redis_helper.save_report(
                        aggregation_id,
                        aggregation["username"],
                        cached_report["report"],
                        visualization_data
                    )

                return {
                    "status": "success",
                    "aggregation_id": aggregation_id,
                    "username": aggregation["username"],
                    "visualizations": visualization_data
                }
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse Nexus output: {e}")
                return {
                    "status": "error",
                    "message": "Failed to parse visualization data",
                    "raw_output": output
                }
        else:
            return {
                "status": "error",
                "message": result.get("error", "Failed to generate visualizations")
            }
    except Exception as e:
        logger.error(f"Error running Nexus visualization: {e}")
        raise HTTPException(status_code=500, detail=f"Visualization error: {str(e)}")


@router.delete("/cleanup/{aggregation_id}")
async def cleanup_aggregation(aggregation_id: str):
    """
    Remove aggregation from tracking and cleanup containers
    """
    if aggregation_id in running_aggregations:
        aggregation = running_aggregations[aggregation_id]

        # Cleanup containers
        for tool_id, tool_data in aggregation["tools"].items():
            if "container_id" in tool_data:
                try:
                    container = running_containers.get(tool_data["container_id"])
                    if container:
                        container_obj = container["container"]
                        try:
                            container_obj.remove(force=True)
                        except:
                            pass  # Container might already be removed
                        # Remove from tracking
                        if tool_data["container_id"] in running_containers:
                            del running_containers[tool_data["container_id"]]
                except Exception as e:
                    logger.error(f"Error cleaning up container {tool_data['container_id']}: {e}")

        del running_aggregations[aggregation_id]
        return {"status": "success", "message": "Aggregation and containers cleaned up"}

    raise HTTPException(status_code=404, detail="Aggregation not found")
