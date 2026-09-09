import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import PrimaryButton from '../../components/PrimaryButton';
import StepFlowHeader from '../../components/StepFlowHeader';
import { useTranslation } from '../../i18n';

export default function HeritageMatch({ route, navigation }) {
  const { imageUri, transcript, productData } = route?.params || {};
  const [isStoryExpanded, setIsStoryExpanded] = useState(true);
  // Default to true (GI matched), but allow toggling to test non-GI case
  const [isGiMatched, setIsGiMatched] = useState(productData?.isGiMatch !== false);
  const { t, currentLanguage } = useTranslation();

  const handleContinue = () => {
    navigation.navigate('SmartPricing', {
      imageUri,
      transcript,
      productData: {
        ...productData,
        isGiMatch: isGiMatched,
      },
    });
  };

  const buttonTitle =
    currentLanguage === 'en'
      ? 'Continue to Smart Pricing'
      : `${t('continueToPricing')} / Smart Pricing`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StepFlowHeader step={3} total={3} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Title */}
        <View style={styles.headerTitleWrap}>
          <Text style={styles.screenHeadingPrimary}>
            {t('heritageMatchTitle')}
          </Text>
          <Text style={styles.screenHeadingSecondary}>
            Government GI & Geographical Heritage Authentication
          </Text>
        </View>

        {/* Demo Switcher Toggle: Test Match vs Non-Match */}
        <View style={styles.demoToggleBar}>
          <Text style={styles.demoToggleLabel}>Demo Case:</Text>
          <TouchableOpacity
            style={[styles.demoTab, isGiMatched && styles.demoTabActive]}
            onPress={() => setIsGiMatched(true)}
          >
            <Text style={[styles.demoTabText, isGiMatched && styles.demoTabTextActive]}>
              GI Matched (Gold)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.demoTab, !isGiMatched && styles.demoTabActive]}
            onPress={() => setIsGiMatched(false)}
          >
            <Text style={[styles.demoTabText, !isGiMatched && styles.demoTabTextActive]}>
              Non-GI (Neutral)
            </Text>
          </TouchableOpacity>
        </View>

        {isGiMatched ? (
          /* Celebratory GI-Matched Card */
          <View style={styles.giCelebrationCard}>
            <View style={styles.goldBanner}>
              <View style={styles.badgeCircle}>
                <Ionicons name="ribbon" size={26} color={colors.surface.white} />
              </View>
              <View style={styles.goldBannerText}>
                <Text style={styles.giTagBadge}>
                  भारत सरकार जीआई पंजीकृत • GI CERTIFIED #99
                </Text>
                <Text style={styles.giCelebrationTitle}>
                  {t('giCelebrationTitle')}
                </Text>
              </View>
            </View>

            {/* Registration Certificate Strip */}
            <View style={styles.regStrip}>
              <View style={styles.regIcon}>
                <Ionicons
                  name="shield-checkmark"
                  size={20}
                  color={colors.status.green}
                />
              </View>
              <View style={styles.regInfoCol}>
                <Text style={styles.regPrimary}>
                  बनारस ब्रोकेड्स और साड़ियाँ (Banaras Brocades & Sarees)
                </Text>
                <Text style={styles.regSecondary}>
                  {t('giRegNumber')}: GI-IN-99 • Class 24 & 25 Textiles
                </Text>
              </View>
            </View>

            {/* Collapsible Heritage Story */}
            <View style={styles.storyContainer}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsStoryExpanded(!isStoryExpanded)}
                style={styles.storyHeader}
              >
                <View style={styles.storyTitleGroup}>
                  <Ionicons name="book-outline" size={16} color={colors.primary.rust} />
                  <Text style={styles.storyTitleText}>
                    {t('heritageStoryTitle')}
                  </Text>
                </View>
                <Ionicons
                  name={isStoryExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.text.muted}
                />
              </TouchableOpacity>

              {isStoryExpanded && (
                <View style={styles.storyBody}>
                  <Text style={styles.storyParagraph}>
                    {currentLanguage === 'en'
                      ? 'A 500-year-old weaving tradition utilizing pure mulberry silk and authentic zari in the historic kadhua technique of Varanasi. Each motif is individually shaped on traditional pit-looms.'
                      : '५०० वर्षों से चली आ रही शुद्ध रेशम और सुनहरी ज़री की कढ़ुआ बुनाई शैली, जो बनारस के बुनकरों की पहचान है। प्रत्येक बूटा हथकरघे पर हाथ से व्यक्तिगत रूप से बुना जाता है।'}
                  </Text>
                </View>
              )}
            </View>

            {/* Value-Prop Callout */}
            <View style={styles.valuePropBox}>
              <Ionicons name="trending-up" size={20} color={colors.status.gold} />
              <Text style={styles.valuePropText}>
                {t('heritageValueProp')}
              </Text>
            </View>
          </View>
        ) : (
          /* Non-Match Neutral Case */
          <View style={styles.neutralCard}>
            <View style={styles.neutralHeader}>
              <View style={styles.neutralIconWrap}>
                <Ionicons name="sparkles-outline" size={28} color={colors.navy.deep} />
              </View>
              <View style={styles.neutralTextCol}>
                <Text style={styles.neutralTitle}>{t('nonGiTitle')}</Text>
                <Text style={styles.neutralSubtitle}>
                  Authentic Handcrafted Artisan Listing
                </Text>
              </View>
            </View>

            <Text style={styles.neutralDesc}>{t('nonGiDesc')}</Text>

            <View style={styles.neutralFeatureList}>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.status.green} />
                <Text style={styles.featureText}>
                  सीधा कारीगर-खरीदार संवाद • Direct maker connection
                </Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.status.green} />
                <Text style={styles.featureText}>
                  शिल्पकला प्रामाणिकता बैज • Artisan verified mark
                </Text>
              </View>
            </View>
          </View>
        )}
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
    marginBottom: 12,
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
  demoToggleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface.white,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    marginBottom: 16,
  },
  demoToggleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.muted,
    marginLeft: 4,
  },
  demoTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F3EDE2',
  },
  demoTabActive: {
    backgroundColor: colors.navy.deep,
  },
  demoTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.navy.deep,
  },
  demoTabTextActive: {
    color: colors.surface.white,
  },
  giCelebrationCard: {
    backgroundColor: colors.surface.white,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#E7BE6B',
    overflow: 'hidden',
    shadowColor: colors.status.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  goldBanner: {
    backgroundColor: '#FFF8E7',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3E1B9',
  },
  badgeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.status.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: colors.status.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  goldBannerText: {
    flex: 1,
  },
  giTagBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#87600C',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  giCelebrationTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
    lineHeight: 22,
  },
  regStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE2',
  },
  regIcon: {
    marginRight: 10,
  },
  regInfoCol: {
    flex: 1,
  },
  regPrimary: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy.deep,
  },
  regSecondary: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 2,
  },
  storyContainer: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE2',
  },
  storyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storyTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storyTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy.deep,
  },
  storyBody: {
    marginTop: 10,
    backgroundColor: colors.background.cream,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  storyParagraph: {
    fontSize: 13,
    lineHeight: 19,
    color: '#4A3D2F',
  },
  valuePropBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FAF5EA',
    padding: 14,
  },
  valuePropText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#6F500E',
    lineHeight: 17,
  },
  neutralCard: {
    backgroundColor: colors.surface.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  neutralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  neutralIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3EDE2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  neutralTextCol: {
    flex: 1,
  },
  neutralTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.navy.deep,
  },
  neutralSubtitle: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
  },
  neutralDesc: {
    fontSize: 13,
    color: '#4A4A4A',
    lineHeight: 19,
    marginBottom: 16,
  },
  neutralFeatureList: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#EFEAE2',
    paddingTop: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.navy.deep,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface.white,
    borderTopWidth: 1,
    borderTopColor: '#EFEAE2',
  },
});
