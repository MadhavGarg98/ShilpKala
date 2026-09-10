import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Current development machine LAN IP on the local Wi-Fi network
export const DEFAULT_LAN_IP = '10.85.233.220';
export const DEFAULT_PORT = '8000';

/**
 * Resolves the ShilpKala backend API base URL.
 * Priority:
 * 1. process.env.EXPO_PUBLIC_API_URL (from frontend/.env)
 * 2. Constants.expoConfig?.hostUri (auto-detected Expo dev server IP from phone connection)
 * 3. Configured machine LAN IP (http://10.15.32.165:8000)
 */
export function getBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    const trimmed = envUrl.trim().replace(/\/+$/, '');
    if (!trimmed.includes('localhost') && !trimmed.includes('127.0.0.1')) {
      return trimmed;
    }
  }

  try {
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return `http://${host}:${DEFAULT_PORT}`;
      }
    }
  } catch (e) {
    // Ignore fallback inspection errors
  }

  return `http://${DEFAULT_LAN_IP}:${DEFAULT_PORT}`;
}

// Single configurable constant exported per requirement
export const API_BASE_URL = getBaseUrl();

export function resolveApiUrl(path) {
  const base = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export function isDemoMode() {
  return process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
}

export default {
  API_BASE_URL,
  getBaseUrl,
  resolveApiUrl,
  isDemoMode,
};
