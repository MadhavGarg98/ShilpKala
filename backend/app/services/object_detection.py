import io
import logging
from typing import List, Dict, Any, Optional
from PIL import Image, ImageOps
from ultralytics import YOLO

logger = logging.getLogger(__name__)

class ObjectDetectionService:
    """
    Real-time multi-product object detector for ShilpKala.
    Uses YOLOv8n (ultralytics open weights) to detect distinct craft objects in frame
    so artisans can select which product to isolate before background removal.
    """

    def __init__(self):
        self._model = None

    @property
    def model(self):
        """Lazy load lightweight YOLOv8n model (~6MB)."""
        if self._model is None:
            logger.info("Initializing YOLOv8n object detection model...")
            self._model = YOLO("yolov8n.pt")
            logger.info("YOLOv8n object detection model ready.")
        return self._model

    def detect_objects(self, image_bytes: bytes, conf_threshold: float = 0.25) -> Dict[str, Any]:
        """
        Detects objects in the uploaded photo and returns bounding boxes with
        both pixel coordinates and percentage coordinates for responsive frontend overlay rendering.
        """
        pil_raw = Image.open(io.BytesIO(image_bytes))
        pil_img = ImageOps.exif_transpose(pil_raw).convert("RGB")
        w, h = pil_img.size

        # Run inference
        results = self.model(pil_img, conf=conf_threshold, verbose=False)
        detected_boxes = []

        # Filter out obvious non-craft categories (e.g. 'person') if other objects exist
        raw_boxes = list(results[0].boxes)
        has_craft_objects = any(
            self.model.names[int(b.cls[0])] not in ["person", "chair", "couch", "bed"]
            for b in raw_boxes
        )

        idx = 0
        for b in raw_boxes:
            cls_id = int(b.cls[0])
            label = self.model.names[cls_id]
            conf = float(b.conf[0])

            # If craft objects are in scene, ignore pure background clutter like human person
            if has_craft_objects and label == "person":
                continue

            x1, y1, x2, y2 = b.xyxy[0].tolist()

            # Ensure coordinates are within image bounds
            x1 = max(0, min(w, x1))
            y1 = max(0, min(h, y1))
            x2 = max(0, min(w, x2))
            y2 = max(0, min(h, y2))

            bw = x2 - x1
            bh = y2 - y1

            # Ignore tiny dust boxes (< 4% of image area)
            if (bw * bh) < (w * h * 0.02):
                continue

            detected_boxes.append({
                "id": idx,
                "label": label.capitalize(),
                "confidence": round(conf, 2),
                "box_pixels": [int(x1), int(y1), int(x2), int(y2)],
                "box_pct": {
                    "x": round((x1 / w) * 100, 1),
                    "y": round((y1 / h) * 100, 1),
                    "width": round((bw / w) * 100, 1),
                    "height": round((bh / h) * 100, 1),
                },
            })
            idx += 1

        logger.info(f"Object detection identified {len(detected_boxes)} product(s) in {w}x{h} photo")

        return {
            "count": len(detected_boxes),
            "image_width": w,
            "image_height": h,
            "objects": detected_boxes,
        }

    def crop_to_bbox(
        self,
        image_bytes: bytes,
        box_pixels: List[int],
        padding_pct: float = 0.08
    ) -> bytes:
        """
        Crops raw image to chosen bounding box with breathing padding for cleaner edge isolation.
        """
        pil_raw = Image.open(io.BytesIO(image_bytes))
        pil_img = ImageOps.exif_transpose(pil_raw).convert("RGB")
        w, h = pil_img.size

        x1, y1, x2, y2 = box_pixels
        bw = x2 - x1
        bh = y2 - y1

        pad_x = int(bw * padding_pct)
        pad_y = int(bh * padding_pct)

        crop_x1 = max(0, x1 - pad_x)
        crop_y1 = max(0, y1 - pad_y)
        crop_x2 = min(w, x2 + pad_x)
        crop_y2 = min(h, y2 + pad_y)

        cropped = pil_img.crop((crop_x1, crop_y1, crop_x2, crop_y2))
        buf = io.BytesIO()
        cropped.save(buf, format="JPEG", quality=95)
        return buf.getvalue()

object_detector = ObjectDetectionService()
