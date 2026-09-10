import io
import time
from typing import Optional
from fastapi import APIRouter, File, UploadFile, Query, HTTPException, Form
from pydantic import BaseModel

from app.services.image_enhancement import image_enhancer
from app.services.demo_cache import demo_cache
from app.services.object_detection import object_detector
from app.services.vision_service import vision_service
from app.services.storage import storage

router = APIRouter(prefix="/api/images", tags=["Image Enhancement"])

class ImageEnhanceResponse(BaseModel):
    original_url: str
    enhanced_url: str
    processing_time_ms: int
    width: Optional[int] = None
    height: Optional[int] = None
    model_used: Optional[str] = None
    is_demo_cache: bool = False
    message: Optional[str] = None
    variants: Optional[dict] = None
    cutout_id: Optional[str] = None
    active_preset: Optional[str] = "studio_white"
    tilt_angle_corrected: Optional[float] = 0.0

class ImagePresetRequest(BaseModel):
    cutout_id: str
    preset: str = "studio_white"

class ImagePresetResponse(BaseModel):
    cutout_id: str
    preset: str
    enhanced_url: str
    processing_time_ms: int

class ObjectDetectionResponse(BaseModel):
    count: int
    image_width: int
    image_height: int
    objects: list

class ImageDescriptionResponse(BaseModel):
    caption: str
    title: str
    title_en: Optional[str] = None
    description: str
    description_en: Optional[str] = None
    keywords: list = []
    suggested_price_min: Optional[int] = None
    suggested_price_max: Optional[int] = None
    is_gi_match: Optional[bool] = False
    gi_name: Optional[str] = None
    source: Optional[str] = "blip_llm"
    processing_time_ms: int

@router.post(
    "/detect-objects",
    response_model=ObjectDetectionResponse,
    summary="Multi-Product Detection via YOLOv8n"
)
async def detect_objects(
    file: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None),
):
    """
    Scans raw photo for distinct products/objects before background removal.
    Returns bounding boxes with pixel and percentage coordinates so artisans can
    tap to select which specific item to enhance if multiple are present.
    """
    upload_file = image or file
    if not upload_file:
        raise HTTPException(status_code=422, detail="Please upload an image to detect objects.")

    contents = await upload_file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        result = object_detector.detect_objects(contents)
        return ObjectDetectionResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Object detection failed: {str(e)}")

@router.post(
    "/describe",
    response_model=ImageDescriptionResponse,
    summary="AI Product Description via Vision BLIP + LLM Generator"
)
async def describe_product_image(
    file: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None),
    cutout_id: Optional[str] = Query(None, description="Cutout ID from /api/images/enhance"),
    image_url: Optional[str] = Query(None, description="Remote image URL"),
    language_code: str = Query("hi-IN", description="Language code (hi-IN, en, etc.)"),
    craft_type: Optional[str] = Query(None, description="Optional craft type"),
):
    """
    Generates an automated, SEO-friendly e-commerce product title, description,
    cultural heritage story, and tags from the product photo using Salesforce BLIP
    vision captioning cascaded into ShilpKala's multilingual LLM listing engine.
    """
    image_bytes = None
    upload_file = image or file
    if upload_file:
        image_bytes = await upload_file.read()
    elif cutout_id:
        try:
            image_bytes = storage.download(f"cutouts/{cutout_id}_cutout.png")
        except Exception:
            cached_img = image_enhancer._cutout_cache.get(cutout_id)
            if cached_img:
                buf = io.BytesIO()
                cached_img.save(buf, format="PNG")
                image_bytes = buf.getvalue()

    if not image_bytes:
        raise HTTPException(
            status_code=422,
            detail="Please provide an uploaded image or valid cutout_id to describe."
        )

    try:
        res = vision_service.describe_image(
            image_bytes=image_bytes,
            language_code=language_code,
            craft_type=craft_type,
            image_url=image_url
        )
        return ImageDescriptionResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vision description failed: {str(e)}")

