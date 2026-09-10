import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { useTranslation } from '../i18n';

export default function OfflineBanner() {
  const netInfo = useNetInfo();
  const { t, currentLanguage } = useTranslation();
  const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;
  const slideAnim = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    if (isOffline) {
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -70,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isOffline]);

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents={isOffline ? 'auto' : 'none'}
    >
      <View style={styles.contentRow}>
        <Ionicons name="cloud-offline" size={18} color={colors.surface.white} />
        <View style={styles.textCol}>
          <Text style={styles.bannerTextPrimary}>
            {currentLanguage === 'en' ? t('offlineTitle') : `${t('offlineTitle')} · You're offline`}
          </Text>
          <Text style={styles.bannerTextSecondary}>
            {currentLanguage === 'en' ? t('offlineSubtitle') : `${t('offlineSubtitle')} • Syncs when online`}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: '#C1440E', // colors.primary.rust
    paddingTop: 36, // accommodates status bar
    paddingBottom: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 10,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textCol: {
    flex: 1,
  },
  bannerTextPrimary: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.surface.white,
    fontFamily: typography.fontFamilies?.body,
  },
  bannerTextSecondary: {
    fontSize: 10.5,
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: typography.fontFamilies?.latin,
    marginTop: 1,
  },
});
