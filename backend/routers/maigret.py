from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import sys
import os

# Añadir el directorio padre al path para importar docker_helper
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from docker_helper import docker_helper

router = APIRouter()

class MaigretRequest(BaseModel):
    username: str
    # Configuración básica
    timeout: Optional[int] = 30
    tags: Optional[List[str]] = None

    # Opciones de búsqueda
    parse_url: Optional[str] = None
    print_not_found: Optional[bool] = False
    no_recursion: Optional[bool] = False
    print_errors: Optional[bool] = False
    use_disabled_sites: Optional[bool] = False

    # Reportes
    pdf: Optional[bool] = False
    html: Optional[bool] = False
    xmind: Optional[bool] = False
    csv: Optional[bool] = False

    # Debugging
    info: Optional[bool] = False
    verbose: Optional[bool] = False
    debug: Optional[bool] = False

@router.post("/search")
async def search_user(request: MaigretRequest):
    """
    Busca un usuario en múltiples redes sociales usando Maigret (via Docker)
    Modo asíncrono con streaming de logs
    """
    try:
        # Construir comando con flags
        command = [request.username]

        # Timeout
        command.extend(["--timeout", str(request.timeout)])

        # Tags
        if request.tags:
            for tag in request.tags:
                command.extend(["--tags", tag])

        # Parse URL
        if request.parse_url:
            command.extend(["--parse", request.parse_url])

        # Opciones de búsqueda
        if request.print_not_found:
            command.append("--print-not-found")
        if request.no_recursion:
            command.append("--no-recursion")
        if request.print_errors:
            command.append("--print-errors")
        if request.use_disabled_sites:
            command.append("--use-disabled-sites")

        # Reportes
        if request.pdf:
            command.append("--pdf")
        if request.html:
            command.append("--html")
        if request.xmind:
            command.append("--xmind")
        if request.csv:
            command.append("--csv")

        # Debugging
        if request.debug:
            command.append("--debug")
        elif request.verbose:
            command.append("--verbose")
        elif request.info:
            command.append("--info")

        # Calcular timeout dinámico basado en el timeout de Maigret
        docker_timeout = max(request.timeout + 30, 60)

        # Ejecutar Maigret en contenedor Docker (async mode)
        result = docker_helper.run_container_async(
            image="deskred-maigret",
            command=command,
            timeout=docker_timeout
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
            "command": " ".join(command),  # Para debugging
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
    Verifica si Maigret está disponible (imagen Docker)
    """
    exists = docker_helper.check_image_exists("deskred-maigret")
    return {
        "installed": exists,
        "message": "Imagen Docker disponible" if exists else "Ejecuta: docker-compose build maigret"
    }
