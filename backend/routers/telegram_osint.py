from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from docker_helper import docker_helper

router = APIRouter()

class TelegramRequest(BaseModel):
    username: str

@router.post("/search")
async def search_telegram(request: TelegramRequest):
    """
    Search for Telegram usernames, groups, and channels
    """
    try:
        # Run Telegram OSINT in Docker container (async mode)
        result = docker_helper.run_container_async(
            image="deskred-telegram-osint",
            command=[request.username],
            timeout=60
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
            "message": "Container started - Searching Telegram..."
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
    Check if Telegram OSINT Docker image is available
    """
    exists = docker_helper.check_image_exists("deskred-telegram-osint")
    return {
        "installed": exists,
        "message": "Docker image available" if exists else "Run: docker-compose build telegram-osint"
    }
