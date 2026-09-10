import json
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, Text, DateTime
from app.db.session import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(String(64), primary_key=True, index=True)
    artisan_id = Column(String(64), index=True, nullable=True)
    craft_type_id = Column(String(32), nullable=True)
    
    title_hindi = Column(String(255), nullable=True)
    title_english = Column(String(255), nullable=True)
    title_key = Column(String(128), nullable=True)
    
    description_hindi = Column(Text, nullable=True)
    description_english = Column(Text, nullable=True)
    description_key = Column(String(128), nullable=True)
    
    price = Column(Float, default=0.0)
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
