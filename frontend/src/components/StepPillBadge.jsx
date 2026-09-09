import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { useTranslation } from '../i18n';

const DEVANAGARI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const GUJARATI_DIGITS = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];

function toNativeDigits(num, langCode) {
  if (num === undefined || num === null) return '';
  const str = String(num);
  if (langCode === 'hi' || langCode === 'mr') {
    return str.replace(/[0-9]/g, (d) => DEVANAGARI_DIGITS[parseInt(d, 10)]);
  }
  if (langCode === 'bn') {
    return str.replace(/[0-9]/g, (d) => BENGALI_DIGITS[parseInt(d, 10)]);
  }
  if (langCode === 'gu') {
    return str.replace(/[0-9]/g, (d) => GUJARATI_DIGITS[parseInt(d, 10)]);
  }
  return str;
}

export default function StepPillBadge({
  step = 1,
  total = 3,
  style,
  textStyle,
  testID,
}) {
  const { t, currentLanguage } = useTranslation();

  const stepWord = t('step');
  const nativeNum = toNativeDigits(step, currentLanguage);

  const pillText =
    currentLanguage === 'en'
      ? `STEP ${step} OF ${total}`
      : `${stepWord} ${nativeNum} / STEP ${step} OF ${total}`;

  return (
    <View testID={testID} style={[styles.pill, style]}>
      <Text style={[styles.text, textStyle]}>{pillText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background.cream,
    borderWidth: 1,
    borderColor: colors.status.amber,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    shadowColor: colors.navy.deep,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  text: {
    color: colors.primary.rust,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.fontFamilies?.body,
    letterSpacing: 0.5,
  },
});
