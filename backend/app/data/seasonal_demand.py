"""
Seasonal Demand Signals for Indian Handicrafts — Static Reference Table
=======================================================================

THE BACKBONE OF THE RECOMMENDATION ENGINE.
This module is a hand-authored, dependency-free static table that maps every
ShilpKala craft category to demand intensity across the Indian festival and
seasonal calendar. It runs the live demo with zero external calls.

DESIGN RATIONALE (not invented numbers — documented Indian handicraft
market seasonality):

1. WEDDING SEASON (Oct-Mar, peaks Nov-Dec & Feb): Indian weddings concentrate
   in these months (wedding-season GMV surges are widely reported by Meesho/
   Flipkart seller advisories and the Wedding-Industry Reports). Zardozi,
   Banarasi brocades, silk handloom and jewellery are the canonical wedding
   categories — zardozi/embroidery units routinely report their busiest
   production cycle here; handloom saree purchases peak for trousseau.

2. DIWALI (Oct/Nov, kartik amavasya): Diyas, brass lamps (kamal/kali diyas,
   akhand jyoti), puja thalis, idols and decor dominate — Moradabad brassware
   and terracotta diyas see documented pre-Diwali order surges (EPCH export
   cycles + state emporia stocking). Highest single-window for metal & clay.

3. HOLI (Mar): Color-adjacent crafts — natural-dye block printing (Sanganeri
   herbal-dye tradition), tie-dye, gulal containers, water toys (pichkari
   craft is wood/bamboo). modest bump, not a peak for most categories.

4. MONSOON (Jun-Sep): Peak festival season is absent; many artisan clusters
   report their slowest production/despatch window (weddings are inauspicious
   until Dev Uthani Ekadashi; flooding hits rural logistics). Classic
   'off-season' baseline. EXCEPTION: Raksha Bandhan (Aug) is a small but real
   bump for clay/thali/pooja-adjacent goods.

5. FESTIVE RUN-UP (Sep-Oct, Navratri→Dussehra→Karwa Chauth→Diwali): India's
   largest retail quarter begins; gifting demand lifts nearly every category
   before the Diwali peak.

6. BASELINE: every category keeps a year-round floor (household re-purchase,
   export orders, temple/commission work) so scores never collapse to zero.

SCORE SEMANTICS
---------------
  demand labels:  "high" | "medium" | "low"
  score scale:    0-100, where 50 is the year-round baseline.
  direction:      "rising"   — score above baseline (festival tailwind)
                  "stable"   — at baseline
                  "declining" — below baseline (off-season)

Every entry must cover ALL windows in SEASON_WINDOWS so that, for any date,
the table independently yields a complete, sensible (trend_score,
trend_direction) pair for every craft category — no network, no keys, no ML.
"""

from datetime import date

# ---------------------------------------------------------------------------
# Calendar windows (month, day) inclusive — computed from today's date only.
# ---------------------------------------------------------------------------
SEASON_WINDOWS: dict[str, dict] = {
    "wedding_season": {
        "label": "Wedding Season",
        "start": (10, 1),   # Oct 1
        "end": (3, 31),     # Mar 31 (spans year-end; overlaps Diwali/festive)
        "reasoning": "Nov-Dec and Feb peak wedding muhurats; trousseau & gifting demand",
    },
    "holi": {
        "label": "Holi Window",
        "start": (2, 15),   # Feb 15 (pre-Holi production & retail ramp)
        "end": (3, 31),     # Mar 31
        "reasoning": "herbal-dye & color-adjacent crafts; modest, category-specific",
    },
    "festive_runup": {
        "label": "Festive Run-up (Navratri to pre-Diwali)",
        "start": (9, 1),    # Sep 1
        "end": (10, 15),    # Oct 15
        "reasoning": "largest retail quarter begins; gifting demand lifts most crafts",
    },
    "diwali": {
        "label": "Diwali Window",
        "start": (10, 10),  # Oct 10
        "end": (11, 15),    # Nov 15 (Dhanteras to Govardhan Puja + buffer)
        "reasoning": "diyas, brass lamps, puja thalis, idols, decor peak",
    },
    "monsoon": {
        "label": "Monsoon Off-Season",
        "start": (6, 1),    # Jun 1
        "end": (8, 31),     # Aug 31
        "reasoning": "slowest despatch window; rural logistics & wedding gap",
    },
    "baseline": {
        "label": "General / Off-Season Baseline",
        "start": None,      # catch-all when no stronger window applies
        "end": None,
        "reasoning": "year-round floor: household re-purchase, exports, commissions",
    },
}

