import { create } from 'zustand';
import { mockArtisan } from '../mock/mockArtisan';
import { mockProducts } from '../mock/mockProducts';
import { mockInquiries } from '../mock/mockInquiries';
import { mockNotifications } from '../mock/mockNotifications';

export const useAppStore = create((set, get) => ({
  // App State
  isOnboardingComplete: false,
  selectedLanguage: 'Hindi', // default: Hindi
  
  // Artisan Profile
  artisanProfile: {
    ...mockArtisan,
    name: 'राम निवास (Ram Niwas)',
    location: 'वाराणसी, उत्तर प्रदेश (Varanasi, UP)',
    craftType: 'हथकरघा बुनाई (Handloom Weaving)',
    artisanIdStatus: 'Verified',
  },
  // Alias for backward compatibility
  artisan: mockArtisan,

  // Data
  products: mockProducts,
  inquiries: mockInquiries,
  notifications: mockNotifications,
  
  // Computed
  unreadInquiryCount: mockInquiries.filter((i) => i.status === 'unread').length,
  unreadNotificationCount: mockNotifications.filter((n) => !n.isRead).length,

  // Actions
  completeOnboarding: () => set({ isOnboardingComplete: true }),
  
  setLanguage: (lang) => set({ selectedLanguage: lang }),
  
  updateArtisanProfile: (updates) =>
    set((state) => ({
      artisanProfile: { ...state.artisanProfile, ...updates },
      artisan: { ...state.artisan, ...updates },
    })),

  updateArtisan: (updates) =>
    set((state) => ({
      artisanProfile: { ...state.artisanProfile, ...updates },
      artisan: { ...state.artisan, ...updates },
    })),

  addProduct: (product) =>
    set((state) => ({
      products: [product, ...state.products],
    })),

  updateProduct: (id, updates) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  addInquiry: (inquiry) =>
    set((state) => {
      const newInquiries = [inquiry, ...state.inquiries];
      return {
        inquiries: newInquiries,
        unreadInquiryCount: state.unreadInquiryCount + 1,
      };
    }),

  updateInquiryStatus: (id, status) =>
    set((state) => {
      const newInquiries = state.inquiries.map((i) =>
        i.id === id ? { ...i, status } : i
      );
      const unreadInquiryCount = newInquiries.filter(
        (i) => i.status === 'unread'
      ).length;
      return { inquiries: newInquiries, unreadInquiryCount };
    }),

  addNotification: (notification) =>
    set((state) => {
      const newNotifications = [notification, ...state.notifications];
      return {
        notifications: newNotifications,
        unreadNotificationCount: state.unreadNotificationCount + 1,
      };
    }),

  markAllNotificationsRead: () =>
    set((state) => {
      const newNotifications = state.notifications.map((n) => ({
        ...n,
        isRead: true,
      }));
      return { notifications: newNotifications, unreadNotificationCount: 0 };
    }),

  resetOnboarding: () => set({ isOnboardingComplete: false }),
}));

export default useAppStore;
