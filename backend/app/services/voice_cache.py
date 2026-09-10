import os
import re
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from gtts import gTTS

from app.config import settings
from app.services.storage import storage

logger = logging.getLogger("voice_cache")

# 1-to-1 Mapping of ShilpKala App's 9 Supported Languages to Sarvam AI BCP-47 Codes
LANGUAGE_CODE_MAP = {
    "hi": "hi-IN",
    "en": "en-IN",
    "bn": "bn-IN",
    "ta": "ta-IN",
    "te": "te-IN",
    "mr": "mr-IN",
    "gu": "gu-IN",
    "kn": "kn-IN",
    "ml": "ml-IN",
}

REVERSE_LANG_MAP = {v: k for k, v in LANGUAGE_CODE_MAP.items()}

def normalize_lang_code(code: str) -> str:
    """Normalizes any input language code ('hi', 'hi-IN', 'Hindi') to Sarvam BCP-47."""
    if not code:
        return "hi-IN"
    clean = code.strip().lower()
    if clean in LANGUAGE_CODE_MAP:
        return LANGUAGE_CODE_MAP[clean]
    for short, bcp in LANGUAGE_CODE_MAP.items():
        if clean.startswith(short):
            return bcp
    return "hi-IN"

# Curated artisan voice descriptions across all 9 languages for Banarasi Saree & Terracotta Pot
DEMO_VOICE_PHRASES = {
    "hi": {
        "lang_name": "Hindi",
        "craft": "Banarasi Silk Saree",
        "transcript": "यह शुद्ध कातून रेशम की हाथ से बुनी बनारसी साड़ी है, जिसमें पारंपरिक ज़री और पल्लू पर बारीक मीनाकारी काम किया गया है।",
        "english_desc": "Handwoven pure Banarasi katan silk saree featuring authentic gold zari motifs and intricate minakari work on the pallu.",
        "title": "हाथ से बुनी बनारसी कातून रेशम साड़ी",
        "keywords": ["Banarasi", "Silk", "Handloom", "Zari", "Wedding", "Varanasi"]
    },
    "ta": {
        "lang_name": "Tamil",
        "craft": "Banarasi Silk Saree",
        "transcript": "இது தூய பட்டு மற்றும் பாரம்பரிய தங்க ஜரிகை வேலைப்பாடுகளுடன் கைத்தறியில் நெய்யப்பட்ட அசல் பனாரசி பட்டுப் புடவை.",
        "english_desc": "Pure mulberry silk handloom Banarasi saree woven with historic kadhua gold zari motifs and rich pallu.",
        "title": "பாரம்பரிய கைத்தறி பனாரசி பட்டுப் புடவை",
        "keywords": ["Silk", "Handloom", "Banarasi", "Zari", "Traditional"]
    },
    "bn": {
        "lang_name": "Bengali",
        "craft": "Banarasi Silk Saree",
        "transcript": "এটি খাঁটি কাতান সিল্কের হাতে বোনা বেনারসি শাড়ি, যার আঁচল এবং বর্ডারে ঐতিহ্যবাহী খাঁটি জরির নকশা ফুটিয়ে তোলা হয়েছে।",
        "english_desc": "Handcrafted pure katan silk Banarasi saree woven with heritage gold zari detailing on borders and pallu.",
        "title": "হাতে বোনা ঐতিহ্যবাহী বেনারসি কাতান সিল্ক শাড়ি",
        "keywords": ["Banarasi", "Silk", "Handloom", "Katan", "Heritage"]
    },
    "te": {
        "lang_name": "Telugu",
        "craft": "Banarasi Silk Saree",
        "transcript": "ఇది సాంప్రదాయ జరీ పని మరియు పల్లూపై సూక్ష్మమైన మీనాకారీతో చేనేతపై నేసిన స్వచ్ఛమైన కతాన్ పట్టు బనారసి చీర.",
        "english_desc": "Authentic handloom Banarasi pure silk saree intricately woven with heritage gold zari and traditional floral motifs.",
        "title": "చేనేత స్వచ్ఛమైన కతాన్ పట్టు బనారసి చీర",
        "keywords": ["Banarasi", "Silk", "Handloom", "Zari", "Wedding"]
    },
    "mr": {
        "lang_name": "Marathi",
        "craft": "Banarasi Silk Saree",
        "transcript": "ही शुद्ध कातान रेशमाची हातमागावर विणलेली बनारसी साडी आहे, ज्यावर पारंपारिक सोनेरी जरीकाम आणि सुंदर पदर आहे.",
        "english_desc": "Pure handwoven Banarasi katan silk saree embellished with royal gold zari motifs and traditional border.",
        "title": "हातमागावर विणलेली शुद्ध बनारसी कातान रेशीम साडी",
        "keywords": ["Banarasi", "Silk", "Handloom", "Zari", "Peshwai"]
    },
    "gu": {
        "lang_name": "Gujarati",
        "craft": "Banarasi Silk Saree",
        "transcript": "આ શુદ્ધ કાતાન રેશમની હાથથી વણેલી બનારસી સાડી છે, જેમાં પલ્લુ પર પરંપરાગત સોનેરી ઝરી અને મીનાકારી કામ કરેલું છે.",
        "english_desc": "Handloom pure Banarasi katan silk saree crafted with rich heritage gold zari motifs on borders and pallu.",
        "title": "હાથથી વણેલી શુદ્ધ બનારસી કાતાન રેશમ સાડી",
        "keywords": ["Banarasi", "Silk", "Handloom", "Zari", "Patola"]
    },
    "kn": {
        "lang_name": "Kannada",
        "craft": "Banarasi Silk Saree",
        "transcript": "ಇದು ಸಾಂಪ್ರದಾಯಿಕ ಚಿನ್ನದ ಜರಿ ಮತ್ತು ಪಲ್ಲುವಿನಲ್ಲಿ ಮೀನಾಕರಿ ಕೆಲಸವಿರುವ ಕೈಮಗ್ಗದಿಂದ ನೇಯ್ದ ಶುದ್ಧ ಕಾತಾನ್ ರೇಷ್ಮೆ ಬನಾರಸಿ ಸೀರೆ.",
        "english_desc": "Handcrafted pure Banarasi silk saree handwoven with authentic heritage zari patterns and opulent pallu.",
        "title": "ಕೈಮಗ್ಗದ ಶುದ್ಧ ಕಾತಾನ್ ರೇಷ್ಮೆ ಬನಾರಸಿ ಸೀರೆ",
        "keywords": ["Banarasi", "Silk", "Handloom", "Zari", "Heritage"]
    },
    "ml": {
        "lang_name": "Malayalam",
        "craft": "Banarasi Silk Saree",
        "transcript": "പരമ്പരാഗത സ്വർണ്ണ സരി വർക്കുകളോടും മുന്താണിയിൽ സൂക്ഷ്മമായ മീനാകാരി പണികളോടും കൂടി കൈത്തറിയിൽ നെയ്ത ശുദ്ധമായ കത്താൻ പട്ട് ബനാറസി സാരി.",
        "english_desc": "Authentic handloom Banarasi pure katan silk saree woven with traditional golden zari motifs and decorative pallu.",
        "title": "കൈത്തറിയിൽ നെയ്ത ശുദ്ധമായ ബനാറസി പട്ട് സാരി",
        "keywords": ["Banarasi", "Silk", "Handloom", "Zari", "Kerala"]
    },
    "en": {
        "lang_name": "English",
        "craft": "Banarasi Silk Saree",
        "transcript": "This is a handwoven pure Banarasi katan silk saree featuring authentic gold zari motifs and intricate minakari detailing.",
        "english_desc": "Handwoven pure Banarasi katan silk saree featuring authentic gold zari motifs and intricate minakari detailing.",
        "title": "Handwoven Pure Banarasi Katan Silk Saree",
        "keywords": ["Banarasi", "Silk", "Handloom", "Zari", "Wedding", "GI-Craft"]
    }
}

