import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import FocusModeHeader from '../../components/FocusModeHeader';
import AudioPlayerInline from '../../components/AudioPlayerInline';
import PrimaryButton from '../../components/PrimaryButton';
import { useTranslation } from '../../i18n';

export default function InquiryThread({ route, navigation }) {
  const { inquiry } = route?.params || {};
  const { t, currentLanguage } = useTranslation();
  const [selectedChip, setSelectedChip] = useState(null);

  const productTitle =
    currentLanguage === 'en'
      ? inquiry?.productTitleEnglish || inquiry?.productTitleHindi || 'Handcrafted Craft'
      : inquiry?.productTitleHindi || inquiry?.productTitleEnglish || 'हस्तशिल्प उत्पाद';

  const suggestedReplies = inquiry?.suggestedReplies || [
    'हाँ, यह उत्पाद उपलब्ध है (Yes, available)',
    'थोक मूल्य पर छूट संभव है (Wholesale discount available)',
    'आधिकारिक GI प्रमाण पत्र शामिल है (GI certificate included)',
    'तैयार होने में 15 दिन लगेंगे (15 days crafting timeline)',
  ];

  const handleVoiceReply = () => {
    navigation.navigate('VoiceReply', {
      inquiry,
      selectedReply: selectedChip,
    });
  };

  const handleTextFallback = () => {
    Alert.alert(
      t('textReplyFallback'),
      currentLanguage === 'en'
        ? 'Voice reply is the recommended fast flow for artisans. Opening voice response studio...'
        : 'कारीगरों के लिए आवाज़ से जवाब देना सबसे तेज़ और आसान तरीका है। वॉयस स्टूडियो खोला जा रहा है...',
      [
        {
          text: 'OK',
          onPress: handleVoiceReply,
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. FocusModeHeader with Buyer Name */}
      <FocusModeHeader
        title={inquiry?.buyerName || 'Buyer Inquiry'}
        subtitle={inquiry?.buyerCompany || ''}
        navigation={navigation}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Top Product-Context Card */}
        <View style={styles.productCard}>
          <Image
            source={{ uri: inquiry?.productImageUrl }}
            style={styles.productImage}
          />
          <View style={styles.productDetails}>
            <View style={styles.categoryRow}>
              <Text style={styles.craftTypeTag}>{inquiry?.craftType || 'Artisan Craft'}</Text>
              {inquiry?.isGiCertified && (
                <View style={styles.giBadge}>
                  <Ionicons name="ribbon" size={11} color={colors.surface.white} />
                  <Text style={styles.giBadgeText}>GI Certified</Text>
                </View>
              )}
            </View>
            <Text style={styles.productName} numberOfLines={2}>
              {productTitle}
            </Text>
            <Text style={styles.productPrice}>
              ₹{(inquiry?.productPrice || 0).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* 3. Original English Message Bubble (Plain Gray) */}
        <View style={styles.messageBubbleWrapper}>
          <View style={styles.bubbleHeaderRow}>
            <Image
              source={{ uri: inquiry?.buyerAvatar }}
              style={styles.avatarMini}
            />
            <Text style={styles.bubbleSenderName}>{inquiry?.buyerName}</Text>
            <Text style={styles.originalTag}>
              {t('originalMessage')}
            </Text>
          </View>

          <View style={styles.originalBubble}>
            <Text style={styles.originalMessageText}>
              {inquiry?.messageOriginal}
            </Text>
            <Text style={styles.bubbleTimestamp}>{inquiry?.timestamp}</Text>
          </View>
        </View>

        {/* 4. AI-Translated Hindi Bubble (Visually distinct: tinted cream/orange + rust left border) */}
        <View style={styles.messageBubbleWrapper}>
          <View style={styles.bubbleHeaderRow}>
            <View style={styles.aiIconBadge}>
              <Ionicons name="sparkles" size={12} color={colors.primary.rust} />
            </View>
            <Text style={styles.aiSenderLabel}>
              {t('aiTranslation')}
            </Text>
          </View>

          <View style={styles.translatedBubble}>
            <Text style={styles.translatedMessageText}>
              {inquiry?.messageHindi}
            </Text>

            {/* Embedded AudioPlayerInline inside the translated bubble */}
            <AudioPlayerInline
              textToSpeak={inquiry?.messageHindi}
              language="hi-IN"
              label="हिंदी में सुनें · Listen in Hindi"
              playingLabel="ऑडियो चल रहा है... · Playing..."
              variant="bubble"
            />
          </View>
        </View>

        {/* 5. Suggested Quick Reply Chips */}
        <View style={styles.quickRepliesSection}>
          <View style={styles.quickRepliesHeader}>
            <Ionicons name="flash-outline" size={14} color={colors.primary.rust} />
            <Text style={styles.quickRepliesTitle}>
              {t('quickReplies')}
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {suggestedReplies.map((chip, idx) => {
              const isSelected = selectedChip === chip;
              return (
                <TouchableOpacity
                  key={`chip-${idx}`}
                  activeOpacity={0.8}
                  onPress={() => setSelectedChip(isSelected ? null : chip)}
                  style={[
                    styles.replyChip,
                    isSelected && styles.replyChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.replyChipText,
                      isSelected && styles.replyChipTextSelected,
                    ]}
                  >
                    {chip}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>

      {/* 6. Bottom Docked CTA Bar: Large Voice Reply PrimaryButton + Text fallback */}
      <View style={styles.bottomBar}>
        <View style={styles.primaryBtnFlex}>
          <PrimaryButton
            title={t('voiceReplyCTA')}
            leadingIcon="mic"
            arrow={true}
            onPress={handleVoiceReply}
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleTextFallback}
          style={styles.textFallbackBtn}
        >
          <Ionicons name="chatbox-ellipses-outline" size={22} color={colors.navy.deep} />
        </TouchableOpacity>
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
    paddingBottom: 110,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    gap: 12,
    marginBottom: 20,
    shadowColor: colors.navy.deep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#EAE6DF',
  },
  productDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  craftTypeTag: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.muted,
    textTransform: 'uppercase',
  },
  giBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.gold,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    gap: 3,
  },
  giBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.surface.white,
  },
  productName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy.deep,
    lineHeight: 18,
    fontFamily: typography.fontFamilies?.body,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary.rust,
    marginTop: 3,
  },
  messageBubbleWrapper: {
    marginBottom: 16,
  },
  bubbleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  avatarMini: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  bubbleSenderName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
  },
  originalTag: {
    fontSize: 11,
    color: colors.text.muted,
    fontFamily: typography.fontFamilies?.latin,
    marginLeft: 'auto',
  },
  originalBubble: {
    backgroundColor: '#F0ECE6',
    borderWidth: 1,
    borderColor: '#E3DDD4',
    borderRadius: 14,
    borderTopLeftRadius: 4,
    padding: 14,
  },
  originalMessageText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.latin,
  },
  bubbleTimestamp: {
    fontSize: 10,
    color: colors.text.muted,
    marginTop: 6,
    textAlign: 'right',
  },
  aiIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiSenderLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary.rust,
    fontFamily: typography.fontFamilies?.body,
  },
  translatedBubble: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#F8D8C2',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary.rust,
    borderRadius: 14,
    borderTopLeftRadius: 4,
    padding: 14,
  },
  translatedMessageText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 23,
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.devanagari,
  },
  quickRepliesSection: {
    marginTop: 10,
  },
  quickRepliesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  quickRepliesTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
  },
  chipsScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  replyChip: {
    backgroundColor: colors.surface.white,
    borderWidth: 1,
    borderColor: '#D8D2C8',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 240,
  },
  replyChipSelected: {
    backgroundColor: colors.navy.deep,
    borderColor: colors.navy.deep,
  },
  replyChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
  },
  replyChipTextSelected: {
    color: colors.surface.white,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: colors.navy.deep,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  primaryBtnFlex: {
    flex: 1,
  },
  textFallbackBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D8D2C8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.white,
  },
});
