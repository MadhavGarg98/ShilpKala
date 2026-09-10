# ShilpKala Backend API — Phase 1 & Phase 2

FastAPI backend powering **ShilpKala**, an AI-driven enablement platform for Indian artisans and GI-heritage crafts.

---

## Honesty Contract

| Module | Status | Technology |
| :--- | :--- | :--- |
| **Foundation & Storage** | **REAL** | FastAPI, SQLAlchemy, Local S3/boto3 Object Wrapper |
| **Image Enhancement (Live Demo)** | **REAL** | `rembg` (lightweight `u2netp` model) + OpenCV CLAHE + Texture Sharpening Recovery |
| **Voice STT (Speech-to-Text)** | **REAL** | **Sarvam AI** (`saaras:v3`) $\rightarrow$ Bhashini $\rightarrow$ local Whisper (`openai-whisper`) |
| **Voice TTS (Text-to-Speech)** | **REAL** | **Sarvam AI** (`bulbul:v3`) $\rightarrow$ ElevenLabs $\rightarrow$ local `gTTS` |
| **AI Listing Generation** | **REAL** | **Groq** (`llama-3.3-70b-versatile` primary) $\rightarrow$ Anthropic Claude fallback $\rightarrow$ Template fallback |
| **Dynamic Pricing Engine** | **REAL** | **Rules-Based Heuristic v1** (Ministry of Textiles / FTFI margin norms + GI +30% premium) |
| **Credit Conservation Layer** | **CACHED SAFETY NET** | Pre-computed audio & transcripts across all 9 languages served in <5ms |
| **Module 4 (Authenticity)** | *Simulated* | Labeled as simulated per hackathon contract |
| **Module 5 (ONDC Integration)** | *Simulated* | Labeled as simulated per hackathon contract |

---

## Endpoints: Real Pipeline vs. Demo Cache

| Endpoint | Method | Latency | Purpose / Usage |
| :--- | :--- | :--- | :--- |
| `/api/images/enhance` | `POST` | **~870ms – 1.2s** | **GENUINE LIVE PIPELINE**. Background removal (`u2netp`), lighting correction (OpenCV CLAHE in LAB space), texture sharpening. |
| `/api/images/enhance/demo` | `POST` | **< 10ms** | **DEMO SAFETY NET**. Pre-computed on 5 curated craft photos (bottle, pot, saree, wood elephant, textile). |
| `/api/voice/transcribe` | `POST` | **~1.5s – 3.0s** | **GENUINE VOICE STT**. Attempts Sarvam STT first, cascades to Bhashini, then local Whisper. |
| `/api/voice/transcribe/demo`| `POST` | **< 10ms** | **DEMO SAFETY NET**. Returns pre-computed transcripts across 9 languages. |
| `/api/voice/synthesize` | `POST` | **~1.2s – 2.5s** | **GENUINE VOICE TTS**. Attempts Sarvam TTS (`bulbul:v3`) first, cascades to ElevenLabs, then `gTTS`. |
| `/api/voice/synthesize/demo`| `POST` | **< 10ms** | **DEMO SAFETY NET**. Returns pre-synthesized audio across all 9 languages. |
| `/api/listings/generate` | `POST` | **~1.5s – 3.0s** | **AI LISTING GENERATION**. Converts transcript + image into structured multilingual listing (local language + English). |
| `/api/pricing/suggest` | `POST` | **< 15ms** | **DYNAMIC PRICING ENGINE**. Rules-based heuristic using material cost, craft margins, and GI status (+30%). |
| `/api/pricing/benchmarks` | `GET` | **< 10ms** | **CURATED REFERENCE COMPARABLES**. Static reference table of comparable market items by craft category. |
| `/api/products` | `GET`, `POST` | < 30ms | Full product CRUD with GI heritage tagging. |
| `/api/artisans` | `GET`, `POST` | < 20ms | Artisan profile management. |
| `/api/listings` | `GET`, `POST` | < 20ms | Multi-channel listings management (ONDC, Shopify, Amazon). |

---

## 9-Language Code Mapping (BCP-47)

ShilpKala maps all 9 supported app languages directly to Sarvam AI's BCP-47 standard:

| Language | App Code | Sarvam BCP-47 Code |
| :--- | :--- | :--- |
| **Hindi** | `hi` | `hi-IN` |
| **English** | `en` | `en-IN` |
| **Tamil** | `ta` | `ta-IN` |
| **Bengali** | `bn` | `bn-IN` |
| **Telugu** | `te` | `te-IN` |
| **Marathi** | `mr` | `mr-IN` |
| **Gujarati** | `gu` | `gu-IN` |
| **Kannada** | `kn` | `kn-IN` |
| **Malayalam** | `ml` | `ml-IN` |

---

## Credit Conservation & Developer Demo Toggles

To protect finite Sarvam credits (₹100 free balance) during live rehearsals:
1. Set `DEMO_MODE=true` in `.env` to route recognized demo prompts to cache while keeping novel requests live.
2. Console outputs real-time color-coded tracking:
   - `[VOICE CREDIT TRACKER] CACHE HIT: 0 credits used (Served from Demo Layer)`
   - `[VOICE CREDIT TRACKER] REAL API CALL to SARVAM: Credits consumed!`
3. Per-request override: Add `?demo=true` to any request URL.

---

## How to Run & Verify

### 1. Run Automated Test Suites
```bash
# Phase 1 Suite (Image Enhancement + CRUD)
python test_phase1.py

# Phase 2 Suite (Voice Pipeline + AI Listing Generator across 3+ languages)
python test_phase2.py
```

### 2. Start the API Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Interactive API documentation available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