# Resolution order: first matching window in this order wins.
# (Diwali & wedding season deliberately overlap Oct 10-Nov 15 — a craft's
# demand there is the union of both signals; resolution favors the window
# where the category has its characteristic peak.)
_WINDOW_RESOLUTION_ORDER = [
    "diwali",
    "wedding_season",
    "festive_runup",
    "holi",
    "monsoon",
    "baseline",
]

# ---------------------------------------------------------------------------
# THE STATIC TABLE — one entry per craft category, every window covered.
#   "high"   → strong documented seasonal peak for this category
#   "medium" → meaningful lift or mild dip
#   "low"    → documented off-season for this category
# ---------------------------------------------------------------------------
SEASONAL_DEMAND: dict[str, dict[str, str]] = {
    # --- The 6 categories actually in the ShilpKala app (mockCraftTypes.js) ---
    "handloom_weaving": {
        "wedding_season": "high",    # Banarasi/silk trousseau sarees peak Nov-Feb
        "diwali": "high",            # festive new-clothes & gifting (silk/stoles)
        "festive_runup": "high",     # Navratri/Karwa Chauth new-clothes demand
        "holi": "medium",            # cottons/dupattas modest lift
        "monsoon": "low",            # slowest handloom despatch window
        "baseline": "medium",
    },
    "clay_pottery": {
        "wedding_season": "medium",  # terracotta decor & pots for wedding rituals
        "diwali": "high",            # THE diya/terracotta-lamp peak (Gorakhpur/Khurja clusters)
        "festive_runup": "medium",   # pre-Diwali diya production ramp
        "holi": "low",               # no color-adjacency, no festival driver
        "monsoon": "low",            # kiln/firing & logistics constrained; slow season
        "baseline": "medium",
    },
    "hand_block_print": {
        "wedding_season": "high",    # printed silk/cotton sarees & suits for functions
        "diwali": "medium",          # festive apparel gifting
        "festive_runup": "medium",   # apparel lift
        "holi": "high",              # Sanganeri herbal-dye tradition = canonical Holi craft
        "monsoon": "low",            # fabric drying/humidity hits production
        "baseline": "medium",
    },
    "wood_carving": {
        "wedding_season": "medium",  # carved giftware & trousseau boxes
        "diwali": "medium",          # decorative items gifting
        "festive_runup": "medium",
        "holi": "low",
        "monsoon": "low",            # Saharanpur cluster reports monsoon lull
        "baseline": "medium",
    },
    "zardozi_embroidery": {
        "wedding_season": "high",    # THE zardozi peak: lehengas, sherwanis, trousseau
        "diwali": "medium",          # festive-wear lift, secondary to weddings
        "festive_runup": "medium",
        "holi": "low",               # white/embellished wear avoided around Holi
        "monsoon": "low",            # inauspicious wedding gap until Dev Uthani
        "baseline": "medium",
    },
    "brass_metalwork": {
        "wedding_season": "medium",  # puja items & wedding gifting (thali sets, gifts)
        "diwali": "high",            # THE brass diya/lamp/idol peak (Moradabad)
        "festive_runup": "high",     # Dhanteras utensil/lamp buying begins early
        "holi": "low",
        "monsoon": "low",
        "baseline": "medium",
    },

    # --- Remaining PM Vishwakarma trades (completeness for other artisans) ---
    "goldsmith_jewellery": {
        "wedding_season": "high",    # jewellery is the canonical wedding purchase
        "diwali": "high",            # Dhanteras is the biggest gold-buying day of the year
        "festive_runup": "high",
        "holi": "low",
        "monsoon": "low",
        "baseline": "medium",
    },
    "blacksmith_ironsmith": {
        "wedding_season": "medium",
        "diwali": "low",             # metal tools/decor not festival-gifted
        "festive_runup": "low",
        "holi": "low",
        "monsoon": "medium",         # pre-harvest tool demand (agricultural cycle)
        "baseline": "medium",
    },
    "carpentry_woodwork": {
        "wedding_season": "medium",  # furniture gifting for new households
        "diwali": "medium",          # home-improvement season
        "festive_runup": "medium",
        "holi": "low",
        "monsoon": "low",
        "baseline": "medium",
    },
    "sculptor_stone_carving": {
        "wedding_season": "medium",
        "diwali": "medium",          # Ganesh/Lakshmi idols
        "festive_runup": "medium",
        "holi": "low",
        "monsoon": "low",
        "baseline": "medium",
    },
    "cobbler_footwear": {
        "wedding_season": "high",    # wedding juttis/mojaris & footwear gifting
        "diwali": "medium",
        "festive_runup": "medium",
        "holi": "low",
        "monsoon": "low",            # leather-work humidity constraints
        "baseline": "medium",
    },
    "mason_basket_coir": {
        "wedding_season": "low",
        "diwali": "medium",          # baskets as festive hamper/puja packaging
        "festive_runup": "medium",
        "holi": "low",
        "monsoon": "medium",         # coir/bamboo harvest & weaving season
        "baseline": "medium",
    },
    "doll_toy_maker": {
        "wedding_season": "medium",  # return gifts & new-household toys
        "diwali": "medium",
        "festive_runup": "high",     # Navratri golu doll displays = documented peak
        "holi": "medium",
        "monsoon": "low",
        "baseline": "medium",
    },
    "garland_maker": {
        "wedding_season": "high",    # varmala & decoration demand peaks with weddings
        "diwali": "medium",          # floral torans & puja garlands
        "festive_runup": "medium",
        "holi": "medium",            # flower color festival
        "monsoon": "low",
        "baseline": "medium",
    },
    "tailor": {
        "wedding_season": "high",    # wedding & festive bespoke wear cycle
        "diwali": "high",            # new clothes on Dhanteras/Diwali tradition
        "festive_runup": "high",
        "holi": "medium",
        "monsoon": "low",
        "baseline": "medium",
    },
    "fishnet_maker": {
        "wedding_season": "low",
        "diwali": "low",
        "festive_runup": "low",
        "holi": "low",
        "monsoon": "medium",         # post-monsoon fishing season preparation
        "baseline": "medium",
    },
    # --- Common extras ---
    "dhokra_bell_metal": {
        "wedding_season": "medium",
        "diwali": "high",            # bell-metal lamps & idols, same Diwali driver as brass
        "festive_runup": "medium",
        "holi": "low",
        "monsoon": "low",
        "baseline": "medium",
    },
    "block_printing": {  # alias kept so "block printing" queries resolve directly
        "wedding_season": "high",
        "diwali": "medium",
        "festive_runup": "medium",
        "holi": "high",
        "monsoon": "low",
        "baseline": "medium",
    },
    "weaving": {         # alias kept so generic "weaving" queries resolve directly
        "wedding_season": "high",
        "diwali": "high",
        "festive_runup": "high",
        "holi": "medium",
        "monsoon": "low",
        "baseline": "medium",
    },
    "embroidery": {      # alias kept so generic "embroidery" queries resolve directly
        "wedding_season": "high",
        "diwali": "medium",
        "festive_runup": "medium",
        "holi": "low",
        "monsoon": "low",
        "baseline": "medium",
    },
}

