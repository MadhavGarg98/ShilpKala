import React, { useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import TabRootHeader from '../../components/TabRootHeader';
import SecondaryButton from '../../components/SecondaryButton';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n';

const NOTIFICATION_ICONS = {
  inquiry: { name: 'chatbubble-ellipses', color: colors.primary.rust, bg: '#FFF2EB', border: '#F8D8C8' },
  gi_verification: { name: 'ribbon', color: colors.status.gold, bg: '#FDF7E8', border: '#F6E5B8' },
  catalog_synced: { name: 'checkmark-done-circle', color: colors.status.green, bg: '#EAF7EE', border: '#CBEBD4' },
  draft_reminder: { name: 'time-outline', color: colors.status.amber, bg: '#FFF6EB', border: '#F9E2C6' },
};

export default function AlertsScreen({ navigation }) {
  const notifications = useAppStore((state) => state.notifications);
  const inquiries = useAppStore((state) => state.inquiries);
  const markAllNotificationsRead = useAppStore((state) => state.markAllNotificationsRead);
  const unreadCount = useAppStore((state) => state.unreadNotificationCount);
  const { t, currentLanguage } = useTranslation();

  // Group notifications by section: "आज · TODAY" / "इस सप्ताह · THIS WEEK"
  const sections = useMemo(() => {
    const groups = {
      'आज · TODAY': [],
      'इस सप्ताह · THIS WEEK': [],
    };

    notifications.forEach((n) => {
      const g = n.group || 'आज · TODAY';
      if (!groups[g]) groups[g] = [];
      groups[g].push(n);
    });

    return Object.keys(groups)
      .filter((key) => groups[key].length > 0)
      .map((key) => ({
        title: key,
        data: groups[key],
      }));
  }, [notifications]);

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
  };

  const handleViewChat = (item) => {
    // Find the corresponding inquiry or use first
    const targetInquiry =
      inquiries.find((i) => i.id === item.inquiryId) || inquiries[0];

    if (targetInquiry) {
      navigation.navigate('Inquiries', {
        screen: 'InquiryThread',
        params: { inquiry: targetInquiry },
      });
    }
  };

  const handleBackToHome = () => {
    navigation.navigate('Home');
  };

  const handleVoiceAssist = () => {
    Alert.alert(
      'Voice Assistant · आवाज़ सहायक',
      'Speak your query: "क्या कोई नई पूछताछ आई है?" or "What are my latest alerts?"',
      [{ text: 'OK' }]
    );
  };

  const renderNotification = ({ item }) => {
    const iconCfg = NOTIFICATION_ICONS[item.type] || NOTIFICATION_ICONS.inquiry;
    const isUnread = !item.isRead;

    const title =
      currentLanguage === 'en'
        ? item.titleEnglish || item.titleHindi || item.title
        : item.titleHindi || item.titleEnglish || item.title;

    const message =
      currentLanguage === 'en'
        ? item.messageEnglish || item.messageHindi || item.message
        : item.messageHindi || item.messageEnglish || item.message;

    return (
      <View
        style={[
          styles.notifCard,
          isUnread && styles.notifCardUnread,
          { borderLeftColor: isUnread ? iconCfg.color : '#E5E0D8' },
        ]}
      >
        <View style={styles.cardTopRow}>
          {/* Accent Icon Circle */}
          <View style={[styles.iconCircle, { backgroundColor: iconCfg.bg, borderColor: iconCfg.border }]}>
            <Ionicons name={iconCfg.name} size={18} color={iconCfg.color} />
          </View>

          <View style={styles.cardHeaderMeta}>
            <View style={styles.titleRow}>
              <Text style={[styles.notifTitle, isUnread && styles.notifTitleUnread]} numberOfLines={1}>
                {title}
              </Text>
              {isUnread && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.timestampText}>{item.timestamp}</Text>
          </View>
        </View>

        {/* Message body */}
        <Text style={styles.notifMessage}>{message}</Text>

        {/* Action Button: e.g. View Chat on new inquiry */}
        {item.type === 'inquiry' ? (
          <View style={styles.cardActionRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleViewChat(item)}
              style={styles.chatActionBtn}
            >
              <Ionicons name="chatbubbles" size={14} color={colors.surface.white} />
              <Text style={styles.chatActionBtnText}>
                {item.actionText || 'चैट देखें · View Chat'}
              </Text>
              <Ionicons name="arrow-forward" size={12} color={colors.surface.white} />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. TabRootHeader with Headline and Unread Count */}
      <TabRootHeader
        title="सूचनाएं · Notifications"
        subtitle="महत्वपूर्ण अपडेट और पूछताछ • Important Updates & Alerts"
        rightElement={
          unreadCount > 0 ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleMarkAllRead}
              style={styles.markAllReadBtn}
            >
              <Text style={styles.markAllReadText}>
                {currentLanguage === 'en' ? 'Mark all read' : 'सभी पढ़ें'}
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Subheader bar with unread count pill */}
      <View style={styles.subHeaderBar}>
        <View style={styles.unreadCountPill}>
          <Ionicons name="notifications" size={13} color={colors.primary.rust} />
          <Text style={styles.unreadCountText}>
            {unreadCount} {currentLanguage === 'en' ? 'unread alerts' : 'नई सूचनाएं'}
          </Text>
        </View>
      </View>

      {/* 2. Grouped SectionList */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* 3. Bottom Persistent Voice-Assistance Card */}
      <View style={styles.bottomDock}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleVoiceAssist}
          style={styles.voiceCard}
        >
          <View style={styles.voiceIconBox}>
            <Ionicons name="mic" size={18} color={colors.surface.white} />
          </View>
          <View style={styles.voiceTextCol}>
            <Text style={styles.voicePromptPrimary}>
              {currentLanguage === 'en'
                ? 'Voice Assistance Available'
                : 'आवाज़ सहायता उपलब्ध'}
            </Text>
            <Text style={styles.voicePromptSecondary}>
              {currentLanguage === 'en'
                ? 'Ask: "What are my latest inquiries?"'
                : 'पूछें: "क्या कोई नया खरीदार संदेश आया है?"'}
            </Text>
          </View>
          <Ionicons name="sparkles" size={16} color={colors.primary.rust} />
        </TouchableOpacity>

        {/* 4. SecondaryButton "Back to Home" (Navy outline per addendum style rule) */}
        <SecondaryButton
          title={currentLanguage === 'en' ? 'Back to Home' : 'होम पर वापस जाएं · Back to Home'}
          leadingIcon="home-outline"
          onPress={handleBackToHome}
          style={styles.backHomeBtn}
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
  markAllReadBtn: {
    backgroundColor: '#FFF2EB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F8D8C8',
  },
  markAllReadText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary.rust,
  },
  subHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  unreadCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4EF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: '#F8D7C8',
  },
  unreadCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary.rust,
    fontFamily: typography.fontFamilies?.body,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 170,
  },
  sectionHeader: {
    paddingVertical: 8,
    marginTop: 8,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.navy.deep,
    letterSpacing: 0.5,
    fontFamily: typography.fontFamilies?.body,
  },
  notifCard: {
    backgroundColor: colors.surface.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    borderLeftWidth: 4,
    shadowColor: colors.navy.deep,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  notifCardUnread: {
    backgroundColor: '#FFFCFA',
    borderColor: '#F5E6DC',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cardHeaderMeta: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
  },
  notifTitleUnread: {
    fontWeight: '800',
    color: colors.navy.deep,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary.rust,
  },
  timestampText: {
    fontSize: 11,
    color: colors.text.muted,
    fontFamily: typography.fontFamilies?.latin,
    marginTop: 1,
  },
  notifMessage: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
  },
  cardActionRow: {
    marginTop: 10,
    flexDirection: 'row',
  },
  chatActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.rust,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  chatActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.surface.white,
    fontFamily: typography.fontFamilies?.body,
  },
  bottomDock: {
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
    gap: 10,
    shadowColor: colors.navy.deep,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  voiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8F4',
    borderWidth: 1,
    borderColor: '#F8D8C8',
    borderRadius: 12,
    padding: 8,
    paddingHorizontal: 10,
    gap: 10,
  },
  voiceIconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary.rust,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceTextCol: {
    flex: 1,
  },
  voicePromptPrimary: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary.rust,
    fontFamily: typography.fontFamilies?.body,
  },
  voicePromptSecondary: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 1,
  },
  backHomeBtn: {
    borderColor: colors.navy.deep,
  },
});
