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
import BilingualText from '../../components/BilingualText';
import { generateListingFromAudio } from '../../services/ai';
import { playTextToSpeech, stopTextToSpeech } from '../../services/audio';
import { useTranslation } from '../../i18n';

export default function ListingReview({ route, navigation }) {
  const imageUri =
    route?.params?.imageUri ||
    'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80';
  const transcript = route?.params?.transcript || '';

  const [loading, setLoading] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [productDetails, setProductDetails] = useState(null);
  const { t, currentLanguage } = useTranslation();

  useEffect(() => {
    let isMounted = true;
    async function loadGeneratedListing() {
      try {
        const data = await generateListingFromAudio(imageUri);
        if (isMounted) {
          setProductDetails(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error generating listing', err);
        if (isMounted) setLoading(false);
      }
    }

    loadGeneratedListing();

    return () => {
      isMounted = false;
      stopTextToSpeech();
    };
  }, [imageUri]);

  const handleToggleAudio = () => {
    if (isPlayingAudio) {
      stopTextToSpeech();
      setIsPlayingAudio(false);
    } else {
      const textToSpeak =
        currentLanguage === 'en'
          ? productDetails?.descriptionEnglish || ''
          : productDetails?.descriptionHindi || '';
      playTextToSpeech(textToSpeak, currentLanguage === 'en' ? 'en-US' : 'hi-IN');
      setIsPlayingAudio(true);
    }
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
            Analyzing fabric weave, motif pattern, and voice transcript...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Enhanced Image with Badge */}
          <View style={styles.imageWrapper}>
            <Image source={{ uri: imageUri }} style={styles.productImage} />
            <View style={styles.enhancedChip}>
              <Ionicons name="sparkles" size={12} color={colors.surface.white} />
              <Text style={styles.enhancedChipText}>{t('enhancedBadge')}</Text>
            </View>
          </View>

          {/* Generated Titles Card */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t('generatedTitle')}</Text>
            <Text style={styles.titlePrimary}>
              {currentLanguage === 'en'
                ? productDetails?.titleEnglish
                : productDetails?.titleHindi}
            </Text>
            {currentLanguage !== 'en' && (
              <Text style={styles.titleSecondary}>
                {productDetails?.titleEnglish}
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
              {currentLanguage === 'en'
                ? productDetails?.descriptionEnglish
                : productDetails?.descriptionHindi}
            </Text>
            {currentLanguage !== 'en' && (
              <Text style={styles.descSecondary}>
                {productDetails?.descriptionEnglish}
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
            <Text style={styles.infoBannerText}>{t('reviewInfoNote')}</Text>
          </View>
        </ScrollView>
      )}

      {/* Bottom CTA */}
      {!loading && (
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
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  titlePrimary: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
  },
  titleSecondary: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 2,
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
    lineHeight: 21,
    color: colors.navy.deep,
    fontWeight: '600',
  },
  descSecondary: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.text.muted,
    marginTop: 4,
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
