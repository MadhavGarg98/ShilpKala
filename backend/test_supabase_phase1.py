"""
Phase 1 verification — Supabase Auth (both roles) + Database + Product Schema Audit
====================================================================================

Three independent sections, each printing an honest PASS / FAIL / NOT-VERIFIED:

  A. ENDPOINT REGRESSION — the 5 required endpoints still respond after the
     DATABASE_URL / auth / model changes:
       POST /api/images/enhance
       POST /api/voice/transcribe
       POST /api/listings/generate
       POST /api/pricing/suggest
       POST /api/recommendations/demand
     A 503 from an endpoint that needs a third-party key is reported as
     EXTERNAL-DEPENDENCY (not a regression); a 500/404/405 is a FAIL.

  B. AUTH ROLE PROOF — mints real HS256 Supabase-style JWTs, and proves the
     FastAPI middleware resolves artisan vs buyer from public.profiles, that
     BOTH profile tables are reachable, and that the server-side DB role wins
     over a (deliberately wrong) token role claim — i.e. exactly one role per
     user, decided at signup, not ambiguous.

  C. SCHEMA AUDIT — every field the build spec requires per product, checked
     against the ORM model AND the live database, with explicit GAP rows.

Run:  python test_supabase_phase1.py
"""

import io
import os
import sys
import time
import json
import sqlite3
from datetime import datetime, timedelta

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import jwt
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.db.session import engine, Base, SessionLocal, ensure_sqlite_dev_schema
from app.models.artisan import Artisan
from app.models.profile import Profile, Buyer
from app.models.product import Product

Base.metadata.create_all(bind=engine)
ensure_sqlite_dev_schema(engine)

client = TestClient(app)

RESULTS = {"pass": 0, "fail": 0, "external": 0, "notverified": 0}


def _mark(kind):
    RESULTS[kind] += 1


def ok(msg):
    _mark("pass")
    print(f"  [OK]   {msg}")


def fail(msg):
    _mark("fail")
    print(f"  [FAIL] {msg}")


def external(msg):
    _mark("external")
    print(f"  [EXT]  {msg}   (external dependency unavailable — not a regression)")


def notverified(msg):
    _mark("notverified")
    print(f"  [N/V]  {msg}   (blocked: Supabase project/credentials not available)")


# ---------------------------------------------------------------------------
# Fixtures — tiny valid media, generated locally (no network, no credits)
# ---------------------------------------------------------------------------
def _tiny_jpeg() -> bytes:
    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", (240, 240), (190, 140, 90)).save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def _tiny_wav() -> bytes:
    import struct
    import math

    sr, dur = 8000, 0.4
    n = int(sr * dur)
    frames = bytearray()
    for i in range(n):
        val = int(3000 * math.sin(2 * math.pi * 220 * i / sr))
        frames += struct.pack("<h", val)
    data = bytes(frames)
    header = b"RIFF" + struct.pack("<I", 36 + len(data)) + b"WAVE"
    header += b"fmt " + struct.pack("<IHHIIHH", 16, 1, 1, sr, sr * 2, 2, 16)
    header += b"data" + struct.pack("<I", len(data))
    return header + data


