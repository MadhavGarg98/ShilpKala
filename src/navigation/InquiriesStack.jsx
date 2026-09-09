import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import InquiriesList from '../screens/inquiries/InquiriesList';
import InquiryThread from '../screens/inquiries/InquiryThread';
import VoiceReply from '../screens/inquiries/VoiceReply';
import ReplyPreview from '../screens/inquiries/ReplyPreview';

const Stack = createNativeStackNavigator();

export default function InquiriesStack() {
  return (
    <Stack.Navigator
      initialRouteName="InquiriesList"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="InquiriesList" component={InquiriesList} />
      <Stack.Screen name="InquiryThread" component={InquiryThread} />
      <Stack.Screen name="VoiceReply" component={VoiceReply} />
      <Stack.Screen name="ReplyPreview" component={ReplyPreview} />
    </Stack.Navigator>
  );
}
