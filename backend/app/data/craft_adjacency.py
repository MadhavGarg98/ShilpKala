"""
Craft Adjacency Map — Hand-Curated Domain Logic
===============================================

THIS IS NOT A TRAINED MODEL OR AN LLM OUTPUT.
Each adjacency below was hand-curated from Indian handicraft-cluster domain
knowledge: shared raw materials, shared production techniques, shared customer
occasions, and shared festival/gifting demand drivers. The core question this
map answers is: "an artisan skilled in craft X can credibly make/sell products
in adjacent craft Y" — the same buyers, the same retail channels, the same
skill transfer distance of one cluster over.

Verification note (2026-09): the six ShilpKala app categories
(handloom_weaving, clay_pottery, hand_block_print, wood_carving,
zardozi_embroidery, brass_metalwork) were explicitly cross-referenced against
frontend/src/mock/mockCraftTypes.js (Banaras Brocades GI #99, Gorakhpur
Terracotta GI #629, Sanganer Block Print GI #164, Saharanpur Wood GI #431,
Lucknow Zardozi GI #316, Handmade Brass) — all six have curated entries below.
The remaining trades follow the official PM Vishwakarma 18-trade list
(pmvishwakarma.gov.in): Carpenter (Suthar), Boat Maker, Armourer, Blacksmith
(Lohar), Hammer & Tool Kit Maker, Locksmith, Goldsmith (Sunar), Potter
(Kumhaar), Sculptor/Moortikar, Cobbler (Charmkar), Mason (Raajmistri),
Basket/Mat/Coir Weaver, Doll & Toy Maker, Barber (Naai), Garland Maker
(Malakaar), Washerman (Dhobi), Tailor (Darzi), Fishing Net Maker.
Barber/Washerman are service trades, not product crafts — they are grouped
under 'textile_services' with sensible textile adjacencies.

SPILLOVER RULE: an artisan may occasionally borrow skills from a second-order
neighbor, so entries include 2-4 first-degree adjacencies and at most one
'spillover' entry (clearly meaningful, but more distant). Deliberately
excluded: nonsensical pairings like handloom-weaving → brass-metalwork, which
share neither material, technique, buyer, nor occasion.
"""

