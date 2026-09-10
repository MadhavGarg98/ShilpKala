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
    Presets:
    1. studio_white: Soft white-gray radial gradient (Amazon / Flipkart pro studio standard)
    2. warm_neutral: Warm ivory to linen beige (ideal for Indian textiles, pottery, wood)
    3. cool_gray: Crisp ice to slate gray (ideal for brass, metalwork, jewelry)
    """
    y, x = np.ogrid[:height, :width]
    cx, cy = width / 2.0, height * 0.40  # Light source slightly above center
    max_r = np.sqrt(cx**2 + cy**2)
    dist = np.sqrt((x - cx)**2 + (y - cy)**2) / max_r
    dist = np.clip(dist, 0.0, 1.0)

    preset_palettes = {
        "studio_white": (
            np.array([255, 255, 255], dtype=np.float32),  # Center
            np.array([238, 240, 244], dtype=np.float32),  # Perimeter
            np.array([226, 230, 236], dtype=np.float32),  # Floor
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

    # 1. Subtle radial backdrop gradient
    dist_3d = dist[:, :, np.newaxis]
    bg = center_c * (1.0 - dist_3d * 0.85) + edge_c * (dist_3d * 0.85)

    # 2. Floor effect in bottom ~15% with smooth horizon transition
    floor_start = height * 0.85
    floor_factor = np.clip((y - floor_start) / (height - floor_start), 0.0, 1.0)
    floor_blend = (1.0 - np.cos(floor_factor * np.pi)) / 2.0
    floor_blend_3d = floor_blend[:, :, np.newaxis]

    # Subtle horizon shadow at surface junction + floor tone
    bg = bg * (1.0 - floor_blend_3d * 0.07)
    bg = bg * (1.0 - floor_blend_3d) + floor_c * floor_blend_3d

    return Image.fromarray(np.clip(bg, 0, 255).astype(np.uint8), mode="RGB").convert("RGBA")


def auto_straighten_silhouette(
    rgba_np: np.ndarray,
    min_angle: float = 2.0,
    max_angle: float = 28.0
) -> Tuple[np.ndarray, float]:
    """
    Detects product tilt using OpenCV contours & minAreaRect on the alpha mask.
    Straightens using cv2.warpAffine if tilt is visibly askew (between min_angle and max_angle).
    Skips rotation if already straight (< min_angle) or extreme (> max_angle).
    """
    alpha = rgba_np[:, :, 3]
    contours, _ = cv2.findContours(alpha, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return rgba_np, 0.0

    main_contour = max(contours, key=cv2.contourArea)
    if cv2.contourArea(main_contour) < 500:
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

    # Auto-straighten via cv2.warpAffine
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
    logger.info(f"OpenCV auto-straightened product tilt by {deviation:.2f}°")
    return straightened, deviation


def composite_product_on_backdrop(
    product_rgba: Image.Image,
    preset: str = "studio_white",
    canvas_size: int = 1200
) -> Image.Image:
    """
    Composites the extracted product onto an e-commerce studio gradient backdrop with a grounded floor drop shadow.
    """
    canvas = generate_studio_backdrop(canvas_size, canvas_size, preset=preset)
    pw, ph = product_rgba.size

    pos_x = (canvas_size - pw) // 2
    # Ground the product naturally near the floor horizon (~1040px)
    natural_center_y = (canvas_size - ph) // 2
    grounded_y = 1040 - ph
    pos_y = max(80, min(natural_center_y, grounded_y)) if ph < 800 else natural_center_y

    # Ground contact drop shadow
    shadow_layer = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow_layer)

    shadow_w = int(pw * 0.72)
    shadow_h = max(18, int(pw * 0.11))
    center_x = canvas_size // 2
    contact_y = pos_y + ph

    shadow_bbox = [
        center_x - shadow_w // 2,
        contact_y - int(shadow_h * 0.28),
        center_x + shadow_w // 2,
        contact_y + int(shadow_h * 0.72),
    ]
    s_draw.ellipse(shadow_bbox, fill=(30, 32, 38, 80))
    shadow_blurred = shadow_layer.filter(ImageFilter.GaussianBlur(16))
    canvas.paste(shadow_blurred, (0, 0), shadow_blurred)

    # Paste isolated product
    canvas.paste(product_rgba, (pos_x, pos_y), product_rgba)
    return canvas.convert("RGB")


class ImageEnhancementPipeline:
    """
    E-Commerce Product Image Enhancement Pipeline for Indian Artisans:
    1. Background Removal: Pretrained U²-Net via rembg.
    2. Perspective & Tilt Correction: OpenCV minAreaRect + cv2.warpAffine auto-straightening.
    3. Lighting & Color Balancing: PIL ImageEnhance for vibrance, contrast, sharpness.
    4. Centering & Square Marketplace Ratio: 1200x1200 with ~80% product fill.
    5. Soft Studio Gradient & Floor Contact Shadow: Presets (Studio White, Warm Neutral, Cool Gray).
    6. Instant Cutout Caching: Fast preset swapping without re-running background removal.
    """

    def __init__(self):
        self._session = None
        self._cutout_cache: Dict[str, Image.Image] = {}

    @property
    def session(self):
        """Re-use pre-warmed rembg session with u2netp (fast, zero download latency)."""
        if self._session is None:
            try:
                logger.info("Initializing rembg session with 'u2netp'...")
                self._session = rembg.new_session("u2netp")
                logger.info("rembg u2netp session initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to load u2netp session, falling back to default: {e}")
                self._session = rembg.new_session()
        return self._session

    def prewarm(self):
        """Pre-warm model session during application startup."""
        try:
            _ = self.session
        except Exception as e:
            logger.warning(f"rembg prewarm failed: {e}")

    def apply_preset(self, cutout_id: str, preset: str = "studio_white") -> Dict[str, Any]:
        """
        Fast preset re-compositing without re-running background removal.
        Retrieves cached RGBA cutout and returns new composite in < 20ms.
        """
        start_time = time.perf_counter()
        product_rgba = self._cutout_cache.get(cutout_id)

        if product_rgba is None:
            # Attempt to fetch cutout from storage
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
        logger.info(f"Applied preset '{preset}' to {cutout_id} in {elapsed_ms}ms")

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

        # 1. Load original image with correct EXIF orientation
        try:
            pil_raw = Image.open(io.BytesIO(image_bytes))
            pil_orig = ImageOps.exif_transpose(pil_raw).convert("RGB")
        except Exception as img_err:
            logger.error(f"Error opening image: {img_err}")
            raise ValueError(f"Invalid or corrupt image format: {img_err}")

        # Optional multi-product selection crop
        if crop_box:
            try:
                parts = [int(float(p.strip())) for p in crop_box.split(",") if p.strip()]
                if len(parts) == 4:
                    x1, y1, x2, y2 = parts
                    ow, oh = pil_orig.size
                    pad_x = int((x2 - x1) * 0.06)
                    pad_y = int((y2 - y1) * 0.06)
                    cx1 = max(0, x1 - pad_x)
                    cy1 = max(0, y1 - pad_y)
                    cx2 = min(ow, x2 + pad_x)
                    cy2 = min(oh, y2 + pad_y)
                    pil_orig = pil_orig.crop((cx1, cy1, cx2, cy2))
                    logger.info(f"Cropped raw image to selected product box: ({cx1}, {cy1}, {cx2}, {cy2})")
            except Exception as crop_err:
                logger.warning(f"Could not crop to specified crop_box '{crop_box}': {crop_err}")

        orig_w, orig_h = pil_orig.size

        # Save original photo via storage service
        orig_key = f"originals/{file_uuid}_{Path(original_filename).name}"
        orig_url = storage.upload(image_bytes, orig_key, content_type="image/jpeg")

        tilt_corrected = 0.0
        try:
            # 2. Pre-scale for optimal inference latency if original is giant
            MAX_INFERENCE_EDGE = 1400
            working_img = pil_orig.copy()
            if max(orig_w, orig_h) > MAX_INFERENCE_EDGE:
                scale = MAX_INFERENCE_EDGE / max(orig_w, orig_h)
                new_dim = (int(orig_w * scale), int(orig_h * scale))
                working_img = working_img.resize(new_dim, Image.Resampling.LANCZOS)

            # 3. Background removal using rembg with alpha matting to clean complex edges
            logger.info("Running background removal via rembg with alpha matting...")
            try:
                no_bg_rgba = rembg.remove(
                    working_img,
                    session=self.session,
                    alpha_matting=True,
                    alpha_matting_foreground_threshold=240,
                    alpha_matting_background_threshold=10,
                    alpha_matting_erode_size=10,
                )
            except Exception as am_err:
                logger.warning(f"Alpha matting fallback to standard remove: {am_err}")
                no_bg_rgba = rembg.remove(working_img, session=self.session)

            # 4. Remove faint reflection marks & noise via morphological opening + edge softening
            rgba_np = np.array(no_bg_rgba)
            alpha = rgba_np[:, :, 3]

            # Suppress faint streak/reflection noise bleeding (< 20)
            alpha_thresh = np.where(alpha < 20, 0, alpha).astype(np.uint8)

            # Morphological OPEN (erode then dilate) kills small stray pixel clusters & streaks
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
            alpha_opened = cv2.morphologyEx(alpha_thresh, cv2.MORPH_OPEN, kernel, iterations=1)

            # Soften cutout edge with gentle Gaussian blur (radius ~1.2px) to prevent jagged cutout
            alpha_feathered = cv2.GaussianBlur(alpha_opened, (3, 3), 1.2)
            rgba_np[:, :, 3] = alpha_feathered

            # 5. Perspective / Tilt Correction using OpenCV
            straightened_np, tilt_corrected = auto_straighten_silhouette(rgba_np)
            isolated_prod = Image.fromarray(straightened_np)

            # 6. Crop tightly to alpha bounding box
            alpha = isolated_prod.split()[3]
            bbox = alpha.getbbox()
            if bbox is not None:
                isolated_prod = isolated_prod.crop(bbox)

            pw, ph = isolated_prod.size

            # 6. Scale product to fill ~80% of square canvas (Amazon/Flipkart listing standard)
            target_max_dim = int(canvas_size * 0.80)  # 960px for 1200x1200
            scale_factor = target_max_dim / max(pw, ph)
            scaled_w = max(1, int(round(pw * scale_factor)))
            scaled_h = max(1, int(round(ph * scale_factor)))
            scaled_prod = isolated_prod.resize((scaled_w, scaled_h), Image.Resampling.LANCZOS)

            # 7. Auto-correct lighting and color (PIL ImageEnhance)
            prod_rgb = scaled_prod.convert("RGB")
            prod_alpha = scaled_prod.split()[3]

            prod_rgb = ImageEnhance.Brightness(prod_rgb).enhance(1.04)
            prod_rgb = ImageEnhance.Contrast(prod_rgb).enhance(1.08)
            prod_rgb = ImageEnhance.Color(prod_rgb).enhance(1.12)
            prod_rgb = ImageEnhance.Sharpness(prod_rgb).enhance(1.25)

            prod_enhanced = Image.merge("RGBA", (*prod_rgb.split(), prod_alpha))

            # Cache the extracted product RGBA for instant preset switching
            self._cutout_cache[file_uuid] = prod_enhanced
            try:
                cutout_buf = io.BytesIO()
                prod_enhanced.save(cutout_buf, format="PNG")
                storage.upload(cutout_buf.getvalue(), f"cutouts/{file_uuid}_cutout.png", content_type="image/png")
            except Exception as store_err:
                logger.warning(f"Could not persist cutout to storage: {store_err}")

            # 8. Composite onto all 3 studio presets
            preset_urls = {}
            for preset_key in ["studio_white", "warm_neutral", "cool_gray"]:
                comp = composite_product_on_backdrop(prod_enhanced, preset=preset_key, canvas_size=canvas_size)
                buf = io.BytesIO()
                comp.save(buf, format="JPEG", quality=95, optimize=True)
                url = storage.upload(buf.getvalue(), f"enhanced/{file_uuid}_{preset_key}.jpg", content_type="image/jpeg")
                preset_urls[preset_key] = url

            primary_enhanced_url = preset_urls.get(active_preset, preset_urls["studio_white"])

        except Exception as proc_err:
            logger.exception(f"Enhancement pipeline failed: {proc_err}. Falling back to centered crop.")
            # Fallback: create 1200x1200 studio canvas and center auto-enhanced original
            fallback_canvas = generate_studio_backdrop(canvas_size, canvas_size, preset="studio_white").convert("RGB")
            target_max_dim = int(canvas_size * 0.85)
            scale = target_max_dim / max(orig_w, orig_h)
            fw = int(round(orig_w * scale))
            fh = int(round(orig_h * scale))
            fallback_prod = pil_orig.resize((fw, fh), Image.Resampling.LANCZOS)
            fallback_prod = ImageEnhance.Brightness(fallback_prod).enhance(1.05)
            fallback_prod = ImageEnhance.Contrast(fallback_prod).enhance(1.10)
            fallback_prod = ImageEnhance.Sharpness(fallback_prod).enhance(1.20)
            px = (canvas_size - fw) // 2
            py = (canvas_size - fh) // 2
            fallback_canvas.paste(fallback_prod, (px, py))

            buf = io.BytesIO()
            fallback_canvas.save(buf, format="JPEG", quality=95, optimize=True)
            primary_enhanced_url = storage.upload(buf.getvalue(), f"enhanced/{file_uuid}_studio_white.jpg", content_type="image/jpeg")
            preset_urls = {
                "studio_white": primary_enhanced_url,
                "warm_neutral": primary_enhanced_url,
                "cool_gray": primary_enhanced_url,
            }

        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        logger.info(f"Studio enhancement complete in {elapsed_ms}ms ({canvas_size}x{canvas_size}, tilt: {tilt_corrected:.1f}°)")

        return {
            "original_url": orig_url,
            "enhanced_url": primary_enhanced_url,
            "cutout_id": file_uuid,
            "active_preset": active_preset,
            "tilt_angle_corrected": tilt_corrected,
            "processing_time_ms": elapsed_ms,
            "width": canvas_size,
            "height": canvas_size,
            "model_used": "rembg (u2net) + OpenCV Straightening + Studio Compositing",
            "is_demo_cache": False,
            "variants": {
                **preset_urls,
                "enhanced": primary_enhanced_url,
                "original": orig_url,
            },
        }

# Singleton instance
image_enhancer = ImageEnhancementPipeline()

