import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../i18n';

export default function TabRootHeader({
  txKey = 'brandName',
  title,
  subtitle,
  rightElement,
  onProfilePress,
  style,
}) {
  const navigation = useNavigation();
  const artisanProfile = useAppStore((state) => state.artisanProfile);
  const { t, currentLanguage } = useTranslation();

  const handleProfilePress = () => {
    if (onProfilePress) {
      onProfilePress();
    } else {
      navigation.navigate('Settings');
    }
  };

  const primaryTitle = title || t(txKey);
  const secondaryTitle = currentLanguage === 'en' ? '' : 'ShilpKala';

  return (
    <View style={[styles.container, style]}>
      <View style={styles.brandCol}>
        <View style={styles.titleRow}>
          <Text style={styles.brandPrimary}>{primaryTitle}</Text>
          {secondaryTitle ? (
            <>
              <Text style={styles.brandDivider}>•</Text>
              <Text style={styles.brandSecondary}>{secondaryTitle}</Text>
            </>
          ) : null}
        </View>
        <Text style={styles.tagline}>
          {subtitle || t('brandTagline')}
        </Text>
      </View>

      <View style={styles.rightActions}>
        {rightElement || (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleProfilePress}
            style={styles.profileBadge}
          >
            {artisanProfile?.profileImageUrl ? (
              <Image
                source={{ uri: artisanProfile.profileImageUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={18} color={colors.primary.rust} />
              </View>
            )}
            <View style={styles.verifiedDot}>
              <Ionicons name="checkmark" size={10} color={colors.surface.white} />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background.cream,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE2',
  },
  brandCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandPrimary: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
  },
  brandDivider: {
    marginHorizontal: 6,
    color: colors.primary.rust,
    fontSize: 14,
  },
  brandSecondary: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary.rust,
    letterSpacing: 0.5,
    fontFamily: typography.fontFamilies?.latin,
  },
  tagline: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 2,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileBadge: {
    position: 'relative',
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: colors.primary.rust,
  },
  avatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface.white,
    borderWidth: 1.5,
    borderColor: colors.primary.rust,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: colors.status.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface.white,
  },
});
