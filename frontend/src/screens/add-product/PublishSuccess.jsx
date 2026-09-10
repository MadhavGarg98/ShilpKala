import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Share,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import PrimaryButton from '../../components/PrimaryButton';
import SecondaryButton from '../../components/SecondaryButton';
import BuyerPreview from './BuyerPreview';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n';
import { resolveImageSource } from '../../utils/imageUtils';

export default function PublishSuccess({ route, navigation }) {
  const { imageUri, productData } = route?.params || {};
  const { t, currentLanguage } = useTranslation();
  const addProduct = useAppStore((state) => state.addProduct);
  const [showBuyerPreview, setShowBuyerPreview] = useState(false);

  // Animations
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Add product to store on mount
    const newProduct = {
      id: `prod-${Date.now()}`,
      titleHindi: productData?.titleHindi || productData?.title || (currentLanguage === 'en' ? 'Handwoven Saree' : t('product.p1.title')),
      titleEnglish: productData?.titleEnglish || productData?.title || 'Handwoven Saree',
      descriptionHindi: productData?.descriptionHindi || productData?.description || '',
      descriptionEnglish: productData?.descriptionEnglish || productData?.description || '',
      price: productData?.price || 6400,
      imageUrl:
        imageUri ||
        require('../../../assets/images/products/banarasi-saree.jpg'),
      status: 'live',
      views: 0,
      inquiries: 0,
      isGiCertified: productData?.isGiMatch || false,
      craftType: 'Handloom Weaving',
      createdAt: new Date().toISOString(),
    };

    addProduct(newProduct);

    // Play celebratory entrance animation sequence
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(confettiAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleShareWhatsApp = async () => {
    const priceText = `₹${(productData?.price || 6400).toLocaleString('en-IN')}`;
    const titleText =
      currentLanguage === 'en'
        ? productData?.titleEnglish || productData?.title || 'Handwoven Saree'
        : productData?.titleHindi || productData?.title || t('product.p1.title');
    const shareText =
      currentLanguage === 'en'
        ? `🧵 Check out my handcrafted product on ShilpKala!\n\n${titleText}\nPrice: ${priceText}\n\n🛒 Direct from artisan — zero commission.\n\n#ShilpKala #Handmade #MakeInIndia`
        : `🧵 ShilpKala: ${titleText}\nPrice: ${priceText}\n\n🛒 Direct from artisan.\n\n#ShilpKala #MakeInIndia`;

    try {
      await Share.share({
        message: shareText,
      });
    } catch (err) {
      console.log('Share error:', err);
    }
  };

  const handleAddAnother = () => {
    // Reset stack to CameraCapture
    navigation.navigate('CameraCapture');
  };

  const handleViewHome = () => {
    navigation.navigate('MainTabs', { screen: 'Home' });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Celebratory Checkmark Animation */}
        <Animated.View
          style={[
            styles.checkCircle,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <Ionicons name="checkmark" size={48} color={colors.surface.white} />
        </Animated.View>

        {/* Confetti Dots (simulated with Animated opacity) */}
        <Animated.View
          style={[
            styles.confettiRow,
            { opacity: confettiAnim },
          ]}
        >
          <View style={[styles.confettiDot, { backgroundColor: colors.status.gold }]} />
          <View style={[styles.confettiDot, { backgroundColor: colors.primary.rust }]} />
          <View style={[styles.confettiDot, { backgroundColor: colors.status.green }]} />
          <View style={[styles.confettiDot, { backgroundColor: colors.accent.pink }]} />
          <View style={[styles.confettiDot, { backgroundColor: colors.accent.blue }]} />
        </Animated.View>

        {/* Title */}
        <Animated.View
          style={{
            opacity: opacityAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Text style={styles.successTitle}>
            {t('publishSuccessTitle')}
          </Text>
          <Text style={styles.successSubtitle}>
            {t('publishSuccessSubtitle')}
          </Text>
        </Animated.View>

        {/* Product Preview Card */}
        <Animated.View
          style={[
            styles.previewCard,
            {
              opacity: opacityAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Image
            source={resolveImageSource(
              imageUri || require('../../../assets/images/products/banarasi-saree.jpg')
            )}
            style={styles.previewImage}
          />
          <View style={styles.previewInfo}>
            <Text style={styles.previewTitle} numberOfLines={2}>
              {t(productData?.titleKey) ||
                (currentLanguage === 'en'
                  ? productData?.titleEnglish || productData?.title || 'Handwoven Saree'
                  : productData?.titleHindi || productData?.title || t('product.p1.title'))}
            </Text>
            <Text style={styles.previewPrice}>
              ₹{(productData?.price || 6400).toLocaleString('en-IN')}
            </Text>
            <View style={styles.liveStatusRow}>
              <View style={styles.liveIndicator} />
              <Text style={styles.liveStatusText}>LIVE</Text>
            </View>
          </View>
        </Animated.View>

        {/* Inquiry Info Banner */}
        <Animated.View
          style={[
            styles.inquiryBanner,
            { opacity: opacityAnim },
          ]}
        >
          <Ionicons name="chatbubbles-outline" size={20} color={colors.status.green} />
          <Text style={styles.inquiryBannerText}>
            {t('inquiryBanner')}
          </Text>
        </Animated.View>
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        {/* WhatsApp Share */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleShareWhatsApp}
          style={styles.whatsappBtn}
        >
          <Ionicons name="logo-whatsapp" size={22} color={colors.surface.white} />
          <Text style={styles.whatsappBtnText}>
            {t('shareOnWhatsapp')}
          </Text>
        </TouchableOpacity>

        {/* Preview as Buyer (Part C) */}
        <SecondaryButton
          title={t('previewAsBuyer')}
          leadingIcon="eye-outline"
          onPress={() => setShowBuyerPreview(true)}
          style={{ marginBottom: 4 }}
        />

        {/* Add Another Product */}
        <SecondaryButton
          title={t('addAnotherProduct')}
          leadingIcon="add-circle-outline"
          onPress={handleAddAnother}
        />

        {/* View on Home / Storefront */}
        <PrimaryButton
          title={t('viewOnHome')}
          arrow={true}
          onPress={handleViewHome}
        />
      </View>

      {/* Buyer Preview Modal */}
      <Modal
        visible={showBuyerPreview}
        animationType="slide"
        onRequestClose={() => setShowBuyerPreview(false)}
      >
        <BuyerPreview
          productData={productData}
          imageUri={imageUri}
          onClose={() => setShowBuyerPreview(false)}
          navigation={navigation}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.cream,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.status.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.status.green,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  confettiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  confettiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.navy.deep,
    textAlign: 'center',
    fontFamily: typography.fontFamilies?.body,
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 13,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  previewCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface.white,
    borderRadius: 16,
    padding: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: '#EFEAE2',
    gap: 12,
    shadowColor: colors.navy.deep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#F0EDE8',
  },
  previewInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
  },
  previewPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary.rust,
  },
  liveStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.status.green,
  },
  liveStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.status.green,
    letterSpacing: 0.8,
  },
  inquiryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F3FAF5',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C8E6D3',
    width: '100%',
  },
  inquiryBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#265C39',
    lineHeight: 17,
  },
  bottomActions: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    backgroundColor: colors.surface.white,
    borderTopWidth: 1,
    borderTopColor: '#EFEAE2',
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25D366',
    paddingVertical: 14,
    borderRadius: 14,
  },
  whatsappBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.surface.white,
  },
});