# Adjacency values are canonical category keys in SEASONAL_DEMAND and this
# map. Each list: 2-4 genuinely related crafts, optionally 1 'spillover' tag.
CRAFT_ADJACENCY: dict[str, list[str]] = {
    # =====================================================================
    # THE 6 SHILPKALA APP CATEGORIES — verified against mockCraftTypes.js
    # =====================================================================

    # Banaras Brocades & Sarees (GI #99): silk/zari loom textiles.
    # Adjacencies share the loom, the zari input, and the wedding occasion.
    "handloom_weaving": [
        "zardozi_embroidery",   # embellishes handloom sarees; same bridal buyer
        "block_printing",       # apparel textiles; shared festive-buyer channels
        "tailor",               # converts woven cloth into garments (spillover)
    ],

    # Gorakhpur Terracotta (GI #629): fired clay — pots, diyas, decor.
    "clay_pottery": [
        "brass_metalwork",      # puja/decor overlap: diya thalis, ritual items
        "dhokra_bell_metal",    # cast-metal ritual & decor figurines (spillover)
        "sculptor_stone_carving",  # figurative modeling craft, decor buyers
    ],

    # Sanganer Hand Block Print (GI #164): hand-stamped textiles with herbal dyes.
    "hand_block_print": [
        "handloom_weaving",     # prints on woven cloth; same apparel buyer
        "embroidery",           # printed-then-embroidered dress materials
        "tailor",               # block-print garments (kurtas, suits)
    ],

    # Saharanpur Wood Craft (GI #431): carved sheesham — decor, furniture, jali.
    "wood_carving": [
        "carpentry_woodwork",   # same material, same tooling family
        "sculptor_stone_carving",  # carving technique transfers across media
        "clay_pottery",         # decor/home-occasion buyer overlap (spillover)
    ],

    # Lucknow Zardozi (GI #316): metallic-wire embroidery on velvet/satin.
    "zardozi_embroidery": [
        "handloom_weaving",     # zari thread is the shared input; bridal overlap
        "tailor",               # embroidered garments cut & stitched
        "goldsmith_jewellery",  # bridal-look occasion overlap (spillover)
    ],

    # Handmade Brass Metalcraft: sand-cast, engraved puja/decor items.
    "brass_metalwork": [
        "dhokra_bell_metal",    # same casting tradition, adjacent alloy
        "clay_pottery",         # ritual/puja item overlap (diyas, thalis)
        "goldsmith_jewellery",  # metal-forming skills; festive gifting overlap (spillover)
    ],

    # =====================================================================
    # REMAINING PM VISHWAKARMA TRADES
    # =====================================================================

    # Goldsmith (Sunar): fine metal jewellery.
    "goldsmith_jewellery": [
        "brass_metalwork",      # metal shaping & finishing skills
        "zardozi_embroidery",   # bridal occasion overlap
        "blacksmith_ironsmith", # metal-working craft family (spillover)
    ],

    # Blacksmith (Lohar) / Armourer / Hammer & Tool Kit Maker / Locksmith:
    # forged-iron trades sharing tools, technique, and hardware buyers.
    "blacksmith_ironsmith": [
        "carpentry_woodwork",   # tool users and tool makers pair naturally
        "brass_metalwork",      # hot-metal forging family
        "sculptor_stone_carving",  # chisel-and-hammer craft family (spillover)
    ],

    # Carpenter (Suthar) / Boat Maker: structural and crafted woodwork.
    "carpentry_woodwork": [
        "wood_carving",         # same material; carving is finishing-level detail
        "blacksmith_ironsmith", # fittings, blades, hardware
        "basket_maker",         # natural-fiber + wood household items (spillover)
    ],

    # Sculptor (Moortikar) / stone carver: figurative carving & idol making.
    "sculptor_stone_carving": [
        "clay_pottery",         # idol making spans clay and stone
        "wood_carving",         # carving technique across media
        "brass_metalwork",      # cast idols overlap (spillover)
    ],

    # Cobbler (Charmkar) / Shoesmith: leather footwear & goods.
    "cobbler_footwear": [
        "tailor",               # stitch-based craft; wedding-occasion overlap
        "zardozi_embroidery",   # embroidered jutti uppers (spillover)
    ],

    # Mason (Raajmistri) + Basket Maker / Mat Maker / Coir Weaver / Broom Maker
    # grouped as household fiber & structure crafts.
    "mason_basket_coir": [
        "basket_maker",         # same weaving-with-fiber technique family
        "carpentry_woodwork",   # structural/household craft overlap
        "weaving",              # mat weaving is loom-adjacent (spillover)
    ],

    # Doll & Toy Maker (traditional): cloth, clay, wood toys.
    "doll_toy_maker": [
        "clay_pottery",         # traditional clay toys
        "wood_carving",         # wooden toy carving (Channapatna/Varanasi tradition)
        "tailor",               # cloth dolls & stuffing (spillover)
    ],

    # Garland Maker (Malakaar): fresh/dried flower craft.
    "garland_maker": [
        "basket_maker",         # fiber-plaiting craft family
        "zardozi_embroidery",   # decorative-embellishment overlap (spillover)
    ],

    # Tailor (Darzi): garment stitching.
    "tailor": [
        "hand_block_print",     # printed cloth into garments
        "handloom_weaving",     # woven cloth into garments
        "embroidery",           # embroidery-then-stitch pipeline
    ],

    # Washerman (Dhobi) / Barber (Naai): textile-adjacent service trades.
    "textile_services": [
        "weaving",              # fabric care ↔ fabric making
        "tailor",               # garment lifecycle overlap
    ],

    # Fishing Net Maker: knotted-net fiber craft.
    "fishnet_maker": [
        "weaving",              # interlacing technique family
        "basket_maker",         # knotted fiber craft (spillover)
    ],

    # =====================================================================
    # COMMON EXTRAS (aliased craft families)
    # =====================================================================

    "weaving": [                # generic weaving (loom & non-loom)
        "handloom_weaving",
        "embroidery",
        "hand_block_print",
    ],
    "embroidery": [             # generic hand embroidery
        "zardozi_embroidery",
        "tailor",
        "handloom_weaving",
    ],
    "block_printing": [         # generic block printing
        "hand_block_print",
        "handloom_weaving",
        "embroidery",
    ],
    "dhokra_bell_metal": [      # Dhokra / bell-metal casting
        "brass_metalwork",
        "clay_pottery",         # lost-wax uses clay cores; ritual overlap
        "sculptor_stone_carving",
    ],
    "basket_maker": [
        "mason_basket_coir",
        "garland_maker",
        "carpentry_woodwork",
    ],
}

