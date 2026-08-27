import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from alembic.config import Config
from alembic import command
from app.core.config import settings
from app.core.database import Base, engine
from app.api.v1.router import api_router
import app.models

logger = logging.getLogger("lumen.startup")


def apply_migrations():
    """Apply any pending Alembic migrations safely on startup."""
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        ini_candidates = [
            os.path.join(base_dir, "alembic.ini"),
            os.path.join(base_dir, "backend", "alembic.ini"),
            os.path.abspath("alembic.ini"),
            os.path.abspath("backend/alembic.ini"),
        ]
        ini_path = next((p for p in ini_candidates if os.path.isfile(p)), None)
        if ini_path:
            logger.info(f"Applying database migrations using config: {ini_path}")
            alembic_cfg = Config(ini_path)
            command.upgrade(alembic_cfg, "head")
            logger.info("Database migrations applied successfully.")
        else:
            logger.warning("alembic.ini not found, falling back to Base.metadata.create_all")
            Base.metadata.create_all(bind=engine)
    except Exception as e:
        logger.warning(f"Alembic auto-migration warning: {e}. Ensuring tables exist via metadata.")
        try:
            Base.metadata.create_all(bind=engine)
        except Exception as create_err:
            logger.error(f"Base.metadata.create_all fallback failed: {create_err}")


# Ensure schema is migrated on application load
apply_migrations()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="Lumen — Unified Software Quality Workspace Backend API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION
    }
