"""FastAPI entry point for WinGo Signal Analyzer."""
import os
try:
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
except ImportError:
    class FastAPI:
        def __init__(self, *args, **kwargs): pass
        def add_middleware(self, *a, **kw): pass
        def include_router(self, *a, **kw): pass
        def get(self, *a, **kw): return lambda f: f
    CORSMiddleware = None

from .config.settings import settings
from .database.session import init_db
from .api.routes import router
from .api.admin import admin_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Real-time WinGo analysis, round timing synchronization, and educational signal dashboard.",
    version="1.6.0"
)

# Allow CORS for development and frontend clients
if CORSMiddleware:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.on_event("startup")
def startup_event():
    """Initialize database and seed baseline checks."""
    init_db()
    print("[WinGo Backend] Database initialized and tables ready.")

app.include_router(router)
app.include_router(admin_router)

@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "status": "ONLINE",
        "docs_url": "/docs",
        "verified_modes": ["wingo_30s", "wingo_1m", "wingo_3m", "wingo_5m"],
        "notice": "Configured HGNICE gateway is used; endpoint ownership/live verification is environment-dependent."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
