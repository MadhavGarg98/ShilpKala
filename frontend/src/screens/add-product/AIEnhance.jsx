import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import PrimaryButton from '../../components/PrimaryButton';
import StepFlowHeader from '../../components/StepFlowHeader';
import { enhanceImage } from '../../services/ai';
import { useTranslation } from '../../i18n';
import { resolveImageSource } from '../../utils/imageUtils';

export default function AIEnhance({ route, navigation }) {
  const originalImageUri =
    route?.params?.imageUri ||
    require('../../../assets/images/products/banarasi-saree.jpg');

  const [finalImageUri, setFinalImageUri] = useState(originalImageUri);
  const [currentStep, setCurrentStep] = useState(1);
  const [percent, setPercent] = useState(0);
  const [statusKey, setStatusKey] = useState('enhancingImage');
  const [isDone, setIsDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const { t, currentLanguage } = useTranslation();

  useEffect(() => {
    let isMounted = true;

    async function runEnhancement() {
      setErrorMessage(null);
      setIsDone(false);
      setPercent(10);
      progressAnim.setValue(0.1);

      try {
        const result = await enhanceImage(originalImageUri, (step, pct, key) => {
          if (!isMounted) return;
          setCurrentStep(step);
          setPercent(pct);
          setStatusKey(key);

          Animated.timing(progressAnim, {
            toValue: pct / 100,
            duration: 350,
            useNativeDriver: false,
          }).start();
        });

        if (isMounted) {
          if (result?.enhancedUri) {
            setFinalImageUri(result.enhancedUri);
          }
          setIsDone(true);
          setStatusKey('aiEnhanceComplete');
        }
      } catch (err) {
        if (isMounted) {
          console.warn('[AIEnhance] Enhancement failed:', err);
          setErrorMessage(err?.message || 'Server connection timeout');
        }
      }
    }

    runEnhancement();

    return () => {
      isMounted = false;
    };
  }, [originalImageUri, retryCount]);

  const handleNext = () => {
    navigation.navigate('VoiceDescribe', {
      imageUri: finalImageUri,
      isEnhanced: isDone,
    });
  };

  const handleRetry = () => {
    setErrorMessage(null);
    setRetryCount((prev) => prev + 1);
  };

  const handleUseOriginal = () => {
    setFinalImageUri(originalImageUri);
    setIsDone(true);
    setErrorMessage(null);
  };

  const steps = [
    { id: 1, key: 'processingStep1', label: t('processingStep1') },
    { id: 2, key: 'processingStep2', label: t('processingStep2') },
    { id: 3, key: 'processingStep3', label: t('processingStep3') },
  ];

  const buttonTitle =
    currentLanguage === 'en'
      ? 'Describe with Voice'
      : `${t('continueToVoice')} / Describe with Voice`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StepFlowHeader
        step={2}
        total={3}
        title={`${t('aiStudioTitle')}`}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Image Preview Card with Enhanced Badge */}
        <View style={styles.imageCard}>
          <Image source={resolveImageSource(finalImageUri)} style={styles.imagePreview} />
          <View style={styles.badgeWrap}>
            <View
              style={[
                styles.liveTag,
                isDone ? styles.tagSuccess : (errorMessage ? styles.tagError : styles.tagProcessing),
              ]}
            >
              <Ionicons
                name={isDone ? 'sparkles' : (errorMessage ? 'alert-circle' : 'sync')}
                size={13}
                color={colors.surface.white}
              />
              <Text style={styles.liveTagText}>
                {isDone ? t('enhancedBadge') : (errorMessage ? 'Original' : `${percent}%`)}
              </Text>
            </View>
          </View>
        </View>

        {/* Error Banner with Retry & Bypass Options */}
        {errorMessage ? (
          <View style={styles.errorCard}>
            <View style={styles.errorHeader}>
              <Ionicons name="warning" size={20} color={colors.status.amber} />
              <Text style={styles.errorTitle}>
                फोटो सुधारने में समस्या • Enhancement Notice
              </Text>
            </View>
            <Text style={styles.errorDescription}>
              सर्वर से कनेक्ट नहीं हो सका ({errorMessage})। आप पुनः प्रयास कर सकते हैं या मूल फ़ोटो के साथ आगे बढ़ सकते हैं।
            </Text>
            <View style={styles.errorActionsRow}>
              <TouchableOpacity onPress={handleRetry} style={styles.retryBtn}>
                <Ionicons name="reload" size={14} color={colors.surface.white} />
                <Text style={styles.retryBtnText}>पुनः प्रयास करें / Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUseOriginal} style={styles.bypassBtn}>
                <Text style={styles.bypassBtnText}>मूल फ़ोटो रखें / Keep Original</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Progress Bar & Status Text */
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.statusTextPrimary}>{t(statusKey)}</Text>
              <Text style={styles.percentText}>{percent}%</Text>
            </View>

            <View style={styles.progressBarTrack}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* 3 Sequential Step Chips */}
        <View style={styles.chipsSection}>
          {steps.map((s) => {
            const stepDone = isDone || currentStep > s.id;
            const stepActive = !isDone && !errorMessage && currentStep === s.id;

            return (
              <View
                key={s.id}
                style={[
                  styles.stepChip,
                  stepDone && styles.chipDone,
                  stepActive && styles.chipActive,
                ]}
              >
                <View style={styles.chipIconSlot}>
                  {stepDone ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.status.green}
                    />
                  ) : stepActive ? (
                    <ActivityIndicator size="small" color={colors.primary.rust} />
                  ) : (
                    <View style={styles.pendingDot} />
                  )}
                </View>
                <Text
                  style={[
                    styles.chipText,
                    stepDone && styles.chipTextDone,
                    stepActive && styles.chipTextActive,
                  ]}
                >
                  {s.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Artisan Tip Banner */}
        <View style={styles.tipBanner}>
          <Ionicons name="bulb" size={18} color={colors.status.gold} />
          <Text style={styles.tipBannerText}>{t('tipBanner')}</Text>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <PrimaryButton
          title={buttonTitle}
          arrow={true}
          disabled={!isDone && !errorMessage}
          onPress={handleNext}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.cream,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  imageCard: {
    width: '100%',
    height: 280,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#F0EDE8',
    position: 'relative',
    shadowColor: colors.navy.deep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 18,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  badgeWrap: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tagProcessing: {
    backgroundColor: colors.navy.deep,
  },
  tagSuccess: {
    backgroundColor: colors.status.green,
  },
  tagError: {
    backgroundColor: colors.status.amber,
  },
  liveTagText: {
    color: colors.surface.white,
    fontSize: 11,
    fontWeight: '700',
  },
  errorCard: {
    backgroundColor: '#FFF8F4',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#F8D7C8',
    marginBottom: 16,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy.deep,
  },
  errorDescription: {
    fontSize: 12,
    color: colors.text.muted,
    lineHeight: 17,
    marginBottom: 12,
  },
  errorActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary.rust,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: colors.surface.white,
    fontSize: 12,
    fontWeight: '700',
  },
  bypassBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F0EDE8',
  },
  bypassBtnText: {
    color: colors.navy.deep,
    fontSize: 12,
    fontWeight: '600',
  },
  progressSection: {
    backgroundColor: colors.surface.white,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusTextPrimary: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy.deep,
  },
  percentText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary.rust,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F0EDE8',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary.rust,
    borderRadius: 4,
  },
  chipsSection: {
    gap: 10,
    marginBottom: 16,
  },
  stepChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  chipActive: {
    borderColor: colors.primary.rust,
    backgroundColor: '#FFF8F4',
  },
  chipDone: {
    borderColor: '#C8E6D3',
    backgroundColor: '#F3FAF5',
  },
  chipIconSlot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  pendingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D1D5DB',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.muted,
  },
  chipTextActive: {
    color: colors.primary.rust,
    fontWeight: '700',
  },
  chipTextDone: {
    color: colors.navy.deep,
    fontWeight: '700',
  },
  tipBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFDF9',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFE1CE',
  },
  tipBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#6A5638',
    lineHeight: 17,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface.white,
    borderTopWidth: 1,
    borderTopColor: '#EFEAE2',
  },
});
