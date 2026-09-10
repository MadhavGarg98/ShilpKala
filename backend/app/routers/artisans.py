from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.models.artisan import Artisan

router = APIRouter(prefix="/api/artisans", tags=["Artisans"])

class ArtisanCreate(BaseModel):
    id: Optional[str] = "artisan-123"
    name: str
    phone: Optional[str] = None
    craft_type: Optional[str] = None
    craft_type_key: Optional[str] = None
    location: Optional[str] = None
    artisan_id_status: Optional[str] = "Verified"
    profile_image_url: Optional[str] = None
    is_profile_complete: Optional[bool] = True

class ArtisanUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    craft_type: Optional[str] = None
    location: Optional[str] = None
    artisan_id_status: Optional[str] = None
    profile_image_url: Optional[str] = None
    is_profile_complete: Optional[bool] = None

class ArtisanResponse(BaseModel):
    id: str
    name: str
    phone: Optional[str]
    craft_type: Optional[str]
    craft_type_key: Optional[str]
    location: Optional[str]
    artisan_id_status: str
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

    for key, val in updates.model_dump(exclude_unset=True).items():
        setattr(artisan, key, val)

    db.commit()
    db.refresh(artisan)
    return artisan
