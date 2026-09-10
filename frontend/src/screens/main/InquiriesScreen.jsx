import React, { useState, useEffect, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import TabRootHeader from '../../components/TabRootHeader';
import PrimaryButton from '../../components/PrimaryButton';
import VoiceInputButton from '../../components/VoiceInputButton';
import { useAppStore } from '../../store/useAppStore';
import { sendInquiryReply } from '../../services/inquiries';
import { useTranslation } from '../../i18n';
import { resolveImageSource } from '../../utils/imageUtils';

const STATUS_FILTERS = ['all', 'unread', 'read', 'replied'];

export default function InquiriesScreen() {
  const inquiries = useAppStore((state) => state.inquiries);
  const products = useAppStore((state) => state.products);
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const { t, currentLanguage } = useTranslation();

  const filteredInquiries = useMemo(() => {
    if (activeFilter === 'all') return inquiries;
    return inquiries.filter((i) => i.status === activeFilter);
  }, [inquiries, activeFilter]);

  const getProductForInquiry = (productId) => {
    return products.find((p) => p.id === productId);
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'unread':
        return { bg: '#FFF2EB', text: colors.primary.rust, label: t('statusNewLabel') };
      case 'read':
        return { bg: '#F3EDE2', text: colors.navy.deep, label: t('statusReadLabel') };
      case 'replied':
        return { bg: '#F3FAF5', text: colors.status.green, label: t('statusRepliedLabel') };
      default:
        return { bg: '#F3EDE2', text: colors.text.muted, label: status };
    }
  };

  const handleReply = async (inquiryId) => {
    if (!replyText.trim()) return;
    setReplying(true);
    try {
      await sendInquiryReply(inquiryId, { message: replyText });
      setReplyText('');
      setExpandedId(null);
      Alert.alert(
        t('replySentTitle'),
        t('replySentMsg')
      );
    } catch (err) {
      console.error('Reply error:', err);
    } finally {
      setReplying(false);
    }
  };

  const handleVoiceReply = (text) => {
    setReplyText(text);
  };

  const getFilterLabel = (filter) => {
    const counts = {
      all: inquiries.length,
      unread: inquiries.filter((i) => i.status === 'unread').length,
      read: inquiries.filter((i) => i.status === 'read').length,
      replied: inquiries.filter((i) => i.status === 'replied').length,
    };
    const labels = {
      all: t('filterAll'),
      unread: t('filterNew'),
      read: t('filterRead'),
      replied: t('filterReplied'),
    };
    return `${labels[filter]} (${counts[filter]})`;
  };

  const renderInquiryCard = ({ item }) => {
    const product = getProductForInquiry(item.productId);
    const statusStyle = getStatusStyle(item.status);
    const isExpanded = expandedId === item.id;
    const isUnread = item.status === 'unread';

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
        style={[
          styles.inquiryCard,
          isUnread && styles.inquiryCardUnread,
        ]}
      >
        {/* Header Row */}
        <View style={styles.inquiryHeader}>
          <Image
            source={resolveImageSource(item.buyerAvatar)}
            style={styles.buyerAvatar}
          />
          <View style={styles.buyerInfoCol}>
            <Text style={styles.buyerName}>{item.buyerName}</Text>
            <Text style={styles.buyerCompany} numberOfLines={1}>
              {item.buyerCompany}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusPillText, { color: statusStyle.text }]}>
                {statusStyle.label}
              </Text>
            </View>
            <Text style={styles.timestamp}>{item.timestamp}</Text>
          </View>
        </View>

        {/* Product Reference Strip */}
        {product && (
          <View style={styles.productRefStrip}>
            <Image
              source={resolveImageSource(product.imageUrl || product.image)}
              style={styles.productThumb}
            />
            <Text style={styles.productRefTitle} numberOfLines={1}>
              {t(product.titleKey) ||
                (currentLanguage === 'en'
                  ? product.titleEnglish
                  : product.titleHindi)}
            </Text>
            <Text style={styles.productRefPrice}>
              ₹{product.price?.toLocaleString('en-IN')}
            </Text>
          </View>
        )}

        {/* Message */}
        <View style={styles.messageBlock}>
          <Text style={styles.messageText}>
            {t(item.messageKey) ||
              (currentLanguage === 'en'
                ? item.messageOriginal
                : item.messageHindi)}
          </Text>
          {currentLanguage !== 'en' && (
            <Text style={styles.messageSecondary}>{item.messageOriginal}</Text>
          )}
        </View>

        {/* Tags */}
        {item.tags?.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.map((tag, idx) => (
              <View key={idx} style={styles.tagPill}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Expanded Reply Section */}
        {isExpanded && item.status !== 'replied' && (
          <View style={styles.replySection}>
            <View style={styles.replyInputRow}>
              <TextInput
                style={styles.replyInput}
                value={replyText}
                onChangeText={setReplyText}
                placeholder={
                  currentLanguage === 'en'
                    ? 'Type your reply...'
                    : t('replyPlaceholder')
                }
                placeholderTextColor={colors.text.muted}
                multiline
              />
              <VoiceInputButton
                size={36}
                mockText={t('voiceReplyMockText')}
                onTranscribed={handleVoiceReply}
              />
            </View>
            <PrimaryButton
              title={t('sendReplyBtn')}
              loading={replying}
              disabled={!replyText.trim()}
              onPress={() => handleReply(item.id)}
            />
          </View>
        )}

        {/* Replied Indicator */}
        {item.status === 'replied' && (
          <View style={styles.repliedNote}>
            <Ionicons name="checkmark-circle" size={14} color={colors.status.green} />
            <Text style={styles.repliedNoteText}>
              {currentLanguage === 'en'
                ? 'You have replied to this inquiry'
                : t('repliedConfirmation')}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={56} color="#D8D2C8" />
      <Text style={styles.emptyTitle}>
        {currentLanguage === 'en'
          ? 'No Inquiries Yet'
          : t('noInquiriesYet')}
      </Text>
      <Text style={styles.emptyDesc}>
        {currentLanguage === 'en'
          ? 'When buyers send inquiries about your products, they will appear here.'
          : t('noInquiriesYetDesc')}}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <TabRootHeader
        title={t('inquiriesTitle')}
        subtitle={t('inquiriesSubtitle')}
      />

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
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

      {/* Inquiry List */}
      <FlatList
        data={filteredInquiries}
        renderItem={renderInquiryCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
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
    gap: 6,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: colors.surface.white,
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  filterChipActive: {
    backgroundColor: colors.navy.deep,
    borderColor: colors.navy.deep,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.navy.deep,
  },
  filterChipTextActive: {
    color: colors.surface.white,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  inquiryCard: {
    backgroundColor: colors.surface.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  inquiryCardUnread: {
    borderColor: colors.primary.rust,
    borderWidth: 1.5,
    shadowColor: colors.primary.rust,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  inquiryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  buyerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0EDE8',
    marginRight: 10,
  },
  buyerInfoCol: {
    flex: 1,
  },
  buyerName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy.deep,
  },
  buyerCompany: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 10,
    color: colors.text.muted,
  },
  productRefStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.cream,
    padding: 8,
    borderRadius: 10,
    gap: 8,
    marginBottom: 10,
  },
  productThumb: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#E8E3DA',
  },
  productRefTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.navy.deep,
  },
  productRefPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary.rust,
  },
  messageBlock: {
    marginBottom: 8,
  },
  messageText: {
    fontSize: 13,
    color: colors.navy.deep,
    lineHeight: 19,
    fontWeight: '600',
  },
  messageSecondary: {
    fontSize: 12,
    color: colors.text.muted,
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 17,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  tagPill: {
    backgroundColor: '#FFF8F4',
    borderWidth: 1,
    borderColor: '#F8D7C8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary.rust,
  },
  replySection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EFEAE2',
    gap: 10,
  },
  replyInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.background.cream,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2DBD0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  replyInput: {
    flex: 1,
    fontSize: 14,
    color: colors.navy.deep,
    minHeight: 36,
    maxHeight: 80,
  },
  repliedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EFEAE2',
  },
  repliedNoteText: {
    fontSize: 12,
    color: colors.status.green,
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
});
