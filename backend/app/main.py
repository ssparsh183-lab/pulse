"""
PULSE — FastAPI Application Entry Point
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup + shutdown hooks."""
    print(f"🚀 {settings.app_name} starting ({settings.app_env})...")

    # Warm up the embedder so first request isn't slow
    from app.pulse_engine.embedder import get_embedder
    from app.pulse_engine.category_classifier import get_classifier
    
    print("Loading ML models...")
    get_embedder().load()
    get_classifier().load()
    print("✅ Models loaded")

    yield

    print(f"👋 {settings.app_name} shutting down...")


app = FastAPI(
    title=settings.app_name,
    description="Real-time audience signal engine for live streams",
    version="0.1.0",
    lifespan=lifespan,
)

from fastapi.openapi.utils import get_openapi


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
    for path in openapi_schema["paths"].values():
        for method in path.values():
            method["security"] = [{"BearerAuth": []}]
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi


# CORS — allow frontend, Vercel & expose download headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],  # 🔥 MUST HAVE: Browser download header allow karta hai
)


# --- Health check ---
@app.get("/")
def root():
    return {
        "name": settings.app_name,
        "status": "alive",
        "env": settings.app_env,
    }


@app.get("/health")
def health_check():
    """Basic health check for uptime monitoring."""
    from app.db.database import engine
    from sqlalchemy import text

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        db_ok = False

    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
    }


# --- Include routers (will add as we build) ---
from app.api import auth as auth_router
app.include_router(auth_router.router, prefix="/api/auth", tags=["auth"])

from app.api import workspace as workspace_router
app.include_router(workspace_router.router, prefix="/api/workspace", tags=["workspace"])

from app.api import streams as streams_router
app.include_router(streams_router.router, prefix="/api/streams", tags=["streams"])

from app.api import videos as videos_router
app.include_router(videos_router.router, prefix="/api/videos", tags=["videos"])

from app.api import demo as demo_router
app.include_router(demo_router.router, prefix="/api/demo", tags=["demo"])

from app.api import websocket as ws_router
app.include_router(ws_router.router, prefix="/ws", tags=["websocket"])

from app.api import intel as intel_router
app.include_router(intel_router.router, prefix="/api/intel", tags=["intel"])

from app.api import telegram as telegram_router
app.include_router(telegram_router.router, prefix="/api/telegram", tags=["telegram"])

from app.api import twitter as twitter_router
app.include_router(twitter_router.router, prefix="/api/twitter", tags=["twitter"])