import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingStack from './OnboardingStack';
import MainTabs from './MainTabs';
import AddProductStack from './AddProductStack';
import { useAppStore } from '../store/useAppStore';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const isOnboardingComplete = useAppStore((state) => state.isOnboardingComplete);

  return (
    <Stack.Navigator
      initialRouteName={isOnboardingComplete ? 'MainTabs' : 'Onboarding'}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingStack} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="AddProduct"
        component={AddProductStack}
        options={{
          animation: 'slide_from_bottom',
        }}
      />
    </Stack.Navigator>
  );
}
