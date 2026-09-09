import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CameraCapture from '../screens/add-product/CameraCapture';
import AIEnhance from '../screens/add-product/AIEnhance';
import VoiceDescribe from '../screens/add-product/VoiceDescribe';
import ListingReview from '../screens/add-product/ListingReview';
import HeritageMatch from '../screens/add-product/HeritageMatch';
import SmartPricing from '../screens/add-product/SmartPricing';
import ReviewPublish from '../screens/add-product/ReviewPublish';
import PublishSuccess from '../screens/add-product/PublishSuccess';
import BuyerPreview from '../screens/add-product/BuyerPreview';

const Stack = createNativeStackNavigator();

export default function AddProductStack() {
  return (
    <Stack.Navigator
      initialRouteName="CameraCapture"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="CameraCapture" component={CameraCapture} />
      <Stack.Screen name="AIEnhance" component={AIEnhance} />
      <Stack.Screen name="VoiceDescribe" component={VoiceDescribe} />
      <Stack.Screen name="ListingReview" component={ListingReview} />
      <Stack.Screen name="HeritageMatch" component={HeritageMatch} />
      <Stack.Screen name="SmartPricing" component={SmartPricing} />
      <Stack.Screen name="ReviewPublish" component={ReviewPublish} />
      <Stack.Screen name="PublishSuccess" component={PublishSuccess} />
      <Stack.Screen name="BuyerPreview" component={BuyerPreview} />
    </Stack.Navigator>
  );
}
