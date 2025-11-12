from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from docker_helper import docker_helper

router = APIRouter()

class HoleheRequest(BaseModel):
    email: EmailStr

@router.post("/search")
async def search_email(request: HoleheRequest):
    """
    Busca un email en múltiples servicios usando Holehe (via Docker)
    Modo asíncrono con streaming de logs
    """
    try:
        # Ejecutar Holehe en contenedor Docker (async mode)
        result = docker_helper.run_container_async(
            image="deskred-holehe",
            command=[request.email],
            timeout=60
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
    Verifica si Holehe está disponible (imagen Docker)
    """
    exists = docker_helper.check_image_exists("deskred-holehe")
    return {
        "installed": exists,
        "message": "Imagen Docker disponible" if exists else "Ejecuta: docker-compose build holehe"
    }
