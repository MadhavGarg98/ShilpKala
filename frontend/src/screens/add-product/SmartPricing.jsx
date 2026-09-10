import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import PrimaryButton from '../../components/PrimaryButton';
import StepFlowHeader from '../../components/StepFlowHeader';
import VoiceInputButton from '../../components/VoiceInputButton';
import { suggestPricing, getMarketComparison } from '../../services/pricing';
import { useTranslation } from '../../i18n';
import { resolveImageSource } from '../../utils/imageUtils';

export default function SmartPricing({ route, navigation }) {
  const { imageUri, transcript, productData } = route?.params || {};
  const { t, currentLanguage } = useTranslation();

  const isGiCertified = Boolean(productData?.isGiMatch);
  const craftName = productData?.craftType || 'Handloom Weaving';

  // Dynamic pricing state
  const [materialCost, setMaterialCost] = useState(
    productData?.materialCost ? String(productData.materialCost) : '2200'
  );
  const [minSuggested, setMinSuggested] = useState(productData?.suggestedPriceMin || 5300);
  const [maxSuggested, setMaxSuggested] = useState(productData?.suggestedPriceMax || 7500);
  const [finalPrice, setFinalPrice] = useState(6400);
  const [pricingDetails, setPricingDetails] = useState(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [marketBenchmarks, setMarketBenchmarks] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [userHasManuallyTweakedPrice, setUserHasManuallyTweakedPrice] = useState(false);

  const debounceTimerRef = useRef(null);

  const fetchPricing = useCallback(async (costVal) => {
    const numericCost = parseFloat(costVal) || 2200;
    if (numericCost <= 0) return;

    setLoadingPricing(true);
    setErrorMessage(null);

    try {
      const data = await suggestPricing({
        craftType: craftName,
        materialCost: numericCost,
        isGiMatch: isGiCertified,
        productCategory: productData?.productCategory,
      });

      setMinSuggested(data.minPrice);
      setMaxSuggested(data.maxPrice);
      setPricingDetails(data);

      if (!userHasManuallyTweakedPrice) {
        setFinalPrice(data.recommendedPrice);
      }

      if (data.marketComparables && data.marketComparables.length > 0) {
        setMarketBenchmarks(data.marketComparables);
      }
    } catch (err) {
      console.warn('[SmartPricing] Pricing calculation notice:', err);
      setErrorMessage(err.message || 'Pricing calculation error');
    } finally {
      setLoadingPricing(false);
    }
  }, [craftName, isGiCertified, productData, userHasManuallyTweakedPrice]);

  useEffect(() => {
    // Initial fetch on mount or when GI status changes
    fetchPricing(materialCost);
  }, [isGiCertified]);

  const handleCostChange = (rawText) => {
    const sanitized = rawText.replace(/[^0-9]/g, '');
    setMaterialCost(sanitized);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchPricing(sanitized || '2200');
    }, 450);
  };

  const handleAdjustPrice = (delta) => {
    setUserHasManuallyTweakedPrice(true);
    setFinalPrice((prev) => Math.max(100, prev + delta));
  };

  const handleVoiceCostInput = (spokenCost) => {
    const digits = spokenCost.replace(/[^0-9]/g, '');
    const finalVal = digits || '2200';
    setMaterialCost(finalVal);
    fetchPricing(finalVal);
  };

  const handleContinue = () => {
    navigation.navigate('ReviewPublish', {
      imageUri,
      transcript,
      productData: {
        ...productData,
        price: finalPrice,
        materialCost: parseInt(materialCost, 10) || 2200,
        suggestedPriceMin: minSuggested,
        suggestedPriceMax: maxSuggested,
        pricingMethod: pricingDetails?.method || 'rules_based_heuristic_v1',
      },
    });
  };

  const buttonTitle =
    currentLanguage === 'en'
      ? 'Review Final Listing'
      : `${t('continueToReviewPublish')} / Review Final Listing`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StepFlowHeader step={3} total={3} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.headerTitleWrap}>
          <Text style={styles.screenHeadingPrimary}>
            {t('smartPricingTitle')}
          </Text>
          <Text style={styles.screenHeadingSecondary}>
            Fair Heritage Pricing Engine • Rules-Based Heuristic v1
          </Text>
        </View>

        {/* 1. AI-Suggested Price Range Card */}
        <View style={styles.rangeCard}>
          <View style={styles.rangeHeader}>
            <View style={styles.sparkleIconWrap}>
              {loadingPricing ? (
                <ActivityIndicator size="small" color={colors.surface.white} />
              ) : (
                <Ionicons name="sparkles" size={16} color={colors.surface.white} />
              )}
            </View>
            <Text style={styles.rangeCardLabel}>
              {t('aiSuggestedRange')}
            </Text>
            {pricingDetails?.giPremiumPct > 0 && (
              <View style={styles.giBadgePill}>
                <Ionicons name="ribbon" size={12} color="#8A600B" />
                <Text style={styles.giBadgeText}>+30% GI Premium</Text>
              </View>
            )}
          </View>

          <View style={styles.rangeNumbersRow}>
            <Text style={styles.rangeValue}>
              ₹{minSuggested.toLocaleString('en-IN')} – ₹{maxSuggested.toLocaleString('en-IN')}
            </Text>
          </View>

          <Text style={styles.rangeSubtext}>
            {pricingDetails?.citation || 'वस्त्र मंत्रालय लागत दिशा-निर्देशों एवं कारीगर मजदूरी मानकों पर आधारित'}
          </Text>
        </View>

        {/* Error / Offline Notice */}
        {errorMessage && (
          <View style={styles.errorNotice}>
            <Ionicons name="information-circle" size={16} color={colors.primary.rust} />
            <Text style={styles.errorNoticeText}>
              स्थानीय लागत मॉडल सक्रिय है • Running on local transparent heuristic
            </Text>
          </View>
        )}

        {/* 2. PRIMARY CONTROL: Large + / - Price Stepper */}
        <View style={styles.stepperControlCard}>
          <Text style={styles.stepperControlTitle}>
            {t('finalPriceControl')}
          </Text>

          {/* Stepper Main Display */}
          <View style={styles.stepperRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleAdjustPrice(-100)}
              style={styles.stepperBtn}
            >
              <Ionicons name="remove" size={28} color={colors.navy.deep} />
            </TouchableOpacity>

            <View style={styles.priceDisplay}>
              <Text style={styles.currencySymbol}>₹</Text>
              <Text style={styles.finalPriceNumber}>
                {finalPrice.toLocaleString('en-IN')}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleAdjustPrice(100)}
              style={[styles.stepperBtn, styles.stepperBtnPlus]}
            >
              <Ionicons name="add" size={28} color={colors.surface.white} />
            </TouchableOpacity>
          </View>

          {/* Quick Adjustment Chips */}
          <View style={styles.quickChipsRow}>
            <TouchableOpacity
              onPress={() => handleAdjustPrice(-500)}
              style={styles.quickChip}
            >
              <Text style={styles.quickChipText}>−₹500</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleAdjustPrice(-100)}
              style={styles.quickChip}
            >
              <Text style={styles.quickChipText}>−₹100</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleAdjustPrice(100)}
              style={styles.quickChip}
            >
              <Text style={styles.quickChipText}>+₹100</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleAdjustPrice(500)}
              style={styles.quickChip}
            >
              <Text style={styles.quickChipText}>+₹500</Text>
            </TouchableOpacity>
          </View>

          {/* Separate "You Decide" Messaging Card */}
          <View style={styles.artisanDecidesBox}>
            <Ionicons name="shield-checkmark" size={18} color={colors.status.green} />
            <Text style={styles.artisanDecidesText}>
              {t('artisanDecidesNote')}
            </Text>
          </View>
        </View>

        {/* 3. Material Cost Input with VoiceInputButton */}
        <View style={styles.costCard}>
          <View style={styles.costLabelRow}>
            <Text style={styles.costCardLabel}>
              {t('materialCostLabel')}
            </Text>
            {loadingPricing && (
              <ActivityIndicator size="small" color={colors.primary.rust} />
            )}
          </View>
          <View style={styles.costInputRow}>
            <Text style={styles.costCurrency}>₹</Text>
            <TextInput
              style={styles.costTextInput}
              value={materialCost}
              onChangeText={handleCostChange}
              keyboardType="number-pad"
              placeholder={t('materialCostPlaceholder')}
              placeholderTextColor={colors.text.muted}
            />
            <VoiceInputButton
              size={40}
              mockText="2200"
              onTranscribed={handleVoiceCostInput}
            />
          </View>
          <Text style={styles.costHint}>
            सामग्री लागत बदलते ही मूल्य सीमा स्वचालित रूप से अपडेट होती है • Auto-calculates as you type or speak
          </Text>
        </View>

        {/* 4. Transparency & Methodology Notice */}
        <View style={styles.transparencyCard}>
          <Ionicons name="document-text-outline" size={18} color={colors.navy.deep} />
          <View style={styles.transparencyCol}>
            <Text style={styles.transparencyTitle}>
              पारदर्शिता अनुबंध • Honesty Disclosure
            </Text>
            <Text style={styles.transparencyText}>
              {pricingDetails?.disclaimer ||
                'यह अनुमान वस्त्र मंत्रालय एवं निष्पक्ष व्यापार दिशानिर्देशों (लागत × 2.4-3.4) एवं जीआई प्रमाणन प्रीमियम (+30%) पर आधारित नियमों द्वारा निकाला गया है। यह कोई गुप्त या बंद एल्गोरिदम नहीं है।'}
            </Text>
          </View>
        </View>

        {/* 5. Market Comparison Benchmarks */}
        <View style={styles.benchmarkSection}>
          <Text style={styles.benchmarkSectionTitle}>
            {t('marketComparisonTitle')}
          </Text>

          <View style={styles.benchmarkRow}>
            {marketBenchmarks.slice(0, 3).map((item, idx) => (
              <View key={item.id || `comp-${idx}`} style={styles.benchmarkCard}>
                <Image
                  source={resolveImageSource(item.imageUrl || require('../../../assets/images/products/banarasi-saree.jpg'))}
                  style={styles.benchmarkImage}
                />
                <Text style={styles.benchmarkPrice}>
                  ₹{(item.price || 4800).toLocaleString('en-IN')}
                </Text>
                <Text style={styles.benchmarkStatus} numberOfLines={1}>
                  {item.source_label || item.sourceLabel || 'सहकारी संदर्भ'}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <PrimaryButton
          title={buttonTitle}
          arrow={true}
          onPress={handleContinue}
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
  headerTitleWrap: {
    marginBottom: 16,
  },
  screenHeadingPrimary: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
  },
  screenHeadingSecondary: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 2,
  },
  rangeCard: {
    backgroundColor: '#FFF9ED',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#F3E1B9',
    marginBottom: 16,
  },
  rangeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sparkleIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.status.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A600B',
  },
  giBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FDECC8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  giBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8A600B',
  },
  rangeNumbersRow: {
    marginVertical: 4,
  },
  rangeValue: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.navy.deep,
  },
  rangeSubtext: {
    fontSize: 11,
    color: '#7C663A',
    marginTop: 4,
    lineHeight: 16,
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF1E8',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  errorNoticeText: {
    fontSize: 11,
    color: colors.primary.rust,
    fontWeight: '600',
  },
  stepperControlCard: {
    backgroundColor: colors.surface.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    marginBottom: 16,
    shadowColor: colors.navy.deep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  stepperControlTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy.deep,
    textAlign: 'center',
    marginBottom: 14,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 14,
  },
  stepperBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3EDE2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8E3DA',
  },
  stepperBtnPlus: {
    backgroundColor: colors.primary.rust,
    borderColor: colors.primary.rust,
  },
  priceDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary.rust,
  },
  finalPriceNumber: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.navy.deep,
  },
  quickChipsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  quickChip: {
    backgroundColor: '#F7F4EE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E3DA',
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy.deep,
  },
  artisanDecidesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3FAF5',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C8E6D3',
  },
  artisanDecidesText: {
    flex: 1,
    fontSize: 12,
    color: '#265C39',
    lineHeight: 16,
    fontWeight: '600',
  },
  costCard: {
    backgroundColor: colors.surface.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    marginBottom: 16,
  },
  costLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  costCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy.deep,
  },
  costInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.cream,
    borderWidth: 1.5,
    borderColor: '#E2DBD0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  costCurrency: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary.rust,
    marginRight: 6,
  },
  costTextInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.navy.deep,
    minHeight: 42,
  },
  costHint: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  transparencyCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#F7F5F0',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E3DA',
    marginBottom: 16,
  },
  transparencyCol: {
    flex: 1,
  },
  transparencyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy.deep,
    marginBottom: 4,
  },
  transparencyText: {
    fontSize: 11,
    color: '#5C5449',
    lineHeight: 16,
  },
  benchmarkSection: {
    marginBottom: 16,
  },
  benchmarkSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy.deep,
    marginBottom: 10,
  },
  benchmarkRow: {
    flexDirection: 'row',
    gap: 10,
  },
  benchmarkCard: {
    flex: 1,
    backgroundColor: colors.surface.white,
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  benchmarkImage: {
    width: '100%',
    height: 64,
    borderRadius: 8,
    backgroundColor: '#F0EDE8',
    marginBottom: 6,
  },
  benchmarkPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy.deep,
  },
  benchmarkStatus: {
    fontSize: 9,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: 2,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface.white,
    borderTopWidth: 1,
    borderTopColor: '#EFEAE2',
  },
});
