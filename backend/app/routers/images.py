import time
from typing import Optional
from fastapi import APIRouter, File, UploadFile, Query, HTTPException, Form
from pydantic import BaseModel

from app.services.image_enhancement import image_enhancer
from app.services.demo_cache import demo_cache

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

@router.post(
    "/enhance",
    response_model=ImageEnhanceResponse,
    summary="Real Image Enhancement Pipeline (u2netp + OpenCV CLAHE + Super-Resolution)"
)
async def enhance_image(
    file: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None),
    demo: bool = Query(False, description="Developer toggle: if true, routes to instant demo cache"),
    mode: Optional[str] = Query(None, description="Set to 'demo' to test cached pathway"),
    backdrop: bool = Query(True, description="Apply clean studio vignette backdrop")
):
    """
    Genuine Image Enhancement Endpoint:
    - Reads raw craft photo from client.
    - Caps longest edge at 800px to maintain CPU-friendly live demo latency.
    - Background removal via lightweight `u2netp` model specifically.
    - OpenCV CLAHE (Contrast Limited Adaptive Histogram Equalization) in LAB space.
    - Detail recovery and studio compositing.
    - Measures and returns real processing_time_ms.
    """
    upload_file = image or file
    if not upload_file:
        raise HTTPException(
            status_code=422,
            detail="No image uploaded. Please include 'image' or 'file' in multipart form data."
        )

    # Demo toggle check (for controlled live testing or safety net)
    if demo or mode == "demo":
        res = demo_cache.get_demo_result(query=upload_file.filename)
        return ImageEnhanceResponse(
            original_url=res["original_url"],
            enhanced_url=res["enhanced_url"],
            processing_time_ms=res.get("processing_time_ms", 18),
            model_used="Pre-computed u2netp + OpenCV CLAHE",
            is_demo_cache=True,
            message="Served from Demo Reliability Layer"
        )

    # Validate file type
    if not upload_file.content_type or not upload_file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image (JPEG/PNG/WEBP).")

    contents = await upload_file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty image uploaded.")

    try:
        result = image_enhancer.enhance(
            image_bytes=contents,
            original_filename=upload_file.filename or "product.jpg",
            apply_studio_backdrop=backdrop
        )
        return ImageEnhanceResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image enhancement failed: {str(e)}")

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
