import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()

def _redact(url: str) -> str:
    """Never log a password from a connection string."""
    try:
        if "@" in url and "://" in url:
            scheme, rest = url.split("://", 1)
            creds, host = rest.split("@", 1)
            user = creds.split(":", 1)[0]
            return f"{scheme}://{user}:***@{host}"
    except Exception:
        pass
    return url


def init_engine():
    db_url = settings.DATABASE_URL
    connect_args = {}
    engine_kwargs = {}

    if db_url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
    else:
        # Hosted Postgres (Supabase) over the network: fail reasonably fast and
        # recycle connections that the pooler has silently dropped.
        engine_kwargs = {
            "pool_pre_ping": True,
            "pool_recycle": 300,
            "pool_size": 5,
            "max_overflow": 5,
            "connect_args": {"connect_timeout": 10},
        }

    try:
        engine = create_engine(db_url, connect_args=connect_args, **engine_kwargs)
        with engine.connect() as conn:
            pass
        logger.info("Connected to database: %s", _redact(db_url))
        return engine
    except Exception as e:
        logger.warning(
            "Could not connect to database at %s: %s. Falling back to SQLite for local demo.",
            _redact(db_url), e,
        )
        return create_engine(
            "sqlite:///./shilpkala.db", connect_args={"check_same_thread": False}
        )

# Additive columns introduced in Phase 1 (and their SQL types). On the hosted
# Postgres/Supabase database these come from supabase/migrations/*.sql. SQLite's
# create_all() cannot ALTER an existing table, so the zero-config local demo DB
# needs this small explicit sync to keep the new fields persistable.
_SQLITE_ADDITIVE_COLUMNS = {
    "products": [
        ("source_language", "VARCHAR(16)"),
        ("suggested_price_min", "FLOAT"),
        ("suggested_price_max", "FLOAT"),
        ("material_cost", "FLOAT"),
    ],
    "artisans": [
        ("user_id", "VARCHAR(64)"),
        ("government_id_status", "VARCHAR(32)"),
        ("role", "VARCHAR(16)"),
    ],
}


def ensure_sqlite_dev_schema(bind=None) -> int:
    """Idempotently add Phase 1 columns to a SQLite dev DB. No-op elsewhere.

    Returns the number of columns actually added.
    """
    bind = bind or engine
    if bind.dialect.name != "sqlite":
        return 0

    added = 0
    try:
        with bind.begin() as conn:
            for table, columns in _SQLITE_ADDITIVE_COLUMNS.items():
                rows = conn.exec_driver_sql(f"PRAGMA table_info({table})").fetchall()
                existing = {r[1] for r in rows}
                if not existing:
                    continue  # table not created yet — create_all will handle it
                for name, coltype in columns:
                    if name not in existing:
                        conn.exec_driver_sql(
                            f"ALTER TABLE {table} ADD COLUMN {name} {coltype}"
                        )
                        added += 1
        if added:
            logger.info("SQLite dev schema: added %d Phase 1 column(s).", added)
    except Exception as e:  # never block startup over a dev-only convenience
        logger.warning("SQLite dev schema sync skipped: %s", e)
    return added


engine = init_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
