from typing import Optional, Dict, Any
from fastapi import APIRouter, File, UploadFile, Query, HTTPException, Body
from pydantic import BaseModel

from app.services.voice_service import voice_service
from app.services.voice_cache import (
    voice_cache,
    DEMO_VOICE_PHRASES,
    LANGUAGE_CODE_MAP,
    normalize_lang_code
)

router = APIRouter(prefix="/api/voice", tags=["Voice Pipeline (STT / TTS)"])

class SynthesizeRequest(BaseModel):
    text: str
    language_code: Optional[str] = "hi-IN"
    speaker: Optional[str] = "shubh"
    demo: Optional[bool] = False

class TranscribeResponse(BaseModel):
    transcript: str
    language_code: str
    source: str
    processing_time_ms: int

class SynthesizeResponse(BaseModel):
    audio_url: str
    language_code: str
    source: str
    processing_time_ms: int
    model: Optional[str] = None

@router.post(
    "/transcribe",
    response_model=TranscribeResponse,
    summary="Speech-to-Text with Provider Chain (Sarvam Primary -> Bhashini -> Whisper)"
)
async def transcribe_audio(
    file: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    language_code: str = Query("hi-IN", description="BCP-47 or ISO code (hi, en, ta, bn, te, mr, gu, kn, ml)"),
    demo: bool = Query(False, description="Developer toggle: if true, uses instant demo cache to conserve credits")
):
    """
    Speech-to-Text Pipeline:
    - Sarvam AI STT (`saaras:v3`) is called as primary provider with exact language code.
    - If Sarvam fails or key is unset, cascades to Bhashini STT.
    - If both cloud services are unavailable, cascades to local Whisper (`openai-whisper` on CPU).
    - Response transparently returns `source` ('sarvam', 'bhashini', or 'whisper_fallback').
    """
    upload_file = audio or file
    if not upload_file:
        raise HTTPException(status_code=422, detail="No audio file uploaded. Please supply 'audio' or 'file' form field.")

    contents = await upload_file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file uploaded.")

    try:
        res = voice_service.transcribe(
            audio_bytes=contents,
            language_code=language_code,
            filename=upload_file.filename or "voice.wav",
            force_demo=demo
        )
        return TranscribeResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@router.post(
    "/transcribe/demo",
    response_model=TranscribeResponse,
    summary="Instant Pre-Cached STT for Live Judging Safety (<50ms)"
)
async def transcribe_audio_demo(
    language_code: str = Query("hi-IN", description="Language code: hi, en, ta, bn, te, mr, gu, kn, ml")
):
    """
    Credit-Conservation & Demo Safety Net:
    Returns pre-computed transcripts across any of the 9 supported languages instantly (<50ms).
    """
    bcp47 = normalize_lang_code(language_code)
    short_lang = bcp47.split("-")[0].lower()
    res = voice_cache.get_demo_transcript(short_lang)
    return TranscribeResponse(
        transcript=res["transcript"],
        language_code=res["language_code"],
        source=res["source"],
        processing_time_ms=res.get("processing_time_ms", 12)
    )

@router.post(
    "/synthesize",
    response_model=SynthesizeResponse,
    summary="Text-to-Speech with Provider Chain (Sarvam Primary -> ElevenLabs -> gTTS)"
)
async def synthesize_speech(
    req: SynthesizeRequest
):
    """
    Text-to-Speech Pipeline:
    - Sarvam AI TTS (`bulbul:v3`) is primary provider with expressive Indian voices.
    - If Sarvam fails or key is unset, cascades to ElevenLabs (if configured).
    - If cloud services are unavailable, cascades to local `gTTS` (zero external keys required).
    - Response transparently returns `source` ('sarvam', 'elevenlabs', or 'gtts').
    """
    if not req.text or len(req.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text field cannot be empty.")

    try:
        res = voice_service.synthesize(
            text=req.text,
            language_code=req.language_code or "hi-IN",
            speaker=req.speaker or "shubh",
            force_demo=req.demo or False
        )
        return SynthesizeResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Speech synthesis failed: {str(e)}")

@router.post(
    "/synthesize/demo",
    response_model=SynthesizeResponse,
    summary="Instant Pre-Cached TTS for Live Judging Safety (<50ms)"
)
async def synthesize_speech_demo(
    language_code: str = Query("hi-IN", description="Language code: hi, en, ta, bn, te, mr, gu, kn, ml")
):
    """
    Credit-Conservation & Demo Safety Net:
    Returns pre-synthesized audio URL across all 9 languages instantly (<50ms).
    """
    bcp47 = normalize_lang_code(language_code)
    short_lang = bcp47.split("-")[0].lower()
    res = voice_cache.get_demo_audio(short_lang)
    return SynthesizeResponse(
        audio_url=res["audio_url"],
        language_code=res["language_code"],
        source=res["source"],
        processing_time_ms=res.get("processing_time_ms", 14),
        model="Pre-rendered Demo Audio"
    )

@router.get("/demo-phrases", summary="List pre-cached phrases across all 9 Indian languages")
async def list_demo_phrases():
    """Returns all 9 language craft descriptions available in the demo reliability cache."""
    return {
        "supported_languages": len(DEMO_VOICE_PHRASES),
        "phrases": DEMO_VOICE_PHRASES
    }
