from datetime import datetime
from sqlalchemy import Column, String, DateTime

from app.db.session import Base


class Profile(Base):
    """
    Authoritative role registry — exactly ONE role per authenticated user.

    `user_id` is the Supabase auth.users id (UUID as text so the same column
    type works on both Postgres and the SQLite demo fallback). This is the row
    the FastAPI auth middleware reads to resolve artisan vs buyer.
    """

    __tablename__ = "profiles"

    user_id = Column(String(64), primary_key=True, index=True)
    role = Column(String(16), nullable=False)  # 'artisan' | 'buyer'
    display_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Buyer(Base):
    """Buyer-side detail profile — one row per buyer-role authenticated user."""

    __tablename__ = "buyers"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), unique=True, index=True, nullable=True)
    company_name = Column(String(255), nullable=True)
    # Retailer | Exporter | Wholesaler | Government Procurement
    buyer_type = Column(String(64), nullable=True)
    country = Column(String(128), nullable=True)
    contact_person_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
