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
import { useTranslation } from '../i18n';

export default function PermissionFallback({
  type = 'camera', // 'camera' | 'microphone'
  onGoBack,
  onRequestPermission,
  style,
}) {
  const { t, getSecondary } = useTranslation();
  const isCamera = type === 'camera';
  const scope = isCamera ? 'perm.camera' : 'perm.mic';

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

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
        <Text style={styles.titlePrimary}>{t(`${scope}.title`)}</Text>
        {getSecondary(`${scope}.title`) ? (
          <Text style={styles.titleSecondary}>{getSecondary(`${scope}.title`)}</Text>
        ) : null}

        {/* Description */}
        <View style={styles.descCard}>
          <Text style={styles.descPrimary}>{t(`${scope}.desc`)}</Text>
          {getSecondary(`${scope}.desc`) ? (
            <Text style={styles.descSecondary}>{getSecondary(`${scope}.desc`)}</Text>
          ) : null}
        </View>

        {/* Settings Guidance Note */}
        <View style={styles.guidanceBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.navy.deep} />
          <Text style={styles.guidanceText}>{t('perm.enableInSettings')}</Text>
        </View>

        {/* Buttons */}
        <View style={styles.btnRow}>
          <PrimaryButton
            title={t('perm.openSettings')}
            leadingIcon="settings-outline"
            onPress={handleOpenSettings}
            style={styles.primaryBtn}
          />

          {onRequestPermission && (
            <SecondaryButton
              title={t('perm.tryAgain')}
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
              <Text style={styles.backLinkText}>{t('perm.goBack')}</Text>
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
