import json
import logging
from typing import Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)

class CraftIntelligenceService:
    """
    Analyzes artisan voice transcripts to extract structured craft profile data.
    Ensures all output is localized to the user's selected language.
    """
    
    # These must match the IDs used in your frontend useAppStore / categories.js
    VALID_CATEGORIES = [
        "handloom", "pottery", "blockprint", "woodcarving", 
        "zardozi", "brass", "clay", "other"
    ]

    def parse_voice_craft(self, transcript: str, language_name: str = "Hindi") -> Dict[str, Any]:
        if not settings.GROQ_API_KEY:
            logger.warning("GROQ_API_KEY missing. Using fallback.")
            return self._fallback(transcript, language_name)

        try:
            from groq import Groq
            client = Groq(api_key=settings.GROQ_API_KEY)
            
            system_msg = (
                "You are ShilpKala AI, an expert in traditional Indian crafts, GI heritage, and artisan materials. "
                "You output ONLY valid, raw JSON. Do not include markdown blocks."
            )
            
            prompt = f"""
            Analyze this artisan's voice transcript: "{transcript}"
            Target Language for Output: {language_name}
            
            Map the craft to the most appropriate category ID from this exact list: {self.VALID_CATEGORIES}
            
            Return a STRICT JSON object. ALL text fields (craft_name, raw_materials, core_technique, gi_cluster) 
            MUST be written in {language_name}.
            {{
                "matched_category_id": "handloom",
                "craft_name": "Name of the craft in {language_name}",
                "raw_materials": ["Material 1 in {language_name}", "Material 2 in {language_name}"],
                "core_technique": "Primary crafting technique in {language_name}",
                "gi_cluster": "Official GI Region or Cluster name in {language_name}, or 'Traditional Craft' if unknown"
            }}
            """
            
            response = client.chat.completions.create(
                model="openai/gpt-oss-20b",
                temperature=0.1,  # Low temperature for strict schema adherence
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": prompt}
                ]
            )
            
            raw_text = response.choices[0].message.content.strip()
            parsed = json.loads(raw_text)
            
            # Failsafe: Ensure the LLM didn't hallucinate a category ID
            if parsed.get("matched_category_id") not in self.VALID_CATEGORIES:
                parsed["matched_category_id"] = "other"
                
            # Attach the original transcript for the UI to display
            parsed["transcript"] = transcript
                
            return parsed
            
        except Exception as e:
            logger.error(f"[Craft Intelligence] AI parse failed: {e}")
            return self._fallback(transcript, language_name)
            
    def _fallback(self, transcript: str, language_name: str) -> Dict[str, Any]:
        """Deterministic fallback if the AI rate-limits or fails."""
        is_en = language_name.lower() == "english"
        return {
            "transcript": transcript,
            "matched_category_id": "other",
            "craft_name": "Traditional Craft" if is_en else "पारंपरिक शिल्प",
            "raw_materials": ["Natural Materials" if is_en else "प्राकृतिक सामग्री"],
            "core_technique": "Handcrafted" if is_en else "हस्तनिर्मित",
            "gi_cluster": "Indian Heritage" if is_en else "भारतीय विरासत"
        }

craft_intelligence = CraftIntelligenceService()