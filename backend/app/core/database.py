from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def create_db_engine():
    # If explicit DATABASE_URL is configured, try it
    if settings.DATABASE_URL:
        try:
            eng = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
            with eng.connect():
                logger.info(f"Connected to database via DATABASE_URL")
                return eng
        except Exception as e:
            logger.warning(f"Failed to connect to DATABASE_URL: {e}. Fallback to sqlite.")
            return create_engine("sqlite:///./lumen.db", connect_args={"check_same_thread": False})
    
    # Try PostgreSQL defaults
    try:
        pg_url = settings.sync_database_url
        eng = create_engine(pg_url, pool_pre_ping=True)
        with eng.connect():
            logger.info("Connected to PostgreSQL database successfully.")
            return eng
    except Exception as e:
        logger.warning(f"PostgreSQL connection failed ({e}). Defaulting to SQLite for local development (lumen.db).")
        return create_engine("sqlite:///./lumen.db", connect_args={"check_same_thread": False})

engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
