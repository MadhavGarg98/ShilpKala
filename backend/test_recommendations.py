"""
Automated Test Suite for ShilpKala Demand-Based Recommendation Module
=====================================================================
The real verification: runs against the SIX actual craft categories in the
app catalog (frontend/src/mock/mockCraftTypes.js):
  Handloom Weaving, Clay Pottery, Hand Block Print, Wood Carving,
  Zardozi & Embroidery, Brass & Metalwork

Verifies:
1. POST /api/recommendations/demand answers for every real catalog category
2. The honestly-traced source (google_trends vs seasonal_static) per response
3. Adjacency sanity: no nonsensical recommendations (e.g. handloom → brass)
4. Forced pytrends failure → static fallback produces a complete, correctly
   shaped response with zero crash
5. Today's real date maps to a sensible season window (not a stale assumption)
6. Persistence into the recommendations table
"""

import sys
import os
import json
from datetime import date

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.data.seasonal_demand import (
    SEASONAL_DEMAND,
    SEASON_WINDOWS,
    get_current_season,
    seasonal_signal,
)
from app.data.craft_adjacency import CRAFT_ADJACENCY, CATEGORY_DISPLAY_NAMES
from app.services.demand_service import demand_service

client = TestClient(app)

# The 6 REAL catalog categories (mockCraftTypes.js order)
REAL_CATALOG = [
    "Handloom Weaving",
    "Clay Pottery",
    "Hand Block Print",
    "Wood Carving",
    "Zardozi & Embroidery",
    "Brass & Metalwork",
]

# Hand-curated sanity: pairs that must NEVER be recommended as adjacent.
# (base, forbidden recommendation) — material/technique/occasion nonsensical.
FORBIDDEN_PAIRS = {
    ("Handloom Weaving", "Brass & Metalwork"),
    ("Handloom Weaving", "Clay Pottery"),
    ("Hand Block Print", "Brass & Metalwork"),
    ("Hand Block Print", "Clay Pottery"),
    ("Brass & Metalwork", "Hand Block Print"),
}


def _display_to_key(display):
    for k, v in CATEGORY_DISPLAY_NAMES.items():
        if v == display:
            return k
    return None


def test_seasonal_table_backbone_complete():
    print("\n[TEST 1] Static seasonal table independently covers all categories & windows...")
    assert get_current_season() in SEASON_WINDOWS, "current season must resolve to a known window"
    for key, entry in SEASONAL_DEMAND.items():
        for window in SEASON_WINDOWS:
            assert window in entry, f"{key} missing window '{window}'"
        sig = seasonal_signal(key)  # zero external dependency
        assert 0 <= sig["trend_score"] <= 100
        assert sig["trend_direction"] in ("rising", "stable", "declining")
    print(f"  {len(SEASONAL_DEMAND)} categories x {len(SEASON_WINDOWS)} windows — all complete.")
    print("  ✓ PASSED: static table is the complete, dependency-free backbone.")


def test_today_maps_to_sensible_window():
    print("\n[TEST 2] Today's ACTUAL date maps to a sensible seasonal window...")
    today = date.today()
    season_key = get_current_season(today)
    label = SEASON_WINDOWS[season_key]["label"]
    print(f"  Today is {today.isoformat()} → season window: '{season_key}' ({label})")
    print(f"  Window reasoning: {SEASON_WINDOWS[season_key]['reasoning']}")

    # Cross-check: the window must actually contain today
    w = SEASON_WINDOWS[season_key]
    s, e = w["start"], w["end"]
    if s and e:
        if s[0] > e[0]:  # wraps year-end
            contained = today >= date(today.year, *s) or today <= date(today.year, *e)
        else:
            contained = date(today.year, *s) <= today <= date(today.year, *e)
        assert contained, f"resolved window '{season_key}' does not contain today!"

    # Sensibility: each of the 6 catalog crafts gets a non-crashing, in-range signal
    mapping = {
        "Handloom Weaving": "handloom_weaving",
        "Clay Pottery": "clay_pottery",
        "Hand Block Print": "hand_block_print",
        "Wood Carving": "wood_carving",
        "Zardozi & Embroidery": "zardozi_embroidery",
        "Brass & Metalwork": "brass_metalwork",
    }
    for display, key in mapping.items():
        sig = seasonal_signal(key, today=today)
        print(f"    {display:22s} → {sig['trend_direction']:9s} score={sig['trend_score']:3d} ({sig['season_label']})")
        assert 0 <= sig["trend_score"] <= 100
    print("  ✓ PASSED: today's date resolves dynamically, no stale hardcoded assumption.")


