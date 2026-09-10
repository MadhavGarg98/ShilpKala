import { useAppStore } from '../store/useAppStore';

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// TODO: BACKEND — replace with: GET /api/products
export async function getProducts() {
  await delay(400);
  return useAppStore.getState().products;
}

// TODO: BACKEND — replace with: POST /api/products { images, voiceTranscript, artisanId }
export async function createListing(data) {
  await delay(1000);
  
  const newProduct = {
    id: `p${Date.now()}`,
    titleHindi: data.titleHindi || 'नया हस्तशिल्प उत्पाद',
    titleEnglish: data.titleEnglish || 'New Handcrafted Product',
    price: data.price || 0,
    status: data.status || 'live',
    isGiCertified: data.isGiCertified || false,
    descriptionHindi: data.descriptionHindi || '',
    descriptionEnglish: data.descriptionEnglish || '',
    imageUrl: data.imageUrl || require('../../assets/images/products/banarasi-saree.jpg'),
    inquiryCount: 0,
    viewsCount: 0,
    keywords: data.keywords || [],
  };

  useAppStore.getState().addProduct(newProduct);
  return newProduct;
}

// TODO: BACKEND — replace with: PUT /api/products/{id}
export async function updateListing(id, updates) {
  await delay(600);
  useAppStore.getState().updateProduct(id, updates);
  return true;
}
