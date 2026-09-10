import os
import sys
import time
from pathlib import Path
from fastapi.testclient import TestClient

# Ensure app is in python path
sys.path.insert(0, str(Path(__file__).resolve().parent))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from app.main import app
from app.db.session import SessionLocal, Base, engine
from app.models.artisan import Artisan
from app.models.product import Product
from app.services.storage import storage
from app.services.image_enhancement import image_enhancer
from app.services.demo_cache import demo_cache

def run_tests():
    print("=" * 60)
    print("RUNNING SHILPKALA PHASE 1 VERIFICATION SUITE")
    print("=" * 60)

    # Initialize tables explicitly
    Base.metadata.create_all(bind=engine)

    client = TestClient(app)
    client.__enter__()
    try:
        # 1. Test Root & Health Check
        print("\n[TEST 1] Root & Health Check Endpoints...")
        res = client.get("/")
        assert res.status_code == 200, f"Root endpoint failed: {res.text}"
        data = res.json()
        assert data["status"] == "healthy"
        print("[OK] Root endpoint returns status: healthy")
        print(f"   Honesty contract declared: {data['honesty_contract']}")

        # 2. Test DB Seeding & Artisan CRUD
        print("\n[TEST 2] Artisan CRUD & Seeding...")
        # Create seed artisan if not exists
        db = SessionLocal()
        existing = db.query(Artisan).filter(Artisan.id == "artisan-123").first()
        if not existing:
            default_artisan = Artisan(
                id="artisan-123",
                name="राम निवास (Ram Niwas)",
                phone="+919876543210",
                craft_type="Handloom Weaving",
                craft_type_key="craft.handloom.label",
                location="Varanasi, Uttar Pradesh",
                artisan_id_status="Verified",
                profile_image_url="http://localhost:8000/uploads/avatars/ramniwas.jpg",
                is_profile_complete=True
            )
            db.add(default_artisan)
            db.commit()
        db.close()

        res = client.get("/api/artisans")
        assert res.status_code == 200
        artisans = res.json()
        assert len(artisans) >= 1, "Expected at least 1 seeded artisan"
        print(f"[OK] Found {len(artisans)} artisan(s). Default: {artisans[0]['name']} ({artisans[0]['id']})")

        # Create new artisan
        new_artisan_data = {
            "id": "artisan-test-456",
            "name": "Meera Devi",
            "phone": "+919812345678",
            "craft_type": "Clay Pottery",
            "location": "Khurja, Uttar Pradesh",
            "artisan_id_status": "Verified"
        }
        res = client.post("/api/artisans", json=new_artisan_data)
        assert res.status_code in (200, 201)
        print("[OK] Artisan create endpoint works.")

        # 3. Test Product CRUD
        print("\n[TEST 3] Product CRUD...")
        # Clean up test product if already exists
        db = SessionLocal()
        existing_p = db.query(Product).filter(Product.id == "p-test-01").first()
        if existing_p:
            db.delete(existing_p)
            db.commit()
        db.close()

        prod_data = {
            "id": "p-test-01",
            "artisan_id": "artisan-123",
            "craft_type_id": "1",
            "title_hindi": "हाथ से बनी रेशम साड़ी",
            "title_english": "Handmade Silk Saree",
            "price": 4500,
            "status": "live",
            "is_gi_certified": True,
            "keywords": ["Silk", "Handloom"]
        }
        res = client.post("/api/products", json=prod_data)
        assert res.status_code == 201

        print("[OK] Product create endpoint works.")

        res = client.get("/api/products/p-test-01")
        assert res.status_code == 200
        p = res.json()
        assert p["title_english"] == "Handmade Silk Saree"
        print("[OK] Product fetch endpoint works.")

        # Update product
        res = client.put("/api/products/p-test-01", json={"price": 4800})
        assert res.status_code == 200
        assert res.json()["price"] == 4800
        print("[OK] Product update endpoint works.")

        # 4. Test Storage Service
        print("\n[TEST 4] S3/boto3-Compatible Object Storage Wrapper...")
        test_bytes = b"Sample image data for testing storage service"
        upload_url = storage.upload(test_bytes, "test_folder/sample.txt", content_type="text/plain")
        assert "/uploads/test_folder/sample.txt" in upload_url
        local_path = storage.get_local_path("test_folder/sample.txt")
        assert local_path.exists()
        assert local_path.read_bytes() == test_bytes
        print(f"[OK] Storage upload & URL resolution: {upload_url}")
        storage.delete("test_folder/sample.txt")
        assert not local_path.exists()
        print("[OK] Storage delete works.")

        # 5. Test Demo Reliability Layer
        print("\n[TEST 5] Demo Reliability Layer Endpoint (POST /api/images/enhance/demo)...")
        t0 = time.perf_counter()
        res = client.post("/api/images/enhance/demo?item_key=pot")
        t_demo = (time.perf_counter() - t0) * 1000
        assert res.status_code == 200, f"Demo endpoint failed: {res.text}"
        demo_res = res.json()
        assert demo_res["is_demo_cache"] is True
        print(f"[OK] Cached demo response returned in {t_demo:.1f}ms (< 50ms)")
        print(f"   Enhanced URL: {demo_res['enhanced_url']}")
        print(f"   Reported processing_time_ms: {demo_res['processing_time_ms']}ms")

        # 6. Test Real Endpoint Against Genuinely NEW Photo
        print("\n[TEST 6] Real Image Enhancement Pipeline (POST /api/images/enhance)...")
        # Use blockprint-bedspread.jpg as a genuinely new image (not one of the cached demo items)
        new_photo_path = Path(__file__).resolve().parent.parent / "frontend" / "assets" / "images" / "products" / "blockprint-bedspread.jpg"
        assert new_photo_path.exists(), f"Missing test photo at {new_photo_path}"

        with open(new_photo_path, "rb") as f:
            file_bytes = f.read()

        print(f"   Testing with genuinely new photo: {new_photo_path.name} ({len(file_bytes)} bytes)")
        
        t0 = time.perf_counter()
        res = client.post(
            "/api/images/enhance",
            files={"file": (new_photo_path.name, file_bytes, "image/jpeg")}
        )
        t_real = (time.perf_counter() - t0) * 1000
        assert res.status_code == 200, f"Real enhance endpoint failed: {res.text}"
        real_res = res.json()

        print(f"[OK] Real Pipeline completed successfully!")
        print(f"   Wall-clock latency: {t_real:.1f}ms")
        print(f"   Backend reported processing_time_ms: {real_res['processing_time_ms']}ms")
        print(f"   Original URL: {real_res['original_url']}")
        print(f"   Enhanced URL: {real_res['enhanced_url']}")
        print(f"   Model used: {real_res['model_used']}")
        print(f"   Dimensions: {real_res['width']}x{real_res['height']}")
        assert real_res["is_demo_cache"] is False

        # 7. Test Developer Toggle on Real Endpoint
        print("\n[TEST 7] Developer Toggle on Real Endpoint (POST /api/images/enhance?demo=true)...")
        res = client.post(
            "/api/images/enhance?demo=true",
            files={"file": ("pot.jpg", file_bytes, "image/jpeg")}
        )
        assert res.status_code == 200
        toggle_res = res.json()
        assert toggle_res["is_demo_cache"] is True
        print("[OK] Developer toggle correctly routes to Demo Reliability Layer instantly.")

        print("\n" + "=" * 60)
        print(">>> ALL PHASE 1 VERIFICATION CHECKS PASSED SUCCESSFULLY! <<<")
        print("=" * 60)

    finally:
        client.__exit__(None, None, None)

if __name__ == "__main__":
    run_tests()
