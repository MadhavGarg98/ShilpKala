import logging
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.data.craft_adjacency import APP_CRAFT_ID_MAP, CATEGORY_DISPLAY_NAMES, normalize_craft_type
from app.db.session import get_db
from app.models.artisan import Artisan
from app.models.recommendation import Recommendation
from app.services.demand_service import demand_service

logger = logging.getLogger("shilpkala.recommendations")

router = APIRouter(prefix="/api/recommendations", tags=["Demand-Based Recommendations"])


class DemandRequest(BaseModel):
    artisan_id: Optional[str] = Field(
        None, description="Artisan id; craft inferred from their profile craft_type"
    )
    craft_type: Optional[str] = Field(
        None,
        description=(
            "Craft category name or app craft-type id ('1'..'6' from mockCraftTypes.js), "
            "e.g. 'Handloom Weaving'"
        ),
    )
    force_static: bool = Field(
        False,
        description="Developer/test flag: skip the live pytrends attempt and answer from the static seasonal table",
    )


class RecommendationItem(BaseModel):
    category: str
    trend_score: int = Field(..., ge=0, le=100)
    trend_direction: str = Field(..., pattern="^(rising|stable|declining)$")
    why: str


class DemandResponse(BaseModel):
    base_craft: str
    recommendations: List[RecommendationItem]
    data_source: str
    source_used: str = Field(..., pattern="^(google_trends|seasonal_static|none)$")
    source_breakdown: dict = Field(
        default_factory=dict,
        description="Per-source counts for the returned recommendations (honest mixed-source accounting)",
    )
    season: Optional[dict] = None


@router.post(
    "/demand",
    response_model=DemandResponse,
    summary="Demand-Based Craft Diversification Recommendations",
)
def demand_recommendations(req: DemandRequest, db: Session = Depends(get_db)):
    """
    Given an artisan_id or craft_type, rank adjacent craft categories by current
    demand (live Google Trends via pytrends when available; otherwise the static
    seasonal-demand table) and return the top 3.

    Honesty contract: `source_used` and every `why` string reflect the source
    that ACTUALLY answered this specific response — the static fallback never
    claims live data.
    """
    if not req.artisan_id and not req.craft_type:
        raise HTTPException(
            status_code=400,
            detail="Provide either 'artisan_id' or 'craft_type'.",
        )

    # Resolve craft from artisan profile when needed
    artisan_craft_hint: Optional[str] = None
    effective_artisan_id = req.artisan_id
    if req.artisan_id:
        artisan = db.query(Artisan).filter(Artisan.id == req.artisan_id).first()
        if artisan:
            artisan_craft_hint = artisan.craft_type
        else:
            # Unknown artisan id — if they also passed craft_type use that,
            # otherwise fall back to the app's default (id '1' = Handloom).
            logger.info(
                "[RECOMMENDATIONS] unknown artisan_id '%s'; using craft_type or app default",
                req.artisan_id,
            )

    if not req.craft_type and not artisan_craft_hint:
        # artisan_id only, unknown artisan: treat id '1'..'6' as a craft id
        if req.artisan_id in APP_CRAFT_ID_MAP:
            effective_artisan_id = None
            req.craft_type = APP_CRAFT_ID_MAP[req.artisan_id]
        else:
            effective_artisan_id = None
            req.craft_type = "Handloom Weaving"

    try:
        result = demand_service.get_recommendations(
            craft_type=req.craft_type,
            artisan_id=effective_artisan_id,
            artisan_craft_hint=artisan_craft_hint,
            force_static=bool(req.force_static),
        )
    except Exception as e:
        logger.exception("[RECOMMENDATIONS] demand recommendation failed")
        raise HTTPException(status_code=500, detail=f"Demand recommendation failed: {e}")

    # ---- Persistence (best-effort; never blocks the demo response) ----
    try:
        rec = Recommendation(
            id=f"rec-{uuid.uuid4().hex[:12]}",
            artisan_id=effective_artisan_id,
            base_craft=result["base_craft"],
            recommended=result["recommendations"],
            source_used=result["source_used"],
            season_key=(result.get("season") or {}).get("key"),
            trend_data=str(
                {
                    r["category"]: {
                        "trend_score": r["trend_score"],
                        "trend_direction": r["trend_direction"],
                    }
                    for r in result["recommendations"]
                }
            ),
        )
        db.add(rec)
        db.commit()
    except Exception as e:
        logger.warning(f"[RECOMMENDATIONS] persistence skipped: {e}")
        db.rollback()

    return DemandResponse(**result)
