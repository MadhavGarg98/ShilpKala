import { Platform } from 'react-native';
import { resolveApiUrl, isDemoMode } from '../config';
import { rnMultipartUpload } from '../utils/networkUpload';

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Real Image Enhancement via ShilpKala FastAPI backend.
 * Calls POST /api/images/enhance (or /api/images/enhance/demo).
 * Progress is driven dynamically and completes upon real backend response.
 */
export async function enhanceImage(imageUri, onProgress, cropBox = null) {
  const useDemo = isDemoMode();
  const endpoint = useDemo ? '/api/images/enhance/demo' : '/api/images/enhance';
  const url = resolveApiUrl(endpoint);

  // Progressive feedback step 1: Studio background clean
  if (onProgress) onProgress(1, 15, 'processingStep1');

  const formData = new FormData();
  let hasRealFile = false;

  if (cropBox) {
    const cropStr = Array.isArray(cropBox) ? cropBox.join(',') : String(cropBox);
    formData.append('crop_box', cropStr);
  }

  if (typeof imageUri === 'string') {
    if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
      // Remote or local server URL
      hasRealFile = true;
      formData.append('demo', 'true');
    } else {
      // Local device file path or content URI
      const photoUri = Platform.OS === 'android' && !imageUri.startsWith('file://') && !imageUri.startsWith('content://')
        ? `file://${imageUri}`
        : imageUri;

      const filePart = {
        uri: photoUri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      };

      formData.append('image', filePart);
      formData.append('file', filePart);
      hasRealFile = true;
    }
  } else {
    // Bundled asset (number from require())
    formData.append('demo', 'true');
  }

  // Progressive feedback step 1 -> step 2 transition
  if (onProgress) onProgress(1, 35, 'processingStep1');
  await delay(200);
  if (onProgress) onProgress(2, 55, 'processingStep2');

  try {
    console.log(`[ai.js] Uploading image via RN built-in network layer to: ${url}`);
    // Use React Native's built-in network client (XMLHttpRequest) instead of expo/fetch
    // to prevent 'Unsupported FormDataPart implementation' error
    const response = await rnMultipartUpload(url, formData, {
      'Accept': 'application/json',
    });

    if (onProgress) onProgress(2, 80, 'processingStep2');

    const data = await response.json();

    // Step 3: Framing & sharpness finalization
    if (onProgress) onProgress(3, 95, 'processingStep3');
    await delay(150);
    if (onProgress) onProgress(3, 100, 'aiEnhanceComplete');

    return {
      enhancedUri: data.enhanced_url,
      originalUri: data.original_url,
      cutoutId: data.cutout_id,
      activePreset: data.active_preset || 'studio_white',
      tiltCorrected: data.tilt_angle_corrected || 0.0,
      variants: data.variants || {
        studio_white: data.enhanced_url,
        warm_neutral: data.enhanced_url,
        cool_gray: data.enhanced_url,
        enhanced: data.enhanced_url,
        original: data.original_url,
      },
      isEnhanced: true,
      processingTimeMs: data.processing_time_ms,
      modelUsed: data.model_used,
      isDemoCache: data.is_demo_cache,
    };
  } catch (err) {
    console.error('[ai.js] Real image enhancement request failed:', err);
    throw err;
  }
}

/**
 * Fast studio backdrop preset switching using the cached product cutout.
 * Calls POST /api/images/preset
 */
export async function applyImagePreset(cutoutId, preset = 'studio_white') {
  const url = resolveApiUrl(`/api/images/preset?cutout_id=${encodeURIComponent(cutoutId)}&preset=${encodeURIComponent(preset)}`);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Preset API failed with HTTP ${response.status}`);
    }
    const data = await response.json();
    return {
      enhancedUri: data.enhanced_url,
      preset: data.preset,
      cutoutId: data.cutout_id,
      processingTimeMs: data.processing_time_ms,
    };
  } catch (err) {
    console.error('[ai.js] Preset switch failed:', err);
    throw err;
  }
}

/**
 * Multi-Product Detection using YOLOv8n via ShilpKala FastAPI backend.
 * Calls POST /api/images/detect-objects
 */
export async function detectObjects(imageUri) {
  const url = resolveApiUrl('/api/images/detect-objects');
  const formData = new FormData();

  if (typeof imageUri === 'string' && !imageUri.startsWith('http://') && !imageUri.startsWith('https://')) {
    const photoUri = Platform.OS === 'android' && !imageUri.startsWith('file://') && !imageUri.startsWith('content://')
      ? `file://${imageUri}`
      : imageUri;
    const filePart = {
      uri: photoUri,
      name: 'photo.jpg',
      type: 'image/jpeg',
    };
    formData.append('image', filePart);
    formData.append('file', filePart);
  } else {
    formData.append('demo', 'true');
  }

  try {
    console.log(`[ai.js] Detecting objects via: ${url}`);
    const response = await rnMultipartUpload(url, formData, {
      'Accept': 'application/json',
    });
    const data = await response.json();
    return {
      count: data.count || 0,
      imageWidth: data.image_width || 800,
      imageHeight: data.image_height || 600,
      objects: data.objects || [],
      hasMultiple: (data.objects || []).length > 1,
    };
  } catch (err) {
    console.warn('[ai.js] Multi-product detection error (falling back to single item):', err);
    return { count: 1, imageWidth: 800, imageHeight: 600, objects: [], hasMultiple: false };
  }
}

