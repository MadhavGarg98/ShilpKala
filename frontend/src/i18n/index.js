import { useAppStore } from '../store/useAppStore';
import hi from './translations/hi';
import en from './translations/en';
import ta from './translations/ta';
import bn from './translations/bn';
import te from './translations/te';
import mr from './translations/mr';
import gu from './translations/gu';
import kn from './translations/kn';
import ml from './translations/ml';

export const translations = {
  hi,
  en,
  ta,
  bn,
  te,
  mr,
  gu,
  kn,
  ml,
};

// Normalize language inputs like 'Hindi', 'hi', 'Tamil', 'ta', etc.
export function normalizeLanguageCode(lang) {
  if (!lang) return 'hi';
  const lower = String(lang).toLowerCase().trim();
  if (lower === 'hi' || lower === 'hindi' || lower.includes('हिन्')) return 'hi';
  if (lower === 'en' || lower === 'english') return 'en';
  if (lower === 'ta' || lower === 'tamil' || lower.includes('தமி')) return 'ta';
  if (lower === 'bn' || lower === 'bengali' || lower.includes('বাং')) return 'bn';
  if (lower === 'te' || lower === 'telugu' || lower.includes('తెలు')) return 'te';
  if (lower === 'mr' || lower === 'marathi' || lower.includes('मरा')) return 'mr';
  if (lower === 'gu' || lower === 'gujarati' || lower.includes('ગુજ')) return 'gu';
  if (lower === 'kn' || lower === 'kannada' || lower.includes('ಕನ್ನ')) return 'kn';
  if (lower === 'ml' || lower === 'malayalam' || lower.includes('മല')) return 'ml';
  return 'hi';
}

export function t(key, langCode = 'hi') {
  const code = normalizeLanguageCode(langCode);
  const langDict = translations[code] || translations.en;
  if (langDict && langDict[key] !== undefined) {
    return langDict[key];
  }
  // Fallback to English
  if (translations.en && translations.en[key] !== undefined) {
    return translations.en[key];
  }
  return key;
}

export function getSecondaryText(key, langCode = 'hi') {
  const code = normalizeLanguageCode(langCode);
  // Per spec: If current language IS English, do not show English twice!
  if (code === 'en') {
    return '';
  }
  return translations.en[key] || '';
}

export function useTranslation() {
  const selectedLanguage = useAppStore((state) => state.selectedLanguage);
  const setLanguageInStore = useAppStore((state) => state.setLanguage);
  const code = normalizeLanguageCode(selectedLanguage);

  return {
    t: (key) => t(key, code),
    getSecondary: (key) => getSecondaryText(key, code),
    currentLanguage: code,
    setLanguage: (newLang) => setLanguageInStore(newLang),
  };
}

export default {
  translations,
  t,
  getSecondaryText,
  useTranslation,
  normalizeLanguageCode,
};
