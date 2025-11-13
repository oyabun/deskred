import docker
from typing import Optional, Dict
import logging
import uuid
import time

logger = logging.getLogger(__name__)

# Store for running containers
running_containers = {}

class DockerHelper:
    """Helper class para ejecutar contenedores Docker de herramientas OSINT"""

    def __init__(self):
        try:
            self.client = docker.from_env()
        except Exception as e:
            logger.error(f"No se pudo conectar a Docker: {e}")
            self.client = None

    def run_container_async(
        self,
        image: str,
        command: list,
        timeout: int = 120,
        auto_remove: bool = False,
        volumes: Optional[Dict] = None,
        tty: bool = False,
        stdin_open: bool = False
    ) -> Dict[str, str]:
        """
        Ejecuta un contenedor Docker en modo detached y retorna el container_id
        para poder hacer streaming de logs

        Args:
            image: Nombre de la imagen (ej: "deskred-maigret")
            command: Comando a ejecutar como lista
            timeout: Timeout en segundos
            auto_remove: Si True, el contenedor se elimina automáticamente al finalizar
            volumes: Dict de volúmenes adicionales a montar (opcional)
            tty: Allocate a pseudo-TTY
            stdin_open: Keep STDIN open

        Returns:
            Dict con status, container_id y message
        """
        if not self.client:
            return {
                "status": "error",
                "message": "Docker no está disponible",
                "container_id": None
            }

        try:
            # Generate unique container name
            container_name = f"{image}-{uuid.uuid4().hex[:8]}"

            # Build volumes dict - start with default results volume
            container_volumes = {
                f"{image.replace('deskred-', '')}_results": {
                    'bind': '/results',
                    'mode': 'rw'
                }
            }

            # Add additional volumes if provided
            if volumes:
                container_volumes.update(volumes)

            # Ejecutar contenedor en detached mode
            container = self.client.containers.run(
                image=image,
                command=command,
                name=container_name,
                detach=True,
                stdout=True,
                stderr=True,
                remove=auto_remove,  # Auto-remove when done (configurable)
                network="osint-network",
                volumes=container_volumes,
                tty=tty,
                stdin_open=stdin_open
            )

            # Store container info
            running_containers[container.id] = {
                "container": container,
                "image": image,
                "started_at": time.time(),
                "name": container_name,
                "auto_remove": auto_remove
            }

            return {
                "status": "success",
                "container_id": container.id,
                "container_name": container_name,
                "message": "Container started"
            }

        except docker.errors.ImageNotFound:
            return {
                "status": "error",
                "message": f"Imagen {image} no encontrada. Ejecuta: docker compose build",
                "container_id": None
            }

        except Exception as e:
            logger.error(f"Error inesperado: {e}")
            return {
                "status": "error",
                "message": f"Error: {str(e)}",
                "container_id": None
            }

    def get_container_logs(self, container_id: str, since: int = 0) -> Dict[str, any]:
        """
        Obtiene los logs de un contenedor en ejecución

        Args:
            container_id: ID del contenedor
            since: Timestamp desde cuando obtener logs (0 = todos)

        Returns:
            Dict con status, logs y container status
        """
        if not self.client:
            return {
                "status": "error",
                "message": "Docker no está disponible",
                "logs": "",
                "container_status": "unknown"
            }

        try:
            if container_id not in running_containers:
                # Try to get container directly from Docker
                try:
                    container = self.client.containers.get(container_id)
                except docker.errors.NotFound:
                    return {
                        "status": "error",
                        "message": "Container not found",
                        "logs": "",
                        "container_status": "not_found"
                    }
            else:
                container = running_containers[container_id]["container"]
                container.reload()  # Refresh container state

            # Get logs
            if since > 0:
                logs = container.logs(since=since, timestamps=True).decode('utf-8', errors='replace')
            else:
                logs = container.logs(timestamps=True).decode('utf-8', errors='replace')

            # Get container status
            status = container.status

            # Clean up if container is done AND was marked for auto-removal
            if status in ['exited', 'dead']:
                # Only remove container if it was started with auto_remove=True
                should_remove = False
                if container_id in running_containers:
                    should_remove = running_containers[container_id].get("auto_remove", False)
                    # Always remove from tracking dict
                    del running_containers[container_id]

                # Remove the actual container only if auto_remove was True
                if should_remove:
                    try:
                        container.remove()
                    except Exception as e:
                        logger.warning(f"Failed to remove container {container_id}: {e}")

            return {
                "status": "success",
                "logs": logs,
                "container_status": status,
                "message": "Logs retrieved"
            }

        except Exception as e:
            logger.error(f"Error getting logs: {e}")
            return {
                "status": "error",
                "message": f"Error: {str(e)}",
                "logs": "",
                "container_status": "error"
            }

    def run_container(
        self,
        image: str,
        command: list,
        remove: bool = True,
        timeout: int = 120
    ) -> Dict[str, str]:
        """
        Ejecuta un contenedor Docker y retorna el output (modo sincrónico)
        Mantiene compatibilidad con código existente

        Args:
            image: Nombre de la imagen (ej: "osint-maigret")
            command: Comando a ejecutar como lista
            remove: Si debe eliminar el contenedor después de ejecutar
            timeout: Timeout en segundos

        Returns:
            Dict con status y output
        """
        if not self.client:
            return {
                "status": "error",
                "message": "Docker no está disponible",
                "output": ""
            }

        try:
            # Ejecutar contenedor
            container = self.client.containers.run(
                image=image,
                command=command,
                remove=remove,
                detach=False,
                stdout=True,
                stderr=True,
                network="osint-network",
                volumes={
                    f"{image.replace('deskred-', '')}_results": {
                        'bind': '/results',
                        'mode': 'rw'
                    }
                }
            )

            # Decodificar output
            output = container.decode('utf-8') if isinstance(container, bytes) else str(container)

            return {
                "status": "success",
                "output": output,
                "message": "Ejecución completada"
            }

        except docker.errors.ContainerError as e:
            logger.error(f"Error en contenedor: {e}")
            return {
                "status": "error",
                "message": f"Error en contenedor: {str(e)}",
                "output": e.stderr.decode('utf-8') if e.stderr else ""
            }

        except docker.errors.ImageNotFound:
            return {
                "status": "error",
                "message": f"Imagen {image} no encontrada. Ejecuta: docker compose build",
                "output": ""
            }

        except Exception as e:
            logger.error(f"Error inesperado: {e}")
            return {
                "status": "error",
                "message": f"Error: {str(e)}",
                "output": ""
            }

    def check_image_exists(self, image: str) -> bool:
        """Verifica si una imagen Docker existe"""
        if not self.client:
            return False

        try:
            self.client.images.get(image)
            return True
        except docker.errors.ImageNotFound:
            return False

    def get_container_status(self, container_name: str) -> Optional[str]:
        """Obtiene el estado de un contenedor"""
        if not self.client:
            return None

        try:
            container = self.client.containers.get(container_name)
            return container.status
        except docker.errors.NotFound:
            return None


# Instancia global
docker_helper = DockerHelper()