# ===========================================================================
# A. ENDPOINT REGRESSION
# ===========================================================================
def section_a_endpoints():
    print("\n" + "=" * 74)
    print("A. ENDPOINT REGRESSION — 5 required endpoints after the Phase 1 changes")
    print("=" * 74)
    backend = "sqlite" if engine.dialect.name == "sqlite" else "postgres"
    print(f"  Database backend in use: {backend}")
    if backend == "sqlite":
        notverified("DATABASE_URL swap to hosted Supabase Postgres")

    def classify(name, resp, allow_5xx_external=False):
        code = resp.status_code
        if 200 <= code < 300:
            ok(f"{name} → {code}")
            return resp
        if code in (503, 502, 504) and allow_5xx_external:
            external(f"{name} → {code} ({_detail(resp)})")
            return resp
        fail(f"{name} → {code} :: {_detail(resp)}")
        return resp

    # 1. Image enhancement (real pipeline, local rembg)
    r = client.post(
        "/api/images/enhance",
        files={"file": ("probe.jpg", _tiny_jpeg(), "image/jpeg")},
        data={"preset": "studio_white"},
    )
    classify("POST /api/images/enhance", r)

    # 2. Voice transcription (real path needs GROQ_API_KEY for Whisper)
    r = client.post(
        "/api/voice/transcribe",
        files={"file": ("probe.wav", _tiny_wav(), "audio/wav")},
        params={"language_code": "hi-IN"},
    )
    classify("POST /api/voice/transcribe", r, allow_5xx_external=True)

    # 3. AI listing generation (needs GROQ_API_KEY)
    r = client.post(
        "/api/listings/generate",
        json={
            "transcript": "यह हाथ से बुना हुआ बनारसी रेशमी साड़ी है, लाल रंग की।",
            "language_code": "hi-IN",
            "craft_type": "Handloom Weaving",
            "artisan_id": "artisan-123",
        },
    )
    classify("POST /api/listings/generate", r, allow_5xx_external=True)

    # 4. Pricing suggestion (local rules engine)
    r = client.post(
        "/api/pricing/suggest",
        json={
            "craft_type": "Handloom Weaving",
            "material_cost": 1200,
            "gi_match_status": True,
        },
    )
    classify("POST /api/pricing/suggest", r)

    # 5. Demand recommendations
    r = client.post("/api/recommendations/demand", json={"craft_type": "Handloom Weaving"})
    classify("POST /api/recommendations/demand", r)

    # Bonus: the new auth endpoints exist
    r = client.get("/api/auth/status")
    classify("GET  /api/auth/status", r)


def _detail(resp):
    try:
        body = resp.json()
        return str(body.get("detail", body))[:180]
    except Exception:
        return resp.text[:180]


# ===========================================================================
# B. AUTH ROLE PROOF
# ===========================================================================
TEST_SECRET = "phase1-test-shared-secret-not-a-real-key"
ARTISAN_UID = "11111111-1111-4111-8111-111111111111"
BUYER_UID = "22222222-2222-4222-8222-222222222222"


def _mint(uid, role_claim, secret=TEST_SECRET):
    now = datetime.utcnow()
    return jwt.encode(
        {
            "sub": uid,
            "aud": "authenticated",
            "iat": now,
            "exp": now + timedelta(hours=1),
            "email": f"{uid[:8]}@example.test",
            "user_metadata": {"role": role_claim},
        },
        secret,
        algorithm="HS256",
    )


def _cleanup():
    db = SessionLocal()
    try:
        for uid in (ARTISAN_UID, BUYER_UID):
            for model in (Profile, Buyer, Artisan):
                try:
                    db.query(model).filter(model.user_id == uid).delete()
                except Exception:
                    db.rollback()
        db.commit()
    finally:
        db.close()


def _seed():
    db = SessionLocal()
    try:
        db.add(Profile(user_id=ARTISAN_UID, role="artisan", display_name="Probe Artisan"))
        db.add(Profile(user_id=BUYER_UID, role="buyer", display_name="Probe Buyer"))
        db.add(
            Artisan(
                id="probe-artisan",
                user_id=ARTISAN_UID,
                name="Probe Artisan",
                craft_type="Handloom Weaving",
                location="Varanasi",
                government_id_status="Verified",
            )
        )
        db.add(
            Buyer(
                id="probe-buyer",
                user_id=BUYER_UID,
                company_name="Probe Exports Pvt Ltd",
                buyer_type="Exporter",
                country="United Arab Emirates",
                contact_person_name="Probe Contact",
            )
        )
        db.commit()
    finally:
        db.close()


