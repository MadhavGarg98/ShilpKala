import React, { useState, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import TabRootHeader from '../../components/TabRootHeader';
import AudioPlayerInline from '../../components/AudioPlayerInline';
import IllustratedEmptyState from '../../components/IllustratedEmptyState';
import PrimaryButton from '../../components/PrimaryButton';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n';
import { resolveImageSource } from '../../utils/imageUtils';

const FILTERS = ['all', 'unread', 'bulk'];

export default function InquiriesList({ navigation }) {
  const inquiries = useAppStore((state) => state.inquiries);
  const unreadCount = useAppStore((state) => state.unreadInquiryCount);
  const [activeFilter, setActiveFilter] = useState('all');
  const { t, currentLanguage } = useTranslation();

  const filteredInquiries = useMemo(() => {
    if (activeFilter === 'unread') {
      return inquiries.filter((i) => i.status === 'unread');
    }
    if (activeFilter === 'bulk') {
      return inquiries.filter((i) => i.isBulk);
    }
    return inquiries;
  }, [inquiries, activeFilter]);

  // Audio sequence text for all unread inquiries
  const unreadAudioText = useMemo(() => {
    const unreadItems = inquiries.filter((i) => i.status === 'unread');
    if (unreadItems.length === 0) {
      return 'आपके पास कोई नया अपठित संदेश नहीं है। You have no unread buyer inquiries.';
    }
    return unreadItems
      .map(
        (item, index) =>
          `संदेश ${index + 1}: ${item.buyerName}, ${item.buyerCompany} से। उत्पाद: ${
            item.productTitleHindi || item.productTitleEnglish
          }। संदेश: ${item.messageHindi || item.messageOriginal}`
      )
      .join(' ... ');
  }, [inquiries]);

  const handleInquiryPress = (inquiry) => {
    navigation.navigate('InquiryThread', { inquiry });
  };

  const handleCompose = () => {
    Alert.alert(
      t('composeInquiry'),
      currentLanguage === 'en'
        ? 'Compose a new direct craft inquiry or quotation for registered wholesale buyers.'
        : 'पंजीकृत थोक खरीदारों के लिए एक नया सीधा शिल्प संदेश या कोटेशन तैयार करें।',
      [{ text: 'OK' }]
    );
  };

  const handleVoiceReplyShortcut = () => {
    // Open the first unread inquiry thread or top inquiry
    const target = inquiries.find((i) => i.status === 'unread') || inquiries[0];
    if (target) {
      navigation.navigate('VoiceReply', { inquiry: target });
    }
  };

  const renderInquiryCard = ({ item }) => {
    const isUnread = item.status === 'unread';
    const isReplied = item.status === 'replied';

    // Status pill styling & copy
    let statusBg = '#EAE8E4';
    let statusTextColor = colors.navy.deep;
    let statusText = t('statusRead');

    if (isUnread) {
      statusBg = '#FBECE5';
      statusTextColor = colors.primary.rust;
      statusText = t('statusNew');
    } else if (isReplied) {
      statusBg = '#E6F4EA';
      statusTextColor = colors.status.green;
      statusText = t('statusUnderReview'); // Scope rule: "Under review" rather than "Approved"
    }

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => handleInquiryPress(item)}
        style={[
          styles.inquiryCard,
          isUnread && styles.inquiryCardUnread,
        ]}
      >
        {/* Buyer Header Row */}
        <View style={styles.cardHeader}>
          <View style={styles.buyerRow}>
            <Image
              source={resolveImageSource(item.buyerAvatar)}
              style={styles.avatar}
            />
            <View style={styles.buyerMeta}>
              <View style={styles.nameRow}>
                <Text style={styles.buyerName} numberOfLines={1}>
                  {item.buyerName}
                </Text>
                {isUnread && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.buyerCompany} numberOfLines={1}>
                {item.buyerCompany}
              </Text>
            </View>
          </View>

          <View style={styles.timeStatusCol}>
            <Text style={styles.timestamp}>{item.timestamp}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusBadgeText, { color: statusTextColor }]}>
                {statusText}
              </Text>
            </View>
          </View>
        </View>

        {/* Product Context Strip */}
        <View style={styles.productStrip}>
          <Image
            source={resolveImageSource(item.productImageUrl || item.productImage)}
            style={styles.productThumb}
          />
          <View style={styles.productInfo}>
            <Text style={styles.productTitle} numberOfLines={1}>
              {t(item.productTitleKey) ||
                (currentLanguage === 'en'
                  ? item.productTitleEnglish || item.productTitleHindi
                  : item.productTitleHindi || item.productTitleEnglish)}
            </Text>
            <Text style={styles.productPrice}>
              ₹{(item.productPrice || 0).toLocaleString('en-IN')}
            </Text>
          </View>
          {item.isGiCertified && (
            <View style={styles.giMiniChip}>
              <Ionicons name="ribbon" size={10} color={colors.surface.white} />
              <Text style={styles.giMiniText}>GI</Text>
            </View>
          )}
        </View>

        {/* Message Preview */}
        <View style={styles.messageBox}>
          <Text style={styles.messageHindi} numberOfLines={2}>
            {t(item.messageKey) || item.messageHindi}
          </Text>
          <Text style={styles.messageEnglish} numberOfLines={1}>
            "{item.messageOriginal}"
          </Text>
        </View>

        {/* Chips Row (Bulk / GI Query / Tags) */}
        <View style={styles.chipsRow}>
          {item.isBulk && (
            <View style={styles.bulkChip}>
              <Ionicons name="cube-outline" size={12} color={colors.primary.rust} />
              <Text style={styles.bulkChipText}>
                {item.bulkQuantity} pcs • ₹{(item.bulkEstimatedValue || 0).toLocaleString('en-IN')}
              </Text>
            </View>
          )}
          {item.isGiQuery && (
            <View style={styles.giQueryChip}>
              <Ionicons name="shield-checkmark-outline" size={12} color={colors.status.gold} />
              <Text style={styles.giQueryChipText}>
                GI Registry Query
              </Text>
            </View>
          )}
          <View style={styles.arrowIconWrap}>
            <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <IllustratedEmptyState
      type="inquiries"
      titleHindi="अभी कोई खरीदार संदेश नहीं है"
      titleEnglish="No buyer inquiries yet"
      descHindi="जब खरीदार आपकी हस्तशिल्प कला देखेंगे, उनके संदेश और पूछताछ यहाँ दिखाई देंगे।"
      descEnglish="When buyers across the world discover your craft listings, their inquiries will appear right here."
    />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. TabRootHeader with dynamic title and unread badge */}
      <TabRootHeader
        title={t('buyerInquiriesHeadline')}
        subtitle="सीधी खरीदार बातचीत • Direct Buyer Inquiries"
        rightElement={
          <View style={styles.unreadHeaderBadge}>
            <Text style={styles.unreadHeaderBadgeText}>
              {unreadCount} {t('statusNew')}
            </Text>
          </View>
        }
      />

      {/* 2. Listen to Inquiries Banner using AudioPlayerInline */}
      <View style={styles.listenBarSection}>
        <AudioPlayerInline
          textToSpeak={unreadAudioText}
          language={currentLanguage === 'en' ? 'en-US' : 'hi-IN'}
          label={t('listenToInquiries')}
          playingLabel={t('playingInquiries')}
          variant="bar"
        />
      </View>

      {/* 3. Segmented Filter Row: All / Unread / Bulk Inquiries (never "orders") */}
      <View style={styles.filtersContainer}>
        {FILTERS.map((f) => {
          const isActive = activeFilter === f;
          let label = t('filterAllInquiries');
          let count = inquiries.length;

          if (f === 'unread') {
            label = t('filterUnreadInquiries');
            count = inquiries.filter((i) => i.status === 'unread').length;
          } else if (f === 'bulk') {
            label = t('filterBulkInquiries');
            count = inquiries.filter((i) => i.isBulk).length;
          }

          return (
            <TouchableOpacity
              key={f}
              activeOpacity={0.75}
              onPress={() => setActiveFilter(f)}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  isActive && styles.filterTabTextActive,
                ]}
              >
                {label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 4. FlatList of Inquiry Cards */}
      <FlatList
        data={filteredInquiries}
        keyExtractor={(item) => item.id}
        renderItem={renderInquiryCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
      />

      {/* 5. Bottom-pinned Quick Action Row: Voice Reply shortcut + Compose Inquiry */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleVoiceReplyShortcut}
          style={styles.voiceShortcutBtn}
        >
          <View style={styles.voiceIconRing}>
            <Ionicons name="mic" size={18} color={colors.surface.white} />
          </View>
          <Text style={styles.voiceShortcutText} numberOfLines={1}>
            {t('voiceReplyShortcut')}
          </Text>
        </TouchableOpacity>

        <View style={styles.composeBtnWrapper}>
          <PrimaryButton
            title={t('composeInquiry')}
            leadingIcon="create-outline"
            onPress={handleCompose}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.cream,
  },
  unreadHeaderBadge: {
    backgroundColor: colors.primary.rust,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unreadHeaderBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.surface.white,
    fontFamily: typography.fontFamilies?.body,
  },
  listenBarSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#EFECE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabActive: {
    backgroundColor: colors.navy.deep,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.muted,
    fontFamily: typography.fontFamilies?.body,
  },
  filterTabTextActive: {
    color: colors.surface.white,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 100,
  },
  inquiryCard: {
    backgroundColor: colors.surface.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    shadowColor: colors.navy.deep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  inquiryCardUnread: {
    borderColor: '#F8D7C8',
    backgroundColor: '#FFFCFA',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary.rust,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  buyerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EAE6DF',
  },
  buyerMeta: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  buyerName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary.rust,
  },
  buyerCompany: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 1,
    fontFamily: typography.fontFamilies?.latin,
  },
  timeStatusCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  timestamp: {
    fontSize: 11,
    color: colors.text.muted,
    fontFamily: typography.fontFamilies?.latin,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: typography.fontFamilies?.body,
  },
  productStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F5F0',
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
    gap: 10,
  },
  productThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
  },
  productPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary.rust,
  },
  giMiniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  giMiniText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.surface.white,
  },
  messageBox: {
    marginBottom: 8,
  },
  messageHindi: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy.deep,
    lineHeight: 20,
    fontFamily: typography.fontFamilies?.devanagari,
  },
  messageEnglish: {
    fontSize: 12.5,
    fontStyle: 'italic',
    color: colors.text.muted,
    lineHeight: 17,
    marginTop: 3,
    fontFamily: typography.fontFamilies?.latin,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  bulkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2EB',
    borderWidth: 1,
    borderColor: '#F8D7C8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 5,
  },
  bulkChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary.rust,
  },
  giQueryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF7E8',
    borderWidth: 1,
    borderColor: '#F5DEB3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 5,
  },
  giQueryChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.status.gold,
  },
  arrowIconWrap: {
    marginLeft: 'auto',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy.deep,
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.text.muted,
    textAlign: 'center',
    paddingHorizontal: 30,
    marginTop: 6,
    lineHeight: 19,
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
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: colors.navy.deep,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  voiceShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.navy.deep,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 8,
  },
  voiceIconRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary.rust,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceShortcutText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.surface.white,
    fontFamily: typography.fontFamilies?.body,
  },
  composeBtnWrapper: {
    flex: 1,
  },
});
