import { create } from 'zustand';
import { mockArtisan } from '../mock/mockArtisan';
import { mockProducts } from '../mock/mockProducts';
import { mockInquiries } from '../mock/mockInquiries';
import { mockNotifications } from '../mock/mockNotifications';

export const useAppStore = create((set, get) => ({
  // App State
  isOnboardingComplete: false,
  selectedLanguage: 'Hindi', // default
  
  // Artisan Profile
  artisan: mockArtisan,
  
  // Data
  products: mockProducts,
  inquiries: mockInquiries,
  notifications: mockNotifications,
  
  // Computed (actions will update these manually for simplicity in this prototype)
  unreadInquiryCount: mockInquiries.filter(i => i.status === 'unread').length,
  unreadNotificationCount: mockNotifications.filter(n => !n.isRead).length,

  // Actions
  completeOnboarding: () => set({ isOnboardingComplete: true }),
  setLanguage: (lang) => set({ selectedLanguage: lang }),
  
  updateArtisan: (updates) => set((state) => ({ 
    artisan: { ...state.artisan, ...updates } 
  })),

  addProduct: (product) => set((state) => {
    const newProducts = [product, ...state.products];
    return { products: newProducts };
  }),

  updateProduct: (id, updates) => set((state) => {
    const newProducts = state.products.map(p => p.id === id ? { ...p, ...updates } : p);
    return { products: newProducts };
  }),

  addInquiry: (inquiry) => set((state) => {
    const newInquiries = [inquiry, ...state.inquiries];
    return { 
      inquiries: newInquiries,
      unreadInquiryCount: state.unreadInquiryCount + 1
    };
  }),

  updateInquiryStatus: (id, status) => set((state) => {
    const newInquiries = state.inquiries.map(i => i.id === id ? { ...i, status } : i);
    const unreadInquiryCount = newInquiries.filter(i => i.status === 'unread').length;
    return { inquiries: newInquiries, unreadInquiryCount };
  }),

  addNotification: (notification) => set((state) => {
    const newNotifications = [notification, ...state.notifications];
    return { 
      notifications: newNotifications,
      unreadNotificationCount: state.unreadNotificationCount + 1
    };
  }),

  markAllNotificationsRead: () => set((state) => {
    const newNotifications = state.notifications.map(n => ({ ...n, isRead: true }));
    return { notifications: newNotifications, unreadNotificationCount: 0 };
  }),
}));
