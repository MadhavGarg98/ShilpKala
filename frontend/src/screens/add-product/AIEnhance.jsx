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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import PrimaryButton from '../../components/PrimaryButton';
import StepFlowHeader from '../../components/StepFlowHeader';
import { enhanceImage } from '../../services/ai';
import { useTranslation } from '../../i18n';

export default function AIEnhance({ route, navigation }) {
  const imageUri =
    route?.params?.imageUri ||
    'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80';

  const [currentStep, setCurrentStep] = useState(1);
  const [percent, setPercent] = useState(0);
  const [statusKey, setStatusKey] = useState('enhancingImage');
  const [isDone, setIsDone] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const { t, currentLanguage } = useTranslation();

  useEffect(() => {
    let isMounted = true;

    async function runEnhancement() {
      try {
        await enhanceImage(imageUri, (step, pct, key) => {
          if (!isMounted) return;
          setCurrentStep(step);
          setPercent(pct);
          setStatusKey(key);

          Animated.timing(progressAnim, {
            toValue: pct / 100,
            duration: 400,
            useNativeDriver: false,
          }).start();
        });

        if (isMounted) {
          setIsDone(true);
          setStatusKey('aiEnhanceComplete');
        }
      } catch (err) {
        console.error('Enhancement error', err);
      }
    }

    runEnhancement();

    return () => {
      isMounted = false;
    };
  }, [imageUri]);

  const handleNext = () => {
    navigation.navigate('VoiceDescribe', {
      imageUri,
      isEnhanced: true,
    });
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
          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          <View style={styles.badgeWrap}>
            <View
              style={[
                styles.liveTag,
                isDone ? styles.tagSuccess : styles.tagProcessing,
              ]}
            >
              <Ionicons
                name={isDone ? 'sparkles' : 'sync'}
                size={13}
                color={colors.surface.white}
              />
              <Text style={styles.liveTagText}>
                {isDone ? t('enhancedBadge') : `${percent}%`}
              </Text>
            </View>
          </View>
        </View>

        {/* Progress Bar & Status Text */}
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

        {/* 3 Sequential Step Chips */}
        <View style={styles.chipsSection}>
          {steps.map((s) => {
            const stepDone = isDone || currentStep > s.id;
            const stepActive = !isDone && currentStep === s.id;

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
          disabled={!isDone}
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
  liveTagText: {
    color: colors.surface.white,
    fontSize: 11,
    fontWeight: '700',
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
