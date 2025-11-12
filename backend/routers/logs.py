from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import subprocess
from typing import List, Dict, Optional

router = APIRouter()

class ClearLogsRequest(BaseModel):
    container: str

# Lista de contenedores del sistema
CONTAINERS = [
    "osint-backend",
    "osint-maigret",
    "osint-holehe",
    "osint-sherlock",
    "osint-harvester",
    "osint-spiderfoot",
    "osint-social-analyzer",
    "osint-h8mail",
    "osint-recon-ng",
]

def get_container_status(container_name: str) -> str:
    """Obtiene el estado de un contenedor"""
    try:
        result = subprocess.run(
            ["docker", "inspect", "-f", "{{.State.Status}}", container_name],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            return result.stdout.strip()
        return "not_found"
    except:
        return "unknown"

def get_container_logs(container_name: str, lines: int = 100) -> str:
    """Obtiene los logs de un contenedor"""
    try:
        result = subprocess.run(
            ["docker", "logs", "--tail", str(lines), container_name],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            # Combinar stdout y stderr
            logs = result.stdout
            if result.stderr:
                logs += "\n" + result.stderr
            return logs
        return f"Error al obtener logs del contenedor {container_name}"
    except subprocess.TimeoutExpired:
        return f"Timeout al obtener logs de {container_name}"
    except Exception as e:
        return f"Error: {str(e)}"

@router.get("/")
async def get_all_logs():
    """
    Obtiene los logs de todos los contenedores del sistema
    """
    try:
        containers_data = []

        for container_name in CONTAINERS:
            status = get_container_status(container_name)
            logs = ""

            # Solo obtener logs si el contenedor existe
            if status != "not_found":
                logs = get_container_logs(container_name)

            containers_data.append({
                "name": container_name,
                "status": status,
                "logs": logs
            })

        return {
            "status": "success",
            "containers": containers_data,
            "count": len(containers_data)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener logs: {str(e)}")

@router.get("/{container_name}")
async def get_container_logs_endpoint(container_name: str, lines: int = 100):
    """
    Obtiene los logs de un contenedor específico
    """
    try:
        if container_name not in CONTAINERS:
            raise HTTPException(status_code=404, detail=f"Contenedor {container_name} no encontrado")

        status = get_container_status(container_name)
        logs = ""

        if status != "not_found":
            logs = get_container_logs(container_name, lines)

        return {
            "status": "success",
            "container": container_name,
            "container_status": status,
            "logs": logs
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.post("/clear")
async def clear_container_logs(request: ClearLogsRequest):
    """
    Limpia los logs de un contenedor (reinicia el contenedor)
    Nota: Docker no permite limpiar logs directamente,
    esta función reinicia el contenedor para generar nuevos logs
    """
    try:
        if request.container not in CONTAINERS:
            raise HTTPException(status_code=404, detail=f"Contenedor {request.container} no encontrado")

        # Verificar si el contenedor existe
        status = get_container_status(request.container)
        if status == "not_found":
            raise HTTPException(status_code=404, detail=f"Contenedor {request.container} no existe")

        # Nota: En producción, podrías querer usar truncate en el archivo de logs
        # Por ahora retornamos un mensaje informativo
        return {
            "status": "info",
            "message": f"Para limpiar logs de {request.container}, considera reiniciar el contenedor con: docker-compose restart {request.container.replace('osint-', '')}",
            "container": request.container
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.get("/status/all")
async def get_all_containers_status():
    """
    Obtiene el estado de todos los contenedores
    """
    try:
        containers_status = []

        for container_name in CONTAINERS:
            status = get_container_status(container_name)
            containers_status.append({
                "name": container_name,
                "status": status
            })

        return {
            "status": "success",
            "containers": containers_status,
            "running": sum(1 for c in containers_status if c["status"] == "running"),
            "total": len(containers_status)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
