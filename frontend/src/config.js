// Hardcoded hackathon config - no caching, no auto-detect
export const DEFAULT_LAN_IP = '192.168.31.27';
export const DEFAULT_PORT = '8000';

export function getBaseUrl() {
  // We completely removed the .env and hostUri checks.
  // It will strictly return this and nothing else:
  return `http://${DEFAULT_LAN_IP}:${DEFAULT_PORT}`;
}

export const API_BASE_URL = getBaseUrl();

export function resolveApiUrl(path) {
  const base = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export function isDemoMode() {
  return false; 
}

export default {
  API_BASE_URL,
  getBaseUrl,
  resolveApiUrl,
  isDemoMode,
};