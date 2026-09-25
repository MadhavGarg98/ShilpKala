import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./shilpkala.db"

    # ── Supabase (Phase 1) ──────────────────────────────────────────────
    # Project base URL, e.g. https://abcdefgh.supabase.co
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    # Legacy symmetric JWT secret (Supabase dashboard → Settings → API → JWT).
    # Modern Supabase projects sign with asymmetric keys (ES256); when this is
    # empty we verify via the project JWKS endpoint instead.
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_JWT_AUDIENCE: str = "authenticated"
    # Enforce JWT verification on protected routes. Defaults to False so the
    # existing demo and test suite keep working with no Supabase configured.
    AUTH_ENABLED: bool = False
    
    # Voice (Sarvam Primary)
    SARVAM_API_KEY: str = ""
    BHASHINI_API_KEY: str = ""
    ELEVENLABS_API_KEY: str = ""
    
    # LLM (Listing Generation: Groq Primary, Anthropic Fallback)
    GROQ_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    
    # Demo & Credit Conservation Flag
    DEMO_MODE: bool = False
    
    # Storage
    CLOUD_STORAGE_BUCKET: str = "shilpkala-assets"
    UPLOAD_DIR: str = str(BASE_DIR / "uploads")
    BASE_URL: str = "http://localhost:8000"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "info"

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Derived Supabase endpoints (never set these by hand).
SUPABASE_JWKS_URL = (
    f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
    if settings.SUPABASE_URL
    else ""
)
SUPABASE_ISSUER = (
    f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1" if settings.SUPABASE_URL else ""
)
# Ensure uploads subdirectories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "originals"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "enhanced"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "demo_cache"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "voice"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "voice_cache"), exist_ok=True)