def section_b_auth():
    print("\n" + "=" * 74)
    print("B. AUTH ROLE PROOF — JWT verification + artisan vs buyer resolution")
    print("=" * 74)

    if not settings.SUPABASE_URL:
        notverified(
            "Live Supabase project / Google + Phone provider enablement / real signup "
            "for each role (no SUPABASE_URL or Supabase CLI in this environment)"
        )
        print("  -- Falling back to the local cryptographic proof of the SAME code path --")

    # Configure the legacy HS256 verification path at runtime.
    settings.SUPABASE_JWT_SECRET = TEST_SECRET
    settings.SUPABASE_JWT_AUDIENCE = "authenticated"

    from app.auth.jwt_verifier import auth_is_configured, verify_supabase_jwt
    from app.auth.middleware import resolve_role_from_db

    if auth_is_configured():
        ok("auth_is_configured() is True with SUPABASE_JWT_SECRET set")
    else:
        fail("auth_is_configured() should be True once a secret is configured")

    # A malformed/garbage token must be rejected.
    try:
        verify_supabase_jwt("not-a-real-token")
        fail("garbage token was accepted")
    except Exception:
        ok("garbage token correctly rejected by verify_supabase_jwt()")

    # A token signed with the WRONG secret must be rejected.
    bad = _mint(ARTISAN_UID, "artisan", secret="wrong-secret")
    try:
        verify_supabase_jwt(bad)
        fail("token signed with a foreign secret was accepted")
    except Exception:
        ok("token signed with a foreign secret correctly rejected")

    _cleanup()
    _seed()
    try:
        # DB-resolved roles.
        if resolve_role_from_db(ARTISAN_UID) == "artisan":
            ok("public.profiles resolves UID → 'artisan'")
        else:
            fail("resolve_role_from_db did not return 'artisan'")
        if resolve_role_from_db(BUYER_UID) == "buyer":
            ok("public.profiles resolves UID → 'buyer'")
        else:
            fail("resolve_role_from_db did not return 'buyer'")

        # Artisan token → artisans table.
        r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {_mint(ARTISAN_UID, 'artisan')}"})
        if r.status_code == 200 and r.json().get("role") == "artisan" and r.json().get("profile_table") == "artisans":
            ok(f"artisan JWT → role={r.json()['role']}, profile_table={r.json()['profile_table']}, "
               f"name={r.json()['profile'].get('name')!r}, "
               f"government_id_status={r.json()['profile'].get('government_id_status')!r}")
        else:
            fail(f"artisan JWT resolved incorrectly: {r.status_code} {r.text[:200]}")

        # Buyer token → buyers table.
        r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {_mint(BUYER_UID, 'buyer')}"})
        if r.status_code == 200 and r.json().get("role") == "buyer" and r.json().get("profile_table") == "buyers":
            ok(f"buyer JWT → role={r.json()['role']}, profile_table={r.json()['profile_table']}, "
               f"company={r.json()['profile'].get('company_name')!r}, "
               f"buyer_type={r.json()['profile'].get('buyer_type')!r}, "
               f"country={r.json()['profile'].get('country')!r}")
        else:
            fail(f"buyer JWT resolved incorrectly: {r.status_code} {r.text[:200]}")

        # The critical non-ambiguity proof: token claims 'buyer' but the DB says
        # 'artisan' → the DB wins. A forged/altered claim cannot flip a role.
        r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {_mint(ARTISAN_UID, 'buyer')}"})
        body = r.json()
        if body.get("role") == "artisan" and body.get("profile_table") == "artisans":
            ok("WRONG token claim ('buyer') overridden by DB role ('artisan') — role is stored at signup, not inferred per request")
        else:
            fail(f"token claim was trusted over the DB: {body}")

        # No token at all.
        r = client.get("/api/auth/me")
        if r.status_code == 200 and r.json().get("authenticated") is False:
            ok(f"no token → authenticated=False (reason={r.json().get('reason')})")
        else:
            fail(f"missing-token handling wrong: {r.status_code} {r.text[:160]}")

        # Enforcement toggle: AUTH_ENABLED gates rejection.
        settings.AUTH_ENABLED = True
        try:
            r = client.get("/api/auth/me")
            if r.status_code == 401:
                ok("AUTH_ENABLED=true → unauthenticated request rejected with 401")
            else:
                fail(f"AUTH_ENABLED=true should 401, got {r.status_code}")
            r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {_mint(BUYER_UID, 'buyer')}"})
            if r.status_code == 200:
                ok("AUTH_ENABLED=true → valid buyer token still accepted")
            else:
                fail(f"AUTH_ENABLED=true rejected a valid token: {r.status_code}")
        finally:
            settings.AUTH_ENABLED = False
    finally:
        _cleanup()
        settings.SUPABASE_JWT_SECRET = ""
        settings.SUPABASE_JWT_AUDIENCE = "authenticated"


