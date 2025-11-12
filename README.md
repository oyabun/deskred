# DESKRED

> **D**ocker **E**xecution **S**ystem for **K**nowledge **R**etrieval and **E**numeration **D**ata

A retro terminal-style OSINT desktop interface for running containerized security and intelligence gathering tools.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Docker-blue.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

## Features

- 🖥️ **Retro Terminal Aesthetic** - CRT-style UI with red/black color scheme
- 🪟 **Desktop Interface** - Draggable, resizable windows with focus management
- 🔄 **Real-time Log Streaming** - Watch tool execution output live
- 🐳 **Containerized Tools** - Each OSINT tool runs in isolated Docker containers
- 💾 **Persistent Layout** - Icon positions saved to localStorage
- 📊 **Dual-tab Interface** - Application controls and container output views
- 🎯 **9 Integrated Tools** - Pre-configured OSINT tools ready to use

## Integrated OSINT Tools

| Tool | Icon | Description |
|------|------|-------------|
| **Maigret** | 🔍 | Username OSINT analysis across 3000+ websites |
| **Sherlock** | 👤 | Hunt down social media accounts by username |
| **Holehe** | 📧 | Check which websites an email is registered on |
| **TheHarvester** | 🌐 | Gather emails, subdomains, IPs, and URLs |
| **Recon-ng** | 📡 | Full-featured reconnaissance framework |
| **Social Analyzer** | 👥 | Profile analysis across social networks |
| **SpiderFoot** | 🕷️ | Automated OSINT collection and correlation |
| **Digital Footprint** | 👣 | Track digital presence across 18+ platforms |
| **GoSearch** | ⚡ | Fast username search with breach data (300+ sites) |

## Architecture

```
┌─────────────────────────────────────────────┐
│         Frontend (React + Vite)             │
│  - Retro terminal UI with Lucide icons     │
│  - Real-time log streaming                 │
│  - Drag-and-drop interface                 │
└─────────────┬───────────────────────────────┘
              │ HTTP/WebSocket
┌─────────────▼───────────────────────────────┐
│         Backend (FastAPI)                   │
│  - Docker SDK integration                   │
│  - Container lifecycle management          │
│  - Log streaming & aggregation             │
└─────────────┬───────────────────────────────┘
              │ Docker API
┌─────────────▼───────────────────────────────┐
│    Containerized OSINT Tools                │
│  🐳 Maigret    🐳 Sherlock   🐳 Holehe     │
│  🐳 Harvester  🐳 Recon-ng   🐳 Analyzer   │
│  🐳 SpiderFoot 🐳 Footprint  🐳 GoSearch   │
└─────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for frontend development)
- Python 3.11+ (for backend development)
- 4GB+ RAM recommended

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/oyabun/deskred.git
   cd deskred
   ```

2. **Create the Docker network**
   ```bash
   docker network create osint-network
   ```

3. **Build tool images**
   ```bash
   docker compose --profile tools build
   ```
   Or use the build script:
   ```bash
   ./build-tools.sh
   ```

4. **Start the application**
   ```bash
   docker compose up -d
   ```

5. **Access the interface**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## Usage

### Using the Desktop Interface

1. **Open a tool** - Double-click any desktop icon
2. **Enter search parameters** - Fill in the target (username, email, domain)
3. **Execute** - Click the action button to start the container
4. **View logs** - Switch to "Container Output" tab to see real-time execution
5. **Analyze results** - Results are parsed and displayed with clickable links

### Drag-and-Drop Icons

- Click and drag icons to reorder them
- Your layout is automatically saved
- Refresh the page to see your custom layout restored

### Window Management

- **Drag** windows by their title bar
- **Resize** by dragging window edges
- **Minimize** to hide temporarily
- **Close** to remove the window
- Click any window to bring it to focus

## Development

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at http://localhost:5173 with hot-reload enabled.

### Backend Development

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

The API will be available at http://localhost:8000.

### Project Structure

```
deskred/
├── frontend/              # React + Vite frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── data/         # Application configs
│   │   └── App.jsx       # Main application
│   └── package.json
├── backend/              # FastAPI backend
│   ├── routers/         # API endpoints
│   ├── docker_helper.py # Docker integration
│   ├── main.py          # Application entry
│   └── requirements.txt
├── docker/              # Tool Dockerfiles
│   ├── maigret/
│   ├── sherlock/
│   └── ...
└── docker-compose.yml   # Service orchestration
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Backend
PYTHONUNBUFFERED=1
DOCKER_HOST=unix:///var/run/docker.sock

# Frontend
VITE_API_URL=http://localhost:8000

# Redis
REDIS_URL=redis://localhost:6379
```

### Adding New Tools

1. Create a Dockerfile in `docker/toolname/`
2. Add the tool to `docker-compose.yml`
3. Create a router in `backend/routers/toolname.py`
4. Add tool config to `frontend/src/data/applications.js`
5. Build and test

See [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for detailed implementation notes.

## API Documentation

Interactive API documentation is available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Key Endpoints

- `POST /api/{tool}/search` - Execute OSINT tool
- `GET /api/{tool}/logs/{container_id}` - Stream container logs
- `GET /health` - Health check endpoint

## Troubleshooting

### Container Permission Issues

If you encounter Docker socket permission errors:

```bash
sudo chmod 666 /var/run/docker.sock
```

Or add your user to the docker group:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

### Port Conflicts

If ports 5173 or 8000 are in use, modify the ports in `docker-compose.yml`:

```yaml
ports:
  - "YOUR_PORT:5173"  # Frontend
  - "YOUR_PORT:8000"  # Backend
```

### Build Failures

Clean Docker cache and rebuild:

```bash
docker compose down -v
docker system prune -a
docker compose build --no-cache
```

## Security Considerations

- Tools run in isolated Docker containers
- No persistent storage of sensitive data by default
- API has no authentication (add reverse proxy for production)
- Results are stored temporarily in mounted volumes
- Consider network isolation for production deployments

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- All OSINT tool developers for their incredible work
- Lucide for the beautiful icon library
- FastAPI and React communities
- Docker for containerization technology

## Disclaimer

⚠️ **IMPORTANT**: This tool is for educational and authorized security testing purposes only. Always obtain proper authorization before conducting OSINT activities. Users are responsible for complying with applicable laws and regulations.

## Links

- 📖 [Full Setup Guide](SETUP.md)
- 📋 [Implementation Details](IMPLEMENTATION_SUMMARY.md)
- 🐛 [Report Issues](https://github.com/oyabun/deskred/issues)
- 💬 [Discussions](https://github.com/oyabun/deskred/discussions)

---

**Built with** ❤️ **using Claude Code**

🤖 Generated with [Claude Code](https://claude.com/claude-code)
