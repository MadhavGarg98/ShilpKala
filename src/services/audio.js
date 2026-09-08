import * as Speech from 'expo-speech';

// TODO: BACKEND — replace with real TTS API if expo-speech is insufficient for specific regional languages
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
