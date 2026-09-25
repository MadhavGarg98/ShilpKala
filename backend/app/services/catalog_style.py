"""
Catalog Style Configuration & Finishing Renderer
================================================
Single source of truth for the ShilpKala catalog finishing stage (Stage 3).

All visual output of /api/images/enhance is controlled by the constants in
this module -- canvas dimensions, product framing, backdrop color, drop
shadow, color grade, and border -- so restyling the catalog look is a
pure-constants change with zero pipeline edits.
"""

from typing import Tuple, Optional
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

# ---------------------------------------------------------------------------
# Canvas & framing
# ---------------------------------------------------------------------------
CANVAS_SIZE: Tuple[int, int] = (1000, 1000)   # square marketplace canvas (W, H)
PRODUCT_FILL_RATIO: float = 0.78              # product height as fraction of canvas height

# ---------------------------------------------------------------------------
# Backdrop (flat studio background)
# ---------------------------------------------------------------------------
# Matches frontend theme: frontend/src/theme/colors.js -> background.cream
BACKDROP_COLOR: str = "#FDFBF7"

# ---------------------------------------------------------------------------
# Soft elliptical drop shadow beneath the product
# ---------------------------------------------------------------------------
SHADOW_BLUR_RADIUS: int = 28        # PIL GaussianBlur radius on the shadow layer
SHADOW_OPACITY: int = 70            # 0-255 peak alpha of the shadow ellipse
SHADOW_OFFSET_Y: int = 26           # vertical offset of the shadow below the product
SHADOW_WIDTH_RATIO: float = 0.66    # shadow ellipse width relative to product width

# ---------------------------------------------------------------------------
# Final color grade (applied to the fully composited canvas)
#   contrast / saturation are multiplicative PIL ImageEnhance factors.
#   warmth is an additive B-channel (RGB) shift in 8-bit levels:
#   positive warms (yellow/red cast), negative cools (blue cast).
# ---------------------------------------------------------------------------
COLOR_GRADE_PRESET = {
    "contrast": 1.06,
    "saturation": 1.04,
    "warmth": 2,
}

# ---------------------------------------------------------------------------
# Optional thin border around the canvas edge
# ---------------------------------------------------------------------------
BORDER_ENABLED: bool = False
BORDER_COLOR: str = "#E8E2D6"
BORDER_WIDTH: int = 2


def _hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    h = hex_color.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


BACKDROP_RGB: Tuple[int, int, int] = _hex_to_rgb(BACKDROP_COLOR)
BORDER_RGB: Tuple[int, int, int] = _hex_to_rgb(BORDER_COLOR)


def render_catalog_finish(product_rgba: Image.Image, canvas_size: Optional[Tuple[int, int]] = None) -> Image.Image:
    """
    Stage 3 -- Catalog Finishing.

    Renders an RGBA product cutout onto the standard ShilpKala catalog canvas:
      1. Scale product so it occupies PRODUCT_FILL_RATIO of canvas height
         (never wider than the canvas) and center it.
      2. Composite onto a flat BACKDROP_COLOR canvas.
      3. Soft elliptical drop shadow (GaussianBlur layer composited before
         the product layer) anchored near the product's base line.
      4. COLOR_GRADE_PRESET applied to the full canvas (Color + Contrast +
         additive warmth).
      5. Optional thin border in BORDER_COLOR.

    Returns a finished RGB PIL Image of exactly CANVAS_SIZE.
    """
    cw, ch = canvas_size if canvas_size else CANVAS_SIZE

    # -- 1. Frame the product ------------------------------------------------
    pw, ph = product_rgba.size
    target_h = int(ch * PRODUCT_FILL_RATIO)
    scale = min(target_h / max(ph, 1), (cw * 0.92) / max(pw, 1))  # height fill, width safety clamp
    new_w = max(1, int(round(pw * scale)))
    new_h = max(1, int(round(ph * scale)))
    product = product_rgba.resize((new_w, new_h), Image.Resampling.LANCZOS)

    pos_x = (cw - new_w) // 2
    # Vertical framing: center-ish, nudged slightly below center; tall products
    # are clamped so the base sits above a 12% bottom margin, leaving room for
    # the drop shadow and keeping the product off the canvas edge.
    pos_y = (ch - new_h) // 2 + int(ch * 0.05)
    pos_y = min(pos_y, ch - int(ch * 0.12) - new_h)
    pos_y = max(pos_y, int(ch * 0.04))

    # -- 2. Flat backdrop canvas --------------------------------------------
    canvas = Image.new("RGBA", (cw, ch), (*BACKDROP_RGB, 255))

    # -- 3. Soft elliptical drop shadow (under the product layer) ------------
    shadow_w = max(24, int(new_w * SHADOW_WIDTH_RATIO))
    shadow_h = max(10, int(new_h * 0.055))
    shadow_cx = pos_x + new_w // 2
    shadow_base = pos_y + new_h  # product's base line

    shadow_layer = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow_layer)
    s_draw.ellipse(
        (
            shadow_cx - shadow_w // 2,
            shadow_base - shadow_h // 2 + SHADOW_OFFSET_Y,
            shadow_cx + shadow_w // 2,
            shadow_base + shadow_h // 2 + SHADOW_OFFSET_Y,
        ),
        fill=(30, 28, 24, SHADOW_OPACITY),
    )
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(SHADOW_BLUR_RADIUS))
    canvas = Image.alpha_composite(canvas, shadow_layer)

    # Product composited above its shadow
    canvas.paste(product, (pos_x, pos_y), product)

    canvas_rgb = canvas.convert("RGB")

    # -- 4. Final color grade ------------------------------------------------
    grade = COLOR_GRADE_PRESET
    canvas_rgb = ImageEnhance.Color(canvas_rgb).enhance(grade.get("saturation", 1.0))
    canvas_rgb = ImageEnhance.Contrast(canvas_rgb).enhance(grade.get("contrast", 1.0))

    warmth = grade.get("warmth", 0)
    if warmth:
        # Cheap additive warmth: shift the blue channel (PIL RGB).
        r, g, b = canvas_rgb.split()
        b = b.point(lambda v: max(0, min(255, v + warmth)))
        canvas_rgb = Image.merge("RGB", (r, g, b))

    # -- 5. Optional border ---------------------------------------------------
    if BORDER_ENABLED and BORDER_WIDTH > 0:
        d = ImageDraw.Draw(canvas_rgb)
        d.rectangle(
            [0, 0, cw - 1, ch - 1],
            outline=BORDER_RGB,
            width=BORDER_WIDTH,
        )

    return canvas_rgb
