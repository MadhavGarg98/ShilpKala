import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import PrimaryButton from '../../components/PrimaryButton';
import StepFlowHeader from '../../components/StepFlowHeader';
import { generateListingFromAudio } from '../../services/ai';
import { playTextToSpeech, stopTextToSpeech } from '../../services/audio';
import { useTranslation } from '../../i18n';
import { resolveImageSource } from '../../utils/imageUtils';

export default function ListingReview({ route, navigation }) {
  const imageUri =
    route?.params?.imageUri ||
    require('../../../assets/images/products/banarasi-saree.jpg');
  const transcript = route?.params?.transcript || 'हस्तनिर्मित पारंपरिक भारतीय शिल्प';

  const [loading, setLoading] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [productDetails, setProductDetails] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const { t, currentLanguage } = useTranslation();

  useEffect(() => {
    let isMounted = true;

    async function loadGeneratedListing() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const data = await generateListingFromAudio({
          transcript,
          imageUri,
          languageCode: currentLanguage || 'hi-IN',
          craftType: 'Handloom Weaving',
        });

        if (isMounted) {
          setProductDetails(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('[ListingReview] Error generating listing:', err);
        if (isMounted) {
          setErrorMessage(err.message || 'Listing generation request failed');
          setLoading(false);
        }
      }
    }

    loadGeneratedListing();

    return () => {
      isMounted = false;
      stopTextToSpeech();
    };
  }, [imageUri, transcript, retryCount, currentLanguage]);

  const handleToggleAudio = () => {
    if (isPlayingAudio) {
      stopTextToSpeech();
      setIsPlayingAudio(false);
    } else {
      const textToSpeak =
        currentLanguage === 'en'
          ? productDetails?.descriptionEnglish || productDetails?.description || ''
          : productDetails?.description || productDetails?.descriptionEnglish || '';
      playTextToSpeech(textToSpeak, currentLanguage === 'en' ? 'en-US' : 'hi-IN');
      setIsPlayingAudio(true);
    }
  };

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  const handleFallbackContinue = () => {
    // Graceful fallback listing in case of offline demo venue
    const fallbackData = {
      title: transcript.length > 5 ? transcript.slice(0, 45) : 'हाथ से बुनी बनारसी साड़ी',
      titleEnglish: 'Handcrafted Authentic Artisan Craft',
      description: transcript,
      descriptionEnglish: 'Authentic handcrafted heritage artisan item created with traditional methods.',
      isGiMatch: true,
      giName: 'Banaras Brocades and Sarees',
      suggestedPriceMin: 5500,
      suggestedPriceMax: 7200,
      keywords: ['Handloom', 'Heritage', 'Artisan', 'Authentic'],
      source: 'offline_safety_fallback',
    };
    navigation.navigate('HeritageMatch', {
      imageUri,
      transcript,
      productData: fallbackData,
    });
  };

  const handleContinue = () => {
    stopTextToSpeech();
    navigation.navigate('HeritageMatch', {
      imageUri,
      transcript,
      productData: productDetails,
    });
  };

  const buttonTitle =
    currentLanguage === 'en'
      ? 'Continue to Heritage Match'
      : `${t('continueToHeritage')} / Heritage Match`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StepFlowHeader step={3} total={3} />

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary.rust} />
          <Text style={styles.loaderTextPrimary}>{t('aiGenerating')}</Text>
          <Text style={styles.loaderTextSecondary}>
            कारीगर के ध्वनि विवरण एवं उत्पाद छवि का एआई विश्लेषण जारी है...
          </Text>
        </View>
      ) : errorMessage ? (
        /* Bilingual Error Screen with Retry */
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="cloud-offline-outline" size={44} color={colors.primary.rust} />
          </View>
          <Text style={styles.errorHeading}>
            विवरण उत्पन्न करने में समस्या • Generation Notice
          </Text>
          <Text style={styles.errorSubtext}>
            सर्वर से संपर्क नहीं हो पाया ({errorMessage})। कृपया पुनः प्रयास करें।
          </Text>
          <TouchableOpacity onPress={handleRetry} style={styles.retryLargeBtn}>
            <Ionicons name="reload" size={18} color={colors.surface.white} />
            <Text style={styles.retryLargeBtnText}>पुनः प्रयास करें / Retry AI</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleFallbackContinue} style={styles.fallbackBtn}>
            <Text style={styles.fallbackBtnText}>मूल विवरण के साथ आगे बढ़ें / Continue</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Enhanced Image with Badge */}
          <View style={styles.imageWrapper}>
            <Image source={resolveImageSource(imageUri)} style={styles.productImage} />
            <View style={styles.enhancedChip}>
              <Ionicons name="sparkles" size={12} color={colors.surface.white} />
              <Text style={styles.enhancedChipText}>{t('enhancedBadge')}</Text>
            </View>
          </View>

          {/* Generated Titles Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardLabel}>{t('generatedTitle')}</Text>
              {productDetails?.source && (
                <View style={styles.sourceTag}>
                  <Text style={styles.sourceTagText}>{productDetails.source.toUpperCase()}</Text>
                </View>
              )}
            </View>
            <Text style={styles.titlePrimary}>
              {productDetails?.title}
            </Text>
            {productDetails?.titleEnglish && productDetails?.titleEnglish !== productDetails?.title && (
              <Text style={styles.titleSecondary}>
                {productDetails.titleEnglish}
              </Text>
            )}
          </View>

          {/* Generated Description Card + Inline Audio Player */}
          <View style={styles.card}>
            <View style={styles.descHeader}>
              <Text style={styles.cardLabel}>{t('generatedDescription')}</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleToggleAudio}
                style={[
                  styles.audioBtn,
                  isPlayingAudio && styles.audioBtnPlaying,
                ]}
              >
                <Ionicons
                  name={isPlayingAudio ? 'stop-circle' : 'volume-high'}
                  size={16}
                  color={isPlayingAudio ? colors.primary.rust : colors.surface.white}
                />
                <Text
                  style={[
                    styles.audioBtnText,
                    isPlayingAudio && styles.audioBtnTextPlaying,
                  ]}
                >
                  {isPlayingAudio ? t('stopListening') : t('listenDescription')}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.descPrimary}>
              {productDetails?.description}
            </Text>
            {productDetails?.descriptionEnglish && productDetails?.descriptionEnglish !== productDetails?.description && (
              <Text style={styles.descSecondary}>
                {productDetails.descriptionEnglish}
              </Text>
            )}
          </View>

          {/* Keywords Pill Tags */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t('keywords')}</Text>
            <View style={styles.keywordsRow}>
              {productDetails?.keywords?.map((tag, idx) => (
                <View key={`kw-${idx}`} style={styles.keywordPill}>
                  <Text style={styles.keywordText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Automatic AI Info Note */}
          <View style={styles.infoBanner}>
            <Ionicons
              name="information-circle"
              size={18}
              color={colors.primary.rust}
            />
            <Text style={styles.infoBannerText}>
              {productDetails?.languageName
                ? `पहचानी गई भाषा: ${productDetails.languageName} • Artisan Voice Analysis Complete`
                : t('reviewInfoNote')}
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Bottom CTA */}
      {!loading && !errorMessage && (
        <View style={styles.bottomBar}>
          <PrimaryButton
            title={buttonTitle}
            arrow={true}
            onPress={handleContinue}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.cream,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loaderTextPrimary: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.navy.deep,
  },
  loaderTextSecondary: {
    fontSize: 12,
    color: colors.text.muted,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF1E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy.deep,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 13,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  retryLargeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary.rust,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  retryLargeBtnText: {
    color: colors.surface.white,
    fontSize: 15,
    fontWeight: '700',
  },
  fallbackBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  fallbackBtnText: {
    color: colors.navy.deep,
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  imageWrapper: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F0EDE8',
    position: 'relative',
    marginBottom: 16,
    shadowColor: colors.navy.deep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  enhancedChip: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: colors.status.green,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  enhancedChipText: {
    color: colors.surface.white,
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  titlePrimary: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
    lineHeight: 24,
  },
  titleSecondary: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 4,
    lineHeight: 18,
  },
  descHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  audioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.navy.deep,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  audioBtnPlaying: {
    backgroundColor: '#FBECE5',
    borderWidth: 1,
    borderColor: colors.primary.rust,
  },
  audioBtnText: {
    color: colors.surface.white,
    fontSize: 11,
    fontWeight: '700',
  },
  audioBtnTextPlaying: {
    color: colors.primary.rust,
  },
  descPrimary: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.navy.deep,
    fontWeight: '600',
  },
  descSecondary: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.text.muted,
    marginTop: 6,
  },
  keywordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  keywordPill: {
    backgroundColor: '#F3EDE2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  keywordText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary.rust,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFF8F4',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F8D7C8',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#8A320A',
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
