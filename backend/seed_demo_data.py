"""
Seed demo data into the database the backend is ACTUALLY using.
================================================================
Idempotent: re-running never duplicates (fixed primary keys, skip-if-exists).

Seeds:
  * 2 artisans (incl. the seeded 'artisan-123', enriched with Phase 1 fields)
  * 6 products — one per REAL catalog category, with bilingual titles,
    final price + AI-suggested band, material cost, source language,
    original/enhanced image URLs pointing at real files in /uploads
  * 2 buyer profiles + role registry rows (Phase 1 auth shape)

Run:  python seed_demo_data.py
"""

import os
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.db.session import engine, Base, SessionLocal, ensure_sqlite_dev_schema
from app.models.artisan import Artisan
from app.models.product import Product
from app.models.profile import Profile, Buyer

BACKEND = "sqlite" if engine.dialect.name == "sqlite" else "postgres"
BASE = "http://localhost:8000"

Base.metadata.create_all(bind=engine)
ensure_sqlite_dev_schema(engine)

ARTISANS = [
    {
        "id": "artisan-123",
        "name": "राम निवास (Ram Niwas)",
        "phone": "+919876543210",
        "craft_type": "Handloom Weaving",
        "craft_type_key": "craft.handloom.label",
        "location": "Varanasi, Uttar Pradesh",
        "government_id_status": "Verified",
        "role": "artisan",
        "is_profile_complete": True,
    },
    {
        "id": "artisan-456",
        "name": "मीरा देवी (Meera Devi)",
        "phone": "+919812345678",
        "craft_type": "Clay Pottery",
        "craft_type_key": "craft.pottery.label",
        "location": "Jaipur, Rajasthan",
        "government_id_status": "Pending",
        "role": "artisan",
        "is_profile_complete": True,
    },
]