@router.post(
    "/enhance",
    response_model=ImageEnhanceResponse,
    summary="Automatic E-Commerce Product Image Enhancement"
)
async def enhance_image(
    file: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None),
    preset: str = Form("studio_white"),
    preset_query: Optional[str] = Query(None, alias="preset"),
    crop_box: Optional[str] = Form(None),
    crop_box_query: Optional[str] = Query(None, alias="crop_box"),
    demo: bool = Query(False, description="Developer toggle"),
    mode: Optional[str] = Query(None),
):
    """
    Automatic E-Commerce Image Enhancement Pipeline:
    - 1-tap automated pipeline matching Amazon / Flipkart product listing standards.
    - Background removal via pretrained U²-Net model (`rembg`) with alpha matting.
    - Morphological cleanup to eliminate reflection bleed and stray edge noise.
    - Edge-only Gaussian softening to prevent jagged cutout boundaries.
    - Perspective / tilt auto-straightening via OpenCV (`minAreaRect` + `warpAffine`).
    - Centered on clean 1200x1200 square studio backdrop with grounded floor effect.
    - 3 studio gradient presets: 'studio_white' (default), 'warm_neutral', 'cool_gray'.
    - Returns all 3 preset URLs in `variants` for instant client-side switching.
    """
    upload_file = image or file
    if not upload_file:
        raise HTTPException(
            status_code=422,
            detail="No image uploaded. Please include 'image' or 'file' in multipart form data."
        )

    chosen_preset = preset_query or preset or "studio_white"
    chosen_crop_box = crop_box_query or crop_box

    # Demo toggle check
    if demo or mode == "demo":
        res = demo_cache.get_demo_result(query=upload_file.filename)
        return ImageEnhanceResponse(
            original_url=res["original_url"],
            enhanced_url=res["enhanced_url"],
            processing_time_ms=res.get("processing_time_ms", 18),
            model_used="Pre-computed rembg + E-Commerce Studio Compositing",
            is_demo_cache=True,
            message="Served from Demo Reliability Layer",
            variants={
                "studio_white": res["enhanced_url"],
                "warm_neutral": res["enhanced_url"],
                "cool_gray": res["enhanced_url"],
                "enhanced": res["enhanced_url"],
                "original": res["original_url"],
            },
            cutout_id="demo-cutout",
            active_preset=chosen_preset,
            tilt_angle_corrected=0.0
        )

    valid_exts = (".jpg", ".jpeg", ".png", ".webp")
    is_img_type = upload_file.content_type and upload_file.content_type.startswith("image/")
    has_img_ext = upload_file.filename and upload_file.filename.lower().endswith(valid_exts)
    if not is_img_type and not has_img_ext:
        raise HTTPException(status_code=400, detail="Uploaded file must be an image (JPEG/PNG/WEBP).")

    try:
        contents = await upload_file.read()
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="Empty image uploaded.")

        result = image_enhancer.enhance(
            image_bytes=contents,
            original_filename=upload_file.filename or "product.jpg",
            active_preset=chosen_preset,
            crop_box=chosen_crop_box,
        )
        return ImageEnhanceResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image enhancement failed: {str(e)}")

@router.post(
    "/preset",
    response_model=ImagePresetResponse,
    summary="Fast Studio Preset Switching (re-uses cached cutout without re-running rembg)"
)
async def apply_image_preset(
    cutout_id: Optional[str] = Query(None, description="Cached extracted product cutout ID"),
    preset: Optional[str] = Query("studio_white", description="studio_white | warm_neutral | cool_gray"),
    body: Optional[ImagePresetRequest] = None,
):
    cid = (body.cutout_id if body and body.cutout_id else cutout_id)
    chosen_preset = (body.preset if body and body.preset else preset) or "studio_white"
    if not cid:
        raise HTTPException(status_code=422, detail="Missing cutout_id. Please provide cutout_id parameter.")

    try:
        res = image_enhancer.apply_preset(cutout_id=cid, preset=chosen_preset)
        return ImagePresetResponse(
            cutout_id=res["cutout_id"],
            preset=res["active_preset"],
            enhanced_url=res["enhanced_url"],
            processing_time_ms=res["processing_time_ms"]
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply preset: {str(e)}")

@router.post(
    "/enhance/demo",
    response_model=ImageEnhanceResponse,
    summary="Instant Cached Demo Endpoint (<50ms response)"
)
async def enhance_image_demo(
    item_key: Optional[str] = Query(None, description="Demo craft key: pot, saree, wood, bottle, textile"),
    craft_type: Optional[str] = Query(None, description="Craft type name for keyword matching"),
    file: Optional[UploadFile] = File(None, description="Optional uploaded file to match keyword from")
):
    """
    Demo Reliability Layer:
    Pre-run real pipeline results on 4-5 fixed demo products, cached and served instantly (<50ms).
    Use this endpoint for guaranteed instant response during high-stakes judge demos.
    """
    query_str = item_key or craft_type or (file.filename if file else None) or "pot"
    res = demo_cache.get_demo_result(item_key=item_key, query=query_str)

    return ImageEnhanceResponse(
        original_url=res["original_url"],
        enhanced_url=res["enhanced_url"],
        processing_time_ms=res.get("processing_time_ms", 18),
        model_used="Pre-computed u2netp + OpenCV CLAHE (Real Pipeline)",
        is_demo_cache=True,
        message=f"Instantly served cached demo for {res.get('name')}"
    )

@router.get("/demo-items", summary="List available pre-cached demo items")
async def list_demo_items():
    """Returns list of curated items available in the Demo Reliability Layer."""
    return {"items": demo_cache.list_demo_items()}
