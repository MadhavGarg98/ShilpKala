from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.models.product import Product

router = APIRouter(prefix="/api/products", tags=["Products"])

class ProductCreate(BaseModel):
    id: Optional[str] = None
    artisan_id: Optional[str] = None
    craft_type_id: Optional[str] = None
    title_hindi: Optional[str] = None
    title_english: Optional[str] = None
    title_key: Optional[str] = None
    description_hindi: Optional[str] = None
    description_english: Optional[str] = None
    description_key: Optional[str] = None
    price: float = 0.0
    status: str = "live"
    is_gi_certified: bool = False
    gi_reg_number: Optional[str] = None
    gi_name_hindi: Optional[str] = None
    gi_name_english: Optional[str] = None
    heritage_story_hindi: Optional[str] = None
    heritage_story_english: Optional[str] = None
    heritage_story_key: Optional[str] = None
    image_url: Optional[str] = None
    before_image_url: Optional[str] = None
    after_image_url: Optional[str] = None
    keywords: Optional[List[str]] = []

class ProductUpdate(BaseModel):
    title_hindi: Optional[str] = None
    title_english: Optional[str] = None
    price: Optional[float] = None
    status: Optional[str] = None
    is_gi_certified: Optional[bool] = None
    description_hindi: Optional[str] = None
    description_english: Optional[str] = None
    image_url: Optional[str] = None
    after_image_url: Optional[str] = None
    keywords: Optional[List[str]] = None

class ProductResponse(BaseModel):
    id: str
    artisan_id: Optional[str]
    craft_type_id: Optional[str]
    title_hindi: Optional[str]
    title_english: Optional[str]
    title_key: Optional[str]
    description_hindi: Optional[str]
    description_english: Optional[str]
    description_key: Optional[str]
    price: float
    status: str
    is_gi_certified: bool
    gi_reg_number: Optional[str]
    gi_name_hindi: Optional[str]
    gi_name_english: Optional[str]
    heritage_story_hindi: Optional[str]
    heritage_story_english: Optional[str]
    heritage_story_key: Optional[str]
    image_url: Optional[str]
    before_image_url: Optional[str]
    after_image_url: Optional[str]
    inquiry_count: int
    views_count: int
    keywords: List[str]

    class Config:
        from_attributes = True

@router.get("", response_model=List[ProductResponse])
def get_products(
    artisan_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Product)
    if artisan_id:
        query = query.filter(Product.artisan_id == artisan_id)
    if status:
        query = query.filter(Product.status == status)
    return query.all()

@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: str, db: Session = Depends(get_db)):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    return prod

@router.post("", response_model=ProductResponse, status_code=201)
def create_product(data: ProductCreate, db: Session = Depends(get_db)):
    prod_id = data.id or f"p{int(time.time() * 1000)}"
    existing = db.query(Product).filter(Product.id == prod_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Product with this ID already exists")

    prod = Product(
        id=prod_id,
        artisan_id=data.artisan_id,
        craft_type_id=data.craft_type_id,
        title_hindi=data.title_hindi,
        title_english=data.title_english,
        title_key=data.title_key,
        description_hindi=data.description_hindi,
        description_english=data.description_english,
        description_key=data.description_key,
        price=data.price,
        status=data.status,
        is_gi_certified=data.is_gi_certified,
        gi_reg_number=data.gi_reg_number,
        gi_name_hindi=data.gi_name_hindi,
        gi_name_english=data.gi_name_english,
        heritage_story_hindi=data.heritage_story_hindi,
        heritage_story_english=data.heritage_story_english,
        heritage_story_key=data.heritage_story_key,
        image_url=data.image_url,
        before_image_url=data.before_image_url,
        after_image_url=data.after_image_url,
        keywords=data.keywords or []
    )
    db.add(prod)
    db.commit()
    db.refresh(prod)
    return prod

@router.put("/{product_id}", response_model=ProductResponse)
def update_product(product_id: str, updates: ProductUpdate, db: Session = Depends(get_db)):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")

    for key, val in updates.model_dump(exclude_unset=True).items():
        setattr(prod, key, val)

    db.commit()
    db.refresh(prod)
    return prod

@router.delete("/{product_id}")
def delete_product(product_id: str, db: Session = Depends(get_db)):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(prod)
    db.commit()
    return {"status": "deleted", "id": product_id}

import time