# image files chosen from what actually exists in backend/uploads
PRODUCTS = [
    {
        "id": "prod-seed-saree-01",
        "artisan_id": "artisan-123",
        "craft_type_id": "1",
        "source_language": "hi-IN",
        "title_hindi": "बनारसी रेशमी साड़ी — हाथ से बुनी हुई",
        "title_english": "Banarasi Silk Saree — Handwoven",
        "description_hindi": "काशी के प्रसिद्ध बुनकरों द्वारा हाथ से बुनी गई शुद्ध रेशमी साड़ी, पारंपरिक ज़री बुनाई के साथ।",
        "description_english": "Pure silk handwoven by Varanasi's master weavers with traditional zari work.",
        "price": 12500.0, "suggested_price_min": 9800.0, "suggested_price_max": 15400.0,
        "material_cost": 7200.0,
        "status": "live", "is_gi_certified": True,
        "gi_reg_number": "GI-BR-117", "gi_name_hindi": "बनारसी ब्रोकेड", "gi_name_english": "Banaras Brocades & Sarees",
        "heritage_story_hindi": "500 साल पुरानी बुनाई परंपरा, पीढ़ियों से चली आ रही है।",
        "heritage_story_english": "A 500-year-old weaving tradition passed down through generations.",
        "before_image_url": f"{BASE}/uploads/originals/0e8bc5aa733c_orig_saree.jpg",
        "after_image_url": f"{BASE}/uploads/enhanced/0e8bc5aa733c_studio_white.jpg",
        "image_url": f"{BASE}/uploads/enhanced/0e8bc5aa733c_studio_white.jpg",
        "keywords": ["banarasi", "silk saree", "handwoven", "varanasi", "gi certified"],
        "views_count": 142, "inquiry_count": 7,
    },
    {
        "id": "prod-seed-pot-02",
        "artisan_id": "artisan-456",
        "craft_type_id": "2",
        "source_language": "hi-IN",
        "title_hindi": "नीलमाता हस्तनिर्मित मिट्टी का घड़ा",
        "title_english": "Neelamata Handmade Clay Pot",
        "description_hindi": "राजस्थानी मिट्टी से हाथ से तराशा गया पारंपरिक घड़ा, प्राकृतिक रंगों में रंगा हुआ।",
        "description_english": "Traditional pot hand-thrown from Rajasthani clay, finished in natural dyes.",
        "price": 1850.0, "suggested_price_min": 1400.0, "suggested_price_max": 2600.0,
        "material_cost": 900.0,
        "status": "live", "is_gi_certified": False,
        "heritage_story_hindi": "खुर्जा की मिट्टी की परंपरा, जो सदियों पुरानी है।",
        "heritage_story_english": "The Khurja pottery tradition, centuries in the making.",
        "before_image_url": f"{BASE}/uploads/originals/0ef060777916_orig_pot.jpg",
        "after_image_url": f"{BASE}/uploads/enhanced/0ef060777916_studio_white.jpg",
        "image_url": f"{BASE}/uploads/enhanced/0ef060777916_studio_white.jpg",
        "keywords": ["clay pot", "khurja pottery", "handmade", "rajasthan"],
        "views_count": 63, "inquiry_count": 3,
    },
    {
        "id": "prod-seed-blockprint-03",
        "artisan_id": "artisan-123",
        "craft_type_id": "3",
        "source_language": "hi-IN",
        "title_hindi": "बाग हैंड ब्लॉक प्रिंट स्कार्फ",
        "title_english": "Bagh Hand Block Print Scarf",
        "description_hindi": "प्राकृतिक रंगों और हाथ की नक्काशी वाले ब्लॉक से छपा सूती स्कार्फ।",
        "description_english": "Cotton scarf printed with natural dyes and hand-carved blocks.",
        "price": 2400.0, "suggested_price_min": 1800.0, "suggested_price_max": 3200.0,
        "material_cost": 1100.0,
        "status": "live", "is_gi_certified": True,
        "gi_reg_number": "GI-MP-042", "gi_name_english": "Bagh Prints of Madhya Pradesh",
        "heritage_story_english": "Bagh village's 400-year-old block-printing craft on the banks of the Bagh river.",
        "before_image_url": f"{BASE}/uploads/originals/01ddc6ed051c_orig_textile.jpg",
        "after_image_url": f"{BASE}/uploads/enhanced/01ddc6ed051c_studio_white.jpg",
        "image_url": f"{BASE}/uploads/enhanced/01ddc6ed051c_studio_white.jpg",
        "keywords": ["bagh print", "block print", "natural dye", "cotton"],
        "views_count": 89, "inquiry_count": 5,
    },
    {
        "id": "prod-seed-wood-04",
        "artisan_id": "artisan-456",
        "craft_type_id": "4",
        "source_language": "hi-IN",
        "title_hindi": "शीशम लकड़ी की नक्काशीदार मुर्ति",
        "title_english": "Sheesham Wood Carved Figurine",
        "description_hindi": "सहारनपुर की प्रसिद्ध लकड़ी की नक्काशी कला से बनी मुर्ति।",
        "description_english": "Figurine carved in Saharanpur's famed wood-carving style.",
        "price": 4200.0, "suggested_price_min": 3200.0, "suggested_price_max": 5800.0,
        "material_cost": 2100.0,
        "status": "draft",
        "heritage_story_english": "Saharanpur wood carving, a GI-recognised craft of Uttar Pradesh.",
        "before_image_url": f"{BASE}/uploads/originals/0ef060777916_orig_pot.jpg",
        "after_image_url": f"{BASE}/uploads/enhanced/0ef060777916_studio_white.jpg",
        "image_url": f"{BASE}/uploads/enhanced/0ef060777916_studio_white.jpg",
        "keywords": ["sheesham wood", "saharanpur", "carving", "handmade"],
        "views_count": 21, "inquiry_count": 1,
    },
    {
        "id": "prod-seed-zardozi-05",
        "artisan_id": "artisan-123",
        "craft_type_id": "5",
        "source_language": "hi-IN",
        "title_hindi": "ज़रदोज़ी कढ़ाई वाला कुशन कवर",
        "title_english": "Zardozi Embroidered Cushion Cover",
        "description_hindi": "स्वर्ण और रज्जु के धागों से की गई शाही ज़रदोज़ी कढ़ाई।",
        "description_english": "Royal zardozi embroidery in gold and silver thread.",
        "price": 3200.0, "suggested_price_min": 2400.0, "suggested_price_max": 4400.0,
        "material_cost": 1600.0,
        "status": "live", "is_gi_certified": True,
        "gi_reg_number": "GI-UP-071", "gi_name_english": "Lucknawi Zardozi",
        "heritage_story_english": "Brought to Lucknow in the Mughal era; patronised by the Nawabs.",
        "before_image_url": f"{BASE}/uploads/originals/158578479d52_photo.jpg",
        "after_image_url": f"{BASE}/uploads/enhanced/158578479d52_studio_white.jpg",
        "image_url": f"{BASE}/uploads/enhanced/158578479d52_studio_white.jpg",
        "keywords": ["zardozi", "embroidery", "lucknow", "gold thread"],
        "views_count": 210, "inquiry_count": 12,
    },
    {
        "id": "prod-seed-brass-06",
        "artisan_id": "artisan-456",
        "craft_type_id": "6",
        "source_language": "hi-IN",
        "title_hindi": "मोरदान हस्तनिर्मित पीतल का दीया",
        "title_english": "Handcrafted Brass Moradabad Diya",
        "description_hindi": "मुरादाबाद की प्रसिद्ध पीतल कारीगरी से बना दीया।",
        "description_english": "Diya crafted in Moradabad's renowned brass work.",
        "price": 950.0, "suggested_price_min": 700.0, "suggested_price_max": 1300.0,
        "material_cost": 450.0,
        "status": "live",
        "heritage_story_english": "Moradabad — the 'Brass City' of India — has crafted brassware since the 1600s.",
        "before_image_url": f"{BASE}/uploads/originals/0d76869e5df8_photo.jpg",
        "after_image_url": f"{BASE}/uploads/enhanced/0d76869e5df8_studio_white.jpg",
        "image_url": f"{BASE}/uploads/enhanced/0d76869e5df8_studio_white.jpg",
        "keywords": ["brass diya", "moradabad", "metalwork", "festive"],
        "views_count": 54, "inquiry_count": 2,
    },
]

