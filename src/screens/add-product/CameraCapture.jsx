import React, { useState, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useTranslation } from '../../i18n';

const { width } = Dimensions.get('window');
const FRAME_SIZE = width * 0.82;

export default function CameraCapture({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [isLowLight, setIsLowLight] = useState(false);
  const cameraRef = useRef(null);
  const { t, currentLanguage } = useTranslation();

  // Fallback if permissions are not granted yet
  if (!permission) {
    return (
      <SafeAreaView style={styles.darkContainer}>
        <View style={styles.permCenter}>
          <Text style={styles.permTitle}>...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.topBackRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={24} color={colors.navy.deep} />
          </TouchableOpacity>
        </View>

        <View style={styles.permCenter}>
          <View style={styles.permIconWrap}>
            <Ionicons name="camera-outline" size={48} color={colors.primary.rust} />
          </View>

          <Text style={styles.permTitle}>{t('cameraPermRequired')}</Text>
          <Text style={styles.permDesc}>{t('cameraPermDesc')}</Text>

          <TouchableOpacity
            style={styles.grantBtn}
            onPress={requestPermission}
          >
            <Text style={styles.grantBtnText}>{t('grantPermission')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => Linking.openSettings()}
          >
            <Ionicons name="settings-outline" size={16} color={colors.navy.deep} />
            <Text style={styles.settingsBtnText}>{t('openSettings')}</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>या / OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.galleryFallbackBtn}
            onPress={async () => {
              const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
              });
              if (!res.canceled && res.assets && res.assets[0]?.uri) {
                navigation.navigate('AIEnhance', { imageUri: res.assets[0].uri });
              }
            }}
          >
            <Ionicons name="images-outline" size={18} color={colors.primary.rust} />
            <Text style={styles.galleryFallbackText}>
              {currentLanguage === 'en' ? 'Choose from Gallery' : `${t('gallery')} से चुनें / From Gallery`}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleCapture = async () => {
    try {
      if (cameraRef.current && cameraRef.current.takePictureAsync) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          skipProcessing: false,
        });
        if (photo?.uri) {
          navigation.navigate('AIEnhance', { imageUri: photo.uri });
          return;
        }
      }
    } catch (err) {
      console.warn('Camera capture error, falling back to sample image:', err);
    }
    // Fallback sample craft image if web or mock camera
    navigation.navigate('AIEnhance', {
      imageUri: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80',
    });
  };

  const handlePickGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (!res.canceled && res.assets && res.assets[0]?.uri) {
      navigation.navigate('AIEnhance', { imageUri: res.assets[0].uri });
    }
  };

  return (
    <View style={styles.darkContainer}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing={facing}
      >
        <SafeAreaView style={styles.cameraOverlay}>
          {/* Top Bar with Back and Lighting Pill */}
          <View style={styles.topControls}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.circleIconBtn}
            >
              <Ionicons name="close" size={24} color={colors.surface.white} />
            </TouchableOpacity>

            {/* Lighting Status Pill */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsLowLight(!isLowLight)}
              style={[
                styles.lightPill,
                isLowLight ? styles.lightPillAmber : styles.lightPillGreen,
              ]}
            >
              <Ionicons
                name={isLowLight ? 'warning' : 'sunny'}
                size={14}
                color={isLowLight ? colors.status.amber : colors.status.green}
              />
              <Text
                style={[
                  styles.lightPillText,
                  isLowLight ? styles.textAmber : styles.textGreen,
                ]}
              >
                {isLowLight ? t('lowLightWarning') : t('naturalLightOk')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
              style={styles.circleIconBtn}
            >
              <Ionicons name="camera-reverse" size={22} color={colors.surface.white} />
            </TouchableOpacity>
          </View>

          {/* Viewfinder Center with Corner Bracket Guides */}
          <View style={styles.viewfinderCenter}>
            <View style={[styles.cornerBracket, styles.bracketTopLeft]} />
            <View style={[styles.cornerBracket, styles.bracketTopRight]} />
            <View style={[styles.cornerBracket, styles.bracketBottomLeft]} />
            <View style={[styles.cornerBracket, styles.bracketBottomRight]} />

            {/* Center Hint */}
            <View style={styles.instructionBadge}>
              <Text style={styles.instructionText}>
                {t('cameraInstruction')}
              </Text>
            </View>
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            {/* Gallery Picker */}
            <TouchableOpacity
              onPress={handlePickGallery}
              style={styles.galleryButton}
            >
              <Ionicons name="images" size={24} color={colors.surface.white} />
              <Text style={styles.galleryText}>{t('gallery')}</Text>
            </TouchableOpacity>

            {/* Shutter Capture Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleCapture}
              style={styles.shutterOuter}
            >
              <View style={styles.shutterInner} />
            </TouchableOpacity>

            {/* Light Switch / Help Button */}
            <TouchableOpacity
              onPress={() => setIsLowLight(!isLowLight)}
              style={styles.helpButton}
            >
              <Ionicons
                name={isLowLight ? 'flash-outline' : 'bulb-outline'}
                size={22}
                color={colors.surface.white}
              />
              <Text style={styles.helpText}>Light</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  darkContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background.cream,
    padding: 20,
  },
  topBackRow: {
    paddingVertical: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8E3DA',
  },
  permCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  permIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FBECE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  permTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.navy.deep,
    textAlign: 'center',
    marginBottom: 8,
  },
  permDesc: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  grantBtn: {
    backgroundColor: colors.primary.rust,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  grantBtnText: {
    color: colors.surface.white,
    fontSize: 16,
    fontWeight: '700',
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  settingsBtnText: {
    color: colors.navy.deep,
    fontSize: 14,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2DBD0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: colors.text.muted,
  },
  galleryFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.primary.rust,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
    justifyContent: 'center',
  },
  galleryFallbackText: {
    color: colors.primary.rust,
    fontSize: 15,
    fontWeight: '700',
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  circleIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  lightPillGreen: {
    borderColor: colors.status.green,
    borderWidth: 1,
  },
  lightPillAmber: {
    borderColor: colors.status.amber,
    borderWidth: 1,
  },
  lightPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  textGreen: {
    color: colors.status.green,
  },
  textAmber: {
    color: colors.status.amber,
  },
  viewfinderCenter: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    alignSelf: 'center',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerBracket: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: colors.surface.white,
  },
  bracketTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 6,
  },
  bracketTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 6,
  },
  bracketBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 6,
  },
  bracketBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 6,
  },
  instructionBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  instructionText: {
    color: colors.surface.white,
    fontSize: 12,
    fontWeight: '600',
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 24,
  },
  galleryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  galleryText: {
    color: colors.surface.white,
    fontSize: 11,
    marginTop: 4,
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: colors.surface.white,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface.white,
  },
  helpButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  helpText: {
    color: colors.surface.white,
    fontSize: 11,
    marginTop: 4,
  },
});
