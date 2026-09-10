"""
Automated Test Suite for ShilpKala Dynamic Pricing Module (Part A)
Verifies:
1. Rules-based heuristic multiplier calculation from material cost
2. Category detection and published guidelines citation
3. GI-certification premium application (25-40% / 30% boost)
4. Full honesty disclaimer and method attribute
5. Curated market-comparable reference data
6. FastAPI endpoints: POST /api/pricing/suggest & GET /api/pricing/benchmarks
"""

import sys
import os

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from fastapi.testclient import TestClient

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.services.pricing_service import pricing_service

client = TestClient(app)

def test_handloom_non_gi_pricing():
    print("\n[TEST 1] Testing Handloom pricing (Non-GI) with ₹2,200 material cost...")
    payload = {
        "craft_type": "Handloom Weaving (बनारसी साड़ी)",
        "material_cost": 2200,
        "product_category": "Saree",
        "gi_match_status": False
    }
    response = client.post("/api/pricing/suggest", json=payload)
    assert response.status_code == 200, f"Failed: {response.text}"
    data = response.json()

    print(f"  Result: Min: ₹{data['min_price']}, Rec: ₹{data['recommended_price']}, Max: ₹{data['max_price']}")
    print(f"  Markup Multipliers: {data['markup_multiplier_range']}")
    print(f"  Method: {data['method']}")
    print(f"  Citation: {data['citation']}")
    print(f"  GI Premium Applied: {data['gi_premium_pct']}%")

    assert data["method"] == "rules_based_heuristic_v1"
    assert "HONESTY NOTICE" in data["disclaimer"]
    assert data["gi_premium_pct"] == 0
    assert data["min_price"] < data["recommended_price"] < data["max_price"]
    assert len(data["market_comparables"]) >= 2
    # 2200 * 2.4 = 5280 -> rounded up ~5300
    assert 5000 <= data["min_price"] <= 5500
    # 2200 * 2.9 = 6380 -> rounded up ~6400
    assert 6200 <= data["recommended_price"] <= 6600
    print("  ✓ PASSED: Handloom non-GI pricing matches published margins.")

def test_handloom_gi_certified_pricing():
    print("\n[TEST 2] Testing Handloom pricing WITH GI-Certification (25-40% premium)...")
    payload = {
        "craft_type": "Banarasi Katan Silk Handloom",
        "material_cost": 2200,
        "product_category": "Silk Saree",
        "gi_match_status": True
    }
    response = client.post("/api/pricing/suggest", json=payload)
    assert response.status_code == 200, f"Failed: {response.text}"
    data = response.json()

    print(f"  Result: Min: ₹{data['min_price']}, Rec: ₹{data['recommended_price']}, Max: ₹{data['max_price']}")
    print(f"  GI Multiplier Applied: {data['gi_multiplier_applied']} (Premium: {data['gi_premium_pct']}%)")

    assert data["gi_premium_pct"] == 30
    assert data["gi_multiplier_applied"] == 1.30
    # 2200 * 2.4 * 1.25 = 6600
    # 2200 * 2.9 * 1.30 = 8294 -> ~8300
    assert data["recommended_price"] >= 8000
    print("  ✓ PASSED: GI certified status appropriately applies ~30% premium.")

def test_pottery_category_markup():
    print("\n[TEST 3] Testing Terracotta & Pottery pricing...")
    payload = {
        "craft_type": "Khurja Terracotta Pottery Pot",
        "material_cost": 500,
        "gi_match_status": False
    }
    response = client.post("/api/pricing/suggest", json=payload)
    assert response.status_code == 200, f"Failed: {response.text}"
    data = response.json()

    print(f"  Category matched: {data['craft_category_matched']}")
    print(f"  Min: ₹{data['min_price']}, Rec: ₹{data['recommended_price']}, Max: ₹{data['max_price']}")
    assert "Pottery" in data["craft_category_matched"] or "टेराकोटा" in data["craft_category_matched"]
    # 500 * 2.0 = 1000, 500 * 2.4 = 1200, 500 * 2.8 = 1400
    assert data["min_price"] == 1000
    assert data["recommended_price"] == 1200
    assert data["max_price"] == 1400
    print("  ✓ PASSED: Pottery category correctly matched with KVIC multiplier norms.")

def test_brass_metalware_markup():
    print("\n[TEST 4] Testing Brass / Metalware pricing...")
    payload = {
        "craft_type": "Moradabad Engraved Brass Urli",
        "material_cost": 1500,
        "gi_match_status": True
    }
    response = client.post("/api/pricing/suggest", json=payload)
    assert response.status_code == 200
    data = response.json()

    print(f"  Category matched: {data['craft_category_matched']}")
    print(f"  Min: ₹{data['min_price']}, Rec: ₹{data['recommended_price']}, Max: ₹{data['max_price']}")
    assert "Brass" in data["craft_category_matched"]
    assert data["gi_premium_pct"] == 30
    print("  ✓ PASSED: Brass category correctly matched with EPCH multiplier norms.")

def test_woodcraft_markup():
    print("\n[TEST 5] Testing Woodcraft pricing...")
    payload = {
        "craft_type": "Saharanpur Carved Wood Elephant",
        "material_cost": 800,
        "gi_match_status": False
    }
    response = client.post("/api/pricing/suggest", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "Wood" in data["craft_category_matched"]
    print("  ✓ PASSED: Woodcraft category correctly matched.")

def test_curated_benchmarks_endpoint():
    print("\n[TEST 6] Testing GET /api/pricing/benchmarks...")
    response = client.get("/api/pricing/benchmarks?craft_type=handloom")
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 2
    for it in items:
        assert "id" in it
        assert "title" in it
        assert "price" in it
        assert "source_label" in it
    print(f"  Found {len(items)} reference comparables: {[it['title'] for it in items]}")
    print("  ✓ PASSED: Static curated benchmark retrieval works cleanly.")

def test_validation_errors():
    print("\n[TEST 7] Testing invalid material cost validation...")
    response = client.post("/api/pricing/suggest", json={"material_cost": 0})
    assert response.status_code == 400
    print("  ✓ PASSED: Zero/negative cost properly rejected with 400.")

if __name__ == "__main__":
    print("=" * 60)
    print("RUNNING SHILPKALA DYNAMIC PRICING MODULE TESTS (PART A)")
    print("=" * 60)
    test_handloom_non_gi_pricing()
    test_handloom_gi_certified_pricing()
    test_pottery_category_markup()
    test_brass_metalware_markup()
    test_woodcraft_markup()
    test_curated_benchmarks_endpoint()
    test_validation_errors()
    print("\n" + "=" * 60)
    print("ALL 7 DYNAMIC PRICING TESTS PASSED PERFECTLY!")
    print("=" * 60)
