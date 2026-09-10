import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.db.session import engine, Base, SessionLocal
from app.models.artisan import Artisan
from app.models.product import Product
from app.models.listing import Listing
from app.services.image_enhancement import image_enhancer
from app.services.demo_cache import demo_cache
from app.services.voice_cache import voice_cache
from app.routers import (
    images_router,
    products_router,
    artisans_router,
    listings_router,
    voice_router,
    pricing_router,
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("shilpkala")

# Ensure database tables are created on module load
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    logger.warning(f"Initial table creation notice: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("Starting ShilpKala Backend (Phase 1 & Phase 2)...")

    # 1. Initialize Database Tables
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified.")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")

    # 2. Seed Default Artisan
    try:
        db = SessionLocal()
        existing = db.query(Artisan).filter(Artisan.id == "artisan-123").first()
        if not existing:
            default_artisan = Artisan(
                id="artisan-123",
                name="राम निवास (Ram Niwas)",
                phone="+919876543210",
                craft_type="Handloom Weaving",
                craft_type_key="craft.handloom.label",
                location="Varanasi, Uttar Pradesh",
                artisan_id_status="Verified",
                profile_image_url="http://localhost:8000/uploads/avatars/ramniwas.jpg",
                is_profile_complete=True
            )
            db.add(default_artisan)
            db.commit()
            logger.info("Seeded default artisan 'artisan-123' (Ram Niwas).")
        db.close()
    except Exception as e:
        logger.warning(f"Could not seed default artisan: {e}")

    # 3. Pre-warm Image Enhancement Pipeline (load u2netp into memory)
    try:
        logger.info("Pre-warming rembg u2netp lightweight model in memory...")
        image_enhancer.prewarm()
        logger.info("u2netp model pre-warmed.")
    except Exception as e:
        logger.error(f"Failed to pre-warm image enhancement session: {e}")

    # 4. Warm Demo Cache Reliability Layer (Images)
    try:
        logger.info("Initializing Image Demo Reliability Layer cache...")
        demo_cache.warm_cache()
    except Exception as e:
        logger.warning(f"Image demo cache warming non-critical warning: {e}")

    # 5. Warm Voice Cache Reliability Layer (All 9 Languages)
    try:
        logger.info("Initializing Voice Demo Reliability Layer (all 9 languages)...")
        voice_cache.warm_cache()
    except Exception as e:
        logger.warning(f"Voice cache warming warning: {e}")

    logger.info("ShilpKala Backend is ready to serve requests.")
    yield
    logger.info("Shutting down ShilpKala Backend...")

app = FastAPI(
    title="ShilpKala API",
    description=(
        "Backend for ShilpKala: AI-Powered Platform for Indian Artisans & GI Craft Heritage.\n\n"
        "HONESTY CONTRACT:\n"
        "- Module 1 (Foundation): 100% Genuine & Functional.\n"
        "- Module 2 (Image Enhancement & AI Listing): 100% Genuine & Functional.\n"
        "- Module 3 (Voice Pipeline - Sarvam Primary): 100% Genuine & Functional.\n"
        "- Module 4 (Authenticity) & Module 5 (ONDC): Explicitly Simulated."
    ),
    version="2.0.0",
    lifespan=lifespan
)

# CORS Configuration for React Native & Web
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploads (S3/GCS local compatibility)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include API Routers
app.include_router(images_router)
app.include_router(products_router)
app.include_router(artisans_router)
app.include_router(listings_router)
app.include_router(voice_router)
app.include_router(pricing_router)

@app.get("/", tags=["Health"])
def root():
    return {
        "app": "ShilpKala API",
        "status": "healthy",
        "version": "2.0.0",
        "endpoints": {
            "voice_stt": "POST /api/voice/transcribe",
            "voice_stt_demo": "POST /api/voice/transcribe/demo",
            "voice_tts": "POST /api/voice/synthesize",
            "voice_tts_demo": "POST /api/voice/synthesize/demo",
            "ai_listing_generate": "POST /api/listings/generate",
            "pricing_suggest": "POST /api/pricing/suggest",
            "pricing_benchmarks": "GET /api/pricing/benchmarks",
            "image_enhancement_real": "POST /api/images/enhance",
            "image_enhancement_demo": "POST /api/images/enhance/demo",
            "products_crud": "/api/products",
            "artisans_crud": "/api/artisans",
            "listings_crud": "/api/listings",
            "docs": "/docs"
        },
        "honesty_contract": {
            "phase_1_image_enhancer": "REAL (rembg u2netp + OpenCV CLAHE + Super-Resolution)",
            "phase_2_voice_pipeline": "REAL (Sarvam primary with Bhashini & Whisper/gTTS fallbacks)",
            "phase_2_listing_generator": "REAL (Multilingual LLM across 9 Indian languages + English)",
            "phase_3_dynamic_pricing": "REAL (Rules-based heuristic v1 citing published MoT guidelines + GI premium)",
            "module_4_authenticity": "SIMULATED (per contract)",
            "module_5_ondc_network": "SIMULATED (per contract)"
        }
    }

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}
