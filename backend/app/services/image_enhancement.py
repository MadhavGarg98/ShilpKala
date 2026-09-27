import io
import time
import uuid
import logging
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance, ImageOps, ImageDraw
import rembg

from app.services.storage import storage

logger = logging.getLogger(__name__)

def generate_studio_backdrop(width: int = 1200, height: int = 1200, preset: str = "studio_white") -> Image.Image:
    """
    Generates an e-commerce studio gradient backdrop with a grounded floor horizon.
    """
    y, x = np.ogrid[:height, :width]
    cx, cy = width / 2.0, height * 0.40
    max_r = np.sqrt(cx**2 + cy**2)
    dist = np.sqrt((x - cx)**2 + (y - cy)**2) / max_r
    dist = np.clip(dist, 0.0, 1.0)

    preset_palettes = {
        "studio_white": (
            np.array([255, 255, 255], dtype=np.float32),  # Center
            np.array([245, 246, 248], dtype=np.float32),  # Perimeter
            np.array([238, 240, 244], dtype=np.float32),  # Floor
        ),
        "warm_neutral": (
            np.array([255, 253, 248], dtype=np.float32),
            np.array([244, 238, 228], dtype=np.float32),
            np.array([232, 224, 212], dtype=np.float32),
        ),
        "cool_gray": (
            np.array([252, 253, 255], dtype=np.float32),
            np.array([228, 234, 241], dtype=np.float32),
            np.array([216, 224, 232], dtype=np.float32),
        ),
    }

    center_c, edge_c, floor_c = preset_palettes.get(preset, preset_palettes["studio_white"])

    dist_3d = dist[:, :, np.newaxis]
    bg = center_c * (1.0 - dist_3d * 0.45) + edge_c * (dist_3d * 0.45)

    floor_start = height * 0.88
    floor_factor = np.clip((y - floor_start) / (height - floor_start), 0.0, 1.0)
    floor_blend = (1.0 - np.cos(floor_factor * np.pi)) / 2.0
    floor_blend_3d = floor_blend[:, :, np.newaxis]

    bg = bg * (1.0 - floor_blend_3d * 0.04)
    bg = bg * (1.0 - floor_blend_3d) + floor_c * floor_blend_3d

    return Image.fromarray(np.clip(bg, 0, 255).astype(np.uint8), mode="RGB").convert("RGBA")


def auto_straighten_silhouette(
    rgba_np: np.ndarray,
    min_angle: float = 2.0,
    max_angle: float = 25.0
) -> Tuple[np.ndarray, float]:
    alpha = rgba_np[:, :, 3]
    contours, _ = cv2.findContours(alpha, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return rgba_np, 0.0

    main_contour = max(contours, key=cv2.contourArea)
    if cv2.contourArea(main_contour) < 1500:
        return rgba_np, 0.0

    rect = cv2.minAreaRect(main_contour)
    pts = cv2.boxPoints(rect)
    e1 = pts[1] - pts[0]
    e2 = pts[2] - pts[1]
    p_edge = e1 if np.linalg.norm(e1) > np.linalg.norm(e2) else e2
    deg = np.degrees(np.arctan2(p_edge[1], p_edge[0]))
    deviation = float((deg + 45) % 90 - 45)

    if abs(deviation) < min_angle or abs(deviation) > max_angle:
        return rgba_np, 0.0

    (cx, cy) = rect[0]
    rot_matrix = cv2.getRotationMatrix2D((cx, cy), deviation, 1.0)
    ih, iw = rgba_np.shape[:2]
    cos = np.abs(rot_matrix[0, 0])
    sin = np.abs(rot_matrix[0, 1])
    nw = int((ih * sin) + (iw * cos))
    nh = int((ih * cos) + (iw * sin))
    rot_matrix[0, 2] += (nw / 2) - cx
    rot_matrix[1, 2] += (nh / 2) - cy

    straightened = cv2.warpAffine(
        rgba_np,
        rot_matrix,
        (nw, nh),
        flags=cv2.INTER_LANCZOS4,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0, 0)
    )
    return straightened, deviation


