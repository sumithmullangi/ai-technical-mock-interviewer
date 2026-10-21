from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
import app.db.session as db_session


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context for startup and graceful shutdown."""
    yield
    # Graceful shutdown: dispose of active SQLAlchemy engine connection pool
    if db_session._engine is not None:
        await db_session._engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for AI Technical Mock Interviewer",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS middleware for local Vite frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API endpoints under /api
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/", include_in_schema=False)
async def root_redirect():
    """Root endpoint providing service status and links to documentation and health check."""
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "health": f"{settings.API_V1_PREFIX}/health",
        "docs": "/docs",
    }