class VoiceCacheService:
    """
    Credit Conservation & Demo Reliability Layer:
    Maintains pre-rendered transcripts and synthetic audio for all 9 languages.
    Ensures zero cloud credit burn during rehearsals and 100% offline presentation reliability.
    """

    def __init__(self):
        self.cache_dir = Path(settings.UPLOAD_DIR) / "voice_cache"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.audio_urls: Dict[str, str] = {}
        self.is_initialized = False

    def warm_cache(self):
        """Pre-generates audio clips for all 9 demo phrases on startup."""
        logger.info("Warming Voice Demo Reliability Layer (all 9 languages)...")
        
        # gTTS language code fallback map
        gtts_lang_map = {
            "hi": "hi", "en": "en", "bn": "bn", "ta": "ta",
            "te": "te", "mr": "mr", "gu": "gu", "kn": "kn", "ml": "ml"
        }

        for short_lang, info in DEMO_VOICE_PHRASES.items():
            cache_file = self.cache_dir / f"demo_{short_lang}.mp3"
            rel_key = f"voice_cache/demo_{short_lang}.mp3"

            if not cache_file.exists():
                try:
                    tts_lang = gtts_lang_map.get(short_lang, "hi")
                    tts = gTTS(text=info["transcript"], lang=tts_lang, slow=False)
                    tts.save(str(cache_file))
                    logger.info(f"Generated demo audio for [{short_lang.upper()}] ({info['lang_name']})")
                except Exception as e:
                    logger.warning(f"Could not pre-generate audio for {short_lang}: {e}")

            if cache_file.exists():
                self.audio_urls[short_lang] = storage.get_url(rel_key)

        self.is_initialized = True
        logger.info(f"Voice cache warmed with {len(self.audio_urls)} audio files.")

    def get_demo_transcript(self, lang_code: str) -> Dict[str, Any]:
        """Returns pre-cached transcript for the specified language instantly."""
        short_lang = lang_code.split("-")[0].lower()
        phrase_info = DEMO_VOICE_PHRASES.get(short_lang, DEMO_VOICE_PHRASES["hi"])
        
        return {
            "transcript": phrase_info["transcript"],
            "language_code": LANGUAGE_CODE_MAP.get(short_lang, "hi-IN"),
            "source": "demo_cache",
            "processing_time_ms": 12,
            "demo_phrase_info": phrase_info
        }

    def get_demo_audio(self, lang_code: str) -> Dict[str, Any]:
        """Returns pre-cached audio URL for the specified language instantly."""
        if not self.is_initialized:
            self.warm_cache()
            
        short_lang = lang_code.split("-")[0].lower()
        audio_url = self.audio_urls.get(short_lang)
        if not audio_url:
            audio_url = self.audio_urls.get("hi", f"{settings.BASE_URL}/uploads/voice_cache/demo_hi.mp3")

        phrase_info = DEMO_VOICE_PHRASES.get(short_lang, DEMO_VOICE_PHRASES["hi"])
        return {
            "audio_url": audio_url,
            "language_code": LANGUAGE_CODE_MAP.get(short_lang, "hi-IN"),
            "source": "demo_cache",
            "processing_time_ms": 14,
            "text": phrase_info["transcript"]
        }

    def matches_demo_text(self, text: str) -> Optional[str]:
        """Checks if text closely matches one of our 9 demo phrases."""
        if not text:
            return None
        text_clean = re.sub(r"[^\w\s]", "", text).lower().strip()
        for short_lang, info in DEMO_VOICE_PHRASES.items():
            phrase_clean = re.sub(r"[^\w\s]", "", info["transcript"]).lower().strip()
            # If 50%+ overlap or contains key signature words
            if phrase_clean in text_clean or text_clean in phrase_clean:
                return short_lang
            # Check key signature words
            words = phrase_clean.split()
            matching = [w for w in words if w in text_clean]
            if len(matching) >= max(3, len(words) // 2):
                return short_lang
        return None

    def log_credit_usage(self, provider: str, is_cache_hit: bool, details: str = ""):
        """Transparently prints credit consumption to console for developer visibility."""
        if is_cache_hit:
            print(f"\033[92m[VOICE CREDIT TRACKER] CACHE HIT: 0 credits used (Served from Demo Layer) | {details}\033[0m")
            logger.info(f"[CREDIT TRACKER] CACHE HIT: 0 credits ({details})")
        else:
            print(f"\033[93m[VOICE CREDIT TRACKER] REAL API CALL to {provider.upper()}: Credits consumed! | {details}\033[0m")
            logger.info(f"[CREDIT TRACKER] REAL API: {provider} ({details})")

voice_cache = VoiceCacheService()
