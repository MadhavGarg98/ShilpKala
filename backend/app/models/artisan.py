from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime
from app.db.session import Base

class Artisan(Base):
    __tablename__ = "artisans"

    id = Column(String(64), primary_key=True, index=True)
    # Supabase auth.users id — links this profile to an authenticated user.
    user_id = Column(String(64), unique=True, index=True, nullable=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(32), nullable=True)
    craft_type = Column(String(128), nullable=True)
    craft_type_key = Column(String(128), nullable=True)
    location = Column(String(255), nullable=True)
    # DEPRECATED (kept for backward compatibility with existing rows/routers).
    # Use government_id_status — the Phase 1 spec field name.
    artisan_id_status = Column(String(32), default="Pending")  # Verified, Pending, None
    # Phase 1 spec field: artisan government-ID verification state.
    government_id_status = Column(String(32), nullable=True)  # Verified, Pending, None
    role = Column(String(16), default="artisan")
    profile_image_url = Column(String(512), nullable=True)
    is_profile_complete = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __init__(self, **kwargs):
        # Keep the two ID-status columns in sync regardless of which name a
        # caller uses, so legacy code and the spec field never diverge.
        if kwargs.get("government_id_status") and not kwargs.get("artisan_id_status"):
            kwargs["artisan_id_status"] = kwargs["government_id_status"]
        elif kwargs.get("artisan_id_status") and not kwargs.get("government_id_status"):
            kwargs["government_id_status"] = kwargs["artisan_id_status"]
        super().__init__(**kwargs)
