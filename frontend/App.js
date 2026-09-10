import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { API_BASE_URL } from './src/config';

export default function App() {
  useEffect(() => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('[ShilpKala] 🚀 App Startup Initialized');
    console.log('[ShilpKala] 🌐 Configured Backend API_BASE_URL:', API_BASE_URL);
    console.log('═══════════════════════════════════════════════════════');
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
