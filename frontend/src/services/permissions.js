import { Camera } from 'expo-camera';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import * as Notifications from 'expo-notifications';
import { Linking, Alert } from 'react-native';
import { t, getSecondaryText } from '../i18n';
import { useAppStore } from '../store/useAppStore';

const currentLang = () => useAppStore.getState().selectedLanguage;

export async function requestCameraPermission() {
  const { status } = await Camera.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    const lang = currentLang();
    Alert.alert(
      t('perm.requiredTitle', lang),
      t('perm.cameraSettingsBody', lang),
      [
        { text: t('common.cancel', lang), style: 'cancel' },
        { text: t('perm.openSettings', lang), onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }
  return true;
}

export async function requestMicrophonePermission() {
  const { status, granted } = await requestRecordingPermissionsAsync();
  if (status !== 'granted' && !granted) {
    const lang = currentLang();
    Alert.alert(
      t('perm.requiredTitle', lang),
      t('perm.micSettingsBody', lang),
      [
        { text: t('common.cancel', lang), style: 'cancel' },
        { text: t('perm.openSettings', lang), onPress: () => Linking.openSettings() },
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
