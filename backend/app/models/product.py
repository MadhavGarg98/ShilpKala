import json
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, Text, DateTime, ForeignKey
from app.db.session import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(String(64), primary_key=True, index=True)
    # Phase 1 audit: was nullable with no constraint. Now a real FK to
    # artisans.id. The Supabase migration additionally enforces NOT NULL;
    # the ORM keeps nullable=True so pre-existing demo rows stay loadable.
    artisan_id = Column(
        String(64),
        ForeignKey("artisans.id", ondelete="RESTRICT"),
        index=True,
        nullable=True,
    )
    craft_type_id = Column(String(32), nullable=True)
    # Language this listing was originally dictated/created in (e.g. 'hi-IN').
    source_language = Column(String(16), nullable=True)
    
    title_hindi = Column(String(255), nullable=True)
    title_english = Column(String(255), nullable=True)
    title_key = Column(String(128), nullable=True)
    
    description_hindi = Column(Text, nullable=True)
    description_english = Column(Text, nullable=True)
    description_key = Column(String(128), nullable=True)
    
    # price = the artisan's FINAL chosen price.
    price = Column(Float, default=0.0)
    # Phase 1 audit gap: the AI-suggested band from POST /api/pricing/suggest
    # was never persisted alongside the artisan's final price.
    suggested_price_min = Column(Float, nullable=True)
    suggested_price_max = Column(Float, nullable=True)
    # Phase 1 audit gap: artisan-entered material/input cost.
    material_cost = Column(Float, nullable=True)
    status = Column(String(32), default="live")  # live, draft, archived
    
    is_gi_certified = Column(Boolean, default=False)
    gi_reg_number = Column(String(64), nullable=True)
    gi_name_hindi = Column(String(255), nullable=True)
    gi_name_english = Column(String(255), nullable=True)
    
    heritage_story_hindi = Column(Text, nullable=True)
    heritage_story_english = Column(Text, nullable=True)
    heritage_story_key = Column(String(128), nullable=True)
    
    image_url = Column(String(512), nullable=True)
    before_image_url = Column(String(512), nullable=True)
    after_image_url = Column(String(512), nullable=True)
    
    inquiry_count = Column(Integer, default=0)
    views_count = Column(Integer, default=0)
    
    keywords_raw = Column(Text, default="[]")  # stored as JSON string
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def keywords(self):
        try:
            return json.loads(self.keywords_raw) if self.keywords_raw else []
        except Exception:
            return []

    @keywords.setter
    def keywords(self, val):
        if isinstance(val, list):
            self.keywords_raw = json.dumps(val)
        elif isinstance(val, str):
            self.keywords_raw = val
        else:
            self.keywords_raw = "[]"
