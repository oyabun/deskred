from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from docker_helper import docker_helper

router = APIRouter()

class GoSearchRequest(BaseModel):
    username: str
    breach_api_key: Optional[str] = None
    no_false_positives: Optional[bool] = False

@router.post("/search")
async def search_user(request: GoSearchRequest):
    """
    Busca un usuario usando GoSearch (via Docker)
    Modo asíncrono con streaming de logs
    """
    try:
        # Construir comando
        command = ["-u", request.username]

        # Agregar flag de no false positives
        if request.no_false_positives:
            command.append("--no-false-positives")

        # Agregar API key de BreachDirectory si se proporciona
        if request.breach_api_key:
            command.extend(["-b", request.breach_api_key])

        # Ejecutar GoSearch en contenedor Docker (async mode)
        result = docker_helper.run_container_async(
            image="deskred-gosearch",
            command=command,
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
            "message": "Container started"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.get("/logs/{container_id}")
async def get_container_logs(container_id: str):
    """
    Obtiene los logs de un contenedor en ejecución
    """
    try:
        result = docker_helper.get_container_logs(container_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.get("/status")
async def check_status():
    """
    Verifica si GoSearch está disponible (imagen Docker)
    """
    exists = docker_helper.check_image_exists("deskred-gosearch")
    return {
        "installed": exists,
        "message": "Imagen Docker disponible" if exists else "Ejecuta: docker compose build gosearch"
    }
