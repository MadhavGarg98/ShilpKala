"""
Supabase JWT verification.

Supabase's current guidance is to verify asymmetric tokens (ES256/RS256) via the
project JWKS endpoint, and to keep supporting the legacy shared HS256 secret for
older projects. We implement both, in that order of preference:

  1. If the token is HS256 and SUPABASE_JWT_SECRET is configured → verify with
     the shared secret (fast, no network).
  2. Otherwise → verify against the project's JWKS (cached).

Everything here is best-effort and non-fatal by design: a verification failure
returns None rather than raising, so the caller (middleware) decides whether
that means 401 or "auth disabled in dev".
"""

from __future__ import annotations

import logging
import threading
import time
from typing import Any, Dict, Optional

from app.config import SUPABASE_ISSUER, SUPABASE_JWKS_URL, settings

logger = logging.getLogger("shilpkala.auth")

try:
    import jwt  # PyJWT
    from jwt import PyJWKClient

    _JWT_AVAILABLE = True
except Exception:  # pragma: no cover
    _JWT_AVAILABLE = False
    PyJWKClient = None  # type: ignore


_JWKS_CACHE_TTL_SECONDS = 3600
_jwks_lock = threading.Lock()
_jwks_client: Optional[Any] = None
_jwks_fetched_at: float = 0.0


def auth_is_configured() -> bool:
    """True when we have enough config to verify a Supabase token at all.

    Either the project URL (JWKS path) or a legacy JWT secret (HS256 path) is
    sufficient.
    """
    return bool(settings.SUPABASE_URL or settings.SUPABASE_JWT_SECRET)


class SupabaseTokenError(Exception):
    """Raised with an honest reason when verification fails."""


def _get_jwks_client() -> Optional[Any]:
    global _jwks_client, _jwks_fetched_at
    if not _JWT_AVAILABLE or not SUPABASE_JWKS_URL:
        return None
    now = time.time()
    with _jwks_lock:
        if _jwks_client is None or (now - _jwks_fetched_at) > _JWKS_CACHE_TTL_SECONDS:
            try:
                # PyJWKClient caches keys internally and refreshes on unknown kid.
                _jwks_client = PyJWKClient(SUPABASE_JWKS_URL, cache_keys=True)
                _jwks_fetched_at = now
                logger.info("[AUTH] Supabase JWKS client initialised at %s", SUPABASE_JWKS_URL)
            except Exception as e:  # pragma: no cover
                logger.warning("[AUTH] Could not initialise JWKS client: %s", e)
                return None
    return _jwks_client


def _decode(token: str) -> Dict[str, Any]:
    """Decode + verify a Supabase-issued JWT. Raises SupabaseTokenError."""
    if not _JWT_AVAILABLE:
        raise SupabaseTokenError("PyJWT is not installed (pip install PyJWT cryptography)")

    try:
        header = jwt.get_unverified_header(token)
    except Exception as e:
        raise SupabaseTokenError(f"Malformed token header: {e}") from e

    alg = (header or {}).get("alg", "")
    verify_kwargs: Dict[str, Any] = {
        "audience": settings.SUPABASE_JWT_AUDIENCE or None,
        "options": {"verify_aud": bool(settings.SUPABASE_JWT_AUDIENCE)},
    }
    if SUPABASE_ISSUER:
        verify_kwargs["issuer"] = SUPABASE_ISSUER

    # 1. Legacy symmetric secret
    if alg.startswith("HS") and settings.SUPABASE_JWT_SECRET:
        try:
            return jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256", "HS384", "HS512"], **verify_kwargs)
        except Exception as e:
            raise SupabaseTokenError(f"HS256 verification failed: {e}") from e

    # 2. Asymmetric via JWKS
    client = _get_jwks_client()
    if client is None:
        raise SupabaseTokenError(
            "No verification key available: set SUPABASE_JWT_SECRET, or configure "
            "SUPABASE_URL so the JWKS endpoint can be used."
        )
    try:
        signing_key = client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256", "EdDSA"],
            **verify_kwargs,
        )
    except Exception as e:
        raise SupabaseTokenError(f"JWKS verification failed ({alg}): {e}") from e


def verify_supabase_jwt(token: str) -> Dict[str, Any]:
    """
    Verify a Supabase access token and return its claims.

    The returned claims always contain `sub` (auth.users id) and, whenever the
    token carries it, a role hint from `user_metadata.role` / `app_metadata.role`.
    """
    claims = _decode(token)
    if not claims.get("sub"):
        raise SupabaseTokenError("Token has no 'sub' claim (user id)")

    role_hint = (
        (claims.get("user_metadata") or {}).get("role")
        or (claims.get("app_metadata") or {}).get("role")
    )
    claims["_role_hint"] = role_hint
    return claims


def try_verify_supabase_jwt(token: str) -> Optional[Dict[str, Any]]:
    """Non-raising wrapper — returns None on any verification failure."""
    try:
        return verify_supabase_jwt(token)
    except SupabaseTokenError as e:
        logger.info("[AUTH] token rejected: %s", e)
        return None
    except Exception as e:  # pragma: no cover
        logger.warning("[AUTH] unexpected verification error: %s", e)
        return None