def composite_product_on_backdrop(
    product_rgba: Image.Image,
    preset: str = "studio_white",
    canvas_size: int = 1200
) -> Image.Image:
    canvas = generate_studio_backdrop(canvas_size, canvas_size, preset=preset)
    pw, ph = product_rgba.size

    pos_x = (canvas_size - pw) // 2
    # Shift slightly lower to sit naturally on the gradient "floor"
    pos_y = (canvas_size - ph) // 2 + int(canvas_size * 0.04)

    # --- E-Commerce Floor Contact Shadow ---
    shadow_layer = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow_layer)

    # Center the shadow exactly at the base of the object
    center_x = canvas_size // 2
    base_y = pos_y + ph

    # Base shadow dimensions based on product width
    shadow_w = int(pw * 0.65)
    shadow_h = max(20, int(pw * 0.12))

    # 1. Dark, tight contact shadow (where the object physically touches the floor)
    contact_bbox = [
        center_x - shadow_w // 2,
        base_y - int(shadow_h * 0.4),
        center_x + shadow_w // 2,
        base_y + int(shadow_h * 0.4),
    ]
    s_draw.ellipse(contact_bbox, fill=(15, 18, 22, 160))
    contact_shadow = shadow_layer.filter(ImageFilter.GaussianBlur(6))
    canvas.paste(contact_shadow, (0, 0), contact_shadow)

    # 2. Wide, soft ambient floor shadow (diffused light blocking)
    ambient_bbox = [
        center_x - int(shadow_w * 1.3) // 2,
        base_y - int(shadow_h * 0.8),
        center_x + int(shadow_w * 1.3) // 2,
        base_y + int(shadow_h * 0.8),
    ]
    s_draw.ellipse(ambient_bbox, fill=(20, 22, 26, 60))
    ambient_shadow = shadow_layer.filter(ImageFilter.GaussianBlur(24))
    canvas.paste(ambient_shadow, (0, 0), ambient_shadow)

    # Paste the crisp product over the floor shadows
    canvas.paste(product_rgba, (pos_x, pos_y), product_rgba)
    
    return canvas.convert("RGB")