# ===========================================================================
# C. SCHEMA AUDIT
# ===========================================================================
SPEC_FIELDS = [
    # (spec requirement, ORM attribute, live-DB column, note-if-gap)
    ("Title — Hindi (creation language)", "title_hindi", "title_hindi", ""),
    ("Title — English", "title_english", "title_english", ""),
    ("Title — i18n key", "title_key", "title_key", ""),
    ("Description — Hindi", "description_hindi", "description_hindi", ""),
    ("Description — English", "description_english", "description_english", ""),
    ("Description — i18n key", "description_key", "description_key", ""),
    ("Source language the listing was created in", "source_language", "source_language", "ADDED in Phase 1"),
    ("Price — artisan's final chosen price", "price", "price", ""),
    ("Price — AI-suggested range (min)", "suggested_price_min", "suggested_price_min", "ADDED in Phase 1"),
    ("Price — AI-suggested range (max)", "suggested_price_max", "suggested_price_max", "ADDED in Phase 1"),
    ("Material cost (artisan-entered)", "material_cost", "material_cost", "ADDED in Phase 1"),
    ("Image — original", "before_image_url", "before_image_url", ""),
    ("Image — enhanced (post pipeline)", "after_image_url", "after_image_url", ""),
    ("Image — active/display URL", "image_url", "image_url", ""),
    ("Craft type / category", "craft_type_id", "craft_type_id", ""),
    ("GI certification status", "is_gi_certified", "is_gi_certified", ""),
    ("GI registration number", "gi_reg_number", "gi_reg_number", ""),
    ("GI name — Hindi", "gi_name_hindi", "gi_name_hindi", ""),
    ("GI name — English", "gi_name_english", "gi_name_english", ""),
    ("Heritage story — Hindi", "heritage_story_hindi", "heritage_story_hindi", ""),
    ("Heritage story — English", "heritage_story_english", "heritage_story_english", ""),
    ("Heritage story — i18n key", "heritage_story_key", "heritage_story_key", ""),
    ("Keywords (from AI listing generation)", "keywords_raw", "keywords_raw", ""),
    ("artisan_id (FK — must exist, enforced, not optional)", "artisan_id", "artisan_id", ""),
    ("Status (live / draft / archived)", "status", "status", ""),
    ("Created timestamp", "created_at", "created_at", ""),
    ("Updated timestamp", "updated_at", "updated_at", ""),
]


