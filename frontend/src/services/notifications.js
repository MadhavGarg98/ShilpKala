import * as Notifications from 'expo-notifications';
import { useAppStore } from '../store/useAppStore';
import { t, normalizeLanguageCode } from '../i18n';

// Configure local notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function getLang() {
  const lang = useAppStore.getState().selectedLanguage;
  return normalizeLanguageCode(lang);
}

// TODO: BACKEND — replace local notification trigger with real push notification event
export async function simulateIncomingInquiry(buyerName, company) {
  const lang = getLang();

  const newInquiry = {
    id: `i${Date.now()}`,
    productId: 'p1', // mock relation
    buyerName: buyerName,
    buyerCompany: company,
    buyerAvatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(buyerName)}`,
    timestamp: 'Just now',
    messageOriginal: 'I am interested in ordering this item. What are your delivery timelines?',
    messageHindi: t('inquiryMessageHindi', lang),
    status: 'unread',
    tags: [t('newInquiryTag', lang)],
  };

  useAppStore.getState().addInquiry(newInquiry);

  const newNotification = {
    id: `n${Date.now()}`,
    type: 'inquiry',
    title: 'New buyer inquiry',
    message: `${buyerName} sent a new message.`,
    timestamp: 'Just now',
    isRead: false,
    group: t('groupToday', lang),
    actionText: t('viewChatActionNotif', lang),
  };

  useAppStore.getState().addNotification(newNotification);

  // Trigger OS-level notification
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'ShilpKala: New Inquiry',
      body: `${buyerName} from ${company} sent a new message.`,
      data: { inquiryId: newInquiry.id, route: 'InquiryThread' },
    },
    trigger: null, // trigger immediately
  });
}
