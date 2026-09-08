import * as Notifications from 'expo-notifications';
import { useAppStore } from '../store/useAppStore';

// Configure local notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// TODO: BACKEND — replace local notification trigger with real push notification event
export async function simulateIncomingInquiry(buyerName, company) {
  const newInquiry = {
    id: `i${Date.now()}`,
    productId: 'p1', // mock relation
    buyerName: buyerName,
    buyerCompany: company,
    buyerAvatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(buyerName)}`,
    timestamp: 'Just now',
    messageOriginal: 'I am interested in ordering this item. What are your delivery timelines?',
    messageHindi: 'मुझे यह आइटम ऑर्डर करने में दिलचस्पी है। आपकी डिलीवरी समयसीमा क्या है?',
    status: 'unread',
    tags: ['नई पूछताछ'],
  };

  useAppStore.getState().addInquiry(newInquiry);

  const newNotification = {
    id: `n${Date.now()}`,
    type: 'inquiry',
    title: 'New buyer inquiry',
    message: `${buyerName} sent a new message.`,
    timestamp: 'Just now',
    isRead: false,
    group: 'आज · TODAY',
    actionText: 'जवाब दें · View Chat',
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
