"""
Demand Service — Demand-Based Recommendation Provider Chain
===========================================================

PROVIDER CHAIN (same honesty-contract pattern as voice/pricing modules):

  1. pytrends (best-effort): free Google-Trends search-interest for the
     craft's search terms over the last 3 months. Strict 5s budget, full
     exception handling, and explicit spurious-data rejection (pytrends is
     known to return all-zero frames instead of clean failures).
  2. seasonal_static (fallback): app/data/seasonal_demand.py — today's
     festival/season window → static demand score. Zero external dependency.

Whichever source answers is cached 24h per category and is honestly
traceable in every response via `source`.
"""

import logging
import threading
import warnings
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional

from app.data.seasonal_demand import (
    BASELINE_SCORE,
    DEMAND_SCORES,
    seasonal_signal,
)
from app.data.craft_adjacency import (
    APP_CRAFT_ID_MAP,
    CRAFT_ADJACENCY,
    CATEGORY_DISPLAY_NAMES,
    normalize_craft_type,
)

logger = logging.getLogger("shilpkala.demand")

# ---------------------------------------------------------------------------
# Tuning constants
# ---------------------------------------------------------------------------
PYTRENDS_TIMEOUT_SECONDS = 5      # strict per-category budget for the pytrends attempt
CACHE_TTL_HOURS = 24              # cache whichever source answered for 24 hours
TOP_N_RECOMMENDATIONS = 3         # rank adjacents, return top 3

# pytrends interest data quality gates — a frame must pass ALL of these to be
# trusted (pytrends' documented failure mode is all-zero / all-same frames
# returned with HTTP 200 instead of an exception).
_MIN_ROWS = 20                     # 3 months of weekly data ≈ 13+ rows; demand more for robustness
_MIN_PEAK = 5                      # peak interest below this = spurious zeros
_MIN_VARIANCE = 0.5                # zero variance = suspect frame

# Baseline for "% above baseline" in the why-field. For google_trends this is
# the mean of the 3-month series (a real empirical baseline); for
# seasonal_static it is the conceptual BASELINE_SCORE = 50.
_TRENDS_BASELINE_FLOOR = 5.0       # avoid division by near-zero


