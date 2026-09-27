from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from groq import Groq
import os
import json
import uuid
import logging

# Import your settings to grab the loaded .env variables
from app.config import settings
from dotenv import load_dotenv

# Import the new Craft Intelligence service
from app.services.craft_intelligence import craft_intelligence

# Fallback: force load the .env file into os.environ just in case
load_dotenv()

router = APIRouter(prefix="/api/categories", tags=["Categories"])
logger = logging.getLogger("shilpkala")

# --- Pydantic Models ---

class CategoryInferenceRequest(BaseModel):
    description: str

class CraftParseRequest(BaseModel):
    transcript: str
    language_name: str = "Hindi"

class CraftParseResponse(BaseModel):
    transcript: str
    matched_category_id: str
    craft_name: str
    raw_materials: List[str]
    core_technique: str
    gi_cluster: str

# --- Endpoints ---

@router.post("/infer", summary="AI Category Inference via Groq")
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
        # Safely grab the API key from settings (if it exists there) OR from the environment
        api_key = getattr(settings, "GROQ_API_KEY", os.environ.get("GROQ_API_KEY"))
        
        if not api_key:
            logger.error("GROQ_API_KEY is missing from both settings and environment variables.")
            raise ValueError("API Key missing")

        # Initialize the Groq client explicitly with the parsed key
        client = Groq(api_key=api_key)
        
        completion = client.chat.completions.create(
            model="openai/gpt-oss-20b",
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


@router.post("/parse-craft", response_model=CraftParseResponse, summary="Parse Multi-Step Craft Profile Voice")
async def parse_craft_voice(req: CraftParseRequest):
    """
    Takes an artisan's voice transcript and extracts structured, 
    localized profile data using the Groq LLM.
    """
    if not req.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript cannot be empty.")
        
    result = craft_intelligence.parse_voice_craft(
        transcript=req.transcript,
        language_name=req.language_name
    )
    
    return result