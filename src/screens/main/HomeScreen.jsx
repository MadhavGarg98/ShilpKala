import React, { useState, useEffect, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import TabRootHeader from '../../components/TabRootHeader';
import { getProducts } from '../../services/products';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n';

const ARTISAN_TIPS = [
  {
    hindi: 'अच्छी प्राकृतिक रोशनी में ली गई तस्वीरें ३ गुना अधिक खरीदारों को आकर्षित करती हैं।',
    english: 'Photos taken in good natural daylight attract 3x more buyer inquiries.',
  },
  {
    hindi: 'हथकरघा बुनाई की छोटी वीडियो खरीदारों में भरोसा और प्रामाणिकता बढ़ाती है।',
    english: 'Short craft process clips build strong trust and authenticity with buyers.',
  },
  {
    hindi: 'अपने उत्पाद के साथ जीआई (GI) प्रमाणन अवश्य जोड़ें — इससे अधिक मूल्य मिलता है।',
    english: 'Always highlight your GI certification badge to command premium pricing.',
  },
];

export default function HomeScreen({ navigation }) {
  const artisanProfile = useAppStore((state) => state.artisanProfile);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'live', 'draft'
  const [tipIndex, setTipIndex] = useState(0);
  const { t, currentLanguage } = useTranslation();

  const fetchProductList = async () => {
    try {
      const list = await getProducts();
      setProducts(list || []);
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProductList();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProductList();
  };

  const handleNextTip = () => {
    setTipIndex((prev) => (prev + 1) % ARTISAN_TIPS.length);
  };

  const handleAddProductPress = () => {
    // Navigate to AddProductStack
    navigation.navigate('AddProduct', { screen: 'CameraCapture' });
  };

  // Stats computation
  const liveCount = useMemo(
    () => products.filter((p) => p.status === 'live').length,
    [products]
  );
  const totalInquiries = useMemo(
    () => products.reduce((acc, p) => acc + (p.inquiryCount || 0), 0),
    [products]
  );
  const totalViews = useMemo(
    () => products.reduce((acc, p) => acc + (p.viewsCount || 0), 0),
    [products]
  );

  // Filtered products
  const filteredProducts = useMemo(() => {
    if (activeFilter === 'live') {
      return products.filter((p) => p.status === 'live');
    }
    if (activeFilter === 'draft') {
      return products.filter((p) => p.status === 'draft');
    }
    return products;
  }, [products, activeFilter]);

  const currentTip = ARTISAN_TIPS[tipIndex];

  // Render Header & Widgets inside FlatList ListHeaderComponent
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* 1. Artisan Greeting */}
      <View style={styles.greetingRow}>
        <View>
          <Text style={styles.greetingPrimary}>
            {t('welcomeArtisan')}, {artisanProfile?.name?.split(' ')[0] || 'कारीगर'} जी 🙏
          </Text>
          <Text style={styles.greetingSecondary}>
            {t('storefrontSubtitle')}
          </Text>
        </View>
        <View style={styles.locationChip}>
          <Ionicons name="location" size={12} color={colors.primary.rust} />
          <Text style={styles.locationChipText}>वाराणसी</Text>
        </View>
      </View>

      {/* 2. Large "Add Product" Action Card */}
      <TouchableOpacity
        activeOpacity={0.88}
        style={styles.addProductCard}
        onPress={handleAddProductPress}
      >
        <View style={styles.addCardLeft}>
          <View style={styles.addBadge}>
            <Text style={styles.addBadgeText}>{t('quickList')}</Text>
          </View>
          <Text style={styles.addCardTitlePrimary}>{t('addProduct')}</Text>
          {currentLanguage !== 'en' && (
            <Text style={styles.addCardTitleSecondary}>Add New Craft Product</Text>
          )}
          <Text style={styles.addCardSubtitle}>
            {t('addCardSubtitle')}
          </Text>
        </View>

        <View style={styles.addCardRightIcons}>
          <View style={styles.addIconCircle}>
            <Ionicons name="camera" size={24} color={colors.surface.white} />
          </View>
          <View style={[styles.addIconCircle, styles.addMicCircle]}>
            <Ionicons name="mic" size={20} color={colors.surface.white} />
          </View>
        </View>
      </TouchableOpacity>

      {/* 3. 3 Stat Chips (Live, Inquiries, Views) */}
      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          <View style={[styles.statDot, { backgroundColor: colors.status.green }]} />
          <Text style={styles.statValue}>{liveCount}</Text>
          <Text style={styles.statLabelPrimary}>{t('statLive')}</Text>
          {currentLanguage !== 'en' && <Text style={styles.statLabelSecondary}>Live</Text>}
        </View>

        <View style={styles.statChip}>
          <View style={[styles.statDot, { backgroundColor: colors.status.amber }]} />
          <Text style={styles.statValue}>{totalInquiries}</Text>
          <Text style={styles.statLabelPrimary}>{t('statInquiries')}</Text>
          {currentLanguage !== 'en' && <Text style={styles.statLabelSecondary}>Inquiries</Text>}
        </View>

        <View style={styles.statChip}>
          <View style={[styles.statDot, { backgroundColor: colors.accent.blue }]} />
          <Text style={styles.statValue}>{totalViews > 0 ? totalViews : 148}</Text>
          <Text style={styles.statLabelPrimary}>{t('statViews')}</Text>
          {currentLanguage !== 'en' && <Text style={styles.statLabelSecondary}>Views</Text>}
        </View>
      </View>

      {/* 4. Rotating "Artisan Tip" Card */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleNextTip}
        style={styles.tipCard}
      >
        <View style={styles.tipHeader}>
          <View style={styles.tipTitleGroup}>
            <Ionicons name="bulb" size={18} color={colors.status.gold} />
            <Text style={styles.tipTitle}>
              {t('artisanTipTitle')} ({tipIndex + 1}/{ARTISAN_TIPS.length})
            </Text>
          </View>
          <Text style={styles.tipTapNotice}>{t('tipTapNotice')}</Text>
        </View>
        <Text style={styles.tipPrimary}>
          {currentLanguage === 'en' ? currentTip.english : currentTip.hindi}
        </Text>
        {currentLanguage !== 'en' && (
          <Text style={styles.tipSecondary}>{currentTip.english}</Text>
        )}
      </TouchableOpacity>

      {/* 5. Filter Tabs (All / Live / Draft) */}
      <View style={styles.filterSection}>
        <View style={styles.filterTitleRow}>
          <Text style={styles.sectionHeadingPrimary}>{t('yourCatalog')}</Text>
          <Text style={styles.sectionHeadingSecondary}>{t('catalogSubtitle')}</Text>
        </View>

        <View style={styles.filterTabsRow}>
          <TouchableOpacity
            style={[
              styles.filterTab,
              activeFilter === 'all' && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilter('all')}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'all' && styles.filterTabTextActive,
              ]}
            >
              {t('all')} ({products.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterTab,
              activeFilter === 'live' && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilter('live')}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'live' && styles.filterTabTextActive,
              ]}
            >
              {t('live')} ({liveCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterTab,
              activeFilter === 'draft' && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilter('draft')}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'draft' && styles.filterTabTextActive,
              ]}
            >
              {t('draft')} ({products.length - liveCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Render Single Product Card
  const renderProductItem = ({ item }) => {
    const isLive = item.status === 'live';

    return (
      <View style={styles.productCard}>
        <Image source={{ uri: item.imageUrl }} style={styles.productImage} />

        <View style={styles.productDetails}>
          {/* Top badges */}
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.statusBadge,
                isLive ? styles.statusLive : styles.statusDraft,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  isLive ? styles.statusTextLive : styles.statusTextDraft,
                ]}
              >
                {isLive ? `● ${t('statLive')}` : `○ ${t('draft')}`}
              </Text>
            </View>

            {item.isGiCertified && (
              <View style={styles.giTag}>
                <Ionicons name="ribbon" size={11} color={colors.status.green} />
                <Text style={styles.giTagText}>{t('giCertified')}</Text>
              </View>
            )}
          </View>

          {/* Bilingual Title */}
          <Text style={styles.productPrimaryTitle} numberOfLines={1}>
            {currentLanguage === 'en' ? item.titleEnglish : item.titleHindi}
          </Text>
          {currentLanguage !== 'en' && (
            <Text style={styles.productSecondaryTitle} numberOfLines={1}>
              {item.titleEnglish}
            </Text>
          )}

          {/* Price & Action Row */}
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>₹{item.price?.toLocaleString('en-IN')}</Text>

            {item.inquiryCount > 0 && (
              <View style={styles.inquiryChip}>
                <Ionicons
                  name="chatbubble-ellipses"
                  size={12}
                  color={colors.primary.rust}
                />
                <Text style={styles.inquiryText}>
                  {item.inquiryCount} {t('newInquiriesCount')}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Render Empty State
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="cube-outline" size={44} color={colors.text.muted} />
      </View>
      <Text style={styles.emptyTitlePrimary}>{t('noProductsFound')}</Text>
      <Text style={styles.emptyDesc}>{t('noProductsFoundDesc')}</Text>
      <TouchableOpacity
        style={styles.emptyAddBtn}
        onPress={handleAddProductPress}
      >
        <Ionicons name="add" size={18} color={colors.surface.white} />
        <Text style={styles.emptyAddText}>{t('addProduct')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <TabRootHeader />

      {loading ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color={colors.primary.rust} />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderProductItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary.rust]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.cream,
  },
  loaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  headerContainer: {
    marginBottom: 8,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  greetingPrimary: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
  },
  greetingSecondary: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 2,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3EDE2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  locationChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary.rust,
  },
  addProductCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary.rust,
    borderRadius: 18,
    padding: 18,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: colors.primary.rust,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  addCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  addBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  addBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.surface.white,
    letterSpacing: 0.8,
  },
  addCardTitlePrimary: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.surface.white,
    fontFamily: typography.fontFamilies?.body,
  },
  addCardTitleSecondary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFE6DC',
  },
  addCardSubtitle: {
    fontSize: 11,
    color: '#FFF0EA',
    marginTop: 6,
    lineHeight: 15,
  },
  addCardRightIcons: {
    alignItems: 'center',
    gap: 8,
  },
  addIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMicCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.navy.deep,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statChip: {
    flex: 1,
    backgroundColor: colors.surface.white,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy.deep,
  },
  statLabelPrimary: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.navy.deep,
    marginTop: 2,
  },
  statLabelSecondary: {
    fontSize: 10,
    color: colors.text.muted,
  },
  tipCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#EFE1CE',
    borderLeftWidth: 4,
    borderLeftColor: colors.status.gold,
  },
  tipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tipTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tipTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.status.amber,
    letterSpacing: 0.5,
  },
  tipTapNotice: {
    fontSize: 11,
    color: colors.primary.rust,
    fontWeight: '600',
  },
  tipPrimary: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy.deep,
    lineHeight: 18,
  },
  tipSecondary: {
    fontSize: 11,
    color: colors.text.muted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  filterSection: {
    marginBottom: 14,
  },
  filterTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 10,
  },
  sectionHeadingPrimary: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.navy.deep,
  },
  sectionHeadingSecondary: {
    fontSize: 13,
    color: colors.text.muted,
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surface.white,
    borderWidth: 1,
    borderColor: '#E8E3DA',
  },
  filterTabActive: {
    backgroundColor: colors.primary.rust,
    borderColor: colors.primary.rust,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.navy.deep,
  },
  filterTabTextActive: {
    color: colors.surface.white,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    shadowColor: colors.navy.deep,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  productImage: {
    width: 88,
    height: 88,
    borderRadius: 10,
    backgroundColor: '#F0EDE8',
  },
  productDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusLive: {
    backgroundColor: '#E8F5E9',
  },
  statusDraft: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextLive: {
    color: colors.status.green,
  },
  statusTextDraft: {
    color: colors.status.amber,
  },
  giTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  giTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.status.green,
  },
  productPrimaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
  },
  productSecondaryTitle: {
    fontSize: 12,
    color: colors.text.muted,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary.rust,
  },
  inquiryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF4EF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  inquiryText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary.rust,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface.white,
    borderWidth: 1,
    borderColor: '#E8E3DA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitlePrimary: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.navy.deep,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
    maxWidth: 280,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary.rust,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
  },
  emptyAddText: {
    color: colors.surface.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
