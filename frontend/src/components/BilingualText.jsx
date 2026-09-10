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

  let primaryText = '';
  let secondaryText = '';

  if (keyToUse) {
    primaryText = t(keyToUse);
    // When currentLanguage is English, never render a secondary line (no duplicate, no Hindi)
    secondaryText = currentLanguage === 'en' ? '' : getSecondary(keyToUse);
  } else {
    // Direct props hi / en passed without i18n key
    if (currentLanguage === 'en') {
      primaryText = en || '';
      secondaryText = '';
    } else if (currentLanguage === 'hi') {
      primaryText = hi || en || '';
      secondaryText = en && en !== hi ? en : '';
    } else {
      primaryText = en || '';
      secondaryText = '';
    }
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
