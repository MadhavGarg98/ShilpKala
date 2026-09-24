import io
import time
import logging
from typing import Dict, Any, Optional
from PIL import Image, ImageOps

from app.services.listing_generator import listing_generator
from app.services.object_detection import object_detector

logger = logging.getLogger(__name__)

class VisionDescriptorService:
    """
    Vision-Language Product Description Service for ShilpKala.
    1. Generates base visual caption using Salesforce BLIP via HuggingFace transformers.
    2. Enriches the caption via ShilpKala's multi-tier LLM listing generator (Groq / Anthropic).
    3. Produces marketplace product title, full description, artisan heritage story, and tags.
    """

    def __init__(self):
        self._blip_processor = None
        self._blip_model = None
        self._is_blip_failed = False

    def _get_blip(self):
        if self._blip_model is None and not self._is_blip_failed:
            try:
                from transformers import BlipProcessor, BlipForConditionalGeneration
                model_name = "Salesforce/blip-image-captioning-base"
                # Check for locally cached weights first to prevent blocking HTTP requests on 1GB download
                self._blip_processor = BlipProcessor.from_pretrained(model_name, local_files_only=True)
                self._blip_model = BlipForConditionalGeneration.from_pretrained(model_name, local_files_only=True)
                logger.info("BLIP image captioning model loaded from local cache.")
            except Exception as e:
                logger.info(f"BLIP model not cached locally ({e}); utilizing craft-aware vision descriptor.")
                self._is_blip_failed = True
        return self._blip_processor, self._blip_model

    def generate_base_caption(self, pil_image: Image.Image) -> str:
        """Runs BLIP conditional generation to produce a descriptive base caption."""
        processor, model = self._get_blip()

        if processor is not None and model is not None:
            try:
                logger.info("Using BLIP model for caption generation")
                inputs = processor(pil_image, return_tensors="pt")
                out = model.generate(**inputs, max_new_tokens=45)
                caption = processor.decode(out[0], skip_special_tokens=True).strip()
                if caption:
                    logger.info(f"BLIP generated caption: '{caption}'")
                    return caption.capitalize()
            except Exception as blip_err:
                logger.warning(f"BLIP inference warning: {blip_err}")
                logger.info("Falling back to YOLO-based detection")

        # Intelligent vision fallback using actual YOLO detections
        # Build caption from real detected objects, not hardcoded craft descriptions
        logger.info("BLIP not available, using YOLO-based object detection for caption generation")
        buf = io.BytesIO()
        pil_image.save(buf, format="JPEG")
        det = object_detector.detect_objects(buf.getvalue(), conf_threshold=0.20)
        labels = [obj["label"].lower() for obj in det.get("objects", [])]
        logger.info(f"YOLO detected objects: {labels}")

        if labels:
            # Build caption from actual detected objects
            unique_labels = list(set(labels))
            if len(unique_labels) == 1:
                return f"A {unique_labels[0]}"
            else:
                return f"A {', '.join(unique_labels[:-1])} and {unique_labels[-1]}"
        else:
            logger.warning("No specific objects detected, using generic fallback")
            return "A product item"

    def describe_image(
        self,
        image_bytes: bytes,
        language_code: str = "hi-IN",
        craft_type: Optional[str] = None,
        image_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Takes product image bytes, generates visual caption via BLIP,
        and expands it through ShilpKala's structured LLM generator.
        """
        start_time = time.perf_counter()
        pil_raw = Image.open(io.BytesIO(image_bytes))
        pil_img = ImageOps.exif_transpose(pil_raw).convert("RGB")

        # 1. Generate base visual caption
        base_caption = self.generate_base_caption(pil_img)
        logger.info(f"Vision base caption: '{base_caption}'")

        # 2. Expand via ShilpKala's listing generator
        listing_res = listing_generator.generate(
            transcript=base_caption,
            language_code=language_code,
            image_url=image_url,
            craft_type=craft_type or "Handicraft & Artisan Goods"
        )

        elapsed_ms = int((time.perf_counter() - start_time) * 1000)

        # Assemble clean, user-friendly response
        title = listing_res.get("title_english") or listing_res.get("title") or "Handcrafted Artisan Product"
        title_local = listing_res.get("title") or title
        desc = listing_res.get("description_local") or listing_res.get("description_en") or base_caption
        desc_en = listing_res.get("description_en") or desc

        # Determine source for logging
        source = listing_res.get("source", "blip_llm")
        if "demo" in source.lower() or "cache" in source.lower():
            logger.warning(f"⚠️ DEMO CACHE RESPONSE - source: {source}")
        else:
            logger.info(f"✓ REAL PIPELINE RESPONSE - source: {source}")

        return {
            "caption": base_caption,
            "title": title_local,
            "title_en": title,
            "description": desc,
            "description_en": desc_en,
            "keywords": listing_res.get("keywords", ["Handmade", "IndianCraft", "Artisan"]),
            "suggested_price_min": listing_res.get("suggested_price_min", 450),
            "suggested_price_max": listing_res.get("suggested_price_max", 1200),
            "is_gi_match": listing_res.get("is_gi_match", False),
            "gi_name": listing_res.get("gi_name"),
            "source": source,
            "processing_time_ms": elapsed_ms,
        }

vision_service = VisionDescriptorService()
