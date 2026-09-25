from app.routers.images import router as images_router
from app.routers.products import router as products_router
from app.routers.artisans import router as artisans_router
from app.routers.listings import router as listings_router
from app.routers.voice import router as voice_router
from app.routers.pricing import router as pricing_router
from app.routers.recommendations import router as recommendations_router
from app.routers.auth import router as auth_router

__all__ = [
    "images_router",
    "products_router",
    "artisans_router",
    "listings_router",
    "voice_router",
    "pricing_router",
    "recommendations_router",
    "auth_router"
]

