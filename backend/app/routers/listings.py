import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.models.listing import Listing
from app.services.listing_generator import listing_generator

router = APIRouter(prefix="/api/listings", tags=["Listings"])

class ListingCreate(BaseModel):
    id: Optional[str] = None
    product_id: str
    platform: str
    external_listing_id: Optional[str] = None
    status: Optional[str] = "active"
    price: float = 0.0
    sync_status: Optional[str] = "synced"

class ListingResponse(BaseModel):
    id: str
    product_id: str
    platform: str
    external_listing_id: Optional[str]
    status: str
    price: float
    sync_status: str

    class Config:
        from_attributes = True

class GenerateListingRequest(BaseModel):
    transcript: str
    language_code: Optional[str] = "hi-IN"
    image_url: Optional[str] = None
    craft_type: Optional[str] = "Handloom Weaving"
    artisan_id: Optional[str] = None

class GenerateListingResponse(BaseModel):
    title: str
    title_english: Optional[str] = None
    description_local: str          # backward-compat: same as description_hi when set
    description_hi: Optional[str] = None   # Hindi description (Devanagari) — spec-required
    description_en: str
    is_gi_match: bool = False
    gi_name: Optional[str] = None
    suggested_price_min: float
    suggested_price_max: float
    keywords: List[str]
    source: str
    language_detected: Optional[str] = None
    language_name: Optional[str] = None

@router.post(
    "/generate",
    response_model=GenerateListingResponse,
    summary="AI Listing Generator — Groq llama-3.3-70b-versatile (Transcript → Structured Listing)"
)
def generate_listing(req: GenerateListingRequest):
    """
    AI Listing Generation (Groq-only pipeline):
    - Calls Groq (llama-3.3-70b-versatile) with a structured JSON prompt.
    - Returns: title, description_en (English), description_hi (Hindi/Devanagari), keywords[].
    - On JSON parse failure: retries once with a stricter prompt, then falls back to a
      labeled deterministic template response — never crashes.
    - Source field: 'groq' | 'template_fallback'.
    - No Anthropic or OpenAI keys are used in this pipeline.
    """
    if not req.transcript or len(req.transcript.strip()) == 0:
        raise HTTPException(status_code=400, detail="Transcript cannot be empty.")

    try:
        result = listing_generator.generate(
            transcript=req.transcript,
            language_code=req.language_code or "hi-IN",
            image_url=req.image_url,
            craft_type=req.craft_type or "Handloom Weaving"
        )
        return GenerateListingResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Listing generation failed: {str(e)}")


@router.get("", response_model=List[ListingResponse])
def get_listings(
    product_id: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Listing)
    if product_id:
        query = query.filter(Listing.product_id == product_id)
    if platform:
        query = query.filter(Listing.platform == platform)
    return query.all()

@router.post("", response_model=ListingResponse, status_code=201)
def create_listing(data: ListingCreate, db: Session = Depends(get_db)):
    list_id = data.id or f"list_{uuid.uuid4().hex[:8]}"
    listing = Listing(
        id=list_id,
        product_id=data.product_id,
        platform=data.platform,
        external_listing_id=data.external_listing_id or f"EXT-{uuid.uuid4().hex[:6].upper()}",
        status=data.status,
        price=data.price,
        sync_status=data.sync_status
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing
