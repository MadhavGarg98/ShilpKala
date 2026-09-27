import * as FileSystemLegacy from 'expo-file-system/legacy';
import { API_BASE_URL } from '../config';
import * as Speech from 'expo-speech';

/**
 * Transcribes an audio file using the ShilpKala Backend.
 */
export async function transcribeAudio(audioUri, languageCode = 'hi-IN') {
  if (!audioUri) throw new Error("No audio URI provided for transcription");

  try {
    const ext = audioUri.split('.').pop() || 'm4a';
    const endpoint = `${API_BASE_URL}/api/voice/transcribe?language_code=${languageCode}&demo=false`;
    
    console.log(`[AudioService] Uploading to: ${endpoint}`);

    // Use the explicitly imported legacy API to bypass Expo SDK 57 deprecation errors
    const response = await FileSystemLegacy.uploadAsync(endpoint, audioUri, {
      httpMethod: 'POST',
      uploadType: 1, // MULTIPART
      fieldName: 'file', // Matches your FastAPI backend parameter
      mimeType: `audio/${ext}`
    });

    if (response.status !== 200) {
      console.error('[AudioService] Backend returned error:', response.status, response.body);
      throw new Error(`Transcription failed with status ${response.status}`);
    }

    const json = JSON.parse(response.body);
    return json.transcript;
    
  } catch (error) {
    console.error('[AudioService] Error during transcription:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Existing TTS logic
// ---------------------------------------------------------------------------

export function playTextToSpeech(text, languageCode = 'hi-IN') {
  Speech.speak(text, {
    language: languageCode,
    pitch: 1.0,
    rate: 0.9,
  });
}

export function stopTextToSpeech() {
  Speech.stop();
}