BUYERS = [
    {
        "id": "buyer-seed-01", "user_id": "11111111-1111-4111-8111-111111111111",
        "company_name": "Global Handicrafts Trading LLC", "buyer_type": "Exporter",
        "country": "United Arab Emirates", "contact_person_name": "Omar Al Farsi",
    },
    {
        "id": "buyer-seed-02", "user_id": "22222222-2222-4222-8222-222222222222",
        "company_name": "Cottage Emporium Retail", "buyer_type": "Retailer",
        "country": "India", "contact_person_name": "Priya Sharma",
    },
]


def upsert(db, model, key_field, key_value, values):
    row = db.query(model).filter(getattr(model, key_field) == key_value).first()
    created = row is None
    if row is None:
        row = model(**values)
        db.add(row)
    else:
        for k, v in values.items():
            if v is not None:
                setattr(row, k, v)
    return row, created


def main():
    db = SessionLocal()
    inserted, updated = 0, 0
    try:
        # Phase 1 role registry rows for the two buyers (proves the auth shape).
        for b in BUYERS:
            _, created = upsert(db, Profile, "user_id", b["user_id"],
                                {"user_id": b["user_id"], "role": "buyer",
                                 "display_name": b["contact_person_name"]})
            inserted += created

        for a in ARTISANS:
            _, created = upsert(db, Artisan, "id", a["id"], a)
            inserted += created

        for p in PRODUCTS:
            vals = dict(p)
            vals["keywords_raw"] = __import__("json").dumps(vals.pop("keywords"))
            _, created = upsert(db, Product, "id", p["id"], vals)
            inserted += created

        for b in BUYERS:
            _, created = upsert(db, Buyer, "id", b["id"], b)
            inserted += created

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seeding failed: {e}")
        raise
    finally:
        db.close()

    print("=" * 66)
    print(f"SEED COMPLETE — database backend: {BACKEND}")
    print("=" * 66)

    # ── Verification: read everything back ────────────────────────────────
    db = SessionLocal()
    try:
        artisans = db.query(Artisan).all()
        print(f"\nARTISANS ({len(artisans)}):")
        for a in artisans:
            print(f"  {a.id:<14} {a.name[:28]:<30} {str(a.craft_type):<20} gov_id={a.government_id_status}")

        products = db.query(Product).all()
        print(f"\nPRODUCTS ({len(products)}):")
        for p in products:
            band = f"[{p.suggested_price_min or '—'} – {p.suggested_price_max or '—'}]"
            print(f"  {p.id:<24} {str(p.title_english)[:32]:<34} ₹{p.price:>9,.0f}  band={band:<20} status={p.status:<6} GI={p.is_gi_certified}")

        buyers = db.query(Buyer).all()
        print(f"\nBUYERS ({len(buyers)}):")
        for b in buyers:
            print(f"  {b.id:<16} {b.company_name:<32} {b.buyer_type:<12} {b.country}")

        profiles = db.query(Profile).all()
        print(f"\nROLE REGISTRY ({len(profiles)}):")
        for r in profiles:
            print(f"  {r.user_id:<40} → {r.role}")

        live = db.query(Product).filter(Product.status == "live").count()
        print(f"\nAPI CHECK → GET /api/products returns {len(products)} rows "
              f"({live} live, {len(products) - live} draft)")
    finally:
        db.close()

    if BACKEND == "sqlite":
        print("\n[NOTE] This data lives in backend/shilpkala.db (local SQLite).")
        print("       The remote Supabase Postgres is still blocked on the DB password;")
        print("       once DATABASE_URL points there, re-run this script to seed the cloud.")


if __name__ == "__main__":
    main()
