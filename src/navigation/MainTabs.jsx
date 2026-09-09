import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import HomeScreen from '../screens/main/HomeScreen';
import ProductsScreen from '../screens/main/ProductsScreen';
import InquiriesStack from './InquiriesStack';
import AlertsScreen from '../screens/main/AlertsScreen';
import { useAppStore } from '../store/useAppStore';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const unreadInquiries = useAppStore((state) => state.unreadInquiryCount);
  const unreadNotifications = useAppStore((state) => state.unreadNotificationCount);

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary.rust,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: {
          backgroundColor: colors.surface.white,
          borderTopColor: '#EFEAE2',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          fontFamily: typography.fontFamilies?.body,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'home';
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Products') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'Inquiries') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Alerts') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          }
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'होम / Home',
        }}
      />
      <Tab.Screen
        name="Products"
        component={ProductsScreen}
        options={{
          tabBarLabel: 'उत्पाद / Products',
        }}
      />
      <Tab.Screen
        name="Inquiries"
        component={InquiriesStack}
        options={{
          tabBarLabel: 'पूछताछ / Inquiries',
          tabBarBadge: unreadInquiries > 0 ? unreadInquiries : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.primary.rust,
            fontSize: 10,
          },
        }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          tabBarLabel: 'सूचनाएं / Alerts',
          tabBarBadge: unreadNotifications > 0 ? unreadNotifications : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.status.amber,
            fontSize: 10,
          },
        }}
      />
    </Tab.Navigator>
  );
}
