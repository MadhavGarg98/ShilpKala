from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime
from app.db.session import Base

class Listing(Base):
    __tablename__ = "listings"

    id = Column(String(64), primary_key=True, index=True)
    product_id = Column(String(64), index=True, nullable=False)
    platform = Column(String(64), nullable=False)  # ONDC, Shopify, Amazon Saheli, Etsy
    external_listing_id = Column(String(128), nullable=True)
    status = Column(String(32), default="active")  # active, synced, draft, error
    price = Column(Float, default=0.0)
    sync_status = Column(String(32), default="synced")  # synced, syncing, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