class DemandService:
    """Provider-chained demand-signal service with 24h result cache."""

    def __init__(self) -> None:
        # cache[(category_key, source_scope)] = {"payload": {...}, "expires": datetime}
        self._cache: dict[tuple[str, str], dict[str, Any]] = {}
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_recommendations(
        self,
        craft_type: Optional[str] = None,
        artisan_id: Optional[str] = None,
        artisan_craft_hint: Optional[str] = None,
        today: Optional[date] = None,
        force_static: bool = False,
    ) -> dict[str, Any]:
        """Rank adjacent craft categories by current demand and return top 3.

        force_static=True skips the pytrends attempt entirely (used by the
        failure-path test to exercise the fallback deterministically).
        """
        base_key = self._resolve_base_key(craft_type, artisan_id, artisan_craft_hint)
        base_display = CATEGORY_DISPLAY_NAMES.get(base_key, craft_type or "Unknown Craft")

        adjacent_keys = CRAFT_ADJACENCY.get(base_key, [])
        if not adjacent_keys:
            # Unknown craft: honest empty recommendation, structured response.
            return {
                "base_craft": base_display,
                "recommendations": [],
                "data_source": (
                    "hand-curated craft-adjacency mapping + seasonal Indian "
                    "handicraft demand patterns; live Google Trends data used "
                    "when available"
                ),
                "source_used": "none",
                "season": None,
                "note": f"No curated adjacency entry for '{base_display}'.",
            }

        signals: list[dict[str, Any]] = []
        for adj_key in adjacent_keys:
            signals.append(
                self.get_category_signal(adj_key, today=today, force_static=force_static)
            )

        # Rank by score, keep top 3.
        ranked = sorted(signals, key=lambda s: s["trend_score"], reverse=True)[
            :TOP_N_RECOMMENDATIONS
        ]

        # Honest source accounting over the RETURNED recommendations.
        # Google can rate-limit mid-response, so a response can legitimately be
        # mixed: e.g. 2 categories answered by trends, 1 by the static table.
        n_trends = sum(1 for s in ranked if s["source"] == "google_trends")
        n_static = len(ranked) - n_trends
        source_breakdown = {"google_trends": n_trends, "seasonal_static": n_static}
        if n_trends == len(ranked):
            primary_source = "google_trends"
        elif n_trends == 0:
            primary_source = "seasonal_static"
        else:
            # Mixed: majority source at response level; the breakdown field and
            # each per-item 'why' carry the full honest per-category trace.
            primary_source = "google_trends" if n_trends > n_static else "seasonal_static"

        recommendations = [
            {
                "category": sig["display_name"],
                "trend_score": sig["trend_score"],
                "trend_direction": sig["trend_direction"],
                "why": self._build_why(sig),
            }
            for sig in ranked
        ]

        season = ranked[0].get("season") if ranked else None
        return {
            "base_craft": base_display,
            "recommendations": recommendations,
            "data_source": self._build_data_source(primary_source, source_breakdown),
            "source_used": primary_source,
            "source_breakdown": source_breakdown,
            "season": season,
        }

    def get_category_signal(
        self,
        category_key: str,
        today: Optional[date] = None,
        force_static: bool = False,
    ) -> dict[str, Any]:
        """Provider-chained demand signal for ONE category (cached 24h)."""
        cache_scope = "static" if force_static else "chain"
        cache_key = (category_key, cache_scope)
        now = datetime.now(timezone.utc)

        with self._lock:
            cached = self._cache.get(cache_key)
            if cached and cached["expires"] > now:
                return dict(cached["payload"])

        if not force_static:
            try:
                trends = self._try_pytrends(category_key)
            except Exception as exc:  # noqa: BLE001 — the chain must never crash
                logger.info(
                    "[DEMAND] pytrends attempt raised for '%s': %s → seasonal_static",
                    category_key,
                    type(exc).__name__,
                )
                trends = None
            if trends is not None:
                payload = self._finalize_signal(trends, season_override=None)
                self._store(cache_key, payload)
                return dict(payload)

        # ---- Fallback: static seasonal table (always available) ----
        static = seasonal_signal(category_key, today=today)
        display = CATEGORY_DISPLAY_NAMES.get(
            category_key, category_key.replace("_", " ").title()
        )
        payload = {
            "category_key": category_key,
            "display_name": display,
            "trend_score": static["trend_score"],
            "trend_direction": static["trend_direction"],
            "source": "seasonal_static",
            "season": {
                "key": static["season_key"],
                "label": static["season_label"],
            },
            "terms": [],
        }
        self._store(cache_key, payload)
        return dict(payload)

    # ------------------------------------------------------------------
    # pytrends attempt (best-effort)
    # ------------------------------------------------------------------

    def _try_pytrends(self, category_key: str) -> Optional[dict[str, Any]]:
        """Attempt a live Google-Trends fetch. Returns a normalized signal
        dict on success, None on ANY failure (error, timeout, empty,
        all-zero/spurious data). Never raises."""
        try:
            from pytrends.request import TrendReq  # imported lazily; optional dep

            terms = self._terms_for(category_key)
            if not terms:
                return None

            # Wall-clock budget enforcement around the whole fetch —
            # pytrends' own retries can hang well past its timeout param.
            result: dict[str, Any] = {}
            error: dict[str, Any] = {}

            def _fetch() -> None:
                try:
                    with warnings.catch_warnings():
                        # pytrends hits a deprecated pandas fillna path; noise only.
                        warnings.simplefilter("ignore", FutureWarning)
                        pt = TrendReq(
                            hl="en-US",
                            tz=330,  # IST
                            timeout=(2, 3),  # (connect, read)
                            retries=0,       # one clean attempt; fallback is cheap
                            backoff_factor=0,
                        )
                        pt.build_payload(terms, timeframe="today 3-m", geo="IN")
                        frame = pt.interest_over_time()
                    result["frame"] = frame
                except Exception as exc:  # noqa: BLE001 — best-effort by design
                    error["exc"] = exc

            worker = threading.Thread(target=_fetch, daemon=True)
            worker.start()
            worker.join(PYTRENDS_TIMEOUT_SECONDS)
            if worker.is_alive():
                logger.info(
                    "[DEMAND] pytrends timeout (%ss) for '%s' → falling through to seasonal_static",
                    PYTRENDS_TIMEOUT_SECONDS,
                    category_key,
                )
                return None
            if error:
                logger.info(
                    "[DEMAND] pytrends failed for '%s': %s → seasonal_static",
                    category_key,
                    type(error["exc"]).__name__,
                )
                return None

            frame = result.get("frame")
            if frame is None or frame.empty:
                logger.info("[DEMAND] pytrends empty frame for '%s' → seasonal_static", category_key)
                return None

            # Drop the isPartial column if present (flag, not data).
            if "isPartial" in frame.columns:
                frame = frame.drop(columns=["isPartial"])
            if frame.empty:
                logger.info("[DEMAND] pytrends empty-after-drop for '%s' → seasonal_static", category_key)
                return None

            values = frame[terms[0]].astype(float)
            if len(values) < _MIN_ROWS:
                logger.info("[DEMAND] pytrends too few rows for '%s' → seasonal_static", category_key)
                return None

            peak = float(values.max())
            variance = float(values.var())
            if peak < _MIN_PEAK or variance < _MIN_VARIANCE:
                # The documented spurious-zero failure mode — HTTP 200 but no signal.
                logger.info(
                    "[DEMAND] pytrends spurious data for '%s' (peak=%.1f var=%.1f) → seasonal_static",
                    category_key,
                    peak,
                    variance,
                )
                return None

            current = float(values.iloc[-1])
            mean = float(values.mean())
            pct_vs_baseline = round(((current - mean) / max(mean, _TRENDS_BASELINE_FLOOR)) * 100)

            # Direction: compare the last 4 weeks against the full 3-month mean.
            recent = float(values.iloc[-4:].mean())
            if recent > mean * 1.15:
                direction = "rising"
            elif recent < mean * 0.85:
                direction = "declining"
            else:
                direction = "stable"

            # Score: scale the series' relative position onto the 0-100 scale
            # (50 = 3-month mean, floor 5, cap 100).
            score = int(round(BASELINE_SCORE + (current - mean) / max(mean, _TRENDS_BASELINE_FLOOR) * 50))
            score = max(5, min(100, score))

            return {
                "category_key": category_key,
                "trend_score": score,
                "trend_direction": direction,
                "pct_vs_baseline": pct_vs_baseline,
                "series_mean": round(mean, 1),
                "series_current": round(current, 1),
                "terms": terms,
            }
        except ImportError:
            logger.info("[DEMAND] pytrends not installed → seasonal_static")
            return None
        except Exception as exc:  # noqa: BLE001 — last-resort guard, must never crash the endpoint
            logger.info("[DEMAND] pytrends unexpected error for '%s': %s → seasonal_static", category_key, exc)
            return None

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _terms_for(category_key: str) -> list[str]:
        """Search terms per category (max 5 — pytrends payload limit)."""
        term_map: dict[str, list[str]] = {
            "handloom_weaving": ["handloom saree", "banarasi saree", "handloom"],
            "clay_pottery": ["terracotta pottery", "clay diyas", "pottery"],
            "hand_block_print": ["block print fabric", "block print", "jaipuri print"],
            "wood_carving": ["wooden handicraft", "wood carving", "sheesham furniture"],
            "zardozi_embroidery": ["zardozi work", "embroidered lehenga", "zardozi"],
            "brass_metalwork": ["brass diya", "brass idols", "brass decor"],
            "goldsmith_jewellery": ["gold jewellery", "temple jewellery"],
            "blacksmith_ironsmith": ["blacksmith tools"],
            "carpentry_woodwork": ["wooden furniture", "carpenter"],
            "sculptor_stone_carving": ["marble idols", "stone carving"],
            "cobbler_footwear": ["leather jutti", "mojari"],
            "mason_basket_coir": ["coir products", "bamboo basket"],
            "doll_toy_maker": ["traditional toys", "channapatna toys"],
            "garland_maker": ["flower garland", "pooja garland"],
            "tailor": ["blouse stitching", "tailor shop"],
            "textile_services": ["dry cleaning"],
            "fishnet_maker": ["fishing net"],
            "weaving": ["handloom saree", "weaving"],
            "embroidery": ["embroidery designs", "hand embroidery"],
            "block_printing": ["block print fabric", "hand block printing"],
            "dhokra_bell_metal": ["dhokra art", "bell metal"],
            "basket_maker": ["bamboo basket", "cane furniture"],
        }
        return term_map.get(category_key, [])[:5]

    def _finalize_signal(self, signal: dict[str, Any], season_override: Any) -> dict[str, Any]:
        display = CATEGORY_DISPLAY_NAMES.get(
            signal["category_key"], signal["category_key"].replace("_", " ").title()
        )
        return {
            "category_key": signal["category_key"],
            "display_name": display,
            "trend_score": signal["trend_score"],
            "trend_direction": signal["trend_direction"],
            "pct_vs_baseline": signal.get("pct_vs_baseline"),
            "series_mean": signal.get("series_mean"),
            "series_current": signal.get("series_current"),
            "source": "google_trends",
            "season": None,
            "terms": signal.get("terms", []),
        }

    def _store(self, key: tuple[str, str], payload: dict[str, Any]) -> None:
        with self._lock:
            self._cache[key] = {
                "payload": dict(payload),
                "expires": datetime.now(timezone.utc) + timedelta(hours=CACHE_TTL_HOURS),
            }

    @staticmethod
    @staticmethod
    def _build_why(sig: dict[str, Any]) -> str:
        """Honest why-field reflecting the actual answering source.

        For google_trends, 'level' (score vs 3-month mean) and 'momentum'
        (direction vs last 4 weeks) are separate facts; when they diverge the
        text states both so the response is never self-contradictory.
        """
        if sig["source"] == "google_trends":
            pct = sig.get("pct_vs_baseline")
            direction = sig["trend_direction"]
            momentum_note = ""
            if pct is not None:
                if direction == "rising" and pct < 0:
                    momentum_note = " though rising over the past 4 weeks"
                elif direction == "declining" and pct > 0:
                    momentum_note = " though declining over the past 4 weeks"
            if pct is None:
                return f"related to your craft; live Google Trends interest is {direction}"
            if pct >= 0:
                return (
                    f"related to your craft; current search interest is {pct}% above the "
                    f"3-month baseline{momentum_note} (source: Google Trends)"
                )
            return (
                f"related to your craft; current search interest is {abs(pct)}% below the "
                f"3-month baseline{momentum_note} (source: Google Trends)"
            )
        # seasonal_static — do NOT claim live data
        season_label = (sig.get("season") or {}).get("label", "current season")
        score = sig["trend_score"]
        delta = score - BASELINE_SCORE
        if delta > 0:
            return (
                f"related to your craft; {season_label.lower()} demand is {delta} points above "
                f"baseline (score {score}/100, source: seasonal patterns)"
            )
        if delta < 0:
            return (
                f"related to your craft; {season_label.lower()} demand is {abs(delta)} points below "
                f"baseline (score {score}/100, source: seasonal patterns)"
            )
        return (
            f"related to your craft; demand is at year-round baseline "
            f"(score {score}/100, source: seasonal patterns)"
        )

    @staticmethod
    def _build_data_source(primary_source: str, breakdown: Optional[dict[str, int]] = None) -> str:
        """Honest response-level data_source text reflecting actual sources."""
        if primary_source == "google_trends" and (not breakdown or breakdown["seasonal_static"] == 0):
            return (
                "hand-curated craft-adjacency mapping + live Google Trends search-interest "
                "(last 3 months, India geo); static seasonal patterns used for any category "
                "trends could not answer"
            )
        if breakdown and breakdown["google_trends"] and breakdown["seasonal_static"]:
            return (
                f"hand-curated craft-adjacency mapping + live Google Trends search-interest "
                f"for {breakdown['google_trends']} of {breakdown['google_trends'] + breakdown['seasonal_static']} "
                f"recommended categories (Google rate-limiting blocked the rest) + static "
                f"seasonal patterns for the remainder; each recommendation's 'why' traces "
                f"its actual source"
            )
        return (
            "hand-curated craft-adjacency mapping + seasonal Indian handicraft demand "
            "patterns; live Google Trends data used when available (currently answering "
            "from the static table)"
        )

    def _resolve_base_key(
        self,
        craft_type: Optional[str],
        artisan_id: Optional[str],
        artisan_craft_hint: Optional[str],
    ) -> str:
        """Resolve request input → canonical adjacency key."""
        # 1. App craft-type id ('1'..'6' from mockCraftTypes.js)
        if artisan_id and artisan_id in APP_CRAFT_ID_MAP:
            return APP_CRAFT_ID_MAP[artisan_id]
        # 2. Explicit craft hint from a fetched artisan record
        if artisan_craft_hint:
            key = normalize_craft_type(artisan_craft_hint)
            if key:
                return key
        # 3. Free-text craft_type
        if craft_type:
            key = normalize_craft_type(craft_type)
            if key:
                return key
        # 4. Unknown artisan/craft — handloom is the seeded default artisan's craft
        return "handloom_weaving"

    def cache_stats(self) -> dict[str, int]:
        with self._lock:
            return {"entries": len(self._cache), "ttl_hours": CACHE_TTL_HOURS}


demand_service = DemandService()