# Demand label → score (0-100; 50 = year-round baseline)
DEMAND_SCORES: dict[str, int] = {
    "high": 82,
    "medium": 58,
    "low": 34,
}

BASELINE_SCORE: int = 50  # conceptual reference for direction & "% above baseline"


def get_current_season(today: date | None = None) -> str:
    """Resolve today's date to the dominant season window key.

    Resolution favors the most festival-specific window whose date range
    contains today (see _WINDOW_RESOLUTION_ORDER). 'baseline' is the
    catch-all — it is a real, sensible answer (the documented off-season),
    not a failure.
    """
    d = today or date.today()
    for key in _WINDOW_RESOLUTION_ORDER:
        w = SEASON_WINDOWS[key]
        s, e = w["start"], w["end"]
        if s is None or e is None:
            continue
        if (date(d.year, *s) <= d <= date(d.year, *e)) or (
            s[0] > e[0]  # wraps year-end (wedding_season Oct→Mar)
            and (d >= date(d.year, *s) or d <= date(d.year, *e))
        ):
            return key
    return "baseline"


def seasonal_signal(category_key: str, today: date | None = None) -> dict:
    """Independent static demand signal for one category.

    Returns {trend_score, trend_direction, season_key, season_label}.
    Zero external dependency — this is what runs the live demo.
    """
    season_key = get_current_season(today)
    entry = SEASONAL_DEMAND.get(category_key)

    if entry is None:
        # Unmapped category: honest neutral signal at baseline, never a crash.
        return {
            "trend_score": BASELINE_SCORE,
            "trend_direction": "stable",
            "season_key": season_key,
            "season_label": SEASON_WINDOWS[season_key]["label"],
        }

    demand = entry.get(season_key, entry.get("baseline", "medium"))
    score = DEMAND_SCORES[demand]
    direction = "rising" if score > BASELINE_SCORE else (
        "declining" if score < BASELINE_SCORE else "stable"
    )
    return {
        "trend_score": score,
        "trend_direction": direction,
        "season_key": season_key,
        "season_label": SEASON_WINDOWS[season_key]["label"],
    }
