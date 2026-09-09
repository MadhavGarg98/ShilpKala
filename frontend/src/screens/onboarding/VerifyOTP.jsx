import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
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
import { useTranslation } from '../../i18n';

export default function VerifyOTP({ route, navigation }) {
  const phone = route?.params?.phone || '9876543210';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);
  const { t, currentLanguage } = useTranslation();

  // Countdown timer
  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

  const handleOtpChange = (value, index) => {
    const cleanVal = value.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = cleanVal ? cleanVal[cleanVal.length - 1] : '';
    setOtp(newOtp);

    // Auto-advance to next box
    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVoiceFill = (spokenCode) => {
    const digits = (spokenCode.replace(/[^0-9]/g, '') || '123456').slice(0, 6).split('');
    const padded = [...digits, ...Array(6 - digits.length).fill('')];
    setOtp(padded);
  };

  const handleResend = () => {
    if (timer === 0) {
      setTimer(30);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleVerify = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigation.navigate('ProfileSetup');
    }, 800);
  };

  const buttonTitle =
    currentLanguage === 'en'
      ? 'Verify & Continue'
      : `${t('verifyAndContinue')} / Verify & Continue`;

  const otpLabelText =
    currentLanguage === 'en'
      ? '6-Digit Verification Code'
      : `${t('otpLabel')} / 6-Digit Code`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StepFlowHeader step={2} total={3} />

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
            <BilingualText txKey="verifyOtpTitle" size="headline" />
            <View style={styles.phoneBadgeRow}>
              <Text style={styles.sentToText}>+91 {phone}</Text>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.editPhoneBtn}
              >
                <Text style={styles.editText}>{t('editPhone')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Trust Card */}
          <View style={styles.trustCard}>
            <Ionicons
              name="lock-closed"
              size={20}
              color={colors.status.green}
              style={styles.trustCardIcon}
            />
            <View style={styles.trustCardTextCol}>
              <Text style={styles.trustCardTitle}>{t('trustCardTitle')}</Text>
              <Text style={styles.trustCardDesc}>{t('trustCardDesc')}</Text>
            </View>
          </View>

          {/* 6-box OTP Input */}
          <View style={styles.otpSection}>
            <Text style={styles.otpLabel}>{otpLabelText}</Text>
            <View style={styles.otpRow}>
              {otp.map((digit, idx) => (
                <TextInput
                  key={`otp-${idx}`}
                  ref={(ref) => (inputRefs.current[idx] = ref)}
                  style={[
                    styles.otpBox,
                    digit ? styles.otpBoxFilled : null,
                  ]}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(val) => handleOtpChange(val, idx)}
                  onKeyPress={(e) => handleKeyPress(e, idx)}
                  selectTextOnFocus
                />
              ))}
            </View>
          </View>

          {/* Voice-fill Option */}
          <View style={styles.voiceFillCard}>
            <VoiceInputButton
              size={42}
              mockText="123456"
              onTranscribed={handleVoiceFill}
            />
            <View style={styles.voiceFillInfo}>
              <Text style={styles.voiceFillPrimary}>{t('voiceFillTitle')}</Text>
              <Text style={styles.voiceFillSecondary}>{t('voiceFillDesc')}</Text>
            </View>
          </View>

          {/* Countdown timer & Resend */}
          <View style={styles.timerSection}>
            {timer > 0 ? (
              <View style={styles.timerRow}>
                <Ionicons name="time-outline" size={16} color={colors.text.muted} />
                <Text style={styles.timerText}>
                  {t('resendIn')} 00:{timer < 10 ? `0${timer}` : timer}s
                </Text>
              </View>
            ) : (
              <TouchableOpacity onPress={handleResend} style={styles.resendActiveBtn}>
                <Ionicons name="refresh" size={16} color={colors.primary.rust} />
                <Text style={styles.resendActiveText}>{t('resendOtp')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottomBar}>
          <PrimaryButton
            title={buttonTitle}
            arrow={true}
            loading={loading}
            onPress={handleVerify}
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
    marginBottom: 20,
  },
  phoneBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  sentToText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy.deep,
  },
  editPhoneBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#F3EDE2',
  },
  editText: {
    fontSize: 12,
    color: colors.primary.rust,
    fontWeight: '600',
  },
  trustCard: {
    flexDirection: 'row',
    backgroundColor: '#F0F7F2',
    borderWidth: 1,
    borderColor: '#C8E6D3',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  trustCardIcon: {
    marginRight: 10,
  },
  trustCardTextCol: {
    flex: 1,
  },
  trustCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.status.green,
  },
  trustCardDesc: {
    fontSize: 11,
    color: '#385945',
    marginTop: 2,
    lineHeight: 15,
  },
  otpSection: {
    marginBottom: 20,
  },
  otpLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy.deep,
    marginBottom: 12,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D8D1C5',
    backgroundColor: colors.surface.white,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: colors.navy.deep,
  },
  otpBoxFilled: {
    borderColor: colors.primary.rust,
    backgroundColor: '#FFF9F6',
  },
  voiceFillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.white,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    marginBottom: 20,
  },
  voiceFillInfo: {
    marginLeft: 10,
    flex: 1,
  },
  voiceFillPrimary: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy.deep,
  },
  voiceFillSecondary: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 2,
  },
  timerSection: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerText: {
    fontSize: 13,
    color: colors.text.muted,
  },
  resendActiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
  },
  resendActiveText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary.rust,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface.white,
    borderTopWidth: 1,
    borderTopColor: '#EFEAE2',
  },
});
