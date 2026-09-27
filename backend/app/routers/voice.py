import os
import json
import uuid
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, File, UploadFile, Query, HTTPException, Body
from pydantic import BaseModel
from groq import Groq

from app.services.voice_service import voice_service
from app.services.voice_cache import (
    voice_cache,
    DEMO_VOICE_PHRASES,
    LANGUAGE_CODE_MAP,
    normalize_lang_code
)

logger = logging.getLogger("shilpkala")
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

class CategoryInferenceRequest(BaseModel):
    description: str


@router.post(
    "/transcribe",
    response_model=TranscribeResponse,
    summary="Speech-to-Text via Groq Whisper (whisper-large-v3-turbo)"
)
async def transcribe_audio(
    file: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    language_code: str = Query("hi-IN", description="BCP-47 or ISO code (hi, en, ta, bn, te, mr, gu, kn, ml)"),
    demo: bool = Query(False, description="Developer toggle: if true, uses instant demo cache to conserve credits")
):
    """
    Speech-to-Text via Groq hosted Whisper (whisper-large-v3-turbo).
    - Reads GROQ_API_KEY from environment — no other STT provider is used.
    - Retries once on API failure, then returns a structured 503 error rather than crashing.
    - Response transparently returns `source` ('groq_whisper' or 'demo_cache').
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
        # Propagate graceful API errors from the service layer as HTTP 503
        if res.get("error"):
            raise HTTPException(status_code=503, detail=res.get("detail", "Transcription unavailable."))
        return TranscribeResponse(**res)
    except HTTPException:
        raise
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
    summary="Text-to-Speech via gTTS (free, no API key required)"
)
async def synthesize_speech(
    req: SynthesizeRequest
):
    """
    Text-to-Speech via gTTS (Google Text-to-Speech, free, no API key).
    - No external paid provider is used for TTS in this pipeline.
    - Produces an MP3 audio file returned as a URL via the storage layer.
    - Response transparently returns `source` ('gtts' or 'demo_cache').
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

# ---------------------------------------------------------------------------
# AI Category Inference Endpoint
# ---------------------------------------------------------------------------
@router.post("/categories/infer", summary="AI Category Inference via Groq")
async def infer_craft_category(request: CategoryInferenceRequest):
    if not request.description:
        raise HTTPException(status_code=400, detail="Description is required")

    system_prompt = """
    You are an AI assistant categorizing Indian artisan crafts. 
    Match the user's spoken description to one of the following existing categories:
    1: "Handloom Weaving"
    2: "Clay Pottery"
    3: "Hand Block Print"
    4: "Wood Carving"
    5: "Zardozi & Embroidery"
    6: "Brass & Metalwork"

    If the description strongly matches an existing category, return it with isNew=false.
    If the description does NOT match, create a concise, accurate new category name and return it with isNew=true.

    You MUST return strictly valid JSON matching this schema:
    {
      "id": "string (use the number for existing, or generate a random short string for new)",
      "name": "string (the category name)",
      "isNew": boolean,
      "giCertified": boolean (true only if it's one of the original 6)
    }
    """

    try:
        # Initialize the Groq client. Ensure GROQ_API_KEY is in your environment (.env)
        client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
        
        completion = client.chat.completions.create(
            model="llama3-8b-8192", 
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"The artisan said: '{request.description}'"}
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )

        response_content = completion.choices[0].message.content
        category_data = json.loads(response_content)

        if category_data.get("isNew") and not str(category_data.get("id")).startswith("custom"):
            category_data["id"] = f"custom_{uuid.uuid4().hex[:8]}"
            
        return category_data

    except Exception as e:
        logger.error(f"Groq Inference Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to infer category via AI")