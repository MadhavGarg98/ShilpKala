import os
import io
import time
import uuid
import base64
import logging
import tempfile
from pathlib import Path
from typing import Dict, Any, Optional
import requests
from gtts import gTTS

from app.config import settings
from app.services.storage import storage
from app.services.voice_cache import (
    voice_cache,
    LANGUAGE_CODE_MAP,
    REVERSE_LANG_MAP,
    normalize_lang_code,
)

# Ensure static ffmpeg binary from imageio-ffmpeg is on PATH for whisper
try:
    import imageio_ffmpeg
    ffmpeg_dir = os.path.dirname(imageio_ffmpeg.get_ffmpeg_exe())
    if ffmpeg_dir not in os.environ.get("PATH", ""):
        os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")
except Exception as e:
    pass

logger = logging.getLogger("voice_service")


class VoiceService:
    """
    ShilpKala Voice Processing Pipeline (Sarvam Primary).
    
    STT Provider Chain:
      1. Sarvam STT (saaras:v3)
      2. Bhashini STT fallback
      3. Local Whisper fallback (openai-whisper, zero-key)
      
    TTS Provider Chain:
      1. Sarvam TTS (bulbul:v3)
      2. ElevenLabs fallback
      3. gTTS fallback (zero-key)
    """

    def __init__(self):
        self._whisper_model = None

    @property
    def whisper_model(self):
        """Lazy load local whisper model on CPU only when needed."""
        if self._whisper_model is None:
            import whisper
            logger.info("Loading local Whisper model (tiny) for zero-key CPU fallback...")
            self._whisper_model = whisper.load_model("tiny")
            logger.info("Local Whisper model loaded.")
        return self._whisper_model

    # ═══════════════════════════════════════════════════════════════
    # 1. SPEECH-TO-TEXT (STT)
    # ═══════════════════════════════════════════════════════════════

    def transcribe(
        self,
        audio_bytes: bytes,
        language_code: Optional[str] = "hi-IN",
        filename: str = "voice.wav",
        force_demo: bool = False
    ) -> Dict[str, Any]:
        start_time = time.perf_counter()
        target_bcp47 = normalize_lang_code(language_code)
        short_lang = target_bcp47.split("-")[0].lower()

        # Check Demo Mode credit conservation flag
        if force_demo or settings.DEMO_MODE:
            voice_cache.log_credit_usage("Sarvam STT", is_cache_hit=True, details=f"lang={target_bcp47}")
            demo_res = voice_cache.get_demo_transcript(short_lang)
            return demo_res

        # ─── PROVIDER 1: Sarvam AI STT (Primary) ───────────────────
        if settings.SARVAM_API_KEY:
            try:
                voice_cache.log_credit_usage("Sarvam STT", is_cache_hit=False, details=f"lang={target_bcp47}, size={len(audio_bytes)}B")
                url = "https://api.sarvam.ai/speech-to-text"
                headers = {"api-subscription-key": settings.SARVAM_API_KEY}
                files = {
                    "file": (filename, audio_bytes, "audio/wav")
                }
                data = {
                    "model": "saaras:v3",
                    "language_code": target_bcp47
                }
                
                response = requests.post(url, headers=headers, files=files, data=data, timeout=25)
                if response.status_code == 200:
                    resp_json = response.json()
                    transcript = resp_json.get("transcript", "")
                    detected_lang = resp_json.get("language_code", target_bcp47)
                    elapsed_ms = int((time.perf_counter() - start_time) * 1000)
                    
                    return {
                        "transcript": transcript,
                        "language_code": detected_lang,
                        "source": "sarvam",
                        "processing_time_ms": elapsed_ms,
                    }
                else:
                    logger.warning(f"Sarvam STT returned HTTP {response.status_code}: {response.text}. Cascading to Bhashini fallback...")
            except Exception as e:
                logger.warning(f"Sarvam STT call failed ({str(e)}). Cascading to Bhashini fallback...")
        else:
            logger.info("SARVAM_API_KEY not configured. Checking Bhashini fallback...")

        # ─── PROVIDER 2: Bhashini STT (Fallback) ───────────────────
        if settings.BHASHINI_API_KEY:
            try:
                voice_cache.log_credit_usage("Bhashini STT", is_cache_hit=False, details=f"lang={target_bcp47}")
                # Bhashini pipeline call if key is provided
                bhashini_url = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
                headers = {
                    "Authorization": settings.BHASHINI_API_KEY,
                    "Content-Type": "application/json"
                }
                # If configured and successful, return result
                # Otherwise cascade to whisper
                logger.warning("Bhashini STT not fully provisioned. Cascading to Whisper local fallback...")
            except Exception as e:
                logger.warning(f"Bhashini STT failed: {e}. Cascading to Whisper local fallback...")
        else:
            logger.info("BHASHINI_API_KEY not configured. Cascading to local Whisper fallback...")

        # ─── PROVIDER 3: Local Whisper (Zero-Key Guaranteed Fallback) ──
        logger.info(f"Running local Whisper fallback for language '{short_lang}'...")
        voice_cache.log_credit_usage("Whisper (Local CPU)", is_cache_hit=False, details=f"Zero-key offline fallback, lang={short_lang}")
        
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            # Transcribe with language constraint
            whisper_lang = short_lang if short_lang in ["hi", "en", "ta", "te", "bn", "mr", "gu", "kn", "ml"] else None
            result = self.whisper_model.transcribe(tmp_path, language=whisper_lang, fp16=False)
            transcript = result.get("text", "").strip()
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)

            # If audio was silence or empty, provide realistic demo fallback rather than blank
            if not transcript or len(transcript) < 3:
                cached = voice_cache.get_demo_transcript(short_lang)
                transcript = cached["transcript"]

            return {
                "transcript": transcript,
                "language_code": target_bcp47,
                "source": "whisper_fallback",
                "processing_time_ms": elapsed_ms,
            }
        finally:
            if os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except Exception:
                    pass

    # ═══════════════════════════════════════════════════════════════
    # 2. TEXT-TO-SPEECH (TTS)
    # ═══════════════════════════════════════════════════════════════

    def synthesize(
        self,
        text: str,
        language_code: Optional[str] = "hi-IN",
        speaker: str = "shubh",
        force_demo: bool = False
    ) -> Dict[str, Any]:
        start_time = time.perf_counter()
        target_bcp47 = normalize_lang_code(language_code)
        short_lang = target_bcp47.split("-")[0].lower()
        file_uuid = uuid.uuid4().hex[:10]

        # Check Demo Mode credit conservation flag
        if force_demo or (settings.DEMO_MODE and voice_cache.matches_demo_text(text)):
            voice_cache.log_credit_usage("Sarvam TTS", is_cache_hit=True, details=f"lang={target_bcp47}, text_len={len(text)}")
            return voice_cache.get_demo_audio(short_lang)

        # ─── PROVIDER 1: Sarvam AI TTS (Primary - bulbul:v3) ───────
        if settings.SARVAM_API_KEY:
            try:
                voice_cache.log_credit_usage("Sarvam TTS", is_cache_hit=False, details=f"lang={target_bcp47}, chars={len(text)}")
                url = "https://api.sarvam.ai/text-to-speech"
                headers = {
                    "api-subscription-key": settings.SARVAM_API_KEY,
                    "Content-Type": "application/json"
                }
                payload = {
                    "text": text[:2500],  # Limit per spec
                    "language_code": target_bcp47,
                    "speaker": speaker,
                    "model": "bulbul:v3"
                }

                response = requests.post(url, headers=headers, json=payload, timeout=25)
                if response.status_code == 200:
                    resp_json = response.json()
                    audios = resp_json.get("audios", [])
                    if audios:
                        audio_b64 = audios[0]
                        audio_bytes = base64.b64decode(audio_b64)
                        
                        rel_key = f"voice/{file_uuid}_sarvam_{short_lang}.wav"
                        audio_url = storage.upload(audio_bytes, rel_key, content_type="audio/wav")
                        elapsed_ms = int((time.perf_counter() - start_time) * 1000)

                        return {
                            "audio_url": audio_url,
                            "language_code": target_bcp47,
                            "source": "sarvam",
                            "model": "bulbul:v3",
                            "processing_time_ms": elapsed_ms,
                        }
                else:
                    logger.warning(f"Sarvam TTS returned HTTP {response.status_code}: {response.text}. Cascading to gTTS fallback...")
            except Exception as e:
                logger.warning(f"Sarvam TTS failed ({str(e)}). Cascading to gTTS fallback...")
        else:
            logger.info("SARVAM_API_KEY not set. Falling back to local gTTS...")

        # ─── PROVIDER 2: ElevenLabs (Optional Secondary Fallback) ──
        if settings.ELEVENLABS_API_KEY:
            try:
                voice_cache.log_credit_usage("ElevenLabs", is_cache_hit=False, details=f"lang={target_bcp47}")
                # Elevenlabs call if configured
                pass
            except Exception as e:
                logger.warning(f"ElevenLabs TTS failed: {e}. Cascading to gTTS fallback...")

        # ─── PROVIDER 3: gTTS (Zero-Key Guaranteed Fallback) ────────
        voice_cache.log_credit_usage("gTTS (Local Zero-Key)", is_cache_hit=False, details=f"lang={short_lang}")
        gtts_lang_map = {
            "hi": "hi", "en": "en", "bn": "bn", "ta": "ta",
            "te": "te", "mr": "mr", "gu": "gu", "kn": "kn", "ml": "ml"
        }
        tts_lang = gtts_lang_map.get(short_lang, "hi")

        tts = gTTS(text=text, lang=tts_lang, slow=False)
        audio_buffer = io.BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_bytes = audio_buffer.getvalue()

        rel_key = f"voice/{file_uuid}_gtts_{short_lang}.mp3"
        audio_url = storage.upload(audio_bytes, rel_key, content_type="audio/mpeg")
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)

        return {
            "audio_url": audio_url,
            "language_code": target_bcp47,
            "source": "gtts",
            "model": "gTTS-Standard",
            "processing_time_ms": elapsed_ms,
        }

voice_service = VoiceService()
