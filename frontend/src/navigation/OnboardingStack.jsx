import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LanguageSelect from '../screens/onboarding/LanguageSelect';
import Login from '../screens/onboarding/Login';
import VerifyOTP from '../screens/onboarding/VerifyOTP';
import ProfileSetup from '../screens/onboarding/ProfileSetup';

const Stack = createNativeStackNavigator();

export default function OnboardingStack() {
  return (
    <Stack.Navigator
      initialRouteName="LanguageSelect"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="LanguageSelect" component={LanguageSelect} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="VerifyOTP" component={VerifyOTP} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetup} />
    </Stack.Navigator>
  );
}
