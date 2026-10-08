import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

logger = logging.getLogger("faceattend.database")

Base = declarative_base()

def get_engine():
    db_url = settings.DATABASE_URL
    connect_args = {}
    if db_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    
    try:
        engine = create_engine(db_url, connect_args=connect_args, pool_pre_ping=True)
        # Test connection
        with engine.connect() as conn:
            pass
        logger.info(f"Connected to database: {db_url.split('@')[-1] if '@' in db_url else db_url}")
        return engine
    except Exception as e:
        if not db_url.startswith("sqlite"):
            logger.warning(f"Could not connect to {db_url}: {e}. Falling back to SQLite for local development.")
            sqlite_url = "sqlite:///./faceattend.db"
            return create_engine(sqlite_url, connect_args={"check_same_thread": False}, pool_pre_ping=True)
        raise e

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """FastAPI dependency to provide a transactional database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Create all database tables."""
    import app.models.user
    import app.models.department
    import app.models.face_embedding
    import app.models.attendance
    import app.models.audit_log

    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")