/**
 * AI Product Description from Image via BLIP Vision + LLM engine.
 * Calls POST /api/images/describe
 */
export async function describeProductImage({ imageUri, cutoutId, languageCode = 'hi-IN', craftType }) {
  let endpoint = `/api/images/describe?language_code=${encodeURIComponent(languageCode)}`;
  if (cutoutId) {
    endpoint += `&cutout_id=${encodeURIComponent(cutoutId)}`;
  }
  if (craftType) {
    endpoint += `&craft_type=${encodeURIComponent(craftType)}`;
  }
  const url = resolveApiUrl(endpoint);

  const formData = new FormData();
  if (cutoutId) {
    formData.append('cutout_id', cutoutId);
  }

  if (typeof imageUri === 'string' && !imageUri.startsWith('http://') && !imageUri.startsWith('https://')) {
    const photoUri = Platform.OS === 'android' && !imageUri.startsWith('file://') && !imageUri.startsWith('content://')
      ? `file://${imageUri}`
      : imageUri;
    const filePart = {
      uri: photoUri,
      name: 'product.jpg',
      type: 'image/jpeg',
    };
    formData.append('image', filePart);
    formData.append('file', filePart);
  }

  try {
    console.log(`[ai.js] Generating AI product description via: ${url}`);
    const response = await rnMultipartUpload(url, formData, {
      'Accept': 'application/json',
    });
    const data = await response.json();
    return {
      caption: data.caption,
      title: data.title,
      titleEn: data.title_en,
      description: data.description,
      descriptionEn: data.description_en,
      keywords: data.keywords || [],
      suggestedPriceMin: data.suggested_price_min,
      suggestedPriceMax: data.suggested_price_max,
      isGiMatch: data.is_gi_match,
      giName: data.gi_name,
      source: data.source,
      processingTimeMs: data.processing_time_ms,
    };
  } catch (err) {
    console.error('[ai.js] Product description failed:', err);
    throw err;
  }
}

/**
 * Transcribes audio via real ShilpKala FastAPI backend.
 * Calls POST /api/voice/transcribe
 */
export async function transcribeAudio({ audioUri, languageCode = 'hi-IN', forceDemo = false }) {
  const useDemo = forceDemo || isDemoMode();
  const endpoint = useDemo
    ? `/api/voice/transcribe/demo?language_code=${encodeURIComponent(languageCode)}`
    : `/api/voice/transcribe?language_code=${encodeURIComponent(languageCode)}`;
  const url = resolveApiUrl(endpoint);

  const formData = new FormData();

  if (!useDemo && audioUri) {
    const filename = audioUri.split('/').pop() || 'voice_recording.wav';
    const extMatch = /\.(\w+)$/.exec(filename);
    const mimeType = extMatch ? `audio/${extMatch[1]}` : 'audio/wav';

    const audioPart = {
      uri: audioUri,
      name: filename,
      type: mimeType,
    };
    formData.append('file', audioPart);
    formData.append('audio', audioPart);
  }

  try {
    console.log(`[ai.js] Uploading voice audio via RN built-in network layer to: ${url}`);
    const response = await rnMultipartUpload(url, formData, {
      'Accept': 'application/json',
    });

    const data = await response.json();
    return {
      transcript: data.transcript,
      languageCode: data.language_code,
      source: data.source,
      processingTimeMs: data.processing_time_ms,
    };
  } catch (err) {
    console.error('[ai.js] Voice transcription error:', err);
    throw err;
  }
}

/**
 * Real AI Listing Generation via ShilpKala FastAPI backend.
 * Calls POST /api/listings/generate
 * Accepts both voice-transcribed and manually-typed text descriptions.
 */
export async function generateListingFromAudio({ transcript, imageUri, languageCode = 'hi-IN', craftType = 'Handloom Weaving' }) {
  const url = resolveApiUrl('/api/listings/generate');

  const payload = {
    transcript: transcript || 'हस्तनिर्मित पारंपरिक भारतीय शिल्प',
    language_code: languageCode || 'hi-IN',
    image_url: typeof imageUri === 'string' ? imageUri : null,
    craft_type: craftType,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Listing generation failed HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();

    return {
      title: data.title,
      titleEnglish: data.title_english || data.title,
      titleHindi: data.title,
      description: data.description_local,
      descriptionEnglish: data.description_en,
      descriptionHindi: data.description_local,
      isGiMatch: Boolean(data.is_gi_match),
      giName: data.gi_name,
      suggestedPriceMin: data.suggested_price_min,
      suggestedPriceMax: data.suggested_price_max,
      keywords: data.keywords || [],
      source: data.source,
      languageDetected: data.language_detected,
      languageName: data.language_name,
    };
  } catch (err) {
    console.error('[ai.js] Real listing generation failed:', err);
    throw err;
  }
}

/**
 * Text-to-Speech synthesis calling POST /api/voice/synthesize
 */
export async function synthesizeSpeech({ text, languageCode = 'hi-IN', speaker = 'shubh' }) {
  const url = resolveApiUrl('/api/voice/synthesize');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        text,
        language_code: languageCode,
        speaker,
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS failed HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('[ai.js] Speech synthesis error:', err);
    throw err;
  }
}
