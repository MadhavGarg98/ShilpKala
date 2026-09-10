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
import PrimaryButton from '../../components/PrimaryButton';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n';
import { resolveImageSource } from '../../utils/imageUtils';

export default function BuyerPreview({ route, navigation, onClose, productData, imageUri }) {
  const params = route?.params || {};
  const effectiveProduct = productData || params.productData || {};
  const effectiveImageUri =
    imageUri ||
    params.imageUri ||
    effectiveProduct.imageUrl ||
    require('../../../assets/images/products/banarasi-saree.jpg');

  const { t, currentLanguage } = useTranslation();
  const addInquiry = useAppStore((state) => state.addInquiry);
  const artisanProfile = useAppStore((state) => state.artisanProfile);
  const [inquiryCreated, setInquiryCreated] = useState(false);

  const price = effectiveProduct.price || 6400;
  const title =
    t(effectiveProduct.titleKey) ||
    (currentLanguage === 'en'
      ? effectiveProduct.titleEnglish || effectiveProduct.title || 'Handcrafted Artisan Craft'
      : effectiveProduct.titleHindi || effectiveProduct.title || 'हस्तनिर्मित शिल्प');
  const description =
    t(effectiveProduct.descriptionKey) ||
    (currentLanguage === 'en'
      ? effectiveProduct.descriptionEnglish || effectiveProduct.description || 'Authentic handcrafted heritage item made directly by master artisans with zero middlemen.'
      : effectiveProduct.descriptionHindi || effectiveProduct.description || 'मास्टर कारीगरों द्वारा बिना किसी बिचौलिए के सीधे बनाया गया प्रामाणिक हस्तशिल्प।');

  const handleContactArtisan = () => {
    // 1. Create realistic mock inquiry referencing this exact product in Zustand store
    const newInquiry = {
      id: `inq-${Date.now()}`,
      productId: effectiveProduct.id || 'p-new',
      productTitleKey: effectiveProduct.titleKey,
      productTitleHindi: effectiveProduct.titleHindi || effectiveProduct.title || title,
      productTitleEnglish: effectiveProduct.titleEnglish || effectiveProduct.title || title,
      productPrice: price,
      productImageUrl: effectiveImageUri,
      craftType: effectiveProduct.craftType || 'Handloom Weaving',
      isGiCertified: effectiveProduct.isGiMatch || effectiveProduct.isGiCertified || true,
      buyerName: 'Sophie Laurent',
      buyerCompany: "Galerie d'Artisan, Paris",
      buyerAvatar: require('../../../assets/images/avatars/elena.jpg'),
      timestamp: 'अभी-अभी · Just now',
      status: 'unread',
      messageOriginal: `Hello! I discovered your newly published ${effectiveProduct.titleEnglish || title} on ShilpKala and would love to inquire about procuring 15 pieces for our boutique in Paris. Could you provide wholesale lead time and pricing?`,
      messageHindi: `नमस्ते! मैंने शिल्पकला पर आपका नया प्रकाशित उत्पाद देखा और हम अपने पेरिस बुटीक के लिए 15 पीस मंगवाने के बारे में पूछताछ करना चाहते हैं। क्या आप थोक समय और मूल्य विवरण साझा कर सकते हैं?`,
      isBulk: true,
      bulkQuantity: 15,
      bulkEstimatedValue: price * 15,
      isGiQuery: false,
      tagHindi: 'थोक पूछताछ',
      tagEnglish: 'Bulk Inquiry',
      suggestedReplies: [
        'हाँ, 15 पीस तैयार कर सकते हैं (Yes, can prepare 15 pieces)',
        'पेरिस डिलीवरी 20 दिनों में संभव (Paris shipping in 20 days)',
        'थोक छूट के साथ विशेष दर (Special wholesale discounted rate)',
      ],
      mockEnglishReply: `Dear Sophie,\n\nThank you for your inquiry from Galerie d'Artisan, Paris. We can handcraft and ship **15 pieces** of the ${effectiveProduct.titleEnglish || title}.\n\nFor 15 units, our wholesale timeline is **20 business days** with authentic artisan mark and export packaging.\n\nWarm regards,\n${artisanProfile?.name || 'Ram Niwas'}\n${artisanProfile?.craftType || 'Master Artisan'}`,
    };

    addInquiry(newInquiry);
    setInquiryCreated(true);

    // 2. Realistic Toast / Alert
    Alert.alert(
      t('contactArtisan'),
      `${t('buyerContactNotice')}\n\n✨ ${t('buyerInquiryCreated')}`,
      [
        {
          text: 'OK',
          onPress: () => {
            if (onClose) {
              onClose();
            } else if (navigation?.goBack) {
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. FocusModeHeader */}
      <FocusModeHeader
        title={t('previewAsBuyer')}
        subtitle="वैश्विक खरीदार दृश्य · International Buyer View"
        onBack={handleBack}
        navigation={navigation}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Watermark Pill Banner */}
        <View style={styles.watermarkBanner}>
          <Ionicons name="eye" size={16} color={colors.primary.rust} />
          <Text style={styles.watermarkText}>{t('buyerPreviewTag')}</Text>
        </View>

        {/* 3. Hero Product Image */}
        <View style={styles.heroImageWrapper}>
          <Image source={resolveImageSource(effectiveImageUri)} style={styles.heroImage} />
          <View style={styles.liveTag}>
            <View style={styles.liveDot} />
            <Text style={styles.liveTagText}>LIVE STOREFRONT</Text>
          </View>
          <View style={styles.giTagOverlay}>
            <Ionicons name="ribbon" size={12} color={colors.surface.white} />
            <Text style={styles.giTagOverlayText}>GI CERTIFIED HERITAGE</Text>
          </View>
        </View>

        {/* 4. Product Info Card */}
        <View style={styles.productCard}>
          <Text style={styles.productTitle}>{title}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceValue}>₹{price.toLocaleString('en-IN')}</Text>
            <Text style={styles.taxNote}>Incl. of all taxes • Direct artisan price</Text>
          </View>

          <View style={styles.divider} />

          {/* Description */}
          <Text style={styles.descHeading}>Product Description</Text>
          <Text style={styles.descText}>{description}</Text>

          {/* Scannable Authenticity Strip */}
          <View style={styles.qrStrip}>
            <View style={styles.qrIconBox}>
              <Ionicons name="qr-code-outline" size={24} color={colors.navy.deep} />
            </View>
            <View style={styles.qrMeta}>
              <Text style={styles.qrTitle}>{t('scanToVerify')}</Text>
              <Text style={styles.qrSub}>Government of India GI Registry verified authenticity</Text>
            </View>
          </View>
        </View>

        {/* 5. Verified Artisan Strip */}
        <View style={styles.artisanCard}>
          <Image
            source={resolveImageSource(
              artisanProfile?.profileImageUrl ||
                artisanProfile?.image ||
                require('../../../assets/images/avatars/ramniwas.jpg')
            )}
            style={styles.artisanAvatar}
          />
          <View style={styles.artisanMeta}>
            <View style={styles.artisanNameRow}>
              <Text style={styles.artisanName}>{artisanProfile?.name || 'Ram Niwas'}</Text>
              <Ionicons name="checkmark-circle" size={16} color={colors.status.green} />
            </View>
            <Text style={styles.artisanSubtitle}>{t('artisanVerifiedStrip')}</Text>
            <Text style={styles.artisanLocation}>
              📍 {artisanProfile?.location || 'Varanasi, Uttar Pradesh'}
            </Text>
          </View>
        </View>

        {inquiryCreated && (
          <View style={styles.createdSuccessBanner}>
            <Ionicons name="checkmark-circle" size={18} color={colors.status.green} />
            <Text style={styles.createdSuccessText}>
              {t('buyerInquiryCreated')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* 6. Bottom CTA Button: Contact Artisan */}
      <View style={styles.bottomBar}>
        <PrimaryButton
          title={t('contactArtisan')}
          leadingIcon="chatbubble-ellipses-outline"
          onPress={handleContactArtisan}
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
  watermarkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF4ED',
    borderWidth: 1,
    borderColor: '#F8D2BD',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 14,
  },
  watermarkText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary.rust,
    fontFamily: typography.fontFamilies?.body,
  },
  heroImageWrapper: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#EAE6DF',
    marginBottom: 16,
  },
  heroImage: {
    width: '100%',
    height: 280,
  },
  liveTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 42, 74, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#4ADE80',
  },
  liveTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.surface.white,
    letterSpacing: 0.5,
  },
  giTagOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.gold,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  giTagOverlayText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.surface.white,
  },
  productCard: {
    backgroundColor: colors.surface.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    marginBottom: 14,
  },
  productTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
    lineHeight: 26,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primary.rust,
  },
  taxNote: {
    fontSize: 11,
    color: colors.text.muted,
  },
  divider: {
    height: 1,
    backgroundColor: '#EFEAE2',
    marginVertical: 14,
  },
  descHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy.deep,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descText: {
    fontSize: 14,
    color: colors.navy.deep,
    lineHeight: 21,
    fontFamily: typography.fontFamilies?.body,
    marginBottom: 14,
  },
  qrStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F5F0',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  qrIconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.surface.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5DFD5',
  },
  qrMeta: {
    flex: 1,
  },
  qrTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy.deep,
  },
  qrSub: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 2,
  },
  artisanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    gap: 12,
    marginBottom: 14,
  },
  artisanAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EAE6DF',
  },
  artisanMeta: {
    flex: 1,
  },
  artisanNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  artisanName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
  },
  artisanSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.status.green,
    marginTop: 1,
  },
  artisanLocation: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 2,
  },
  createdSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#C6E7D0',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
  },
  createdSuccessText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.status.green,
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
