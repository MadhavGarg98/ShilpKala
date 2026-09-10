import { Camera } from 'expo-camera';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import * as Notifications from 'expo-notifications';
import { Linking, Alert } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { t, normalizeLanguageCode } from '../i18n';

function getLang() {
  const lang = useAppStore.getState().selectedLanguage;
  return normalizeLanguageCode(lang);
}

export async function requestCameraPermission() {
  const { status } = await Camera.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    const lang = getLang();
    Alert.alert(
      t('permissionRequired', lang),
      t('cameraPermSettingsMsg', lang),
      [
        { text: t('cancel', lang), style: 'cancel' },
        { text: t('settingsBtn', lang), onPress: () => Linking.openSettings() }
      ]
    );
    return false;
  }
  return true;
}

export async function requestMicrophonePermission() {
  const { status, granted } = await requestRecordingPermissionsAsync();
  if (status !== 'granted' && !granted) {
    const lang = getLang();
    Alert.alert(
      t('permissionRequired', lang),
      t('micPermSettingsMsg', lang),
      [
        { text: t('cancel', lang), style: 'cancel' },
        { text: t('settingsBtn', lang), onPress: () => Linking.openSettings() }
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