def test_all_six_real_catalog_categories():
    print("\n[TEST 3] POST /api/recommendations/demand for all 6 REAL catalog categories...")
    results = {}
    for craft in REAL_CATALOG:
        resp = client.post("/api/recommendations/demand", json={"craft_type": craft})
        assert resp.status_code == 200, f"{craft} failed: {resp.text}"
        data = resp.json()

        # Shape contract
        assert data["base_craft"] == craft
        assert isinstance(data["recommendations"], list) and 1 <= len(data["recommendations"]) <= 3
        for r in data["recommendations"]:
            assert set(r) == {"category", "trend_score", "trend_direction", "why"}
            assert 0 <= r["trend_score"] <= 100
            assert r["trend_direction"] in ("rising", "stable", "declining")
            assert r["why"] and isinstance(r["why"], str)
        assert data["source_used"] in ("google_trends", "seasonal_static")
        assert "craft-adjacency" in data["data_source"]

        # Honesty: each 'why' must cite ITS OWN item's source; the response-level
        # breakdown must count them exactly; mixed responses must say so.
        n_trends_why = sum(1 for r in data["recommendations"] if "Google Trends" in r["why"])
        n_static_why = sum(1 for r in data["recommendations"] if "seasonal patterns" in r["why"])
        assert data["source_breakdown"]["google_trends"] == n_trends_why
        assert data["source_breakdown"]["seasonal_static"] == n_static_why
        for r in data["recommendations"]:
            if "Google Trends" in r["why"]:
                assert "seasonal patterns" not in r["why"]
            elif "seasonal patterns" in r["why"]:
                assert "Google Trends" not in r["why"]
            else:
                raise AssertionError(f"why-field cites no source: {r['why']}")
        if n_trends_why and n_static_why:
            assert "rate-limit" in data["data_source"].lower(), data["data_source"]

        # Ranking: scores descending
        scores = [r["trend_score"] for r in data["recommendations"]]
        assert scores == sorted(scores, reverse=True)

        # Adjacency sanity
        for r in data["recommendations"]:
            assert (craft, r["category"]) not in FORBIDDEN_PAIRS, (
                f"NONSENSICAL ADJACENCY: {craft} → {r['category']}"
            )

        # No self-recommendation
        for r in data["recommendations"]:
            assert r["category"] != craft

        results[craft] = data
        src = data["source_used"]
        top = data["recommendations"][0]
        print(f"  {craft:22s} source={src:15s} top={top['category']} ({top['trend_score']}/100, {top['trend_direction']})")
        for r in data["recommendations"]:
            print(f"      - {r['category']:28s} {r['trend_score']:3d} {r['trend_direction']:9s} | {r['why'][:80]}")

    print("  ✓ PASSED: all 6 real catalog categories answered with sensible adjacencies.")
    return results


