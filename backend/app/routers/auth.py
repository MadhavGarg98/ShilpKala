"""
Auth introspection endpoints.

These do not create accounts — Supabase Auth owns signup/login. They exist so
the app (and the Phase 1 verification script) can prove that a Supabase JWT was
verified by the middleware and that the resulting role resolves to the correct
profile table:

  GET /api/auth/status → is Supabase auth configured / enforced here?
  GET /api/auth/me     → who does this token belong to, and which role?
"""

from typing import Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.auth.jwt_verifier import auth_is_configured
from app.auth.middleware import AuthContext, get_current_user
from app.config import settings
from app.db.session import get_db
from app.models.artisan import Artisan
from app.models.profile import Buyer, Profile

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.get("/status")
def auth_status(request: Request):
    ctx: Optional[AuthContext] = getattr(request.state, "auth", None)
    return {
        "auth_configured": auth_is_configured(),
        "auth_enforced": bool(settings.AUTH_ENABLED),
        "supabase_url_set": bool(settings.SUPABASE_URL),
        "verification_method": (
            "hs256_shared_secret"
            if settings.SUPABASE_JWT_SECRET
            else ("jwks" if settings.SUPABASE_URL else "none")
        ),
        "request": ctx.as_dict() if ctx else None,
    }


@router.get("/me")
def auth_me(
    ctx: AuthContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the authenticated identity plus its role-specific profile row."""
    if not ctx.authenticated:
        return {
            "authenticated": False,
            "reason": ctx.reason or "no_token",
            "auth_enforced": bool(settings.AUTH_ENABLED),
        }

    payload = {
        "authenticated": True,
        "user_id": ctx.user_id,
        "email": ctx.email,
        "role": ctx.role,
        "profile_table": None,
        "profile": None,
    }

    profile = None
    try:
        profile = db.query(Profile).filter(Profile.user_id == ctx.user_id).first()
    except Exception:
        profile = None

    if profile:
        payload["profile_table"] = "profiles"
        payload["role"] = profile.role
        if profile.role == "artisan":
            artisan = db.query(Artisan).filter(Artisan.user_id == ctx.user_id).first()
            if artisan:
                payload["profile_table"] = "artisans"
                payload["profile"] = {
                    "id": artisan.id,
                    "name": artisan.name,
                    "craft_type": artisan.craft_type,
                    "location": artisan.location,
                    "government_id_status": artisan.government_id_status,
                }
        elif profile.role == "buyer":
            buyer = db.query(Buyer).filter(Buyer.user_id == ctx.user_id).first()
            if buyer:
                payload["profile_table"] = "buyers"
                payload["profile"] = {
                    "id": buyer.id,
                    "company_name": buyer.company_name,
                    "buyer_type": buyer.buyer_type,
                    "country": buyer.country,
                    "contact_person_name": buyer.contact_person_name,
                }
    return payload
