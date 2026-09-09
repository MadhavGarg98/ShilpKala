import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingStack from './OnboardingStack';
import MainTabs from './MainTabs';
import AddProductStack from './AddProductStack';
import SettingsScreen from '../screens/main/SettingsScreen';
import OfflineBanner from '../components/OfflineBanner';
import { useAppStore } from '../store/useAppStore';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const isOnboardingComplete = useAppStore(
    (state) => state.isOnboardingComplete
  );

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />

      <Stack.Navigator
        initialRouteName={
          isOnboardingComplete ? 'MainTabs' : 'Onboarding'
        }
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen
          name="Onboarding"
          component={OnboardingStack}
        />

        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
        />

        <Stack.Screen
          name="AddProduct"
          component={AddProductStack}
          options={{
            animation: 'slide_from_bottom',
          }}
        />

        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
      </Stack.Navigator>
    </View>
  );
}