import docker
from typing import Optional, Dict
import logging
import uuid
import time
import threading
import redis

logger = logging.getLogger(__name__)

# Redis client for log storage
try:
    redis_client = redis.Redis(host='redis', port=6379, db=0, decode_responses=False)
except Exception as e:
    logger.warning(f"Redis not available for log storage: {e}")
    redis_client = None

# Store for running containers
running_containers = {}

def monitor_and_cleanup_container(container_id: str, docker_client, auto_remove: bool):
    """
    Background thread that monitors a container and captures logs before removal.
    This ensures logs are available even after the container is removed.
    """
    try:
        # Wait a bit to ensure container info is set
        time.sleep(0.5)

        if container_id not in running_containers:
            logger.warning(f"Container {container_id} not in tracking dict")
            return

        container = running_containers[container_id]["container"]

        # Wait for container to finish (with timeout)
        max_wait = 600  # 10 minutes max
        start_time = time.time()

        while time.time() - start_time < max_wait:
            try:
                container.reload()
                status = container.status

                if status in ['exited', 'dead', 'stopped']:
                    # Container finished - capture logs before removal
                    try:
                        logs = container.logs(timestamps=True).decode('utf-8', errors='replace')

                        # Store logs in Redis with 24 hour expiry
                        if redis_client:
                            log_key = f"container:{container_id}:logs"
                            redis_client.setex(log_key, 86400, logs.encode('utf-8'))  # 24 hours
                            logger.info(f"Stored logs for {container_id} in Redis")

                        # Store final status
                        if redis_client:
                            status_key = f"container:{container_id}:status"
                            redis_client.setex(status_key, 86400, status.encode('utf-8'))
                    except Exception as e:
                        logger.error(f"Failed to capture logs for {container_id}: {e}")

                    # Remove from tracking
                    if container_id in running_containers:
                        del running_containers[container_id]

                    # Remove container if auto_remove was requested
                    if auto_remove:
                        try:
                            container.remove()
                            logger.info(f"Removed container {container_id}")
                        except Exception as e:
                            logger.warning(f"Failed to remove container {container_id}: {e}")

                    break

            except docker.errors.NotFound:
                # Container already removed
                logger.warning(f"Container {container_id} not found during monitoring")
                if container_id in running_containers:
                    del running_containers[container_id]
                break
            except Exception as e:
                logger.error(f"Error monitoring container {container_id}: {e}")
                break

            # Check every second
            time.sleep(1)

    except Exception as e:
        logger.error(f"Monitor thread failed for {container_id}: {e}")

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
        auto_remove: bool = True,
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
            # NOTE: We always use remove=False and handle cleanup ourselves
            # This ensures we can capture logs before removal
            container = self.client.containers.run(
                image=image,
                command=command,
                name=container_name,
                detach=True,
                stdout=True,
                stderr=True,
                remove=False,  # Never auto-remove, we handle cleanup ourselves
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

            # Start background monitoring thread for cleanup
            monitor_thread = threading.Thread(
                target=monitor_and_cleanup_container,
                args=(container.id, self.client, auto_remove),
                daemon=True
            )
            monitor_thread.start()

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
        Obtiene los logs de un contenedor en ejecución o desde Redis si ya fue removido

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
            # First, try to get from running container
            container = None

            if container_id in running_containers:
                container = running_containers[container_id]["container"]
                container.reload()  # Refresh container state
            else:
                # Try to get container directly from Docker
                try:
                    container = self.client.containers.get(container_id)
                except docker.errors.NotFound:
                    # Container not found in Docker, check Redis for cached logs
                    if redis_client:
                        try:
                            log_key = f"container:{container_id}:logs"
                            status_key = f"container:{container_id}:status"

                            cached_logs = redis_client.get(log_key)
                            cached_status = redis_client.get(status_key)

                            if cached_logs:
                                logs_str = cached_logs.decode('utf-8', errors='replace')
                                status_str = cached_status.decode('utf-8', errors='replace') if cached_status else 'completed'

                                return {
                                    "status": "success",
                                    "logs": logs_str,
                                    "container_status": status_str,
                                    "message": "Logs retrieved from cache"
                                }
                        except Exception as e:
                            logger.warning(f"Failed to retrieve cached logs for {container_id}: {e}")

                    # No cached logs available
                    return {
                        "status": "error",
                        "message": "Container not found and no cached logs available",
                        "logs": "",
                        "container_status": "not_found"
                    }

            # Container exists, get logs directly
            if since > 0:
                logs = container.logs(since=since, timestamps=True).decode('utf-8', errors='replace')
            else:
                logs = container.logs(timestamps=True).decode('utf-8', errors='replace')

            # Get container status
            status = container.status

            # Note: Cleanup is now handled by the background monitoring thread
            # We don't need to manually remove containers here anymore

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