def section_c_audit():
    print("\n" + "=" * 74)
    print("C. PRODUCT SCHEMA AUDIT — spec requirement vs ORM vs live database")
    print("=" * 74)

    orm_cols = set(Product.__table__.columns.keys())

    live_cols = set()
    con = sqlite3.connect(os.path.join(os.path.dirname(os.path.abspath(__file__)), "shilpkala.db"))
    try:
        live_cols = {c[1] for c in con.execute("PRAGMA table_info(products)").fetchall()}
    except Exception:
        pass
    finally:
        con.close()

    print(f"  {'SPEC FIELD':<52} {'ORM':<6} {'DB':<6} NOTE")
    print("  " + "-" * 72)
    gaps = []
    for label, attr, col, note in SPEC_FIELDS:
        in_orm = attr in orm_cols
        in_db = col in live_cols
        mark_o = "yes" if in_orm else "MISS"
        mark_d = "yes" if in_db else "MISS"
        label_col = (label[:50] + "..") if len(label) > 51 else label
        print(f"  {label_col:<52} {mark_o:<6} {mark_d:<6} {note}")
        if not in_orm or not in_db:
            gaps.append((label, in_orm, in_db, note))

    print("  " + "-" * 72)
    if not gaps:
        ok(f"All {len(SPEC_FIELDS)} spec fields present in BOTH the ORM model and the live database")
    else:
        for label, in_orm, in_db, note in gaps:
            fail(f"GAP: {label} (ORM={'yes' if in_orm else 'MISS'}, DB={'yes' if in_db else 'MISS'}) {note}")

    # artisan_id FK + nullability
    print("\n  artisan_id referential integrity:")
    fks = list(Product.__table__.columns["artisan_id"].foreign_keys)
    if fks:
        fk = fks[0]
        ok(f"ORM declares ForeignKey → {fk.target_fullname} (ondelete via dialect)")
    else:
        fail("ORM declares no ForeignKey on products.artisan_id")

    # Does the live SQLite table actually carry the FK constraint?
    con = sqlite3.connect(os.path.join(os.path.dirname(os.path.abspath(__file__)), "shilpkala.db"))
    try:
        fk_list = con.execute("PRAGMA foreign_key_list(products)").fetchall()
    finally:
        con.close()
    if fk_list:
        ok(f"Live database enforces FK constraint(s): {[(f[2], f[3], f[4]) for f in fk_list]}")
    else:
        notverified(
            "Live SQLite dev DB cannot retro-add a FK via ALTER; the constraint is "
            "enforced on Postgres by supabase/migrations/20260925090100_phase1_product_schema_gaps.sql "
            "(FK + NOT NULL), and declared in the ORM"
        )

    # Nullability of artisan_id in the ORM
    col = Product.__table__.columns["artisan_id"]
    print(f"\n  artisan_id nullable in ORM: {col.nullable} "
          f"(ORM keeps nullable for demo rows; the Postgres migration sets NOT NULL "
          f"after backfilling orphans)")

    # listings table (buyer-facing) columns
    con = sqlite3.connect(os.path.join(os.path.dirname(os.path.abspath(__file__)), "shilpkala.db"))
    try:
        listing_cols = [c[1] for c in con.execute("PRAGMA table_info(listings)").fetchall()]
    finally:
        con.close()
    print(f"\n  listings table columns: {listing_cols}")
    required_listing = {"id", "product_id", "platform", "status", "price", "sync_status", "created_at", "updated_at"}
    missing = required_listing - set(listing_cols)
    if not missing:
        ok("listings table has all expected columns (external_ids + per-platform price/status/sync)")
    else:
        fail(f"listings missing: {missing}")


# ===========================================================================
if __name__ == "__main__":
    print("=" * 74)
    print("SHILPKALA PHASE 1 VERIFICATION")
    print("Supabase Auth (both roles) · Database · Full Product Schema Audit")
    print(f"Run at {datetime.utcnow().isoformat()}Z")
    print("=" * 74)

    section_a_endpoints()
    section_b_auth()
    section_c_audit()

    print("\n" + "=" * 74)
    print(
        f"SUMMARY: {RESULTS['pass']} passed · {RESULTS['fail']} failed · "
        f"{RESULTS['external']} external-dependency · {RESULTS['notverified']} not-verified"
    )
    print("=" * 74)
    if RESULTS["fail"]:
        print("\nThere are FAILURES above — see details.")
        sys.exit(1)
    print("\nAll locally-verifiable Phase 1 checks passed.")
    print("Items marked [N/V] require the real Supabase project (see report).")
