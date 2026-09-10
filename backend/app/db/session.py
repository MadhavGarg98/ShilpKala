import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()

def init_engine():
    db_url = settings.DATABASE_URL
    connect_args = {}
    
    if db_url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
    
    try:
        engine = create_engine(db_url, connect_args=connect_args)
        # Test connection
        with engine.connect() as conn:
            pass
        return engine
    except Exception as e:
        logger.warning(f"Could not connect to database at {db_url}: {e}. Falling back to SQLite for local demo.")
        fallback_url = "sqlite:///./shilpkala.db"
        return create_engine(fallback_url, connect_args={"check_same_thread": False})

engine = init_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
