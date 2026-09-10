from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.pricing_service import pricing_service

router = APIRouter(prefix="/api/pricing", tags=["Dynamic Pricing Engine"])

class PricingSuggestRequest(BaseModel):
    craft_type: Optional[str] = Field("Handloom Weaving", description="Artisan craft category or product type")
    material_cost: float = Field(..., description="Artisan-entered raw material cost in INR (₹)")
    product_category: Optional[str] = Field(None, description="Optional secondary craft classification")
    gi_match_status: Optional[bool] = Field(False, description="Whether product has verified GI-certified status")

class MarketComparableItem(BaseModel):
    id: str
    title: str
    price: int
    source_label: str

class PricingSuggestResponse(BaseModel):
    min_price: int
    recommended_price: int
    max_price: int
    material_cost: float
    markup_multiplier_range: Dict[str, float]
    base_markup_range: Dict[str, float]
    gi_multiplier_applied: float
    gi_premium_pct: int
    craft_category_matched: str
    citation: str
    method: str = "rules_based_heuristic_v1"
    disclaimer: str
    market_comparables: List[MarketComparableItem]

@router.post(
    "/suggest",
    response_model=PricingSuggestResponse,
    summary="Suggest Fair Dynamic Pricing (Material Cost + Published Margins + GI Premium)"
)
def suggest_pricing(req: PricingSuggestRequest):
    """
    Dynamic Pricing Suggestion:
    - Base multiplier off artisan-entered material cost based on published handicraft costing guidelines.
    - Adjustment for GI-certified status (25-40% empirical realization premium, using 30% midpoint).
    - Returns suggested range (min/recommended/max).
    - Method explicitly labeled 'rules_based_heuristic_v1' with full transparency disclaimer.
    - Curated static reference table of realistic market-comparables returned alongside.
    """
    if req.material_cost <= 0:
        raise HTTPException(status_code=400, detail="Material cost must be greater than zero.")

    try:
        result = pricing_service.calculate_suggestion(
            craft_type=req.craft_type,
            material_cost=req.material_cost,
            product_category=req.product_category,
            gi_match_status=bool(req.gi_match_status)
        )
        return PricingSuggestResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pricing calculation failed: {str(e)}")

@router.get(
    "/benchmarks",
    response_model=List[MarketComparableItem],
    summary="Get Static Curated Market Comparables for Craft Category"
)
def get_benchmarks(
    craft_type: Optional[str] = Query(None, description="Craft type (e.g., Handloom, Pottery, Brass, Wood, Embroidery)")
):
    """
    Returns curated reference benchmark items for market comparison.
    Explicitly documented as static reference data, not live-scraped feeds.
    """
    items = pricing_service.get_benchmarks_for_category(craft_type)
    return [MarketComparableItem(**it) for it in items]
