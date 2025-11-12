# DESKRED OSINT Platform - Setup Guide

## Overview
DESKRED is a retro terminal-style OSINT (Open Source Intelligence) platform that runs multiple security tools in isolated Docker containers. Each tool can be executed on-demand through a beautiful desktop interface.

## Prerequisites
- Docker and Docker Compose installed
- At least 4GB of RAM available for Docker
- Internet connection for downloading tool repositories

## Architecture
- **Frontend**: React + Vite retro terminal UI (Port 5173)
- **Backend**: FastAPI Python server (Port 8000)
- **Redis**: Caching and task queue (Port 6379)
- **OSINT Tools**: 7 containerized tools that run on-demand

## Available OSINT Tools
1. **Maigret** 🔍 - Username OSINT analysis across 3000+ sites
2. **Sherlock** 🕵️ - Hunt down social media accounts by username
3. **Holehe** 📧 - Check email accounts registered on different websites
4. **TheHarvester** 🌐 - Gather emails, subdomains, IPs, and more
5. **Recon-ng** 🛰️ - Full-featured reconnaissance framework
6. **Social Analyzer** 👤 - Analyze and find profiles across social networks
7. **SpiderFoot** 🕷️ - Automated OSINT collection tool

## Installation Steps

### 1. Create Docker Network
First, create the required Docker network:

```bash
docker network create osint-network
```

### 2. Build All Tool Images
Build all OSINT tool Docker images (this will take 10-20 minutes):

```bash
# Build all tool images at once
docker-compose build maigret sherlock holehe theharvester recon-ng social-analyzer spiderfoot

# Or build them individually if you prefer
docker-compose build maigret
docker-compose build sherlock
docker-compose build holehe
docker-compose build theharvester
docker-compose build recon-ng
docker-compose build social-analyzer
docker-compose build spiderfoot
```

### 3. Start Core Services
Start the backend, frontend, and Redis:

```bash
docker-compose up -d backend frontend redis
```

## Usage

### Access the Platform
Once all services are running, access the platform at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### Using the Interface
1. **Open Tools**: Double-click any desktop icon to open that tool's window
2. **Enter Data**: Fill in the required information (username, email, domain, etc.)
3. **Execute**: Click the action button to run the tool in a Docker container
4. **View Results**: Results will appear in the window once the container finishes
5. **Manage Windows**: Drag windows around, minimize, or close them

### How It Works
When you click a tool:
1. Frontend sends a request to the Backend API
2. Backend spawns a Docker container with the tool
3. Tool executes inside an isolated container
4. Results are captured and sent back to the frontend
5. Container is automatically removed after execution

## Development

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Backend Development
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# View running tool containers
docker ps -a | grep osint-dashboard
```

## Troubleshooting

### Tool Images Not Found
If you get "Image not found" errors:
```bash
docker-compose build [tool-name]
```

### Network Issues
If containers can't communicate:
```bash
docker network rm osint-network
docker network create osint-network
docker-compose restart
```

### Port Already in Use
If ports are occupied, modify the ports in `docker-compose.yml`:
```yaml
ports:
  - "5174:5173"  # Change 5173 to 5174 for frontend
  - "8001:8000"  # Change 8000 to 8001 for backend
```

### Clear All Data and Restart
```bash
docker-compose down -v
docker network create osint-network
docker-compose build
docker-compose up -d
```

## File Structure
```
deskred/
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   │   ├── tools/    # Tool-specific components
│   │   │   ├── Window.jsx
│   │   │   ├── MenuBar.jsx
│   │   │   └── DesktopIcon.jsx
│   │   ├── data/         # Application data
│   │   └── App.jsx       # Main application
│   └── Dockerfile
├── backend/               # FastAPI backend
│   ├── routers/          # API endpoints for each tool
│   ├── docker_helper.py  # Docker management
│   └── main.py
├── docker/               # Tool Dockerfiles
│   ├── maigret/
│   ├── sherlock/
│   ├── holehe/
│   ├── theharvester/
│   ├── recon-ng/
│   ├── social-analyzer/
│   └── spiderfoot/
└── docker-compose.yml    # Service orchestration
```

## Security Notes
- All tools run in isolated Docker containers
- Containers are removed after execution
- Results are stored in named Docker volumes
- Network isolation prevents unauthorized access
- This platform is for authorized security testing and research only

## Performance Tips
- Pre-build all tool images before first use
- Allocate at least 4GB RAM to Docker
- Use SSD storage for better container performance
- Clean up old results periodically: `docker volume prune`

## Stop the Platform
```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Next Steps
- Configure API keys for tools that require them (TheHarvester, SpiderFoot)
- Customize tool parameters in the backend routers
- Add authentication for production deployment
- Set up result persistence and export features
