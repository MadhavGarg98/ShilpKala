from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime
from app.db.session import Base

class Artisan(Base):
    __tablename__ = "artisans"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(32), nullable=True)
    craft_type = Column(String(128), nullable=True)
    craft_type_key = Column(String(128), nullable=True)
    location = Column(String(255), nullable=True)
    artisan_id_status = Column(String(32), default="Pending")  # Verified, Pending, None
    profile_image_url = Column(String(512), nullable=True)
    is_profile_complete = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
