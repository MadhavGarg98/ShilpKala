import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { Linking, Alert } from 'react-native';

export async function requestCameraPermission() {
  const { status } = await Camera.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'अनुमति आवश्यक है (Permission Required)',
      'कैमरा उपयोग करने के लिए कृपया सेटिंग्स में अनुमति दें। (Please allow camera access in settings.)',
      [
        { text: 'रद्द करें (Cancel)', style: 'cancel' },
        { text: 'सेटिंग्स (Settings)', onPress: () => Linking.openSettings() }
      ]
    );
    return false;
  }
  return true;
}

export async function requestMicrophonePermission() {
  const { status } = await Audio.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'अनुमति आवश्यक है (Permission Required)',
      'माइक उपयोग करने के लिए कृपया सेटिंग्स में अनुमति दें। (Please allow microphone access in settings.)',
      [
        { text: 'रद्द करें (Cancel)', style: 'cancel' },
        { text: 'सेटिंग्स (Settings)', onPress: () => Linking.openSettings() }
      ]
    );
    return false;
  }
  return true;
}

export async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    // Graceful fallback for demo, just warn
    console.warn('Notification permission not granted');
    return false;
  }
  return true;
}
