import { useAppStore } from '../store/useAppStore';

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// TODO: BACKEND — replace with POST /api/profile
export async function updateProfile(data) {
  await delay(1000);
  useAppStore.getState().updateArtisan(data);
  return { success: true };
}
