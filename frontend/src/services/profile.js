import { useAppStore } from '../store/useAppStore';
import { mockCraftTypes } from '../mock/mockCraftTypes';

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// TODO: BACKEND — replace with GET /api/craft-types
export async function getCraftTypes() {
  await delay(300);
  return mockCraftTypes;
}

// TODO: BACKEND — replace with GET /api/profile
export async function getArtisanProfile() {
  await delay(200);
  const state = useAppStore.getState();
  return state.artisanProfile || state.artisan;
}

// TODO: BACKEND — replace with POST /api/profile
export async function updateProfile(data) {
  await delay(800);
  useAppStore.getState().updateArtisan(data);
  return { success: true };
}
