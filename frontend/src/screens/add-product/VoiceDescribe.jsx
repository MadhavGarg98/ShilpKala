import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import PrimaryButton from '../../components/PrimaryButton';
import StepFlowHeader from '../../components/StepFlowHeader';
import VoiceInputButton from '../../components/VoiceInputButton';
import PermissionFallback from '../../components/PermissionFallback';
import { streamVoiceTranscription } from '../../services/ai';
import { useTranslation } from '../../i18n';

export default function VoiceDescribe({ route, navigation }) {
  const imageUri =
    route?.params?.imageUri ||
    'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80';

  const [transcribedText, setTranscribedText] = useState('');
  const [isTypingMode, setIsTypingMode] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const stopStreamRef = useRef(null);
  const { t, currentLanguage } = useTranslation();

  const handleStartVoice = async () => {
    if (isStreaming) return;

    try {
      const { status, granted } = await requestRecordingPermissionsAsync();
      if (status !== 'granted' && !granted) {
        setMicDenied(true);
        return;
      }
    } catch (e) {
      // ignore on platforms without Audio permissions
    }

    setIsStreaming(true);
    setTranscribedText('');

    stopStreamRef.current = streamVoiceTranscription({
      onWord: (text) => {
        setTranscribedText(text);
      },
      onComplete: () => {
        setIsStreaming(false);
      },
    });
  };

  const handleClear = () => {
    if (stopStreamRef.current) stopStreamRef.current();
    setIsStreaming(false);
    setTranscribedText('');
  };

  const handleContinue = () => {
    navigation.navigate('ListingReview', {
      imageUri,
      transcript: transcribedText,
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
              <Image source={{ uri: imageUri }} style={styles.thumbnail} />
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
              onTranscribed={() => {}}
              style={styles.largeMic}
            />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleStartVoice}
              style={[
                styles.voiceTriggerBtn,
                isStreaming && styles.voiceTriggerBtnActive,
              ]}
            >
              <Ionicons
                name={isStreaming ? 'pulse' : 'mic'}
                size={18}
                color={colors.surface.white}
              />
              <Text style={styles.voiceTriggerText}>
                {isStreaming ? t('listeningWave') : 'बोलना शुरू करें / Tap to Speak'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Live Transcription Box */}
          <View style={styles.transcriptCard}>
            <View style={styles.transcriptHeader}>
              <View style={styles.transcriptBadgeRow}>
                <View
                  style={[
                    styles.pulseDot,
                    isStreaming && styles.pulseDotActive,
                  ]}
                />
                <Text style={styles.transcriptLabel}>
                  {t('liveTranscriptLabel')}
                </Text>
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
                placeholder="उदा. यह शुद्ध रेशम की साड़ी है..."
                placeholderTextColor={colors.text.muted}
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
                  : 'माइक दबाएं और अपनी भाषा में उत्पाद के बारे में बताएं। शब्द यहाँ लाइव दिखेंगे...'}
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
                ? 'माइक मोड पर वापस जाएं / Back to Voice'
                : `${t('typeInstead')} (Keyboard)`}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottomBar}>
          <PrimaryButton
            title={buttonTitle}
            arrow={true}
            disabled={!hasContent}
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
    backgroundColor: colors.status.amber,
  },
  voiceTriggerText: {
    color: colors.surface.white,
    fontSize: 14,
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
