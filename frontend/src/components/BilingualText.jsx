import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { useTranslation } from '../i18n';

export default function BilingualText({
  txKey,
  i18nKey,
  hi,
  en,
  size = 'md',
  layout = 'column', // 'column' (beneath) or 'row' (beside)
  align = 'left',
  isAiTranslation = false,
  style,
  primaryStyle,
  secondaryStyle,
  hindiStyle,
  englishStyle,
}) {
  const { t, getSecondary, currentLanguage } = useTranslation();

  const keyToUse = txKey || i18nKey;

  // Resolve primary line from current language
  const primaryText = keyToUse ? t(keyToUse) : hi;

  // Resolve secondary line (always English unless current language is English)
  let secondaryText = '';
  if (keyToUse) {
    secondaryText = currentLanguage === 'en' ? '' : getSecondary(keyToUse);
  } else if (en && currentLanguage !== 'en') {
    secondaryText = en;
  }

  const sizeConfig =
    typography.bilingualSizes[size] || typography.bilingualSizes.md;

  const isRow = layout === 'row';

  return (
    <View
      style={[
        styles.container,
        isRow ? styles.rowContainer : styles.columnContainer,
        align === 'center' && styles.alignCenter,
        align === 'right' && styles.alignRight,
        style,
      ]}
    >
      {primaryText ? (
        <Text
          style={[
            sizeConfig.hindi,
            styles.basePrimary,
            align === 'center' && styles.textCenter,
            align === 'right' && styles.textRight,
            isRow && secondaryText ? styles.rowMarginRight : undefined,
            hindiStyle || primaryStyle,
          ]}
        >
          {primaryText}
        </Text>
      ) : null}

      {secondaryText ? (
        <Text
          style={[
            sizeConfig.english,
            styles.baseSecondary,
            isAiTranslation && typography.aiTranslation,
            align === 'center' && styles.textCenter,
            align === 'right' && styles.textRight,
            englishStyle || secondaryStyle,
          ]}
        >
          {secondaryText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  columnContainer: {
    flexDirection: 'column',
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  alignCenter: {
    alignItems: 'center',
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  basePrimary: {
    color: colors.navy.deep,
  },
  baseSecondary: {
    color: colors.text.muted,
  },
  rowMarginRight: {
    marginRight: 8,
  },
  textCenter: {
    textAlign: 'center',
  },
  textRight: {
    textAlign: 'right',
  },
});
