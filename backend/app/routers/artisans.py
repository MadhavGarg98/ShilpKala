from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.models.artisan import Artisan

router = APIRouter(prefix="/api/artisans", tags=["Artisans"])

class ArtisanCreate(BaseModel):
    id: Optional[str] = "artisan-123"
    # Supabase auth.users id (Phase 1) — links this profile to a login.
    user_id: Optional[str] = None
    name: str
    phone: Optional[str] = None
    craft_type: Optional[str] = None
    craft_type_key: Optional[str] = None
    location: Optional[str] = None
    # Spec field name; artisan_id_status is the legacy alias kept in sync.
    government_id_status: Optional[str] = None
    artisan_id_status: Optional[str] = "Verified"
    role: Optional[str] = "artisan"
    profile_image_url: Optional[str] = None
    is_profile_complete: Optional[bool] = True

class ArtisanUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    craft_type: Optional[str] = None
    location: Optional[str] = None
    government_id_status: Optional[str] = None
    artisan_id_status: Optional[str] = None
    profile_image_url: Optional[str] = None
    is_profile_complete: Optional[bool] = None

class ArtisanResponse(BaseModel):
    id: str
    user_id: Optional[str]
    name: str
    phone: Optional[str]
    craft_type: Optional[str]
    craft_type_key: Optional[str]
    location: Optional[str]
    government_id_status: Optional[str]
    artisan_id_status: str
    role: Optional[str]
    profile_image_url: Optional[str]
    is_profile_complete: bool

    class Config:
        from_attributes = True

@router.get("", response_model=List[ArtisanResponse])
def get_artisans(db: Session = Depends(get_db)):
    return db.query(Artisan).all()

@router.get("/{artisan_id}", response_model=ArtisanResponse)
def get_artisan(artisan_id: str, db: Session = Depends(get_db)):
    artisan = db.query(Artisan).filter(Artisan.id == artisan_id).first()
    if not artisan:
        raise HTTPException(status_code=404, detail="Artisan not found")
    return artisan

@router.post("", response_model=ArtisanResponse, status_code=201)
def create_artisan(data: ArtisanCreate, db: Session = Depends(get_db)):
    existing = db.query(Artisan).filter(Artisan.id == data.id).first()
    if existing:
        return existing

    artisan = Artisan(**data.model_dump())
    db.add(artisan)
    db.commit()
    db.refresh(artisan)
    return artisan

@router.put("/{artisan_id}", response_model=ArtisanResponse)
def update_artisan(artisan_id: str, updates: ArtisanUpdate, db: Session = Depends(get_db)):
    artisan = db.query(Artisan).filter(Artisan.id == artisan_id).first()
    if not artisan:
        raise HTTPException(status_code=404, detail="Artisan not found")

    changed = updates.model_dump(exclude_unset=True)
    for key, val in changed.items():
        setattr(artisan, key, val)

    # Keep the legacy alias and the spec field in sync on update too (the
    # model's __init__ only handles construction).
    if "government_id_status" in changed and "artisan_id_status" not in changed:
        artisan.artisan_id_status = changed["government_id_status"]
    elif "artisan_id_status" in changed and "government_id_status" not in changed:
        artisan.government_id_status = changed["artisan_id_status"]

    db.commit()
    db.refresh(artisan)
    return artisan
