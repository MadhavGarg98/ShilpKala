import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./shilpkala.db"
    
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

# Ensure uploads subdirectories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "originals"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "enhanced"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "demo_cache"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "voice"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "voice_cache"), exist_ok=True)
