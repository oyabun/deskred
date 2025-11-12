from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import sys
import os

# Añadir el directorio padre al path para importar docker_helper
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from docker_helper import docker_helper

router = APIRouter()

class SocialAnalyzerRequest(BaseModel):
    username: str
    # Configuration options
    mode: Optional[str] = "fast"
    metadata: Optional[bool] = True
    extract: Optional[bool] = True
    screenshots: Optional[bool] = False
    websites: Optional[str] = None  # Specific websites, space-separated
    output: Optional[str] = "json"
    method: Optional[str] = "find"
    filter: Optional[str] = "good"

@router.post("/")
async def analyze_profile(request: SocialAnalyzerRequest):
    """
    Analiza perfiles de redes sociales usando Social-Analyzer (via Docker)
    Modo asíncrono con streaming de logs
    """
    try:
        # Construir comando
        command = [
            "--username", request.username,
            "--output", request.output,
            "--method", request.method,
            "--filter", request.filter,
        ]

        # Modo de análisis
        if request.mode == "fast":
            command.extend(["--mode", "fast"])
        elif request.mode == "deep":
            command.extend(["--mode", "slow"])

        # Opciones adicionales
        if request.metadata:
            command.append("--metadata")

        if request.extract:
            command.append("--extract")

        if request.screenshots:
            command.append("--screenshots")
            command.append("--logs")  # Screenshots require logs

        # Sitios específicos
        if request.websites:
            command.extend(["--websites", request.websites])

        # Simplificar salida
        command.append("--trim")

        # Timeout dinámico basado en modo
        timeout = 180 if request.mode == "deep" else 120

        # Ejecutar Social-Analyzer en contenedor Docker (async mode)
        result = docker_helper.run_container_async(
            image="deskred-social-analyzer",
            command=command,
            timeout=timeout
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
            "command": " ".join(command),
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
    Verifica si Social-Analyzer está disponible (imagen Docker)
    """
    exists = docker_helper.check_image_exists("deskred-social-analyzer")
    return {
        "installed": exists,
        "message": "Imagen Docker disponible" if exists else "Ejecuta: docker-compose build social-analyzer"
    }

@router.get("/websites")
async def list_websites():
    """
    Lista todos los sitios web disponibles para análisis
    """
    try:
        # Ejecutar comando para listar sitios web
        result = docker_helper.run_container(
            image="deskred-social-analyzer",
            command=["--list"],
            timeout=30
        )

        if result["status"] == "error":
            return {
                "status": "error",
                "message": "No se pudo obtener la lista de sitios web",
                "websites": []
            }

        return {
            "status": "success",
            "raw_output": result["output"],
            "message": "Lista de sitios web obtenida"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
