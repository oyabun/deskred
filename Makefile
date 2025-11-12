.PHONY: help build up down restart logs clean

help:
	@echo "OSINT Dashboard - Docker Compose Commands"
	@echo ""
	@echo "Available commands:"
	@echo "  make build    - Build all Docker images"
	@echo "  make up       - Start all services"
	@echo "  make down     - Stop all services"
	@echo "  make restart  - Restart all services"
	@echo "  make logs     - View logs from all services"
	@echo "  make clean    - Remove all containers, networks, and volumes"
	@echo "  make backend-logs - View backend logs"
	@echo "  make redis-logs   - View redis logs"

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

restart:
	docker-compose restart

logs:
	docker-compose logs -f

backend-logs:
	docker-compose logs -f backend

redis-logs:
	docker-compose logs -f redis

clean:
	docker-compose down -v --remove-orphans
	docker network prune -f
	docker volume prune -f

status:
	docker-compose ps

shell-backend:
	docker-compose exec backend /bin/bash

shell-redis:
	docker-compose exec redis redis-cli
