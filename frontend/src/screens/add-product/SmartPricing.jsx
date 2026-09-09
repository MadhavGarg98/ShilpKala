import React, { useState, useEffect } from 'react';
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
import { getMarketComparison } from '../../services/pricing';
import { useTranslation } from '../../i18n';

export default function SmartPricing({ route, navigation }) {
  const { imageUri, transcript, productData } = route?.params || {};
  const { t, currentLanguage } = useTranslation();

  const minSuggested = productData?.suggestedPriceMin || 5500;
  const maxSuggested = productData?.suggestedPriceMax || 7200;
  const recommendedPrice = Math.round((minSuggested + maxSuggested) / 200) * 100; // e.g. 6400 or 6500

  const [finalPrice, setFinalPrice] = useState(recommendedPrice);
  const [materialCost, setMaterialCost] = useState('2200');
  const [marketBenchmarks, setMarketBenchmarks] = useState([]);
  const [loadingBenchmarks, setLoadingBenchmarks] = useState(true);

  useEffect(() => {
    async function loadBenchmarks() {
      try {
        const data = await getMarketComparison(productData?.craftTypeId || '1');
        setMarketBenchmarks(data);
      } catch (err) {
        console.error('Error loading pricing benchmarks', err);
      } finally {
        setLoadingBenchmarks(false);
      }
    }

    loadBenchmarks();
  }, [productData]);

  const handleAdjustPrice = (delta) => {
    setFinalPrice((prev) => Math.max(100, prev + delta));
  };

  const handleVoiceCostInput = (spokenCost) => {
    const digits = spokenCost.replace(/[^0-9]/g, '');
    if (digits) {
      setMaterialCost(digits);
    } else {
      setMaterialCost('2200');
    }
  };

  const handleContinue = () => {
    navigation.navigate('ReviewPublish', {
      imageUri,
      transcript,
      productData: {
        ...productData,
        price: finalPrice,
        materialCost: parseInt(materialCost, 10) || 2200,
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
            Fair Heritage Pricing Engine • Powered by Market Intelligence
          </Text>
        </View>

        {/* 1. AI-Suggested Price Range Card */}
        <View style={styles.rangeCard}>
          <View style={styles.rangeHeader}>
            <View style={styles.sparkleIconWrap}>
              <Ionicons name="sparkles" size={16} color={colors.surface.white} />
            </View>
            <Text style={styles.rangeCardLabel}>
              {t('aiSuggestedRange')}
            </Text>
          </View>

          <View style={styles.rangeNumbersRow}>
            <Text style={styles.rangeValue}>
              ₹{minSuggested.toLocaleString('en-IN')} – ₹{maxSuggested.toLocaleString('en-IN')}
            </Text>
          </View>
          <Text style={styles.rangeSubtext}>
            शुद्ध रेशम, हाथ की बुनाई और जीआई प्रमाणन के आधार पर गणना की गई
          </Text>
        </View>

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
          <Text style={styles.costCardLabel}>
            {t('materialCostLabel')}
          </Text>
          <View style={styles.costInputRow}>
            <Text style={styles.costCurrency}>₹</Text>
            <TextInput
              style={styles.costTextInput}
              value={materialCost}
              onChangeText={(txt) => setMaterialCost(txt.replace(/[^0-9]/g, ''))}
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
            सामग्री लागत दर्ज करने के लिए माइक पर टैप करें • Tap mic to speak
          </Text>
        </View>

        {/* 4. Market Comparison Benchmarks */}
        <View style={styles.benchmarkSection}>
          <Text style={styles.benchmarkSectionTitle}>
            {t('marketComparisonTitle')}
          </Text>

          {loadingBenchmarks ? (
            <ActivityIndicator color={colors.primary.rust} style={{ padding: 12 }} />
          ) : (
            <View style={styles.benchmarkRow}>
              {marketBenchmarks.map((item, idx) => (
                <View key={item.id || idx} style={styles.benchmarkCard}>
                  <Image source={{ uri: item.imageUrl }} style={styles.benchmarkImage} />
                  <Text style={styles.benchmarkPrice}>
                    ₹{item.price.toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.benchmarkStatus}>बाज़ार मूल्य</Text>
                </View>
              ))}
            </View>
          )}
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
  costCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy.deep,
    marginBottom: 8,
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
    fontSize: 10,
    color: colors.text.muted,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface.white,
    borderTopWidth: 1,
    borderTopColor: '#EFEAE2',
  },
});
