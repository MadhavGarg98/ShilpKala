import React, { useState, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import TabRootHeader from '../../components/TabRootHeader';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n';

const FILTERS = ['all', 'live', 'draft'];

export default function ProductsScreen({ navigation }) {
  const products = useAppStore((state) => state.products);
  const [activeFilter, setActiveFilter] = useState('all');
  const { t, currentLanguage } = useTranslation();

  const filteredProducts = useMemo(() => {
    if (activeFilter === 'all') return products;
    return products.filter((p) => p.status === activeFilter);
  }, [products, activeFilter]);

  const liveCount = useMemo(() => products.filter((p) => p.status === 'live').length, [products]);
  const draftCount = useMemo(() => products.filter((p) => p.status === 'draft').length, [products]);

  const handleProductPress = (product) => {
    // Future: navigate to product detail/edit screen
  };

  const handleAddProduct = () => {
    navigation.navigate('AddProduct');
  };

  const getFilterLabel = (filter) => {
    switch (filter) {
      case 'all':
        return `${t('all')} (${products.length})`;
      case 'live':
        return `${t('live')} (${liveCount})`;
      case 'draft':
        return `${t('draft')} (${draftCount})`;
      default:
        return filter;
    }
  };

  const renderProductCard = ({ item }) => {
    const title =
      currentLanguage === 'en'
        ? item.titleEnglish || item.titleHindi
        : item.titleHindi || item.titleEnglish;
    const isLive = item.status === 'live';

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.productCard}
        onPress={() => handleProductPress(item)}
      >
        {/* Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.imageUrl || item.image }}
            style={styles.productImage}
          />
          {/* Status Badge */}
          <View
            style={[
              styles.statusBadge,
              isLive ? styles.statusLive : styles.statusDraft,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isLive ? colors.surface.white : colors.text.muted },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: isLive ? colors.surface.white : colors.text.muted },
              ]}
            >
              {isLive ? 'LIVE' : 'DRAFT'}
            </Text>
          </View>

          {/* GI Badge */}
          {item.isGiCertified && (
            <View style={styles.giOverlayBadge}>
              <Ionicons name="ribbon" size={10} color={colors.surface.white} />
              <Text style={styles.giOverlayText}>GI</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.cardPrice}>
            ₹{item.price?.toLocaleString('en-IN')}
          </Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={12} color={colors.text.muted} />
              <Text style={styles.statText}>{item.viewsCount || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="chatbubble-outline" size={11} color={colors.text.muted} />
              <Text style={styles.statText}>{item.inquiryCount || 0}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="cube-outline" size={56} color="#D8D2C8" />
      <Text style={styles.emptyTitle}>{t('noProductsFound')}</Text>
      <Text style={styles.emptyDesc}>{t('noProductsFoundDesc')}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <TabRootHeader
        titleHindi="उत्पाद सूची"
        titleEnglish="Products"
        subtitle="आपकी पूरी हस्तशिल्प सूची • Complete Catalog"
      />

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            activeOpacity={0.8}
            onPress={() => setActiveFilter(f)}
            style={[
              styles.filterChip,
              activeFilter === f && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === f && styles.filterChipTextActive,
              ]}
            >
              {getFilterLabel(f)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Product Grid */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.gridRow}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB: Add New Product */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleAddProduct}
        style={styles.fab}
      >
        <Ionicons name="add" size={28} color={colors.surface.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.cream,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surface.white,
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  filterChipActive: {
    backgroundColor: colors.navy.deep,
    borderColor: colors.navy.deep,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy.deep,
  },
  filterChipTextActive: {
    color: colors.surface.white,
  },
  gridContent: {
    paddingHorizontal: 12,
    paddingBottom: 80,
  },
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  productCard: {
    width: '48%',
    backgroundColor: colors.surface.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: colors.navy.deep,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  imageContainer: {
    width: '100%',
    height: 130,
    backgroundColor: '#F0EDE8',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusLive: {
    backgroundColor: colors.status.green,
  },
  statusDraft: {
    backgroundColor: '#F3EDE2',
    borderWidth: 1,
    borderColor: '#E2DBD0',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  giOverlayBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: colors.status.gold,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
  },
  giOverlayText: {
    color: colors.surface.white,
    fontSize: 9,
    fontWeight: '800',
  },
  cardInfo: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy.deep,
    lineHeight: 17,
    marginBottom: 4,
    fontFamily: typography.fontFamilies?.body,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primary.rust,
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontSize: 11,
    color: colors.text.muted,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.navy.deep,
    marginTop: 14,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 19,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.rust,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary.rust,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
