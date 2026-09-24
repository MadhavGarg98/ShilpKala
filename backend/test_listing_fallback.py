import importlib.util
import types
import sys
from pathlib import Path


def load_listing_generator_module():
    # Stub only the dependencies required by listing_generator.py
    app_module = types.ModuleType("app")
    config_module = types.ModuleType("app.config")
    services_module = types.ModuleType("app.services")
    voice_cache_module = types.ModuleType("app.services.voice_cache")

    class _Settings:
        GROQ_API_KEY = ""

    config_module.settings = _Settings()
    voice_cache_module.LANGUAGE_CODE_MAP = {
        "hi": "hi-IN",
        "en": "en-IN",
    }
    voice_cache_module.DEMO_VOICE_PHRASES = {
        "hi": {
            "title": "हाथ से बुनी बनारसी कातून रेशम साड़ी",
            "english_desc": "Handwoven pure Banarasi katan silk saree",
            "transcript": "यह शुद्ध कातून रेशम की हाथ से बुनी बनारसी साड़ी है।",
            "keywords": ["Banarasi", "Silk", "Handloom"],
        },
        "en": {
            "title": "Handwoven Pure Banarasi Katan Silk Saree",
            "english_desc": "Handwoven pure Banarasi katan silk saree",
            "transcript": "This is a handwoven pure Banarasi saree.",
            "keywords": ["Banarasi", "Silk", "Handloom"],
        },
    }

    sys.modules["app"] = app_module
    sys.modules["app.config"] = config_module
    sys.modules["app.services"] = services_module
    sys.modules["app.services.voice_cache"] = voice_cache_module

    target = Path(__file__).parent / "app/services/listing_generator.py"
    spec = importlib.util.spec_from_file_location("listing_generator_under_test", target)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_non_saree_transcript_not_forced_to_banarasi(module):
    service = module.ListingGeneratorService()
    out = service._generate_template_fallback(
        transcript="Handcrafted bamboo basket for home storage.",
        short_lang="en",
        lang_name="English",
        craft_type="Basket Weaving",
    )

    assert out["gi_name"] is None
    assert "banarasi" not in out["title"].lower()
    assert "banarasi" not in out["description_en"].lower()


def test_saree_transcript_keeps_banarasi_path(module):
    service = module.ListingGeneratorService()
    out = service._generate_template_fallback(
        transcript="This is a handwoven Banarasi silk saree with zari motifs.",
        short_lang="en",
        lang_name="English",
        craft_type="Handloom Weaving",
    )

    assert out["gi_name"] and "Banaras" in out["gi_name"]


if __name__ == "__main__":
    mod = load_listing_generator_module()
    test_non_saree_transcript_not_forced_to_banarasi(mod)
    test_saree_transcript_keeps_banarasi_path(mod)
    print("[OK] Listing fallback tests passed")
