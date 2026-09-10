import io
import time
import uuid
import logging
from typing import Dict, Any, Optional

import requests
from gtts import gTTS

from app.config import settings
from app.services.storage import storage
from app.services.voice_cache import (
    voice_cache,
    normalize_lang_code,
)

logger = logging.getLogger("voice_service")

# ─── Groq STT constants ──────────────────────────────────────────────────────
_GROQ_STT_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
_GROQ_STT_MODEL = "whisper-large-v3-turbo"

# ─── gTTS language map (BCP-47 short code → gTTS lang param) ─────────────────
_GTTS_LANG_MAP: Dict[str, str] = {
    "hi": "hi", "en": "en", "bn": "bn", "ta": "ta",
    "te": "te", "mr": "mr", "gu": "gu", "kn": "kn", "ml": "ml",
}


def _infer_mime(filename: str) -> str:
    """Return a suitable MIME type for an audio file based on its extension."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "wav"
    return {
        "wav": "audio/wav",
        "mp3": "audio/mpeg",
        "m4a": "audio/mp4",
        "ogg": "audio/ogg",
        "flac": "audio/flac",
        "webm": "audio/webm",
    }.get(ext, "audio/wav")


class VoiceService:
    """
    ShilpKala Voice Processing Pipeline — Groq-only edition.

    STT:  Groq hosted Whisper (whisper-large-v3-turbo) via
          https://api.groq.com/openai/v1/audio/transcriptions.
          Retry policy: attempt 1 → retry once on failure → return structured
          error dict (never raises / never crashes the server).

    TTS:  gTTS (Google Text-to-Speech, free, no API key required).
          Produces an MP3 stored via the storage abstraction layer.
    """

    # ═══════════════════════════════════════════════════════════════
    # 1. SPEECH-TO-TEXT (STT) — Groq whisper-large-v3-turbo
    # ═══════════════════════════════════════════════════════════════

    def transcribe(
        self,
        audio_bytes: bytes,
        language_code: Optional[str] = "hi-IN",
        filename: str = "voice.wav",
        force_demo: bool = False,
    ) -> Dict[str, Any]:
        """
        Transcribe audio using Groq's hosted Whisper endpoint.

        Retry policy:
          - Attempt 1 → normal POST to Groq.
          - Attempt 2 → single retry after a 400 ms back-off on any failure.
          - After two failures → returns a structured error dict so the caller
            can surface a clear error to the user without crashing.

        Returns dict with keys:
          transcript, language_code, source, processing_time_ms
          On failure also: error=True, detail=<human-readable reason>
        """
        start_time = time.perf_counter()
        target_bcp47 = normalize_lang_code(language_code)
        short_lang = target_bcp47.split("-")[0].lower()

        # Demo mode: instant pre-cached result, conserves API credits
        if force_demo or settings.DEMO_MODE:
            voice_cache.log_credit_usage(
                "Demo Cache (STT)", is_cache_hit=True, details=f"lang={target_bcp47}"
            )
            return voice_cache.get_demo_transcript(short_lang)

        if not settings.GROQ_API_KEY:
            logger.error("[Groq STT] GROQ_API_KEY is not set.")
            return {
                "transcript": "",
                "language_code": target_bcp47,
                "source": "groq_whisper",
                "processing_time_ms": 0,
                "error": True,
                "detail": (
                    "GROQ_API_KEY is not configured. "
                    "Set it in your .env file to enable transcription."
                ),
            }

        last_error: str = ""
        for attempt in range(1, 3):  # attempts 1 and 2
            try:
                logger.info(
                    f"[Groq STT] Attempt {attempt} — model={_GROQ_STT_MODEL}, "
                    f"lang={short_lang}, bytes={len(audio_bytes)}"
                )
                resp = requests.post(
                    _GROQ_STT_URL,
                    headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                    files={
                        "file": (filename, audio_bytes, _infer_mime(filename)),
                        "model": (None, _GROQ_STT_MODEL),
                        "language": (None, short_lang),
                        "response_format": (None, "json"),
                    },
                    timeout=30,
                )
                if resp.status_code == 200:
                    transcript = resp.json().get("text", "").strip()
                    elapsed_ms = int((time.perf_counter() - start_time) * 1000)
                    logger.info(
                        f"[Groq STT] Success — {len(transcript)} chars in {elapsed_ms}ms"
                    )
                    return {
                        "transcript": transcript,
                        "language_code": target_bcp47,
                        "source": "groq_whisper",
                        "processing_time_ms": elapsed_ms,
                    }
                else:
                    last_error = f"HTTP {resp.status_code}: {resp.text[:300]}"
                    logger.warning(f"[Groq STT] Attempt {attempt} non-2xx — {last_error}")

            except requests.exceptions.Timeout:
                last_error = f"Request timed out on attempt {attempt}."
                logger.warning(f"[Groq STT] {last_error}")
            except Exception as exc:
                last_error = f"Exception on attempt {attempt}: {exc}"
                logger.warning(f"[Groq STT] {last_error}")

            if attempt == 1:
                logger.info("[Groq STT] Retrying once after short back-off...")
                time.sleep(0.4)

        # Both attempts exhausted — structured error, no crash
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        logger.error(f"[Groq STT] Both attempts failed. Last error: {last_error}")
        return {
            "transcript": "",
            "language_code": target_bcp47,
            "source": "groq_whisper",
            "processing_time_ms": elapsed_ms,
            "error": True,
            "detail": f"Transcription failed after 2 attempts. {last_error}",
        }

    # ═══════════════════════════════════════════════════════════════
    # 2. TEXT-TO-SPEECH (TTS) — gTTS (free, no API key)
    # ═══════════════════════════════════════════════════════════════

    def synthesize(
        self,
        text: str,
        language_code: Optional[str] = "hi-IN",
        speaker: str = "shubh",  # accepted for schema compatibility, unused by gTTS
        force_demo: bool = False,
    ) -> Dict[str, Any]:
        """
        Synthesize speech using gTTS (free, no API key required).

        The `speaker` parameter is accepted for API schema compatibility but is
        ignored — gTTS does not support voice selection.

        Returns dict with keys: audio_url, language_code, source, model,
        processing_time_ms.
        """
        start_time = time.perf_counter()
        target_bcp47 = normalize_lang_code(language_code)
        short_lang = target_bcp47.split("-")[0].lower()
        file_uuid = uuid.uuid4().hex[:10]

        # Demo mode: instant pre-cached audio
        if force_demo or (settings.DEMO_MODE and voice_cache.matches_demo_text(text)):
            voice_cache.log_credit_usage(
                "Demo Cache (TTS)", is_cache_hit=True, details=f"lang={target_bcp47}"
            )
            return voice_cache.get_demo_audio(short_lang)

        tts_lang = _GTTS_LANG_MAP.get(short_lang, "hi")
        logger.info(f"[gTTS] Synthesizing {len(text)} chars in lang='{tts_lang}'")

        tts = gTTS(text=text, lang=tts_lang, slow=False)
        audio_buffer = io.BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_bytes = audio_buffer.getvalue()

        rel_key = f"voice/{file_uuid}_gtts_{short_lang}.mp3"
        audio_url = storage.upload(audio_bytes, rel_key, content_type="audio/mpeg")
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        logger.info(f"[gTTS] Done — {len(audio_bytes)}B uploaded in {elapsed_ms}ms")

        return {
            "audio_url": audio_url,
            "language_code": target_bcp47,
            "source": "gtts",
            "model": "gTTS-Standard",
            "processing_time_ms": elapsed_ms,
        }


voice_service = VoiceService()
