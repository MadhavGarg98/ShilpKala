import { API_BASE_URL } from '../config';

export async function inferCraftCategory(transcript) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/categories/infer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: transcript }),
    });

    if (!response.ok) {
      throw new Error(`AI inference failed with status ${response.status}`);
    }
    
    return await response.json(); 
  } catch (error) {
    console.error('[API Service] Category Inference Error:', error);
    throw error;
  }
}