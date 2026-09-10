import React, { useState, useRef, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import PermissionFallback from '../../components/PermissionFallback';
import { useTranslation } from '../../i18n';

const { width } = Dimensions.get('window');
const FRAME_SIZE = width * 0.82;

export default function CameraCapture({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [torch, setTorch] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef(null);
  const { t, currentLanguage } = useTranslation();

  // 1. Visible console.log of permission status on mount and when it changes
  useEffect(() => {
    console.log('[CameraCapture] Camera permission status on mount/change:', JSON.stringify(permission));
  }, [permission]);

  // Reset camera ready state if facing changes
  useEffect(() => {
    setIsCameraReady(false);
  }, [facing]);

  // 2. Strict permission check: if permission is null (not yet requested/loaded)
  // or false (denied), render the bilingual permission screen INSTEAD of CameraView.
  // Never render CameraView optimistically before permission is confirmed granted.
  if (!permission || !permission.granted) {
    return (
      <PermissionFallback
        type="camera"
        onRequestPermission={requestPermission}
        onGoBack={() => navigation.goBack()}
      />
    );
  }

  const handleCapture = async () => {
    const isRefAvailable = Boolean(cameraRef.current);
    console.log('[CameraCapture] Shutter pressed. Diagnostic status:', {
      isCameraReady,
      isRefAvailable,
      permissionGranted: permission?.granted,
      facing,
    });

    if (!isCameraReady || !isRefAvailable) {
      console.warn('[CameraCapture] Capture aborted: cameraRef is not set or camera is not ready yet.');
      return;
    }

    if (isCapturing) return;

    try {
      setIsCapturing(true);
      console.log('[CameraCapture] Calling cameraRef.current.takePictureAsync({ quality: 0.85 })...');
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });

      console.log('[CameraCapture] takePictureAsync succeeded with result:', photo);

      if (photo?.uri) {
        navigation.navigate('AIEnhance', { imageUri: photo.uri });
        return;
      }

      throw new Error('takePictureAsync completed but did not return a valid photo.uri');
    } catch (err) {
      console.error('[CameraCapture] takePictureAsync failed. Full error object:', err);
      // Fallback sample craft image if web or mock camera
      navigation.navigate('AIEnhance', {
        imageUri: require('../../../assets/images/products/banarasi-saree.jpg'),
      });
    } finally {
      setIsCapturing(false);
    }
  };

  // 3. Updated ImagePicker to use ['images'] array instead of deprecated MediaTypeOptions
  const handlePickGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });
    if (!res.canceled && res.assets && res.assets[0]?.uri) {
      navigation.navigate('AIEnhance', { imageUri: res.assets[0].uri });
    }
  };

  return (
    <View style={styles.darkContainer}>
      {/* 1. Self-closing CameraView with zero children, onMountError, and onCameraReady logging */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        enableTorch={torch}
        mode="picture"
        onMountError={(error) => {
          console.error('[CameraCapture] CameraView onMountError (full object):', error?.message || error, error);
          setIsCameraReady(false);
        }}
        onCameraReady={() => {
          console.log('[CameraCapture] onCameraReady fired: camera sensor ready and preview stream active.');
          setIsCameraReady(true);
        }}
      />

      {/* 2. Top Bar Overlay (Back, Flash/Status Pill, Camera Flip) */}
      <View style={styles.topControlsOverlay} pointerEvents="box-none">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.circleIconBtn}
          accessibilityLabel="Go back"
        >
          <Ionicons name="close" size={24} color={colors.surface.white} />
        </TouchableOpacity>

        {/* Flash / Camera Status Pill */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setTorch(!torch)}
          style={[
            styles.lightPill,
            torch ? styles.lightPillAmber : styles.lightPillNormal,
          ]}
        >
          <Ionicons
            name={torch ? 'flash' : 'camera-outline'}
            size={14}
            color={torch ? colors.status.amber : colors.navy.deep}
          />
          <Text
            style={[
              styles.lightPillText,
              torch ? styles.textAmber : styles.textNavy,
            ]}
          >
            {torch ? 'Flash Torch: ON' : t('craftPhotoMode')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
          style={styles.circleIconBtn}
          accessibilityLabel="Flip camera"
        >
          <Ionicons name="camera-reverse" size={22} color={colors.surface.white} />
        </TouchableOpacity>
      </View>

      {/* 3. Viewfinder Overlay (Corner Bracket Guides & Instruction Badge) */}
      <View style={styles.viewfinderOverlay} pointerEvents="none">
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
      </View>

      {/* 4. Bottom Controls Overlay (Gallery, Shutter Button, Real Torch Toggle) */}
      <View style={styles.bottomControlsOverlay} pointerEvents="box-none">
        {/* Gallery Picker */}
        <TouchableOpacity
          onPress={handlePickGallery}
          style={styles.galleryButton}
          accessibilityLabel="Gallery"
        >
          <Ionicons name="images" size={24} color={colors.surface.white} />
          <Text style={styles.galleryText}>{t('gallery')}</Text>
        </TouchableOpacity>

        {/* Shutter Capture Button (Disabled/loading until camera is confirmed ready) */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleCapture}
          disabled={!isCameraReady || isCapturing}
          style={[
            styles.shutterOuter,
            (!isCameraReady || isCapturing) && styles.shutterDisabled,
          ]}
          accessibilityLabel="Capture"
        >
          {isCapturing ? (
            <ActivityIndicator size="small" color={colors.primary.rust} />
          ) : (
            <View
              style={[
                styles.shutterInner,
                !isCameraReady && styles.shutterInnerDisabled,
              ]}
            />
          )}
        </TouchableOpacity>

        {/* Real Flash Torch Toggle */}
        <TouchableOpacity
          onPress={() => setTorch(!torch)}
          style={styles.helpButton}
          accessibilityLabel="Toggle Flash Torch"
        >
          <Ionicons
            name={torch ? 'flash' : 'flash-outline'}
            size={24}
            color={torch ? '#FFD700' : colors.surface.white}
          />
          <Text style={[styles.helpText, torch && styles.helpTextGold]}>
            {torch ? 'Flash On' : 'Flash'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  darkContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
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
  topControlsOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 36,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  viewfinderOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
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
  lightPillNormal: {
    borderColor: '#E2DBD0',
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
  textNavy: {
    color: colors.navy.deep,
  },
  textAmber: {
    color: colors.status.amber,
  },
  helpTextGold: {
    color: '#FFD700',
    fontWeight: '700',
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
  bottomControlsOverlay: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 44 : 28,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    zIndex: 10,
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
  shutterDisabled: {
    opacity: 0.45,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  shutterInnerDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
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