def test_forced_pytrends_failure_static_fallback():
    print("\n[TEST 4] FORCED pytrends failure → static fallback must be complete & uncrashed...")
    # Deterministic failure injection: bypass the live attempt entirely
    # (same code path a timeout/429/spurious-zero failure would trigger).
    for craft in REAL_CATALOG:
        resp = client.post(
            "/api/recommendations/demand",
            json={"craft_type": craft, "force_static": True},
        )
        assert resp.status_code == 200, f"{craft} crashed under forced failure: {resp.text}"
        data = resp.json()
        assert data["source_used"] == "seasonal_static", data["source_used"]
        assert 1 <= len(data["recommendations"]) <= 3
        for r in data["recommendations"]:
            assert set(r) == {"category", "trend_score", "trend_direction", "why"}
            assert "seasonal patterns" in r["why"]
            assert "Google Trends" not in r["why"]
        assert "static" in data["data_source"].lower()
    print("  ✓ PASSED: forced-failure path yields complete, correctly-shaped responses, zero crash.")

    # Also simulate a hard pytrends exception (network-style) via monkeypatching
    import app.services.demand_service as ds

    class _Boom:
        def __init__(self, *a, **k):
            raise ConnectionError("simulated network timeout")

    original = ds.DemandService._try_pytrends
    ds.DemandService._try_pytrends = lambda self, key: (_ for _ in ()).throw(ConnectionError("simulated timeout"))
    try:
        demand_service._cache.clear()
        resp = client.post("/api/recommendations/demand", json={"craft_type": "Handloom Weaving"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["source_used"] == "seasonal_static"
        print("  ✓ PASSED: hard exception inside pytrends attempt → clean seasonal_static response.")
    finally:
        ds.DemandService._try_pytrends = original
        demand_service._cache.clear()


def test_artisan_id_lookup():
    print("\n[TEST 5] artisan_id path (seeded artisan-123 = Handloom Weaving)...")
    resp = client.post("/api/recommendations/demand", json={"artisan_id": "artisan-123"})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["base_craft"] == "Handloom Weaving"
    assert len(data["recommendations"]) >= 1
    print(f"  artisan-123 → base_craft={data['base_craft']}, "
          f"top={data['recommendations'][0]['category']} ({data['source_used']})")
    print("  ✓ PASSED: artisan profile lookup works.")


def test_validation_and_unknown_input():
    print("\n[TEST 6] Validation & unknown-craft robustness...")
    r1 = client.post("/api/recommendations/demand", json={})
    assert r1.status_code == 400
    r2 = client.post("/api/recommendations/demand", json={"craft_type": "Quantum Blockchain Craft"})
    assert r2.status_code == 200
    data = r2.json()
    # Unknown → falls back to default (handloom) with honest note or empty recs
    assert data["recommendations"] == [] or data["base_craft"] == "Handloom Weaving"
    r3 = client.post("/api/recommendations/demand", json={"artisan_id": "artisan-999"})
    assert r3.status_code == 200
    print("  ✓ PASSED: 400 on empty body; graceful handling of unknown craft/artisan.")


def test_persistence():
    print("\n[TEST 7] recommendations table persistence...")
    import sqlite3
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shilpkala.db")
    con = sqlite3.connect(db_path)
    cur = con.cursor()
    cols = [c[1] for c in cur.execute("PRAGMA table_info(recommendations)").fetchall()]
    assert {"artisan_id", "base_craft", "recommended_categories", "source_used"}.issubset(set(cols)), cols
    row = cur.execute(
        "SELECT base_craft, recommended_categories, source_used, season_key, created_at "
        "FROM recommendations ORDER BY created_at DESC LIMIT 1"
    ).fetchone()
    assert row is not None, "no recommendation row persisted"
    base_craft, rec_json, source_used, season_key, created_at = row
    recs = json.loads(rec_json)
    assert isinstance(recs, list) and len(recs) >= 1
    assert source_used in ("google_trends", "seasonal_static")
    print(f"  Last row: base_craft={base_craft!r}, source_used={source_used}, "
          f"season={season_key!r}, recs={len(recs)}, at={created_at}")
    con.close()
    print("  ✓ PASSED: recommendations persist with JSON categories + source_used.")


if __name__ == "__main__":
    print("=" * 70)
    print("RUNNING SHILPKALA DEMAND RECOMMENDATION MODULE TESTS")
    print("against the REAL catalog: " + " | ".join(REAL_CATALOG))
    print("=" * 70)
    test_seasonal_table_backbone_complete()
    test_today_maps_to_sensible_window()
    test_all_six_real_catalog_categories()
    test_forced_pytrends_failure_static_fallback()
    test_artisan_id_lookup()
    test_validation_and_unknown_input()
    test_persistence()
    print("\n" + "=" * 70)
    print("ALL DEMAND RECOMMENDATION TESTS PASSED!")
    print("=" * 70)
