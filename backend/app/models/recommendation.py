import json
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text
from app.db.session import Base

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String(64), primary_key=True, index=True)
    artisan_id = Column(String(64), index=True, nullable=True)
    base_craft = Column(String(128), nullable=False)
    recommended_categories = Column(Text, default="[]")  # stored as JSON string
    source_used = Column(String(32), nullable=False)     # google_trends | seasonal_static
    season_key = Column(String(32), nullable=True)
    trend_data = Column(Text, default="{}")              # JSON: per-category scores/directions
    created_at = Column(DateTime, default=datetime.utcnow)

    @property
    def recommended(self):
        try:
            return json.loads(self.recommended_categories) if self.recommended_categories else []
        except Exception:
            return []

    @recommended.setter
    def recommended(self, val):
        if isinstance(val, list):
            self.recommended_categories = json.dumps(val)
        elif isinstance(val, str):
            self.recommended_categories = val
        else:
            self.recommended_categories = "[]"
