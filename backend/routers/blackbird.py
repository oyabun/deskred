from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from docker_helper import docker_helper

router = APIRouter()

class BlackbirdRequest(BaseModel):
    username: str

@router.post("/search")
async def search_user(request: BlackbirdRequest):
    """
    Search for a username across 584+ websites using Blackbird with account information
    """
    try:
        # Run Blackbird in Docker container (async mode)
        result = docker_helper.run_container_async(
            image="deskred-blackbird",
            command=["--username", request.username],
            timeout=120
        )

        if result["status"] == "error":
            return {
                "status": "error",
                "message": result["message"],
                "username": request.username,
                "container_id": None
            }

        return {
            "status": "success",
            "username": request.username,
            "container_id": result["container_id"],
            "container_name": result["container_name"],
            "message": "Container started - Searching 584+ websites with account info..."
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.get("/logs/{container_id}")
async def get_container_logs(container_id: str):
    """
    Get logs from a running container
    """
    try:
        result = docker_helper.get_container_logs(container_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.get("/status")
async def check_status():
    """
    Check if Blackbird Docker image is available
    """
    exists = docker_helper.check_image_exists("deskred-blackbird")
    return {
        "installed": exists,
        "message": "Docker image available" if exists else "Run: docker-compose build blackbird"
    }
