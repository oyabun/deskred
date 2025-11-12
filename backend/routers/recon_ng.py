from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import sys
import os
import subprocess
import re

# Añadir el directorio padre al path para importar docker_helper
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from docker_helper import docker_helper

router = APIRouter()

class ReconNgRequest(BaseModel):
    workspace: str
    command: str
    timeout: Optional[int] = 120

class ModuleInstallRequest(BaseModel):
    module: str

class ModuleUninstallRequest(BaseModel):
    module: str

class SimpleScanRequest(BaseModel):
    target: str

@router.post("/scan")
async def scan_target(request: SimpleScanRequest):
    """
    Simplified scan endpoint for easy integration
    """
    # Use a default command to scan the target
    workspace = "default"
    command = f"modules load recon/domains-hosts/hackertarget; options set SOURCE {request.target}; run"

    # Delegate to run_command
    recon_request = ReconNgRequest(workspace=workspace, command=command)
    return await run_command(recon_request)

@router.post("/run")
async def run_command(request: ReconNgRequest):
    """
    Ejecuta un comando en Recon-ng dentro de un workspace
    Modo asíncrono con streaming de logs
    """
    try:
        # Construir comando para Recon-ng
        command = [
            "-w", request.workspace,
            "-c", request.command
        ]

        # Ejecutar Recon-ng en contenedor Docker (async mode)
        result = docker_helper.run_container_async(
            image="deskred-recon-ng",
            command=command,
            timeout=request.timeout
        )

        if result["status"] == "error":
            return {
                "status": "error",
                "message": result["message"],
                "workspace": request.workspace,
                "container_id": None
            }

        return {
            "status": "success",
            "workspace": request.workspace,
            "command": request.command,
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

@router.get("/modules")
async def get_installed_modules():
    """
    Obtiene la lista de módulos instalados en Recon-ng
    """
    try:
        # Ejecutar comando para listar módulos instalados
        result = subprocess.run(
            [
                "docker", "exec", "osint-recon-ng",
                "python3", "recon-ng",
                "-c", "marketplace list"
            ],
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode != 0:
            return {
                "status": "error",
                "message": "No se pudo obtener la lista de módulos",
                "modules": []
            }

        # Parsear la salida para encontrar módulos instalados
        installed_modules = []
        output_lines = result.stdout.split('\n')

        for line in output_lines:
            # Buscar líneas que contengan "*" (módulos instalados)
            if '*' in line and 'recon/' in line:
                # Extraer el nombre del módulo
                parts = line.split()
                for part in parts:
                    if 'recon/' in part:
                        installed_modules.append(part)
                        break

        return {
            "status": "success",
            "modules": installed_modules,
            "count": len(installed_modules)
        }

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Timeout al obtener módulos")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.post("/install")
async def install_module(request: ModuleInstallRequest):
    """
    Instala un módulo de Recon-ng desde el marketplace
    """
    try:
        # Ejecutar comando de instalación
        result = subprocess.run(
            [
                "docker", "exec", "osint-recon-ng",
                "python3", "recon-ng",
                "-c", f"marketplace install {request.module}"
            ],
            capture_output=True,
            text=True,
            timeout=60
        )

        if result.returncode != 0:
            return {
                "success": False,
                "module": request.module,
                "message": "Error al instalar el módulo",
                "output": result.stderr or result.stdout
            }

        return {
            "success": True,
            "module": request.module,
            "message": f"Módulo {request.module} instalado exitosamente",
            "output": result.stdout
        }

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Timeout al instalar módulo")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.post("/uninstall")
async def uninstall_module(request: ModuleUninstallRequest):
    """
    Desinstala un módulo de Recon-ng
    """
    try:
        # Ejecutar comando de desinstalación
        result = subprocess.run(
            [
                "docker", "exec", "osint-recon-ng",
                "python3", "recon-ng",
                "-c", f"marketplace remove {request.module}"
            ],
            capture_output=True,
            text=True,
            timeout=60
        )

        if result.returncode != 0:
            return {
                "success": False,
                "module": request.module,
                "message": "Error al desinstalar el módulo",
                "output": result.stderr or result.stdout
            }

        return {
            "success": True,
            "module": request.module,
            "message": f"Módulo {request.module} desinstalado exitosamente",
            "output": result.stdout
        }

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Timeout al desinstalar módulo")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.get("/status")
async def check_status():
    """
    Verifica si Recon-ng está disponible
    """
    exists = docker_helper.check_image_exists("deskred-recon-ng")

    # También verificar si el contenedor está corriendo
    container_status = None
    try:
        result = subprocess.run(
            ["docker", "ps", "--filter", "name=osint-recon-ng", "--format", "{{.Status}}"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.stdout.strip():
            container_status = "running"
        else:
            # Verificar si existe pero está parado
            result = subprocess.run(
                ["docker", "ps", "-a", "--filter", "name=osint-recon-ng", "--format", "{{.Status}}"],
                capture_output=True,
                text=True,
                timeout=5
            )
            container_status = result.stdout.strip() if result.stdout.strip() else "not_found"
    except:
        container_status = "unknown"

    return {
        "installed": exists,
        "container_status": container_status,
        "message": "Imagen Docker disponible" if exists else "Ejecuta: docker-compose build recon-ng"
    }
