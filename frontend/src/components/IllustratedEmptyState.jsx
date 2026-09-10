import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import PrimaryButton from './PrimaryButton';
import { useTranslation } from '../i18n';

export default function IllustratedEmptyState({
  type = 'products', // 'products' | 'inquiries'
  titleHindi,
  titleEnglish,
  descHindi,
  descEnglish,
  buttonTitle,
  onButtonPress,
  style,
}) {
  const { t, currentLanguage } = useTranslation();
  const isProducts = type === 'products';

  const defaultTitleHi = isProducts
    ? t('emptyStateAddCraft')
    : t('emptyInquiriesTitle');
  const defaultTitleEn = isProducts
    ? t('emptyStateAddCraft')
    : t('emptyInquiriesTitle');

  const defaultDescHi = isProducts
    ? t('emptyStateAddCraftDesc')
    : t('emptyInquiriesDesc');
  const defaultDescEn = isProducts
    ? t('emptyStateAddCraftDesc')
    : t('emptyInquiriesDesc');

  const isEn = currentLanguage === 'en';

  return (
    <View style={[styles.container, style]}>
      {/* Illustrated Icon Halo */}
      <View style={styles.outerHalo}>
        <View style={styles.midHalo}>
          <View style={styles.innerCircle}>
            <Ionicons
              name={isProducts ? 'cube-outline' : 'chatbubbles-outline'}
              size={42}
              color={colors.primary.rust}
            />
          </View>
        </View>

        {/* Decorative micro-dots */}
        <View style={[styles.dot, styles.dot1, { backgroundColor: colors.status.gold }]} />
        <View style={[styles.dot, styles.dot2, { backgroundColor: colors.primary.rust }]} />
        <View style={[styles.dot, styles.dot3, { backgroundColor: colors.status.green }]} />
      </View>

      {/* Title */}
      {isEn ? (
        <Text style={styles.headingPrimary}>
          {titleEnglish || defaultTitleEn}
        </Text>
      ) : (
        <>
          <Text style={styles.headingPrimary}>
            {titleHindi || defaultTitleHi}
          </Text>
          <Text style={styles.headingSecondary}>
            {titleEnglish || defaultTitleEn}
          </Text>
        </>
      )}

      {/* Description */}
      {isEn ? (
        <Text style={styles.description}>
          {descEnglish || defaultDescEn}
        </Text>
      ) : (
        <>
          <Text style={styles.description}>
            {descHindi || defaultDescHi}
          </Text>
          <Text style={styles.descriptionSecondary}>
            {descEnglish || defaultDescEn}
          </Text>
        </>
      )}

      {/* Optional CTA Button */}
      {onButtonPress ? (
        <View style={styles.buttonWrapper}>
          <PrimaryButton
            title={
              buttonTitle ||
              (isProducts
                ? (isEn ? t('addProduct') : `${t('addProduct')} · Add Product`)
                : (isEn ? t('sendMessageBtn') : `${t('sendMessageBtn')} · Send Message`))
            }
            leadingIcon={isProducts ? 'add-circle-outline' : 'paper-plane-outline'}
            onPress={onButtonPress}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  outerHalo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF5EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  midHalo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFE9DE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary.rust,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dot1: {
    top: 8,
    right: 18,
  },
  dot2: {
    bottom: 12,
    left: 14,
  },
  dot3: {
    top: 24,
    left: 8,
  },
  headingPrimary: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy.deep,
    textAlign: 'center',
    fontFamily: typography.fontFamilies?.body,
    marginBottom: 4,
  },
  headingSecondary: {
    fontSize: 13,
    color: colors.text.muted,
    textAlign: 'center',
    fontFamily: typography.fontFamilies?.latin,
    marginBottom: 10,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.navy.deep,
    textAlign: 'center',
    fontFamily: typography.fontFamilies?.devanagari,
    maxWidth: 300,
  },
  descriptionSecondary: {
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.text.muted,
    textAlign: 'center',
    fontFamily: typography.fontFamilies?.latin,
    fontStyle: 'italic',
    marginTop: 4,
    maxWidth: 290,
  },
  buttonWrapper: {
    width: '100%',
    maxWidth: 280,
    marginTop: 20,
  },
});
