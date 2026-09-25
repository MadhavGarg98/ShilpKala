"""
Supabase authentication middleware + FastAPI security dependencies.

The middleware runs on every request:
  * Reads `Authorization: Bearer <supabase access token>`.
  * Verifies it (JWKS or legacy HS256 — see jwt_verifier).
  * Resolves which role the request belongs to: 'artisan' or 'buyer'. The
    authoritative source is the public.profiles row for that user id; the token
    role claim is only a fallback (and is cross-checked against the DB when the
    row exists).
  * Publishes the result on `request.state.auth` for downstream handlers.

Enforcement is governed by settings.AUTH_ENABLED:
  * False (default) → the middleware still *resolves and annotates* the caller,
    but never rejects. This keeps the existing demo + test suite working with no
    Supabase project configured.
  * True → protected routes return 401 without a valid token, and the
    require_artisan / require_buyer dependencies enforce role.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.auth.jwt_verifier import auth_is_configured, try_verify_supabase_jwt
from app.config import settings

logger = logging.getLogger("shilpkala.auth")

VALID_ROLES = ("artisan", "buyer")


@dataclass
class AuthContext:
    """The resolved identity for a request."""

    user_id: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    claims: dict = field(default_factory=dict)
    authenticated: bool = False
    reason: str = ""

    def as_dict(self) -> dict:
        return {
            "user_id": self.user_id,
            "role": self.role,
            "email": self.email,
            "authenticated": self.authenticated,
        }


def _extract_bearer(request: Request) -> Optional[str]:
    header = request.headers.get("authorization") or ""
    if not header.lower().startswith("bearer "):
        return None
    token = header[7:].strip()
    return token or None


def resolve_role_from_db(user_id: str) -> Optional[str]:
    """Look up the authoritative role in public.profiles."""
    try:
        from app.db.session import SessionLocal
        from app.models.profile import Profile

        db = SessionLocal()
        try:
            row = db.query(Profile).filter(Profile.user_id == user_id).first()
            return row.role if row else None
        finally:
            db.close()
    except Exception as e:  # table missing / db down — fall back to token hint
        logger.info("[AUTH] profile lookup unavailable for %s: %s", user_id, e)
        return None


class SupabaseAuthMiddleware(BaseHTTPMiddleware):
    """Resolve and (optionally) enforce the Supabase identity on each request."""

    async def dispatch(self, request: Request, call_next):
        # CORS preflight must never be blocked by auth.
        if request.method == "OPTIONS":
            request.state.auth = AuthContext(reason="preflight")
            return await call_next(request)

        ctx = AuthContext()
        token = _extract_bearer(request)

        if token:
            claims = try_verify_supabase_jwt(token)
            if claims:
                user_id = str(claims.get("sub"))
                db_role = resolve_role_from_db(user_id)
                token_role = claims.get("_role_hint")
                role = db_role or token_role
                if role not in VALID_ROLES:
                    role = None

                ctx = AuthContext(
                    user_id=user_id,
                    role=role,
                    email=claims.get("email"),
                    claims=claims,
                    authenticated=True,
                    reason="verified",
                )
            else:
                ctx.reason = "invalid_token"
        elif auth_is_configured():
            ctx.reason = "missing_token"
        else:
            ctx.reason = "auth_not_configured"

        request.state.auth = ctx

        # Enforcement only when explicitly switched on.
        if settings.AUTH_ENABLED and not ctx.authenticated:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "detail": "Authentication required.",
                    "reason": ctx.reason,
                },
                headers={"WWW-Authenticate": "Bearer"},
            )

        return await call_next(request)


# ── FastAPI dependencies ────────────────────────────────────────────────────
_bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(request: Request) -> AuthContext:
    ctx: Optional[AuthContext] = getattr(request.state, "auth", None)
    if ctx and ctx.authenticated:
        return ctx
    if settings.AUTH_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Enforcement off: hand back the middleware's annotation so callers see the
    # true reason (missing_token / invalid_token / auth_not_configured).
    return ctx or AuthContext(reason="auth_disabled_dev_mode")


def require_role(role: str):
    """Dependency factory: require the caller to hold a specific role."""

    def _dep(ctx: AuthContext = Depends(get_current_user)) -> AuthContext:
        if not ctx.authenticated:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required.",
            )
        if ctx.role != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This endpoint requires the '{role}' role (you are '{ctx.role}').",
            )
        return ctx

    return _dep


require_artisan = require_role("artisan")
require_buyer = require_role("buyer")
