from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import maigret, spiderfoot, holehe, harvester, sherlock, recon_ng, social_analyzer, logs, digitalfootprint, gosearch

app = FastAPI(
    title="OSINT Dashboard API",
    description="API Backend para herramientas OSINT",
    version="1.0.0"
)

# Configurar CORS para permitir peticiones desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",  # Vite dev server
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(maigret.router, prefix="/api/maigret", tags=["Maigret"])
app.include_router(spiderfoot.router, prefix="/api/spiderfoot", tags=["SpiderFoot"])
app.include_router(holehe.router, prefix="/api/holehe", tags=["Holehe"])
app.include_router(harvester.router, prefix="/api/harvester", tags=["TheHarvester"])
app.include_router(sherlock.router, prefix="/api/sherlock", tags=["Sherlock"])
app.include_router(recon_ng.router, prefix="/api/recon-ng", tags=["Recon-ng"])
app.include_router(social_analyzer.router, prefix="/api/social-analyzer", tags=["Social-Analyzer"])
app.include_router(digitalfootprint.router, prefix="/api/digitalfootprint", tags=["DigitalFootprint"])
app.include_router(gosearch.router, prefix="/api/gosearch", tags=["GoSearch"])
app.include_router(logs.router, prefix="/api/logs", tags=["Logs"])

@app.get("/")
async def root():
    return {
        "message": "OSINT Dashboard API",
        "version": "1.0.0",
        "tools": ["maigret", "spiderfoot", "holehe", "harvester", "sherlock", "recon-ng", "social-analyzer", "digitalfootprint", "gosearch"]
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
