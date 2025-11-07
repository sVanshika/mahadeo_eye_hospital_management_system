from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import socketio
from contextlib import asynccontextmanager
import uvicorn
from dotenv import load_dotenv
import os
from pathlib import Path

from database_sqlite import engine, Base
from routers import auth, patients, opd, admin, display, printing, opd_management
from websocket_manager import sio

load_dotenv()

# Create database tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown

app = FastAPI(
    title="Eye Hospital Patient Management System",
    description="Real-time queue and patient flow management system",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware - Allow all origins for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=False,  # Must be False when using wildcard
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(patients.router, prefix="/api/patients", tags=["patients"])
app.include_router(opd.router, prefix="/api/opd", tags=["opd"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(display.router, prefix="/api/display", tags=["display"])
app.include_router(printing.router, prefix="/api/printing", tags=["printing"])
app.include_router(opd_management.router, prefix="/api/opd-management", tags=["opd-management"])

# Mount Socket.IO
app.mount("/socket.io", socketio.ASGIApp(sio))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Serve React frontend static files (only if build directory exists)
frontend_build_dir = Path(__file__).parent.parent / "frontend" / "build"
if frontend_build_dir.exists():
    # Mount static files
    app.mount("/static", StaticFiles(directory=str(frontend_build_dir / "static")), name="static")
    
    # Catch-all route to serve React app (must be last)
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # If path doesn't start with /api or /socket.io, serve index.html
        if not full_path.startswith(("api/", "socket.io/")):
            index_file = frontend_build_dir / "index.html"
            if index_file.exists():
                return FileResponse(str(index_file))
        return {"message": "Eye Hospital Patient Management System API"}
else:
    @app.get("/")
    async def root():
        return {"message": "Eye Hospital Patient Management System API - Frontend not built"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
