import json
import logging
from typing import Dict, Any, Optional, List

from app.config import settings
from app.services.voice_cache import DEMO_VOICE_PHRASES, LANGUAGE_CODE_MAP

logger = logging.getLogger("listing_generator")

LANG_NAMES: Dict[str, str] = {
    "hi": "Hindi",
    "en": "English",
    "ta": "Tamil",
    "bn": "Bengali",
    "te": "Telugu",
    "mr": "Marathi",
    "gu": "Gujarati",
    "kn": "Kannada",
    "ml": "Malayalam",
}

# ═══════════════════════════════════════════════════════════════════════════
# MODEL SELECTION
# ═══════════════════════════════════════════════════════════════════════════
# Groq's 70B-class Llama model optimised for multilingual structured generation
# with sub-second inference speeds via Groq's LPU inference engine.
# Fallback model string if deprecated: "llama-3.1-70b-versatile".
_GROQ_MODEL = "llama-3.3-70b-versatile"


class ListingGeneratorService:
    """
    AI Listing Generation — Groq-only edition.

    Provider chain (GROQ_API_KEY only — no Anthropic or OpenAI):
      1. Groq (llama-3.3-70b-versatile) with response_format=json_object.
         - Attempt 1: standard structured prompt.
         - Attempt 2 (retry): stricter "return ONLY valid JSON" prompt on parse failure.
      2. Deterministic craft-aware multilingual template fallback — never crashes.

    All keys (ANTHROPIC_API_KEY, OPENAI_API_KEY) are intentionally not referenced.
    """

    def generate(
        self,
        transcript: str,
        language_code: str = "hi-IN",
        image_url: Optional[str] = None,
        craft_type: Optional[str] = "Handloom Weaving",
    ) -> Dict[str, Any]:
        short_lang = language_code.split("-")[0].lower()
        lang_name = LANG_NAMES.get(short_lang, "Hindi")

        # ─── PRIMARY: Groq (llama-3.3-70b-versatile) ────────────────
        if settings.GROQ_API_KEY:
            try:
                res = self._call_groq(transcript, short_lang, lang_name, craft_type)
                if res:
                    res["source"] = "groq"
                    res["language_detected"] = short_lang
                    res["language_name"] = lang_name
                    return res
            except Exception as e:
                err_str = str(e)
                if "429" in err_str or "rate_limit" in err_str.lower():
                    logger.warning(
                        f"[Groq] Rate limit (429) hit: {e}. "
                        "Cascading to template fallback."
                    )
                else:
                    logger.warning(
                        f"[Groq] Listing generation error: {e}. "
                        "Cascading to template fallback."
                    )
        else:
            logger.warning(
                "GROQ_API_KEY is not set — cannot call Groq. "
                "Using template fallback."
            )

        # ─── FALLBACK: Deterministic multilingual template ───────────
        logger.info(
            f"Using high-fidelity template fallback for language: {lang_name} ({short_lang})."
        )
        res = self._generate_template_fallback(transcript, short_lang, lang_name, craft_type)
        res["source"] = "template_fallback"
        return res

    # ─── Internal: prompt builder ────────────────────────────────────

    def _build_prompt(
        self,
        transcript: str,
        short_lang: str,
        lang_name: str,
        craft_type: str,
        strict: bool = False,
    ) -> str:
        strict_addon = (
            " CRITICAL: Return raw JSON ONLY. Start with { and end with }. "
            "No markdown, no commentary, no extra text."
            if strict
            else ""
        )
        return f"""The Indian artisan spoke in {lang_name} ({short_lang}):
"{transcript}"

Craft category: {craft_type}

Generate an authentic, market-ready handicraft listing.
Return a STRICT JSON object without any markdown formatting or surrounding text.{strict_addon}
{{
  "title": "Inspiring product title in {lang_name}",
  "title_english": "Inspiring product title in English",
  "description_en": "Polished buyer-facing English description — highlight GI heritage, texture, and craft technique in 2–3 sentences",
  "description_hi": "Natural Hindi translation of the description (Devanagari script). Even if the artisan spoke in another language, always provide this in standard Hindi for the national marketplace.",
  "is_gi_match": true,
  "gi_name": "Authentic Geographical Indication name if matched, else null",
  "suggested_price_min": 4500,
  "suggested_price_max": 6500,
  "keywords": ["5", "to", "7", "searchable", "keywords"]
}}
"""

    def _clean_json_str(self, text: str) -> str:
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()

    def _standardize_response(
        self, raw: Dict[str, Any], short_lang: str, lang_name: str
    ) -> Dict[str, Any]:
        """Ensure all ShilpKala listing fields are present and properly typed."""
        title = raw.get("title") or "हस्तनिर्मित शिल्प"
        title_en = raw.get("title_english") or raw.get("title_en") or title
        desc_en = raw.get("description_en") or raw.get("description_english") or ""
        # description_hi is the spec-mandated Hindi description field
        desc_hi = raw.get("description_hi") or raw.get("description_local") or desc_en
        # description_local kept for backward compatibility (clients reading old field)
        desc_local = raw.get("description_local") or desc_hi

        keywords = raw.get("keywords")
        if not isinstance(keywords, list):
            keywords = ["Handloom", "Artisan", "Handmade", "Heritage"]

        return {
            "title": title,
            "title_english": title_en,
            "description_local": desc_local,   # backward-compat alias
            "description_hi": desc_hi,          # spec-required Hindi field
            "description_en": desc_en,
            "is_gi_match": bool(raw.get("is_gi_match", False)),
            "gi_name": raw.get("gi_name"),
            "suggested_price_min": float(raw.get("suggested_price_min", 4500)),
            "suggested_price_max": float(raw.get("suggested_price_max", 6500)),
            "keywords": keywords,
        }

    # ─── Internal: Groq call with one retry on JSON parse failure ────

    def _call_groq(
        self,
        transcript: str,
        short_lang: str,
        lang_name: str,
        craft_type: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Call Groq chat completions (llama-3.3-70b-versatile).

        Retry policy:
          - Attempt 1: standard structured prompt.
          - Attempt 2: stricter "return ONLY valid JSON" prompt on JSON parse failure.
          - Rate-limit (429) → return None immediately (no retry, let caller log).
        """
        from groq import Groq
        client = Groq(api_key=settings.GROQ_API_KEY)

        system_msg = (
            "You are ShilpKala AI, an expert evaluator of traditional Indian crafts, "
            "handloom, and GI heritage. "
            "You output ONLY valid, raw JSON parseable by json.loads. "
            "Always include a natural Hindi translation in 'description_hi' field."
        )

        for attempt in range(1, 3):  # attempt 1 and 2
            try:
                prompt = self._build_prompt(
                    transcript, short_lang, lang_name, craft_type, strict=(attempt > 1)
                )
                if attempt == 2:
                    logger.info("[Groq] Retrying with strict JSON prompt after parse failure.")

                response = client.chat.completions.create(
                    model=_GROQ_MODEL,
                    temperature=0.2,
                    response_format={"type": "json_object"},
                    messages=[
                        {"role": "system", "content": system_msg},
                        {"role": "user", "content": prompt},
                    ],
                )

                raw_text = response.choices[0].message.content
                clean = self._clean_json_str(raw_text)
                parsed = json.loads(clean)
                return self._standardize_response(parsed, short_lang, lang_name)

            except json.JSONDecodeError as e:
                logger.warning(f"[Groq] Attempt {attempt} — JSON parse failed: {e}")
                if attempt == 2:
                    # Both attempts failed to produce valid JSON — fall through to template
                    logger.error("[Groq] JSON parse failed on retry. Using template fallback.")
                    return None
            except Exception as e:
                err_str = str(e)
                if "429" in err_str or "rate_limit" in err_str.lower():
                    # Rate limit: do NOT retry, pass immediately to fallback
                    raise
                logger.warning(f"[Groq] Attempt {attempt} error: {e}")
                if attempt == 2:
                    return None

        return None

    # ─── Internal: deterministic template fallback ───────────────────

    def _generate_template_fallback(
        self,
        transcript: str,
        short_lang: str,
        lang_name: str,
        craft_type: str,
    ) -> Dict[str, Any]:
        """
        Deterministic, crash-proof multilingual fallback.
        Adapts title, GI match, and keywords based on craft type and transcript keywords.
        Always populates description_hi (standard Hindi) for the national marketplace.
        """
        demo_info = DEMO_VOICE_PHRASES.get(short_lang, DEMO_VOICE_PHRASES["hi"])
        combined = f"{transcript} {craft_type}".lower()

        if any(w in combined for w in ["लकड़ी", "हाथी", "wood", "carving", "sheesham", "शीशम", "furniture"]):
            title_local = "सहारनपुर हस्तनिर्मित नक्काशीदार शीशम लकड़ी शिल्प"
            title_en = "Hand-Carved Saharanpur Sheesham Wood Sculpture"
            desc_en = f"Authentic handcrafted solid Sheesham wood carving from master artisans with natural finish: {transcript}"
            desc_hi = f"सहारनपुर के कुशल कारीगरों द्वारा हाथ से नक्काशी किया गया शीशम लकड़ी का शिल्प। प्राकृतिक फिनिश के साथ पारंपरिक डिज़ाइन: {transcript}"
            gi_name = "Saharanpur Wood Craft (GI Reg #157)"
            keywords = ["Woodcraft", "Sheesham", "Handcarved", "Saharanpur", "HomeDecor"]
            p_min, p_max = 2400, 4800

        elif any(w in combined for w in ["मिट्टी", "टेराकोटा", "pottery", "clay", "pot", "vase", "कुम्हार"]):
            title_local = "हस्तनिर्मित पारंपरिक टेराकोटा मिट्टी शिल्प"
            title_en = "Handcrafted Traditional Terracotta Pottery"
            desc_en = f"Authentic hand-thrown natural terracotta craft using generational pottery techniques: {transcript}"
            desc_hi = f"पारंपरिक कुम्हार कला से निर्मित हस्तनिर्मित टेराकोटा शिल्प। पीढ़ियों से चली आ रही तकनीक: {transcript}"
            gi_name = "Gorakhpur Terracotta Craft (GI Reg #371)"
            keywords = ["Terracotta", "Pottery", "Clay", "Handmade", "EcoFriendly"]
            p_min, p_max = 1200, 2800

        elif any(w in combined for w in ["पीतल", "धातु", "brass", "metal", "bronze", "urli", "diya"]):
            title_local = "मुरादाबाद नक्काशीदार पीतल धातु शिल्प"
            title_en = "Moradabad Hand-Engraved Brass Artware"
            desc_en = f"Mastercrafted pure brass metalware featuring intricate hand-chiseled engraving: {transcript}"
            desc_hi = f"मुरादाबाद के कुशल कारीगरों द्वारा हाथ से उकेरी गई शुद्ध पीतल की कलाकृति: {transcript}"
            gi_name = "Moradabad Metal Craft (GI Reg #237)"
            keywords = ["Brass", "Metalware", "Engraved", "Moradabad", "Heritage"]
            p_min, p_max = 3200, 6500

        elif any(w in combined for w in ["ज़रदोज़ी", "कढ़ाई", "चिकनकारी", "zardozi", "chikankari", "embroidery"]):
            title_local = "हस्तनिर्मित पारंपरिक लखनऊ ज़रदोज़ी शिल्प"
            title_en = "Traditional Handcrafted Lucknow Zardozi Work"
            desc_en = f"Exquisite traditional hand embroidery embellished with fine metallic zardozi: {transcript}"
            desc_hi = f"लखनऊ की पारंपरिक ज़रदोज़ी कढ़ाई से सुसज्जित हस्तनिर्मित वस्त्र। बारीक धातु के धागे की कारीगरी: {transcript}"
            gi_name = "Lucknow Zardozi (GI Reg #119)"
            keywords = ["Zardozi", "Embroidery", "Chikankari", "Zari", "Handmade"]
            p_min, p_max = 3500, 7800

        else:
            # Default: Handloom / Banarasi Saree
            title_local = demo_info["title"]
            title_en = DEMO_VOICE_PHRASES["en"]["title"]
            desc_en = demo_info["english_desc"]
            desc_hi = (
                demo_info.get("transcript", "")
                if short_lang == "hi"
                else "बनारसी बुनकरों द्वारा हस्तनिर्मित रेशमी साड़ी। जीआई प्रमाणित पारंपरिक शिल्प।"
            )
            gi_name = "Banaras Brocades & Sarees (GI Reg #99)"
            keywords = demo_info["keywords"]
            p_min, p_max = 5500, 7200

        return {
            "title": title_local,
            "title_english": title_en,
            "description_local": transcript if len(transcript) > 5 else demo_info["transcript"],
            "description_hi": desc_hi,
            "description_en": desc_en,
            "is_gi_match": True,
            "gi_name": gi_name,
            "suggested_price_min": p_min,
            "suggested_price_max": p_max,
            "keywords": keywords,
            "language_detected": short_lang,
            "language_name": lang_name,
        }


listing_generator = ListingGeneratorService()

