import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import FocusModeHeader from '../../components/FocusModeHeader';
import VoiceInputButton from '../../components/VoiceInputButton';
import PrimaryButton from '../../components/PrimaryButton';
import { useTranslation } from '../../i18n';
import { resolveImageSource } from '../../utils/imageUtils';

export default function VoiceReply({ route, navigation }) {
  const { inquiry, selectedReply } = route?.params || {};
  const { t, currentLanguage } = useTranslation();

  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [hasCaptured, setHasCaptured] = useState(false);

  // Blinking cursor animation for live-cursor feel
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cursorLoop;
    if (hasCaptured) {
      cursorLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(cursorOpacity, { toValue: 0, duration: 450, useNativeDriver: true }),
          Animated.timing(cursorOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        ])
      );
      cursorLoop.start();
    }
    return () => {
      if (cursorLoop) cursorLoop.stop();
    };
  }, [hasCaptured]);

  // Seed response text if a quick-reply chip was selected, or use default mock transcription
  const mockHindiResponse =
    selectedReply ||
    (inquiry?.isBulk
      ? `नमस्ते ${inquiry?.buyerName || ''}, हम 50 पीस का पूरा बैच 25 दिनों में तैयार कर सकते हैं। थोक छूट के साथ ₹5,800 प्रति पीस रहेगा।`
      : inquiry?.isGiQuery
      ? `नमस्ते ${inquiry?.buyerName || ''}, हमारी हर साड़ी पर भारत सरकार का आधिकारिक GI-IN-99 टैग और क्यूआर कोड उपलब्ध है।`
      : `नमस्ते ${inquiry?.buyerName || ''}, आपकी रुचि के लिए धन्यवाद। हम आपके ऑर्डर के लिए सभी विवरण तुरंत उपलब्ध करा रहे हैं।`);

  const handleTranscribed = (text) => {
    setIsRecording(false);
    setTranscribedText(text || mockHindiResponse);
    setHasCaptured(true);
  };

  const handleRetry = () => {
    setHasCaptured(false);
    setTranscribedText('');
    setIsRecording(false);
  };

  const handlePreviewEnglish = () => {
    navigation.navigate('ReplyPreview', {
      inquiry,
      transcribedHindi: transcribedText || mockHindiResponse,
    });
  };

  const buyerName = inquiry?.buyerName || 'Buyer';
  const headerTitle = `${t('replyingTo')}: ${buyerName}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. FocusModeHeader with dynamic title */}
      <FocusModeHeader
        title={headerTitle}
        subtitle={t('responseMode')}
        navigation={navigation}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Small Context Card */}
        <View style={styles.contextCard}>
          <Image
            source={resolveImageSource(inquiry?.buyerAvatar)}
            style={styles.buyerAvatar}
          />
          <View style={styles.contextMeta}>
            <Text style={styles.contextBuyerName}>{buyerName}</Text>
            <Text style={styles.contextCompany} numberOfLines={1}>
              {inquiry?.buyerCompany}
            </Text>
          </View>
          <View style={styles.productMiniTag}>
            <Image
              source={resolveImageSource(inquiry?.productImageUrl || inquiry?.productImage)}
              style={styles.productMiniImage}
            />
            <Text style={styles.productMiniPrice}>
              ₹{(inquiry?.productPrice || 0).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* 3. Center Voice Recording Section */}
        <View style={styles.voiceSection}>
          <Text style={styles.micInstructionText}>
            {hasCaptured
              ? t('speechCaptured')
              : t('micInstruction')}
          </Text>

          {/* Large Central Mic Button (scaled up to size 92) */}
          <View style={styles.micButtonContainer}>
            <VoiceInputButton
              size={92}
              mockText={mockHindiResponse}
              delayMs={2200}
              onTranscribed={handleTranscribed}
            />
          </View>

          {/* Status Pill */}
          <View style={styles.statusPillWrapper}>
            <View style={styles.statusPill}>
              <View
                style={[
                  styles.statusDot,
                  hasCaptured ? styles.statusDotGreen : styles.statusDotOrange,
                ]}
              />
              <Text style={styles.statusPillText}>
                {hasCaptured
                  ? 'रिकॉर्डिंग पूर्ण · Voice Captured'
                  : 'माइक दबाकर बोलें · Tap Mic to Speak'}
              </Text>
            </View>
          </View>
        </View>

        {/* 4. Speech Captured Card (with live-cursor feel) */}
        {hasCaptured ? (
          <View style={styles.capturedCard}>
            <View style={styles.capturedHeaderRow}>
              <View style={styles.capturedLabelGroup}>
                <Ionicons name="mic" size={16} color={colors.primary.rust} />
                <Text style={styles.capturedTitle}>{t('speechCaptured')}</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleRetry}
                style={styles.retryBtn}
              >
                <Ionicons name="refresh" size={14} color={colors.text.muted} />
                <Text style={styles.retryBtnText}>{t('retrySpeech')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.transcriptionBody}>
              <Text style={styles.transcribedText}>
                {transcribedText}
                <Animated.Text style={[styles.cursor, { opacity: cursorOpacity }]}>
                  |
                </Animated.Text>
              </Text>
            </View>
          </View>
        ) : null}

        {/* 5. Subtle Info Banner */}
        <View style={styles.aiInfoBanner}>
          <Ionicons name="sparkles" size={18} color={colors.primary.rust} />
          <View style={styles.aiInfoTextCol}>
            <Text style={styles.aiInfoTitle}>{t('aiTranslatorBanner')}</Text>
            <Text style={styles.aiInfoDesc}>{t('aiTranslatorExplainer')}</Text>
          </View>
        </View>
      </ScrollView>

      {/* 6. Bottom Docked CTA */}
      <View style={styles.bottomBar}>
        <PrimaryButton
          title={t('previewEnglishReply')}
          arrow={true}
          disabled={!hasCaptured}
          onPress={handlePreviewEnglish}
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
    paddingBottom: 100,
  },
  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    gap: 10,
    marginBottom: 24,
  },
  buyerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EAE6DF',
  },
  contextMeta: {
    flex: 1,
  },
  contextBuyerName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
  },
  contextCompany: {
    fontSize: 11,
    color: colors.text.muted,
    fontFamily: typography.fontFamilies?.latin,
  },
  productMiniTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F5F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  productMiniImage: {
    width: 22,
    height: 22,
    borderRadius: 4,
  },
  productMiniPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary.rust,
  },
  voiceSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  micInstructionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy.deep,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: typography.fontFamilies?.body,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  micButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  statusPillWrapper: {
    marginTop: 18,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECE8E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 7,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotOrange: {
    backgroundColor: colors.primary.rust,
  },
  statusDotGreen: {
    backgroundColor: colors.status.green,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
  },
  capturedCard: {
    backgroundColor: colors.surface.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    marginTop: 16,
    marginBottom: 16,
    shadowColor: colors.navy.deep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  capturedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFE9',
  },
  capturedLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  capturedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary.rust,
    fontFamily: typography.fontFamilies?.body,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F3EFE9',
  },
  retryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.muted,
  },
  transcriptionBody: {
    paddingVertical: 4,
  },
  transcribedText: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.devanagari,
  },
  cursor: {
    color: colors.primary.rust,
    fontWeight: '900',
    fontSize: 16,
  },
  aiInfoBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#F8D8C2',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    alignItems: 'flex-start',
    marginTop: 12,
  },
  aiInfoTextCol: {
    flex: 1,
  },
  aiInfoTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary.rust,
    marginBottom: 2,
    fontFamily: typography.fontFamilies?.body,
  },
  aiInfoDesc: {
    fontSize: 11.5,
    color: '#8A320A',
    lineHeight: 16,
    fontFamily: typography.fontFamilies?.body,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface.white,
    borderTopWidth: 1,
    borderTopColor: '#EFEAE2',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    shadowColor: colors.navy.deep,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
});