# Map every mockCraftTypes.js entry (by app id and English label) to its
# canonical adjacency key — the router uses this for artisan_id lookups.
APP_CRAFT_ID_MAP: dict[str, str] = {
    "1": "handloom_weaving",        # Handloom Weaving (Banaras Brocades GI #99)
    "2": "clay_pottery",            # Clay Pottery (Gorakhpur Terracotta GI #629)
    "3": "hand_block_print",        # Hand Block Print (Sanganer GI #164)
    "4": "wood_carving",            # Wood Carving (Saharanpur GI #431)
    "5": "zardozi_embroidery",      # Zardozi & Embroidery (Lucknow GI #316)
    "6": "brass_metalwork",         # Brass & Metalwork
}

# English display names for canonical keys (API responses use these).
CATEGORY_DISPLAY_NAMES: dict[str, str] = {
    "handloom_weaving": "Handloom Weaving",
    "clay_pottery": "Clay Pottery",
    "hand_block_print": "Hand Block Print",
    "wood_carving": "Wood Carving",
    "zardozi_embroidery": "Zardozi & Embroidery",
    "brass_metalwork": "Brass & Metalwork",
    "goldsmith_jewellery": "Goldsmith & Jewellery",
    "blacksmith_ironsmith": "Blacksmith & Ironwork",
    "carpentry_woodwork": "Carpentry & Woodwork",
    "sculptor_stone_carving": "Sculptor & Stone Carving",
    "cobbler_footwear": "Cobbler & Footwear",
    "mason_basket_coir": "Mason, Basket & Coir Craft",
    "doll_toy_maker": "Doll & Toy Making",
    "garland_maker": "Garland Making",
    "tailor": "Tailoring",
    "textile_services": "Textile Services (Dhobi/Naai)",
    "fishnet_maker": "Fishing Net Making",
    "weaving": "Weaving",
    "embroidery": "Embroidery",
    "block_printing": "Block Printing",
    "dhokra_bell_metal": "Dhokra & Bell Metal",
    "basket_maker": "Basket Making",
}


def normalize_craft_type(raw: str | None) -> str | None:
    """Normalize a free-text craft label (any app category or alias) to a
    canonical adjacency key. Handles app display names, Hindi-ish variants,
    pricing-service keywords, and simple synonyms. Returns None if unknown."""
    if not raw:
        return None
    text = raw.strip().lower()
    if not text:
        return None

    # Exact display-name match first (most precise)
    for key, display in CATEGORY_DISPLAY_NAMES.items():
        if text == display.lower():
            return key

    # Keyword signatures (checked in specificity order — 'block' before
    # generic 'print', 'zardozi' before generic 'embroidery', etc.)
    keyword_rules: list[tuple[tuple[str, ...], str]] = [
        (("zardozi", "embroider", "chikankari", "kantha", "needlework", "zari"), "zardozi_embroidery"),
        (("block print", "blockprint", "block-print", "sanganer", "thappa"), "hand_block_print"),
        (("handloom", "weav", "saree", "sari", "loom", "banarasi", "textile"), "handloom_weaving"),
        (("pottery", "terracotta", "clay", "kumhar", "khurja", "gorakhpur", "diya"), "clay_pottery"),
        (("wood", "carv", "sheesham", "saharanpur", "timber"), "wood_carving"),
        (("brass", "metal", "bronze", "copper", "moradabad", "bell metal", "urli"), "brass_metalwork"),
        (("goldsmith", "jewel", "sunar", "sonar", "gold"), "goldsmith_jewellery"),
        (("blacksmith", "ironsmith", "lohar", "locksmith", "armourer", "armor"), "blacksmith_ironsmith"),
        (("carpent", "suthar", "badhai", "boat", "furniture"), "carpentry_woodwork"),
        (("sculpt", "moortikar", "stone", "idol", "moorti"), "sculptor_stone_carving"),
        (("cobbler", "footwear", "shoe", "charmkar", "jutti", "mojari", "leather"), "cobbler_footwear"),
        (("mason", "raajmistri", "basket", "coir", "mat ", "broom"), "mason_basket_coir"),
        (("doll", "toy"), "doll_toy_maker"),
        (("garland", "malakaar", "flower"), "garland_maker"),
        (("tailor", "darzi", "stitch", "garment"), "tailor"),
        (("dhobi", "naai", "barber", "laundry"), "textile_services"),
        (("fishing net", "fishnet", "net mak"), "fishnet_maker"),
        (("dhokra", "dhokhra"), "dhokra_bell_metal"),
    ]
    for keywords, key in keyword_rules:
        for kw in keywords:
            if kw in text:
                return key
    return None
