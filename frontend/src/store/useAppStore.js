import { create } from 'zustand';
import { mockArtisan } from '../mock/mockArtisan';
import { mockProducts } from '../mock/mockProducts';
import { mockInquiries } from '../mock/mockInquiries';
import { mockNotifications } from '../mock/mockNotifications';
import { inferCraftCategory } from '../services/api'; 

// Default categories matching your UI design
const INITIAL_CATEGORIES = [
  { id: '1', name: 'Handloom Weaving', image: require('../../assets/images/craft-types/handloom-weaving.jpg'), giCertified: true },
  { id: '2', name: 'Clay Pottery', image: require('../../assets/images/craft-types/clay-pottery.jpg'), giCertified: true },
  { id: '3', name: 'Hand Block Print', image: require('../../assets/images/craft-types/block-print.jpg'), giCertified: true },
  { id: '4', name: 'Wood Carving', image: require('../../assets/images/craft-types/wood-carving.jpg'), giCertified: true },
  { id: '5', name: 'Zardozi & Embroidery', image: require('../../assets/images/craft-types/zardozi.jpg'), giCertified: true },
  { id: '6', name: 'Brass & Metalwork', image: require('../../assets/images/craft-types/brass-metalwork.jpg'), giCertified: true },
];

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
  
  // Category State for Profile Setup
  categories: INITIAL_CATEGORIES,
  selectedCategoryId: '6', // Default matching your mockup
  isInferringCategory: false,
  
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

  // --- New Category & Voice Actions ---
  setSelectedCategory: (id) => set({ selectedCategoryId: id }),

  inferCategoryFromVoice: async (transcript) => {
    set({ isInferringCategory: true });
    try {
      const inferredCategory = await inferCraftCategory(transcript);
      
      set((state) => {
        // If the AI generated a brand new category, add it to the start of the list
        const newCategories = inferredCategory.isNew 
          ? [inferredCategory, ...state.categories] 
          : state.categories;

        return {
          categories: newCategories,
          selectedCategoryId: inferredCategory.id,
          isInferringCategory: false,
        };
      });
      
      return inferredCategory;
    } catch (error) {
      console.error("Store: Failed to infer category");
      set({ isInferringCategory: false });
    }
  },
}));

export default useAppStore;