const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// TODO: BACKEND — replace with real image background removal and studio lighting API (e.g. rembg + custom lighting GAN)
export async function enhanceImage(imageUri, onProgress) {
  // Step 1: Studio background clean (0 - 35%)
  if (onProgress) onProgress(1, 15, 'processingStep1');
  await delay(600);
  if (onProgress) onProgress(1, 35, 'processingStep1');
  await delay(500);

  // Step 2: Natural light & color enhancement (35 - 75%)
  if (onProgress) onProgress(2, 50, 'processingStep2');
  await delay(600);
  if (onProgress) onProgress(2, 75, 'processingStep2');
  await delay(600);

  // Step 3: Smart craft framing & sharpness (75 - 100%)
  if (onProgress) onProgress(3, 88, 'processingStep3');
  await delay(500);
  if (onProgress) onProgress(3, 100, 'aiEnhanceComplete');
  await delay(300);

  return {
    enhancedUri: imageUri,
    isEnhanced: true,
  };
}

// TODO: BACKEND — replace with real whisper / regional ASR streaming WebSocket
export function streamVoiceTranscription({ onWord, onComplete }) {
  const sampleWords = [
    'यह',
    'शुद्ध',
    'कातून',
    'रेशम',
    'की',
    'हाथ',
    'से',
    'बुनी',
    'बनारसी',
    'साड़ी',
    'है,',
    'जिसमें',
    'पारंपरिक',
    'ज़री',
    'बूटा',
    'और',
    'पल्लू',
    'पर',
    'मीनाकारी',
    'काम',
    'किया',
    'गया',
    'है।',
  ];

  let index = 0;
  let accumulated = '';

  const interval = setInterval(() => {
    if (index < sampleWords.length) {
      accumulated = accumulated
        ? `${accumulated} ${sampleWords[index]}`
        : sampleWords[index];
      if (onWord) {
        onWord(accumulated);
      }
      index++;
    } else {
      clearInterval(interval);
      if (onComplete) {
        onComplete(accumulated);
      }
    }
  }, 160);

  return () => clearInterval(interval);
}

// TODO: BACKEND — replace with real AI generation API: POST /api/ai/generate-listing
export async function generateListingFromAudio(audioUri) {
  await delay(2000);

  return {
    titleHindi: 'हाथ से बुनी बनारसी कातून रेशम साड़ी',
    titleEnglish: 'Handwoven Pure Banarasi Katan Silk Saree',
    descriptionHindi: 'पारंपरिक ज़री और पल्लू पर बारीक मीनाकारी काम वाली शुद्ध रेशम साड़ी।',
    descriptionEnglish: 'Pure katan silk saree handwoven with authentic gold zari motifs and rich pallu.',
    isGiMatch: true,
    suggestedPriceMin: 5500,
    suggestedPriceMax: 7200,
    keywords: ['Silk', 'Handloom', 'Banarasi', 'Zari', 'Wedding'],
  };
}
