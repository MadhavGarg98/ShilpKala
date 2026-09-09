import { colors } from './colors';

export const fontFamilies = {
  devanagari: 'Noto Sans Devanagari, system-ui, -apple-system, sans-serif',
  latin: 'Inter, system-ui, -apple-system, sans-serif',
  body: 'Noto Sans Devanagari, Inter, system-ui, -apple-system, sans-serif',
};

export const typography = {
  fontFamilies,

  // Hindi primary text: 18-20px, bold
  hindiPrimary: {
    fontSize: 19,
    fontWeight: '700',
    fontFamily: fontFamilies.devanagari,
    color: colors.navy.deep,
    lineHeight: 25,
  },

  // English secondary text: 13-14px, muted gray
  englishSecondary: {
    fontSize: 13.5,
    fontWeight: '400',
    fontFamily: fontFamilies.latin,
    color: colors.text.muted,
    lineHeight: 18,
  },

  // Headline sizes
  headline: {
    large: {
      fontSize: 28,
      fontWeight: '700',
      fontFamily: fontFamilies.body,
      color: colors.navy.deep,
      lineHeight: 34,
    },
    medium: {
      fontSize: 24,
      fontWeight: '700',
      fontFamily: fontFamilies.body,
      color: colors.navy.deep,
      lineHeight: 30,
    },
    small: {
      fontSize: 20,
      fontWeight: '700',
      fontFamily: fontFamilies.body,
      color: colors.navy.deep,
      lineHeight: 26,
    },
  },

  // Italic-for-AI-translation rule
  aiTranslation: {
    fontStyle: 'italic',
    fontSize: 13.5,
    fontFamily: fontFamilies.latin,
    color: colors.text.muted,
    lineHeight: 18,
  },

  // Sizing matrix for BilingualText component (no hardcoded sizing in components)
  bilingualSizes: {
    sm: {
      hindi: {
        fontSize: 16,
        fontWeight: '700',
        fontFamily: fontFamilies.devanagari,
        lineHeight: 22,
      },
      english: {
        fontSize: 12,
        fontWeight: '400',
        fontFamily: fontFamilies.latin,
        color: colors.text.muted,
        lineHeight: 16,
      },
    },
    md: {
      hindi: {
        fontSize: 18,
        fontWeight: '700',
        fontFamily: fontFamilies.devanagari,
        lineHeight: 24,
      },
      english: {
        fontSize: 13.5,
        fontWeight: '400',
        fontFamily: fontFamilies.latin,
        color: colors.text.muted,
        lineHeight: 18,
      },
    },
    lg: {
      hindi: {
        fontSize: 20,
        fontWeight: '700',
        fontFamily: fontFamilies.devanagari,
        lineHeight: 27,
      },
      english: {
        fontSize: 14,
        fontWeight: '400',
        fontFamily: fontFamilies.latin,
        color: colors.text.muted,
        lineHeight: 19,
      },
    },
    headline: {
      hindi: {
        fontSize: 26,
        fontWeight: '700',
        fontFamily: fontFamilies.devanagari,
        lineHeight: 32,
      },
      english: {
        fontSize: 15,
        fontWeight: '400',
        fontFamily: fontFamilies.latin,
        color: colors.text.muted,
        lineHeight: 21,
      },
    },
  },
};

export default typography;
