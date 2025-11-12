from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import sys
import os

# Añadir el directorio padre al path para importar docker_helper
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from docker_helper import docker_helper

router = APIRouter()

class HarvesterRequest(BaseModel):
    domain: str
    source: Optional[str] = "all"  # google, bing, baidu, duckduckgo, etc.
    limit: Optional[int] = 500  # Límite de resultados

@router.post("/search")
async def search_domain(request: HarvesterRequest):
    """
    Recopila información de un dominio usando TheHarvester (via Docker)
    Modo asíncrono con streaming de logs
    """
    try:
        # Construir comando para TheHarvester
        command = [
            "-d", request.domain,
            "-b", request.source,
            "-l", str(request.limit)
        ]

        # Ejecutar TheHarvester en contenedor Docker (async mode)
        result = docker_helper.run_container_async(
            image="deskred-harvester",
            command=command,
            timeout=180  # 3 minutos timeout
        )

        if result["status"] == "error":
            return {
                "status": "error",
                "message": result["message"],
                "domain": request.domain,
                "container_id": None
            }

        return {
            "status": "success",
            "domain": request.domain,
            "source": request.source,
            "container_id": result["container_id"],
            "container_name": result["container_name"],
            "command": f"theHarvester {' '.join(command)}",
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
    Verifica si TheHarvester está disponible (imagen Docker)
    """
    exists = docker_helper.check_image_exists("deskred-harvester")
    return {
        "installed": exists,
        "message": "Imagen Docker disponible" if exists else "Ejecuta: docker-compose build harvester"
    }
