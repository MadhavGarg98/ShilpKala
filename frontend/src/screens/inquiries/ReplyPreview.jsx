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
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import FocusModeHeader from '../../components/FocusModeHeader';
import AudioPlayerInline from '../../components/AudioPlayerInline';
import PrimaryButton from '../../components/PrimaryButton';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n';
import { resolveImageSource } from '../../utils/imageUtils';

export default function ReplyPreview({ route, navigation }) {
  const { inquiry, transcribedHindi } = route?.params || {};
  const { t, currentLanguage } = useTranslation();
  const updateInquiryStatus = useAppStore((state) => state.updateInquiryStatus);
  const artisanProfile = useAppStore((state) => state.artisanProfile);

  const [showOriginalHindi, setShowOriginalHindi] = useState(false);
  const [sending, setSending] = useState(false);

  const buyerName = inquiry?.buyerName || 'Buyer';
  const buyerCompany = inquiry?.buyerCompany || 'Studio';
  const buyerEmail = `${buyerName.toLowerCase().replace(/\s+/g, '.')}@${buyerCompany
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 10)}.com`;

  const productTitle =
    t(inquiry?.productTitleKey) ||
    (currentLanguage === 'en'
      ? inquiry?.productTitleEnglish || inquiry?.productTitleHindi || 'Handcrafted Product'
      : inquiry?.productTitleHindi || inquiry?.productTitleEnglish || 'हस्तशिल्प उत्पाद');

  // Professional English reply text
  const englishReplyBody =
    inquiry?.mockEnglishReply ||
    `Dear ${buyerName},\n\nThank you for your interest in our ${productTitle}.\n\nWe would be pleased to fulfill your order. Every piece is handcrafted with traditional techniques and authentic materials. Production timeline is **15 to 20 business days**.\n\nWarm regards,\n${
      artisanProfile?.name || 'Ram Niwas'
    }\n${artisanProfile?.craftType || 'Master Artisan'}`;

  const handleSendReply = async () => {
    setSending(true);

    // Trigger haptic feedback
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      // Haptics fallback on web/unsupported
    }

    // Simulate sending network latency
    await new Promise((res) => setTimeout(res, 900));

    // Update Zustand store globally so list reflects 'replied' status
    if (inquiry?.id) {
      updateInquiryStatus(inquiry.id, 'replied');
    }

    setSending(false);

    Alert.alert(
      t('replySuccessTitle'),
      t('replySuccessToast'),
      [
        {
          text: 'OK',
          onPress: () => {
            // Pop back to InquiriesList
            navigation.popToTop();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. FocusModeHeader */}
      <FocusModeHeader
        title={t('replyPreviewHeader')}
        subtitle="सत्यापित अंग्रेजी प्रारूप · Verified Draft"
        navigation={navigation}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Status Badge + Audio Player Header Row */}
        <View style={styles.topStatusRow}>
          <View style={styles.verifiedDraftBadge}>
            <Ionicons name="shield-checkmark" size={14} color={colors.status.green} />
            <Text style={styles.verifiedDraftText}>
              {t('verifiedDraft')}
            </Text>
          </View>

          <AudioPlayerInline
            textToSpeak={englishReplyBody.replace(/\*\*/g, '')}
            language="en-US"
            label={t('listenToDraft')}
            variant="compact"
          />
        </View>

        {/* 3. Product & Buyer Context Card Repeated */}
        <View style={styles.contextCard}>
          <Image
            source={resolveImageSource(inquiry?.buyerAvatar)}
            style={styles.avatar}
          />
          <View style={styles.contextCol}>
            <Text style={styles.contextName}>{buyerName}</Text>
            <Text style={styles.contextCompany}>{buyerCompany}</Text>
          </View>
          <View style={styles.productPill}>
            <Image
              source={resolveImageSource(inquiry?.productImageUrl || inquiry?.productImage)}
              style={styles.productThumb}
            />
            <Text style={styles.productPillPrice}>
              ₹{(inquiry?.productPrice || 0).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* 4. AI Translated Badge Notice */}
        <View style={styles.aiBadgeStrip}>
          <Ionicons name="sparkles" size={14} color={colors.primary.rust} />
          <Text style={styles.aiBadgeText}>
            {t('aiPolishedBadge')}
          </Text>
        </View>

        {/* 5. Email-Style Preview Card */}
        <View style={styles.emailCard}>
          {/* Header Lines */}
          <View style={styles.emailHeaderRow}>
            <Text style={styles.emailFieldLabel}>{t('emailTo')}:</Text>
            <Text style={styles.emailFieldValue} numberOfLines={1}>
              {buyerName} &lt;{buyerEmail}&gt;
            </Text>
          </View>

          <View style={styles.emailHeaderRow}>
            <Text style={styles.emailFieldLabel}>{t('emailSubject')}:</Text>
            <Text style={styles.emailFieldValue} numberOfLines={1}>
              Re: Inquiry regarding {productTitle}
            </Text>
          </View>

          <View style={styles.emailDivider} />

          {/* Email Body with bold specs highlight */}
          <View style={styles.emailBody}>
            <Text style={styles.bodyParagraph}>
              {englishReplyBody.split('\n\n').map((paragraph, pIdx) => (
                <Text key={`p-${pIdx}`}>
                  {paragraph}
                  {pIdx < englishReplyBody.split('\n\n').length - 1 ? '\n\n' : ''}
                </Text>
              ))}
            </Text>
          </View>
        </View>

        {/* 6. Collapsible Original Hindi Section */}
        <View style={styles.accordionContainer}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowOriginalHindi(!showOriginalHindi)}
            style={styles.accordionToggle}
          >
            <Ionicons
              name={showOriginalHindi ? 'chevron-down' : 'chevron-forward'}
              size={18}
              color={colors.navy.deep}
            />
            <Text style={styles.accordionToggleText}>
              {showOriginalHindi ? t('hideOriginalHindi') : t('viewOriginalHindi')}
            </Text>
          </TouchableOpacity>

          {showOriginalHindi ? (
            <View style={styles.accordionContent}>
              <Text style={styles.originalHindiText}>
                {transcribedHindi || inquiry?.messageHindi || 'हिंदी आवाज़ प्रारूप उपलब्ध नहीं है।'}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* 7. Bottom Docked Send Reply CTA */}
      <View style={styles.bottomBar}>
        <PrimaryButton
          title={t('sendReplyCTA')}
          arrow={!sending}
          loading={sending}
          leadingIcon="paper-plane-outline"
          onPress={handleSendReply}
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
    paddingBottom: 110,
  },
  topStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  verifiedDraftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#C6E7D0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 5,
  },
  verifiedDraftText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.status.green,
    fontFamily: typography.fontFamilies?.body,
  },
  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.white,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    gap: 10,
    marginBottom: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EAE6DF',
  },
  contextCol: {
    flex: 1,
  },
  contextName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
  },
  contextCompany: {
    fontSize: 11,
    color: colors.text.muted,
    fontFamily: typography.fontFamilies?.latin,
  },
  productPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F5F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  productThumb: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  productPillPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary.rust,
  },
  aiBadgeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#F8D8C2',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 8,
    marginBottom: 14,
  },
  aiBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary.rust,
    fontFamily: typography.fontFamilies?.body,
  },
  emailCard: {
    backgroundColor: colors.surface.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    marginBottom: 14,
    shadowColor: colors.navy.deep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  emailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    gap: 8,
  },
  emailFieldLabel: {
    width: 60,
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.muted,
    fontFamily: typography.fontFamilies?.latin,
  },
  emailFieldValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.latin,
  },
  emailDivider: {
    height: 1,
    backgroundColor: '#EFEAE2',
    marginVertical: 10,
  },
  emailBody: {
    paddingVertical: 6,
  },
  bodyParagraph: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.latin,
  },
  accordionContainer: {
    backgroundColor: colors.surface.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    overflow: 'hidden',
    marginBottom: 16,
  },
  accordionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    backgroundColor: '#FAF8F5',
  },
  accordionToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
  },
  accordionContent: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#EFEAE2',
    backgroundColor: colors.surface.white,
  },
  originalHindiText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.devanagari,
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
