import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from alembic.config import Config
from alembic import command
from sqlalchemy import text, inspect
from app.core.config import settings
from app.core.database import Base, engine
from app.api.v1.router import api_router
import app.models

logger = logging.getLogger("lumen.startup")


def ensure_schema_upgrades():
    """Idempotent direct DDL upgrade ensuring all required tables and columns exist in existing databases."""
    try:
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()

        with engine.begin() as conn:
            # 1. Ensure users.professional_title
            if "users" in existing_tables:
                user_cols = [c["name"] for c in inspector.get_columns("users")]
                if "professional_title" not in user_cols:
                    logger.info("Adding missing column users.professional_title")
                    conn.execute(text("ALTER TABLE users ADD COLUMN professional_title VARCHAR(100);"))

            # 2. Create tables that might not exist yet (like organizations) before referencing them
            Base.metadata.create_all(bind=conn)

            # Re-inspect table names after create_all
            existing_tables = inspect(conn).get_table_names()

            # 3. Ensure workspaces.organization_id
            if "workspaces" in existing_tables:
                ws_cols = [c["name"] for c in inspect(conn).get_columns("workspaces")]
                if "organization_id" not in ws_cols:
                    logger.info("Adding missing column workspaces.organization_id")
                    if engine.dialect.name == "postgresql":
                        conn.execute(text("ALTER TABLE workspaces ADD COLUMN organization_id VARCHAR(36) REFERENCES organizations(id) ON DELETE CASCADE;"))
                        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_workspaces_organization_id ON workspaces (organization_id);"))
                    else:
                        conn.execute(text("ALTER TABLE workspaces ADD COLUMN organization_id VARCHAR(36);"))

            # 4. Ensure test_cases missing columns
            if "test_cases" in existing_tables:
                tc_cols = [c["name"] for c in inspect(conn).get_columns("test_cases")]
                if "test_type" not in tc_cols:
                    conn.execute(text("ALTER TABLE test_cases ADD COLUMN test_type VARCHAR(50) DEFAULT 'FUNCTIONAL' NOT NULL;"))
                if "severity" not in tc_cols:
                    conn.execute(text("ALTER TABLE test_cases ADD COLUMN severity VARCHAR(50) DEFAULT 'MEDIUM' NOT NULL;"))
                if "review_status" not in tc_cols:
                    conn.execute(text("ALTER TABLE test_cases ADD COLUMN review_status VARCHAR(50) DEFAULT 'DRAFT' NOT NULL;"))
                if "tags" not in tc_cols:
                    conn.execute(text("ALTER TABLE test_cases ADD COLUMN tags VARCHAR(500);"))
                if "reviewer_id" not in tc_cols:
                    if engine.dialect.name == "postgresql":
                        conn.execute(text("ALTER TABLE test_cases ADD COLUMN reviewer_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL;"))
                    else:
                        conn.execute(text("ALTER TABLE test_cases ADD COLUMN reviewer_id VARCHAR(36);"))

            # 5. Ensure test_runs missing columns
            if "test_runs" in existing_tables:
                tr_cols = [c["name"] for c in inspect(conn).get_columns("test_runs")]
                if "started_by_id" not in tr_cols:
                    if engine.dialect.name == "postgresql":
                        conn.execute(text("ALTER TABLE test_runs ADD COLUMN started_by_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL;"))
                    else:
                        conn.execute(text("ALTER TABLE test_runs ADD COLUMN started_by_id VARCHAR(36);"))
                if "updated_by_id" not in tr_cols:
                    if engine.dialect.name == "postgresql":
                        conn.execute(text("ALTER TABLE test_runs ADD COLUMN updated_by_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL;"))
                    else:
                        conn.execute(text("ALTER TABLE test_runs ADD COLUMN updated_by_id VARCHAR(36);"))

            # 6. Ensure test_run_items missing columns
            if "test_run_items" in existing_tables:
                tri_cols = [c["name"] for c in inspect(conn).get_columns("test_run_items")]
                if "severity" not in tri_cols:
                    conn.execute(text("ALTER TABLE test_run_items ADD COLUMN severity VARCHAR(20) DEFAULT 'MEDIUM' NOT NULL;"))
                if "test_type" not in tri_cols:
                    conn.execute(text("ALTER TABLE test_run_items ADD COLUMN test_type VARCHAR(50) DEFAULT 'FUNCTIONAL' NOT NULL;"))
                if "tags" not in tri_cols:
                    conn.execute(text("ALTER TABLE test_run_items ADD COLUMN tags VARCHAR(500);"))
                if "assigned_to_id" not in tri_cols:
                    if engine.dialect.name == "postgresql":
                        conn.execute(text("ALTER TABLE test_run_items ADD COLUMN assigned_to_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL;"))
                    else:
                        conn.execute(text("ALTER TABLE test_run_items ADD COLUMN assigned_to_id VARCHAR(36);"))
                if "updated_by_id" not in tri_cols:
                    if engine.dialect.name == "postgresql":
                        conn.execute(text("ALTER TABLE test_run_items ADD COLUMN updated_by_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL;"))
                    else:
                        conn.execute(text("ALTER TABLE test_run_items ADD COLUMN updated_by_id VARCHAR(36);"))
                if "execution_started_at" not in tri_cols:
                    conn.execute(text("ALTER TABLE test_run_items ADD COLUMN execution_started_at TIMESTAMP WITH TIME ZONE;" if engine.dialect.name == "postgresql" else "ALTER TABLE test_run_items ADD COLUMN execution_started_at DATETIME;"))
                if "execution_completed_at" not in tri_cols:
                    conn.execute(text("ALTER TABLE test_run_items ADD COLUMN execution_completed_at TIMESTAMP WITH TIME ZONE;" if engine.dialect.name == "postgresql" else "ALTER TABLE test_run_items ADD COLUMN execution_completed_at DATETIME;"))

            # 7. Ensure test_run_step_results missing columns
            if "test_run_step_results" in existing_tables:
                trs_cols = [c["name"] for c in inspect(conn).get_columns("test_run_step_results")]
                if "test_data" not in trs_cols:
                    conn.execute(text("ALTER TABLE test_run_step_results ADD COLUMN test_data TEXT;"))

        logger.info("Schema integrity verification completed successfully.")
    except Exception as e:
        logger.error(f"ensure_schema_upgrades error: {e}")


def apply_migrations():
    """Apply Alembic migrations and guarantee schema synchronization on startup."""
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    alembic_dir = os.path.join(backend_dir, "alembic")
    ini_candidates = [
        os.path.join(backend_dir, "..", "alembic.ini"),
        os.path.join(backend_dir, "alembic.ini"),
    ]
    ini_path = next((os.path.abspath(p) for p in ini_candidates if os.path.isfile(p)), None)

    try:
        if ini_path and os.path.isdir(alembic_dir):
            alembic_cfg = Config(ini_path)
            alembic_cfg.set_main_option("script_location", alembic_dir)
            command.upgrade(alembic_cfg, "head")
            logger.info("Alembic migrations executed successfully.")
    except Exception as e:
        logger.warning(f"Alembic auto-migration warning: {e}")

    # Direct schema upgrade guarantees missing columns and new tables are added in place
    ensure_schema_upgrades()


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
        "version": settings.PROJECT_VERSION,
        "release": "v1.0.1",
        "schema_status": "migrated"
    }
