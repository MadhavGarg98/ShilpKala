const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// TODO: BACKEND — replace with real image background removal API (e.g. rembg)
export async function enhanceImage(imageUri, onProgress) {
  // Simulate progress
  for (let i = 0; i <= 100; i += 10) {
    onProgress(i);
    await delay(300);
  }
  
  // Return the original URI as a mock enhanced image
  return imageUri;
}

// TODO: BACKEND — replace with real AI generation API
export async function generateListingFromAudio(audioUri) {
  await delay(2000); // Simulate network and processing delay

  return {
    titleHindi: 'हाथ से बुनी बनारसी साड़ी',
    titleEnglish: 'Handwoven Banarasi Saree',
    descriptionHindi: 'पारंपरिक बनारसी पैटर्न के साथ शुद्ध रेशम साड़ी।',
    descriptionEnglish: 'Pure silk saree with traditional Banarasi patterns.',
    isGiMatch: true,
    suggestedPriceMin: 4500,
    suggestedPriceMax: 6500,
    keywords: ['Silk', 'Handloom', 'Wedding'],
  };
}

// TODO: BACKEND — replace with real translation/rewriting API
export async function translateReplyToEnglish(hindiText) {
  await delay(1500);
  return `Thank you for your interest. We can deliver this item within 7-10 business days. Let us know if you want to proceed.`;
}
