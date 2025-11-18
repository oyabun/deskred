from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import sys
import os
import docker

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from docker_helper import docker_helper

router = APIRouter()

class GHuntRequest(BaseModel):
    email: str

# Volume name for GHunt credentials
GHUNT_VOLUME = "ghunt_credentials"

def ensure_ghunt_volume():
    """Ensure the GHunt credentials volume exists"""
    try:
        client = docker.from_env()
        try:
            client.volumes.get(GHUNT_VOLUME)
        except docker.errors.NotFound:
            client.volumes.create(GHUNT_VOLUME)
    except Exception as e:
        print(f"Error ensuring volume: {e}")

@router.get("/auth/status")
async def check_auth_status():
    """
    Check if GHunt is authenticated (has valid credentials)
    """
    try:
        ensure_ghunt_volume()

        # Run a quick test to see if credentials exist
        client = docker.from_env()

        # Try to run a non-intrusive command that checks for auth
        container = client.containers.run(
            image="deskred-ghunt",
            command=["email", "--help"],
            volumes={GHUNT_VOLUME: {'bind': '/root/.ghunt', 'mode': 'rw'}},
            remove=False,
            detach=True
        )

        # Wait for container to finish
        result = container.wait(timeout=10)
        logs = container.logs().decode('utf-8')
        container.remove()

        # Check if logs contain session error
        is_authenticated = "No stored session found" not in logs and "Please generate a new session" not in logs

        instructions = """To authenticate GHunt:
1. Click 'Start Login Process' button below
2. Follow the instructions in the Container Output tab
3. Complete the Google authentication process
4. Once complete, click 'Recheck Auth Status'
"""

        return {
            "authenticated": is_authenticated,
            "instructions": instructions if not is_authenticated else None
        }
    except Exception as e:
        return {
            "authenticated": False,
            "instructions": f"Error checking auth status: {str(e)}"
        }

@router.post("/auth/login")
async def start_login_process():
    """
    Start the GHunt login process in an interactive container
    """
    try:
        ensure_ghunt_volume()

        # Run GHunt login command with volume mounted
        result = docker_helper.run_container_async(
            image="deskred-ghunt",
            command=["login"],
            timeout=300,  # 5 minutes for login
            volumes={GHUNT_VOLUME: {'bind': '/root/.ghunt', 'mode': 'rw'}},
            tty=True,
            stdin_open=True
        )

        if result["status"] == "error":
            return {
                "status": "error",
                "message": result["message"],
                "container_id": None
            }

        return {
            "status": "success",
            "container_id": result["container_id"],
            "container_name": result["container_name"],
            "message": "Login container started. Follow instructions in the Container Output tab."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.post("/search")
async def search_google_account(request: GHuntRequest):
    """
    Investigate Google/Gmail accounts using GHunt
    """
    try:
        ensure_ghunt_volume()

        # Run GHunt in Docker container (async mode) with credentials volume mounted
        result = docker_helper.run_container_async(
            image="deskred-ghunt",
            command=["email", request.email],
            timeout=90,
            volumes={GHUNT_VOLUME: {'bind': '/root/.ghunt', 'mode': 'rw'}}
        )

        if result["status"] == "error":
            return {
                "status": "error",
                "message": result["message"],
                "email": request.email,
                "container_id": None
            }

        return {
            "status": "success",
            "email": request.email,
            "container_id": result["container_id"],
            "container_name": result["container_name"],
            "message": "Container started - Investigating Google account..."
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
    Check if GHunt Docker image is available
    """
    exists = docker_helper.check_image_exists("deskred-ghunt")
    return {
        "installed": exists,
        "message": "Docker image available" if exists else "Run: docker-compose build ghunt"
    }
