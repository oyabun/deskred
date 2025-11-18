from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import sys
import os

# Añadir el directorio padre al path para importar docker_helper
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from docker_helper import docker_helper

router = APIRouter()

class SpiderFootRequest(BaseModel):
    target: str
    # Configuración básica
    target_type: Optional[str] = "DOMAIN"  # DOMAIN, IP_ADDRESS, EMAILADDR, HUMAN_NAME, etc.
    scan_name: Optional[str] = None

    # Módulos
    modules: Optional[List[str]] = None  # Lista de módulos a ejecutar
    module_types: Optional[List[str]] = None  # Tipos de módulos: passive, active, etc.

    # Opciones de escaneo
    max_threads: Optional[int] = 10
    timeout: Optional[int] = 60

    # Output
    output_format: Optional[str] = "json"  # json, csv, html

    # Opciones avanzadas
    recursive: Optional[bool] = True
    correlate: Optional[bool] = True
    debug: Optional[bool] = False

@router.post("/search")
async def search_target(request: SpiderFootRequest):
    """
    Escanea un objetivo usando SpiderFoot (via Docker CLI mode)
    Modo asíncrono con streaming de logs
    """
    try:
        # Construir comando
        # Note: ENTRYPOINT is already set to "python sf.py" in Dockerfile
        # So we only need to pass the actual arguments
        command = []

        # Modo scan (no web UI)
        command.extend(["-s", request.target])

        # Tipo de objetivo
        command.extend(["-t", request.target_type])

        # Módulos específicos
        if request.modules:
            command.extend(["-m", ",".join(request.modules)])
        # Si no hay módulos específicos, necesitamos especificar tipos de módulos
        else:
            # Tipos de módulos (use flag -u, not -T)
            if request.module_types:
                # SpiderFoot acepta: all, footprint, investigate, passive
                # Mapear nuestros valores a los esperados
                valid_types = []
                for t in request.module_types:
                    t_lower = t.lower()
                    if t_lower in ["all", "footprint", "investigate", "passive"]:
                        valid_types.append(t_lower)
                if valid_types:
                    command.extend(["-u", ",".join(valid_types)])
                else:
                    # Si no hay tipos válidos, usar 'all' por defecto
                    command.extend(["-u", "all"])
            else:
                # Si no se especifican ni módulos ni tipos, usar 'all' por defecto
                command.extend(["-u", "all"])

        # Max threads (use -max-threads, not -x)
        if request.max_threads:
            command.extend(["-max-threads", str(request.max_threads)])

        # Debug
        if request.debug:
            command.append("-d")

        # Output format (only tab, csv, json are supported)
        output_format = request.output_format
        if output_format not in ["tab", "csv", "json"]:
            output_format = "json"  # Default to json if invalid
        command.extend(["-o", output_format])

        # Note: SpiderFoot CLI doesn't support scan_name, correlate, or recursive flags
        # These are web UI features only

        # Calcular timeout
        docker_timeout = max(request.timeout + 30, 120)

        # Ejecutar SpiderFoot en contenedor Docker (async mode)
        result = docker_helper.run_container_async(
            image="deskred-spiderfoot",
            command=command,
            timeout=docker_timeout
        )

        if result["status"] == "error":
            return {
                "status": "error",
                "message": result["message"],
                "target": request.target,
                "container_id": None
            }

        return {
            "status": "success",
            "target": request.target,
            "target_type": request.target_type,
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
    Verifica si SpiderFoot está disponible (imagen Docker)
    """
    exists = docker_helper.check_image_exists("deskred-spiderfoot")
    return {
        "installed": exists,
        "message": "Imagen Docker disponible" if exists else "Ejecuta: docker-compose build spiderfoot"
    }
