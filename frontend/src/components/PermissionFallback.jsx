import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';

export default function PermissionFallback({
  type = 'camera', // 'camera' | 'microphone'
  onGoBack,
  onRequestPermission,
  style,
}) {
  const isCamera = type === 'camera';

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  const titleHindi = isCamera
    ? 'कैमरा अनुमति आवश्यक है'
    : 'माइक्रोफ़ोन अनुमति आवश्यक है';
  const titleEnglish = isCamera
    ? 'Camera Permission Required'
    : 'Microphone Permission Required';

  const descHindi = isCamera
    ? 'शिल्पकला को आपके हस्तशिल्प की तस्वीरें लेने के लिए कैमरे की अनुमति की आवश्यकता है।'
    : 'शिल्पकला को आपकी मातृभाषा में शिल्प का विवरण और वॉयस जवाब रिकॉर्ड करने के लिए माइक की अनुमति चाहिए।';
  const descEnglish = isCamera
    ? 'ShilpKala needs camera access so you can photograph your authentic handcrafted products.'
    : 'ShilpKala needs microphone access to capture voice descriptions and record buyer voice responses.';

  return (
    <SafeAreaView style={[styles.safeArea, style]}>
      <View style={styles.container}>
        {/* Top Icon Halo */}
        <View style={styles.outerHalo}>
          <View style={styles.midHalo}>
            <View style={styles.innerCircle}>
              <Ionicons
                name={isCamera ? 'camera-outline' : 'mic-off-outline'}
                size={40}
                color={colors.primary.rust}
              />
            </View>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.titlePrimary}>{titleHindi}</Text>
        <Text style={styles.titleSecondary}>{titleEnglish}</Text>

        {/* Description */}
        <View style={styles.descCard}>
          <Text style={styles.descPrimary}>{descHindi}</Text>
          <Text style={styles.descSecondary}>{descEnglish}</Text>
        </View>

        {/* Settings Guidance Note */}
        <View style={styles.guidanceBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.navy.deep} />
          <Text style={styles.guidanceText}>
            सेटिंग्स में जाकर अनुमति चालू करें • Enable in device settings
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.btnRow}>
          <PrimaryButton
            title="सेटिंग्स खोलें · Open Settings"
            leadingIcon="settings-outline"
            onPress={handleOpenSettings}
            style={styles.primaryBtn}
          />

          {onRequestPermission && (
            <SecondaryButton
              title="पुनः अनुमति मांगें · Try Again"
              leadingIcon="refresh"
              onPress={onRequestPermission}
              style={styles.secondaryBtn}
            />
          )}

          {onGoBack && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onGoBack}
              style={styles.backLink}
            >
              <Ionicons name="arrow-back" size={16} color={colors.text.muted} />
              <Text style={styles.backLinkText}>वापस जाएं · Go Back</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.cream,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  outerHalo: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FFF5EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  midHalo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFE8DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: colors.surface.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary.rust,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  titlePrimary: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.navy.deep,
    textAlign: 'center',
    fontFamily: typography.fontFamilies?.body,
    marginBottom: 4,
  },
  titleSecondary: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
    fontFamily: typography.fontFamilies?.latin,
    marginBottom: 16,
  },
  descCard: {
    backgroundColor: colors.surface.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    marginBottom: 16,
    width: '100%',
  },
  descPrimary: {
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.navy.deep,
    textAlign: 'center',
    fontFamily: typography.fontFamilies?.devanagari,
  },
  descSecondary: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.text.muted,
    textAlign: 'center',
    fontFamily: typography.fontFamilies?.latin,
    fontStyle: 'italic',
    marginTop: 6,
  },
  guidanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3EFE9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 24,
  },
  guidanceText: {
    fontSize: 11.5,
    color: colors.navy.deep,
    fontWeight: '600',
    fontFamily: typography.fontFamilies?.body,
  },
  btnRow: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    width: '100%',
  },
  secondaryBtn: {
    width: '100%',
    borderColor: colors.navy.deep,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  backLinkText: {
    fontSize: 12.5,
    color: colors.text.muted,
    fontWeight: '600',
  },
});
