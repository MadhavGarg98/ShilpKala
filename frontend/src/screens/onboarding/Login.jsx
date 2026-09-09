import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import PrimaryButton from '../../components/PrimaryButton';
import BilingualText from '../../components/BilingualText';
import StepFlowHeader from '../../components/StepFlowHeader';
import VoiceInputButton from '../../components/VoiceInputButton';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n';

export default function Login({ navigation }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const updateArtisanProfile = useAppStore((state) => state.updateArtisanProfile);
  const { t, currentLanguage } = useTranslation();

  const handleVoiceTranscribe = (transcribedText) => {
    const cleaned = transcribedText.replace(/\D/g, '');
    const num = cleaned.length >= 10 ? cleaned.slice(-10) : '9876543210';
    setPhoneNumber(num);
    setErrorMsg('');
  };

  const handleGetOtp = () => {
    const finalPhone = phoneNumber.trim() || '9876543210';
    setLoading(true);
    setErrorMsg('');

    updateArtisanProfile({ phone: `+91 ${finalPhone}` });

    setTimeout(() => {
      setLoading(false);
      navigation.navigate('VerifyOTP', {
        phone: finalPhone,
      });
    }, 1000);
  };

  const buttonTitle =
    currentLanguage === 'en'
      ? 'Get OTP'
      : `${t('getOtp')} / Get OTP`;

  const inputLabel =
    currentLanguage === 'en'
      ? 'Mobile Number'
      : `${t('mobileNumberLabel')} / Mobile Number`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StepFlowHeader step={1} total={3} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Headline */}
          <View style={styles.headlineContainer}>
            <BilingualText txKey="loginTitle" size="headline" />
            <Text style={styles.helperText}>{t('loginSubtitle')}</Text>
          </View>

          {/* Phone Input Box with VoiceInputButton */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>{inputLabel}</Text>
            <View style={styles.phoneRow}>
              {/* Country Code */}
              <View style={styles.countryCodeBadge}>
                <Text style={styles.flag}>🇮🇳</Text>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>

              {/* Number Input */}
              <TextInput
                style={styles.textInput}
                placeholder={t('mobilePlaceholder')}
                placeholderTextColor={colors.text.muted}
                keyboardType="phone-pad"
                maxLength={10}
                value={phoneNumber}
                onChangeText={(text) => {
                  setPhoneNumber(text.replace(/[^0-9]/g, ''));
                  if (errorMsg) setErrorMsg('');
                }}
              />

              {/* Generic VoiceInputButton */}
              <VoiceInputButton
                size={44}
                mockText="9876543210"
                onTranscribed={handleVoiceTranscribe}
                style={styles.voiceBtn}
              />
            </View>
            <Text style={styles.voiceHint}>{t('tapMicToSpeak')}</Text>
            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
          </View>

          {/* Trust Badges */}
          <View style={styles.trustSection}>
            <Text style={styles.trustSectionTitle}>
              {t('protectionTitle')}
            </Text>

            <View style={styles.trustBadgeCard}>
              <View style={styles.trustIconCircle}>
                <Ionicons
                  name="shield-checkmark"
                  size={20}
                  color={colors.status.green}
                />
              </View>
              <View style={styles.trustTextCol}>
                <Text style={styles.trustPrimary}>{t('trust1Title')}</Text>
                <Text style={styles.trustSecondary}>{t('trust1Desc')}</Text>
              </View>
            </View>

            <View style={styles.trustBadgeCard}>
              <View style={styles.trustIconCircle}>
                <Ionicons
                  name="ribbon-outline"
                  size={20}
                  color={colors.primary.rust}
                />
              </View>
              <View style={styles.trustTextCol}>
                <Text style={styles.trustPrimary}>{t('trust2Title')}</Text>
                <Text style={styles.trustSecondary}>{t('trust2Desc')}</Text>
              </View>
            </View>

            <View style={styles.trustBadgeCard}>
              <View style={styles.trustIconCircle}>
                <Ionicons
                  name="cash-outline"
                  size={20}
                  color={colors.status.gold}
                />
              </View>
              <View style={styles.trustTextCol}>
                <Text style={styles.trustPrimary}>{t('trust3Title')}</Text>
                <Text style={styles.trustSecondary}>{t('trust3Desc')}</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottomBar}>
          <PrimaryButton
            title={buttonTitle}
            arrow={true}
            loading={loading}
            onPress={handleGetOtp}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.cream,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 24,
  },
  headlineContainer: {
    marginBottom: 24,
  },
  helperText: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 6,
    lineHeight: 18,
  },
  inputSection: {
    marginBottom: 28,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy.deep,
    marginBottom: 8,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2DBD0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: colors.navy.deep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: '#E2DBD0',
  },
  flag: {
    fontSize: 18,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy.deep,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 17,
    fontWeight: '600',
    color: colors.navy.deep,
    minHeight: 46,
  },
  voiceBtn: {
    marginLeft: 4,
  },
  voiceHint: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    color: colors.primary.rust,
    marginTop: 6,
  },
  trustSection: {
    marginTop: 10,
    gap: 12,
  },
  trustSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy.deep,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  trustBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.white,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  trustIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trustTextCol: {
    flex: 1,
  },
  trustPrimary: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy.deep,
  },
  trustSecondary: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 2,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface.white,
    borderTopWidth: 1,
    borderTopColor: '#EFEAE2',
  },
});