class ImageEnhancementPipeline:
    def __init__(self):
        self._session = None
        self._cutout_cache: Dict[str, Image.Image] = {}

    @property
    def session(self):
        """Use high-resolution IS-Net or U2-Net for high-fidelity edge extraction."""
        if self._session is None:
            for model_name in ["isnet-general-use", "u2net"]:
                try:
                    logger.info(f"Initializing rembg with model '{model_name}'...")
                    self._session = rembg.new_session(model_name)
                    logger.info(f"Loaded rembg model: {model_name}")
                    break
                except Exception as e:
                    logger.warning(f"Failed to load '{model_name}': {e}. Trying fallback...")
            
            if self._session is None:
                self._session = rembg.new_session("u2netp")
        return self._session

    def prewarm(self):
        try:
            _ = self.session
        except Exception as e:
            logger.warning(f"rembg prewarm failed: {e}")

    def apply_preset(self, cutout_id: str, preset: str = "studio_white") -> Dict[str, Any]:
        start_time = time.perf_counter()
        product_rgba = self._cutout_cache.get(cutout_id)

        if product_rgba is None:
            try:
                cutout_bytes = storage.download(f"cutouts/{cutout_id}_cutout.png")
                product_rgba = Image.open(io.BytesIO(cutout_bytes)).convert("RGBA")
                self._cutout_cache[cutout_id] = product_rgba
            except Exception as e:
                logger.error(f"Cutout {cutout_id} not found: {e}")
                raise ValueError(f"Extracted product {cutout_id} not found in cache.")

        composite_img = composite_product_on_backdrop(product_rgba, preset=preset, canvas_size=1200)

        buf = io.BytesIO()
        composite_img.save(buf, format="JPEG", quality=95, optimize=True)
        enh_bytes = buf.getvalue()

        enh_key = f"enhanced/{cutout_id}_{preset}.jpg"
        enh_url = storage.upload(enh_bytes, enh_key, content_type="image/jpeg")

        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        return {
            "cutout_id": cutout_id,
            "active_preset": preset,
            "enhanced_url": enh_url,
            "processing_time_ms": elapsed_ms,
        }

    def enhance(
        self,
        image_bytes: bytes,
        original_filename: str = "product.jpg",
        canvas_size: int = 1200,
        active_preset: str = "studio_white",
        crop_box: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        start_time = time.perf_counter()
        file_uuid = uuid.uuid4().hex[:12]

        try:
            pil_raw = Image.open(io.BytesIO(image_bytes))
            pil_orig = ImageOps.exif_transpose(pil_raw).convert("RGB")
        except Exception as img_err:
            logger.error(f"Error opening image: {img_err}")
            raise ValueError(f"Invalid or corrupt image format: {img_err}")

        orig_w, orig_h = pil_orig.size

        # Save original photo
        orig_key = f"originals/{file_uuid}_{Path(original_filename).name}"
        orig_url = storage.upload(image_bytes, orig_key, content_type="image/jpeg")

        tilt_corrected = 0.0
        try:
            # 1. Scale down slightly only if image is excessively large
            MAX_INFERENCE_EDGE = 1600
            working_img = pil_orig.copy()
            if max(orig_w, orig_h) > MAX_INFERENCE_EDGE:
                scale = MAX_INFERENCE_EDGE / max(orig_w, orig_h)
                new_dim = (int(orig_w * scale), int(orig_h * scale))
                working_img = working_img.resize(new_dim, Image.Resampling.LANCZOS)

            # 2. Extract background cleanly with post_process_mask
            logger.info("Executing background removal...")
            no_bg_rgba = rembg.remove(
                working_img,
                session=self.session,
                post_process_mask=True
            )

            rgba_np = np.array(no_bg_rgba)
            alpha = rgba_np[:, :, 3]

            # Crisp thresholding: remove faint background haze while preserving thin elements
            alpha[alpha < 35] = 0
            rgba_np[:, :, 3] = alpha

            # 3. Perspective auto-straighten
            straightened_np, tilt_corrected = auto_straighten_silhouette(rgba_np)
            isolated_prod = Image.fromarray(straightened_np)

            # 4. Crop tightly to bounding box
            alpha_chan = isolated_prod.split()[3]
            bbox = alpha_chan.getbbox()
            if bbox is not None:
                isolated_prod = isolated_prod.crop(bbox)

            pw, ph = isolated_prod.size

            # 5. Fit within 82% of square canvas
            target_max_dim = int(canvas_size * 0.82)
            scale_factor = target_max_dim / max(pw, ph)
            scaled_w = max(1, int(round(pw * scale_factor)))
            scaled_h = max(1, int(round(ph * scale_factor)))
            scaled_prod = isolated_prod.resize((scaled_w, scaled_h), Image.Resampling.LANCZOS)

            # 6. E-commerce studio lighting & exposure boost
            prod_rgb = scaled_prod.convert("RGB")
            prod_alpha = scaled_prod.split()[3]

            # Boost brightness & contrast so the subject does not look muddy against pure white
            prod_rgb = ImageEnhance.Brightness(prod_rgb).enhance(1.10)
            prod_rgb = ImageEnhance.Contrast(prod_rgb).enhance(1.14)
            prod_rgb = ImageEnhance.Color(prod_rgb).enhance(1.15)
            prod_rgb = ImageEnhance.Sharpness(prod_rgb).enhance(1.30)

            prod_enhanced = Image.merge("RGBA", (*prod_rgb.split(), prod_alpha))

            # Cache the cutout
            self._cutout_cache[file_uuid] = prod_enhanced
            try:
                cutout_buf = io.BytesIO()
                prod_enhanced.save(cutout_buf, format="PNG")
                storage.upload(cutout_buf.getvalue(), f"cutouts/{file_uuid}_cutout.png", content_type="image/png")
            except Exception as store_err:
                logger.warning(f"Could not persist cutout: {store_err}")

            # 7. Render presets
            preset_urls = {}
            for preset_key in ["studio_white", "warm_neutral", "cool_gray"]:
                comp = composite_product_on_backdrop(prod_enhanced, preset=preset_key, canvas_size=canvas_size)
                buf = io.BytesIO()
                comp.save(buf, format="JPEG", quality=95, optimize=True)
                url = storage.upload(buf.getvalue(), f"enhanced/{file_uuid}_{preset_key}.jpg", content_type="image/jpeg")
                preset_urls[preset_key] = url

            primary_enhanced_url = preset_urls.get(active_preset, preset_urls["studio_white"])

        except Exception as proc_err:
            logger.exception(f"Enhancement error: {proc_err}")
            raise HTTPException(status_code=500, detail=f"Image processing failed: {proc_err}")

        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        return {
            "original_url": orig_url,
            "enhanced_url": primary_enhanced_url,
            "cutout_id": file_uuid,
            "active_preset": active_preset,
            "tilt_angle_corrected": tilt_corrected,
            "processing_time_ms": elapsed_ms,
            "width": canvas_size,
            "height": canvas_size,
            "model_used": "rembg (isnet-general-use / u2net) + Studio Compositing",
            "is_demo_cache": False,
            "variants": {
                **preset_urls,
                "enhanced": primary_enhanced_url,
                "original": orig_url,
            },
        }

# Singleton instance
image_enhancer = ImageEnhancementPipeline()