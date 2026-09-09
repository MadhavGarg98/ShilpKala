import React, { useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import TabRootHeader from '../../components/TabRootHeader';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n';

const NOTIFICATION_ICONS = {
  inquiry: { name: 'chatbubbles', color: colors.primary.rust, bg: '#FFF2EB' },
  gi_verification: { name: 'ribbon', color: colors.status.gold, bg: '#FFF8E7' },
  draft_reminder: { name: 'document-text-outline', color: colors.status.amber, bg: '#FFF5E6' },
  order_update: { name: 'cube', color: colors.status.green, bg: '#F3FAF5' },
  system: { name: 'information-circle', color: colors.navy.deep, bg: '#F0EDF5' },
};

export default function AlertsScreen() {
  const notifications = useAppStore((state) => state.notifications);
  const markAllNotificationsRead = useAppStore((state) => state.markAllNotificationsRead);
  const unreadCount = useAppStore((state) => state.unreadNotificationCount);
  const { t, currentLanguage } = useTranslation();

  // Group notifications by their `group` field
  const sections = useMemo(() => {
    const grouped = {};
    notifications.forEach((n) => {
      const groupKey = n.group || 'Other';
      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push(n);
    });
    return Object.keys(grouped).map((title) => ({
      title,
      data: grouped[title],
    }));
  }, [notifications]);

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
  };

  const getIconConfig = (type) => {
    return NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.system;
  };

  const renderNotification = ({ item }) => {
    const iconCfg = getIconConfig(item.type);
    const isUnread = !item.isRead;

    return (
      <View
        style={[
          styles.notifCard,
          isUnread && styles.notifCardUnread,
        ]}
      >
        {/* Icon Circle */}
        <View style={[styles.iconCircle, { backgroundColor: iconCfg.bg }]}>
          <Ionicons name={iconCfg.name} size={20} color={iconCfg.color} />
        </View>

        {/* Content */}
        <View style={styles.notifContent}>
          <View style={styles.notifTitleRow}>
            <Text
              style={[styles.notifTitle, isUnread && styles.notifTitleUnread]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notifMessage} numberOfLines={2}>
            {item.message}
          </Text>
          <View style={styles.notifFooter}>
            <Text style={styles.notifTimestamp}>{item.timestamp}</Text>
            {item.actionText && (
              <TouchableOpacity activeOpacity={0.7} style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>{item.actionText}</Text>
                <Ionicons name="chevron-forward" size={12} color={colors.primary.rust} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-off-outline" size={56} color="#D8D2C8" />
      <Text style={styles.emptyTitle}>
        {currentLanguage === 'en'
          ? 'No Notifications'
          : 'कोई सूचना नहीं'}
      </Text>
      <Text style={styles.emptyDesc}>
        {currentLanguage === 'en'
          ? 'You\'re all caught up! Order and market updates will appear here.'
          : 'सब अपडेट हो चुके हैं! ऑर्डर और बाज़ार अपडेट यहां दिखाई देंगे।'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <TabRootHeader
        titleHindi="सूचनाएं"
        titleEnglish="Alerts"
        subtitle="ऑर्डर और बाज़ार अपडेट • Order & Market Alerts"
      />

      {/* Mark All Read Row */}
      {unreadCount > 0 && (
        <View style={styles.markAllRow}>
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {unreadCount} {currentLanguage === 'en' ? 'unread' : 'अपठित'}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleMarkAllRead}
            style={styles.markAllBtn}
          >
            <Ionicons name="checkmark-done" size={16} color={colors.primary.rust} />
            <Text style={styles.markAllBtnText}>
              {currentLanguage === 'en' ? 'Mark all read' : 'सभी पढ़ा चिह्नित करें'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notification List */}
      <SectionList
        sections={sections}
        renderItem={renderNotification}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.cream,
  },
  markAllRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  unreadBadge: {
    backgroundColor: '#FFF2EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F8D7C8',
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary.rust,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markAllBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary.rust,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionHeader: {
    paddingVertical: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    gap: 12,
  },
  notifCardUnread: {
    backgroundColor: '#FFFBF8',
    borderColor: '#F5DAC8',
    borderWidth: 1.5,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifContent: {
    flex: 1,
  },
  notifTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy.deep,
    flex: 1,
  },
  notifTitleUnread: {
    fontWeight: '800',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary.rust,
  },
  notifMessage: {
    fontSize: 12,
    color: '#5A5246',
    lineHeight: 17,
    marginBottom: 6,
  },
  notifFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTimestamp: {
    fontSize: 10,
    color: colors.text.muted,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary.rust,
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
