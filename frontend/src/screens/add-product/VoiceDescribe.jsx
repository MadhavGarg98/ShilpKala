import React, { useState, useRef, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import PrimaryButton from '../../components/PrimaryButton';
import StepFlowHeader from '../../components/StepFlowHeader';
import VoiceInputButton from '../../components/VoiceInputButton';
import PermissionFallback from '../../components/PermissionFallback';
import { transcribeAudio } from '../../services/ai';
import { useTranslation } from '../../i18n';
import { resolveImageSource } from '../../utils/imageUtils';

export default function VoiceDescribe({ route, navigation }) {
  const imageUri =
    route?.params?.imageUri ||
    require('../../../assets/images/products/banarasi-saree.jpg');
  const initialText =
    route?.params?.initialDescription ||
    route?.params?.descriptionData?.description ||
    '';

  const [transcribedText, setTranscribedText] = useState(initialText);
  const [isTypingMode, setIsTypingMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [transcriptionSource, setTranscriptionSource] = useState(
    initialText ? 'vision_auto' : null
  );
  const [errorMessage, setErrorMessage] = useState(null);

  const { t, currentLanguage } = useTranslation();

  // Expo-audio recorder hook
  let audioRecorder = null;
  try {
    audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  } catch (e) {
    console.warn('[VoiceDescribe] useAudioRecorder unavailable on current platform:', e);
  }

  const handleToggleVoice = async () => {
    if (isProcessing) return;

    if (isRecording) {
      // Stop recording and send audio to backend
      console.log('[VoiceDescribe] Stopping audio recording...');
      setIsRecording(false);
      setIsProcessing(true);
      setErrorMessage(null);

      try {
        let recordedUri = null;
        if (audioRecorder && audioRecorder.stop) {
          await audioRecorder.stop();
          recordedUri = audioRecorder.uri;
          console.log('[VoiceDescribe] Audio recording stopped. File URI:', recordedUri);
        }

        console.log('[VoiceDescribe] Sending audio to /api/voice/transcribe with lang:', currentLanguage || 'hi-IN');
        const result = await transcribeAudio({
          audioUri: recordedUri,
          languageCode: currentLanguage || 'hi-IN',
          forceDemo: !recordedUri,
        });

        console.log('[VoiceDescribe] Transcription result received:', result);
        if (result?.transcript) {
          setTranscribedText((prev) =>
            prev && prev.trim() ? `${prev}\n${result.transcript}` : result.transcript
          );
          setTranscriptionSource(result.source || 'sarvam');
        }
      } catch (err) {
        setErrorMessage(`${t('transcriptionErrorPrefix')}${err.message || 'Connection failed'}`);
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Start recording
      console.log('[VoiceDescribe] Requesting microphone permission...');
      setErrorMessage(null);
      try {
        const perm = await requestRecordingPermissionsAsync();
        console.log('[VoiceDescribe] Microphone permission response:', perm);
        if (perm && perm.status !== 'granted' && !perm.granted) {
          console.warn('[VoiceDescribe] Microphone permission denied by user.');
          setMicDenied(true);
          return;
        }
      } catch (e) {
        console.warn('[VoiceDescribe] Permission check skipped or unsupported:', e);
      }

      try {
        if (audioRecorder && audioRecorder.prepareToRecordAsync) {
          console.log('[VoiceDescribe] Preparing recorder...');
          await audioRecorder.prepareToRecordAsync();
          console.log('[VoiceDescribe] Starting recorder...');
          audioRecorder.record();
          setIsRecording(true);
        } else {
          throw new Error('Audio hardware recorder not ready on this platform');
        }
      } catch (err) {
        console.warn('[VoiceDescribe] Native recorder error, attempting demo audio STT test:', err);
        setIsProcessing(true);
        try {
          const result = await transcribeAudio({
            audioUri: null,
            languageCode: currentLanguage || 'hi-IN',
            forceDemo: true,
          });
          setTranscribedText((prev) =>
            prev && prev.trim() ? `${prev}\n${result.transcript}` : result.transcript
          );
          setTranscriptionSource(result.source || 'demo_cache');
        } catch (e) {
          console.error('[VoiceDescribe] Recording fallback failed:', e);
          setErrorMessage(t('micUnavailable'));
          setIsTypingMode(true);
        } finally {
          setIsProcessing(false);
        }
      }
    }
  };

  const handleClear = () => {
    setIsRecording(false);
    setIsProcessing(false);
    setTranscribedText('');
    setTranscriptionSource(null);
    setErrorMessage(null);
  };

  const handleContinue = () => {
    navigation.navigate('ListingReview', {
      imageUri,
      transcript: transcribedText.trim(),
    });
  };

  const buttonTitle =
    currentLanguage === 'en'
      ? 'Review Listing'
      : `${t('continueToReview')} / Review Listing`;

  const hasContent = transcribedText.trim().length > 0;

  if (micDenied) {
    return (
      <PermissionFallback
        type="microphone"
        onRequestPermission={async () => {
          try {
            const { status, granted } = await requestRecordingPermissionsAsync();
            if (status === 'granted' || granted) setMicDenied(false);
          } catch (e) {}
        }}
        onGoBack={() => setMicDenied(false)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StepFlowHeader step={3} total={3} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Enhanced Thumbnail + Title Card */}
          <View style={styles.topInfoCard}>
            <View style={styles.thumbWrapper}>
              <Image source={resolveImageSource(imageUri)} style={styles.thumbnail} />
              <View style={styles.enhancedChip}>
                <Ionicons name="sparkles" size={10} color={colors.surface.white} />
                <Text style={styles.enhancedChipText}>{t('enhancedBadge')}</Text>
              </View>
            </View>

            <View style={styles.captionCol}>
              <Text style={styles.captionTitlePrimary}>
                {t('voiceDescribeTitle')}
              </Text>
              <Text style={styles.captionInstruction}>
                {t('voiceDescribeInstruction')}
              </Text>
            </View>
          </View>

          {/* Central Voice Recording Section */}
          <View style={styles.voiceSection}>
            <VoiceInputButton
              size={68}
              isRecording={isRecording}
              isProcessing={isProcessing}
              onPress={handleToggleVoice}
              style={styles.largeMic}
            />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleToggleVoice}
              disabled={isProcessing}
              style={[
                styles.voiceTriggerBtn,
                isRecording && styles.voiceTriggerBtnActive,
                isProcessing && styles.voiceTriggerBtnProcessing,
              ]}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={colors.surface.white} />
              ) : (
                <Ionicons
                  name={isRecording ? 'stop' : 'mic'}
                  size={18}
                  color={colors.surface.white}
                />
              )}
              <Text style={styles.voiceTriggerText}>
                {isProcessing
                  ? t('voiceTranscribing')
                  : isRecording
                  ? t('tapToFinish')
                  : t('tapToSpeakVoice')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Banner with Retry */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={colors.status.amber} />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
              <TouchableOpacity
                onPress={() => setIsTypingMode(true)}
                style={styles.errorActionBtn}
              >
                <Text style={styles.errorActionText}>{t('typeAction')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Live Transcription Box */}
          <View style={styles.transcriptCard}>
            <View style={styles.transcriptHeader}>
              <View style={styles.transcriptBadgeRow}>
                <View
                  style={[
                    styles.pulseDot,
                    isRecording && styles.pulseDotActive,
                  ]}
                />
                <Text style={styles.transcriptLabel}>
                  {isTypingMode ? t('writtenDescription') : t('liveTranscriptLabel')}
                </Text>
                {transcriptionSource && !isTypingMode && (
                  <View style={styles.sourceTag}>
                    <Text style={styles.sourceTagText}>
                      {transcriptionSource.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              {hasContent && (
                <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
                  <Ionicons name="trash-outline" size={14} color={colors.primary.rust} />
                  <Text style={styles.clearBtnText}>{t('clearAndRetry')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {isTypingMode ? (
              <TextInput
                style={styles.textEditor}
                multiline
                value={transcribedText}
                onChangeText={setTranscribedText}
                placeholder={t('voicePlaceholder')}
                placeholderTextColor={colors.text.muted}
                autoFocus
              />
            ) : (
              <Text
                style={[
                  styles.transcriptText,
                  !hasContent && styles.transcriptPlaceholder,
                ]}
              >
                {hasContent
                  ? transcribedText
                  : t('voiceDescriptionHint')}
              </Text>
            )}
          </View>

          {/* Fallback Switcher (Type Instead) */}
          <TouchableOpacity
            onPress={() => setIsTypingMode(!isTypingMode)}
            style={styles.typeInsteadBtn}
          >
            <Ionicons
              name={isTypingMode ? 'mic-outline' : 'keypad-outline'}
              size={16}
              color={colors.primary.rust}
            />
            <Text style={styles.typeInsteadText}>
              {isTypingMode
                ? t('backToVoice')
                : `${t('typeInstead')} (Keyboard)`}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottomBar}>
          <PrimaryButton
            title={buttonTitle}
            arrow={true}
            disabled={!hasContent || isProcessing}
            onPress={handleContinue}
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
    padding: 16,
    paddingBottom: 24,
  },
  topInfoCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface.white,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    alignItems: 'center',
    marginBottom: 20,
  },
  thumbWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  thumbnail: {
    width: 68,
    height: 68,
    borderRadius: 10,
    backgroundColor: '#F0EDE8',
  },
  enhancedChip: {
    position: 'absolute',
    bottom: -4,
    left: 4,
    right: 4,
    backgroundColor: colors.status.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 2,
    borderRadius: 4,
  },
  enhancedChipText: {
    color: colors.surface.white,
    fontSize: 9,
    fontWeight: '700',
  },
  captionCol: {
    flex: 1,
  },
  captionTitlePrimary: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
  },
  captionInstruction: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 4,
    lineHeight: 16,
  },
  voiceSection: {
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 16,
  },
  largeMic: {
    marginBottom: 14,
  },
  voiceTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary.rust,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: colors.primary.rust,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  voiceTriggerBtnActive: {
    backgroundColor: '#C53030',
  },
  voiceTriggerBtnProcessing: {
    backgroundColor: colors.navy.deep,
  },
  voiceTriggerText: {
    color: colors.surface.white,
    fontSize: 14,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF8F4',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F8D7C8',
    marginBottom: 12,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#8A320A',
  },
  errorActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.primary.rust,
  },
  errorActionText: {
    color: colors.surface.white,
    fontSize: 11,
    fontWeight: '700',
  },
  transcriptCard: {
    backgroundColor: colors.surface.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E8E3DA',
    minHeight: 120,
    marginBottom: 12,
  },
  transcriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F2EC',
  },
  transcriptBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  pulseDotActive: {
    backgroundColor: colors.primary.rust,
  },
  transcriptLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy.deep,
  },
  sourceTag: {
    backgroundColor: '#EBF5FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourceTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.navy.deep,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearBtnText: {
    fontSize: 11,
    color: colors.primary.rust,
    fontWeight: '600',
  },
  transcriptText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.navy.deep,
    fontWeight: '600',
  },
  transcriptPlaceholder: {
    color: colors.text.muted,
    fontStyle: 'italic',
    fontSize: 13,
  },
  textEditor: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.navy.deep,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeInsteadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  typeInsteadText: {
    fontSize: 13,
    color: colors.primary.rust,
    fontWeight: '700',
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface.white,
    borderTopWidth: 1,
    borderTopColor: '#EFEAE2',
  },
});
