import React, { useState, useEffect, useRef } from 'react';
import { TouchableOpacity, View, StyleSheet, Animated, Easing, ActivityIndicator, Alert, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';
import { transcribeAudio } from '../services/audio';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';

export default function VoiceInputButton({ 
  onTranscribed, 
  size = 52, 
  disabled = false, 
  style, 
  testID
}) {
  const { currentLanguage } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const getBcp47Code = (shortCode) => {
    const map = {
      'hi': 'hi-IN', 'en': 'en-IN', 'ta': 'ta-IN', 'bn': 'bn-IN',
      'te': 'te-IN', 'mr': 'mr-IN', 'gu': 'gu-IN', 'kn': 'kn-IN', 'ml': 'ml-IN'
    };
    return map[shortCode] || 'hi-IN';
  };

  // Dynamic translated tooltip text based on the user's selected language
  const getStopTooltipText = (lang) => {
    const textMap = {
      'en': 'Tap to stop',
      'hi': 'रोकने के लिए टैप करें',
      'mr': 'थांबवण्यासाठी टॅप करा',
      'gu': 'રોકવા માટે ટેપ કરો',
      'bn': 'থামতে ট্যাপ করুন',
      'ta': 'நிறுத்த தட்டவும்',
      'te': 'ఆపడానికి నొక్కండి',
      'kn': 'ನಿಲ್ಲಿಸಲು ಟ್ಯಾಪ್ ಮಾಡಿ',
      'ml': 'നിർത്താൻ ടാപ്പുചെയ്യുക'
    };
    return textMap[lang] || 'Tap to stop';
  };

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;
  const bar1 = useRef(new Animated.Value(0.4)).current;
  const bar2 = useRef(new Animated.Value(0.8)).current;
  const bar3 = useRef(new Animated.Value(0.5)).current;
  const bar4 = useRef(new Animated.Value(0.9)).current;
  const animLoopRef = useRef(null);

  useEffect(() => {
    if (isRecording) {
      startAnimation();
    } else {
      stopAnimation();
    }
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (animLoopRef.current) animLoopRef.current.stop();
      if (isRecording && audioRecorder) {
         audioRecorder.stop();
      }
    };
  }, [isRecording]);

  const startAnimation = () => {
    if (animLoopRef.current) animLoopRef.current.stop();
    const pulse = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.45, duration: 800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, { toValue: 0.1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        ]),
      ])
    );

    const createBarAnim = (anim, minVal, maxVal, dur) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: maxVal, duration: dur, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(anim, { toValue: minVal, duration: dur, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ])
      );

    const barAnim = Animated.parallel([
      createBarAnim(bar1, 0.3, 1.1, 280),
      createBarAnim(bar2, 0.4, 1.3, 340),
      createBarAnim(bar3, 0.2, 1.0, 310),
      createBarAnim(bar4, 0.5, 1.2, 260),
    ]);

    animLoopRef.current = Animated.parallel([pulse, barAnim]);
    animLoopRef.current.start();
  };

  const stopAnimation = () => {
    if (animLoopRef.current) animLoopRef.current.stop();
    pulseAnim.setValue(1);
    pulseOpacity.setValue(0.6);
    bar1.setValue(0.4);
    bar2.setValue(0.8);
    bar3.setValue(0.5);
    bar4.setValue(0.9);
  };

  const handlePress = async () => {
    if (disabled || isProcessing) return;

    if (isRecording) {
      // STOP RECORDING
      setIsRecording(false);
      setIsProcessing(true);
      
      try {
        await audioRecorder.stop();
        await AudioModule.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
        
        const uri = audioRecorder.uri;
        
        if (uri) {
          const langCode = getBcp47Code(currentLanguage);
          const transcript = await transcribeAudio(uri, langCode);
          if (onTranscribed && transcript) {
             onTranscribed(transcript);
          }
        }
      } catch (error) {
        console.error('[VoiceInputButton] Transcription flow failed:', error);
        Alert.alert("Transcription Error", "Could not process audio. Check your backend server connection.");
      } finally {
        setIsProcessing(false);
      }

    } else {
      // START RECORDING
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
         Alert.alert("Microphone Required", "Please allow microphone access.");
         return;
      }
      
      try {
        await AudioModule.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true }).catch(() => {});
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
        setIsRecording(true);
      } catch (err) {
        console.error("Failed to start recording:", err);
        Alert.alert("Recording Error", "Failed to start recording on this device.");
      }
    }
  };

  const buttonSize = typeof size === 'number' ? size : 52;
  const iconSize = Math.round(buttonSize * 0.46);

  return (
    <View style={[styles.wrapper, { width: buttonSize + 24, height: buttonSize + 24 }, style]}>
      
      {/* Dynamic Translated Floating Tooltip */}
      {isRecording && (
        <Animated.View style={[styles.tooltipContainer, { opacity: pulseOpacity }]}>
          <Text style={styles.tooltipText}>{getStopTooltipText(currentLanguage)}</Text>
          <View style={styles.tooltipTriangle} />
        </Animated.View>
      )}

      {/* Animated pulsing halo in listening state */}
      {isRecording && (
        <Animated.View
          style={[
            styles.pulseHalo,
            {
              width: buttonSize + 16,
              height: buttonSize + 16,
              borderRadius: (buttonSize + 16) / 2,
              transform: [{ scale: pulseAnim }],
              opacity: pulseOpacity,
            },
          ]}
        />
      )}

      <TouchableOpacity
        testID={testID}
        activeOpacity={0.8}
        onPress={handlePress}
        disabled={disabled || isProcessing}
        style={[
          styles.button,
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
            backgroundColor: isRecording ? colors.primary.rust : colors.background.cream,
            borderColor: isRecording ? colors.primary.rust : colors.status.amber,
          },
          disabled && styles.disabledButton,
        ]}
      >
        {isProcessing ? (
          <ActivityIndicator size="small" color={colors.primary.rust} />
        ) : isRecording ? (
          <View style={styles.waveformContainer}>
            <Animated.View style={[styles.waveformBar, { transform: [{ scaleY: bar1 }] }]} />
            <Animated.View style={[styles.waveformBar, { transform: [{ scaleY: bar2 }] }]} />
            <Ionicons name="stop" size={14} color={colors.surface.white} style={styles.stopIconInWave} />
            <Animated.View style={[styles.waveformBar, { transform: [{ scaleY: bar3 }] }]} />
            <Animated.View style={[styles.waveformBar, { transform: [{ scaleY: bar4 }] }]} />
          </View>
        ) : (
          <Ionicons name="mic" size={iconSize} color={colors.primary.rust} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { 
    alignItems: 'center', 
    justifyContent: 'center',
    position: 'relative',
  },
  tooltipContainer: {
    position: 'absolute',
    top: -38,
    backgroundColor: colors.navy.deep,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    // Add shadow so the tooltip stands out
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  tooltipText: {
    color: colors.surface.white,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  tooltipTriangle: {
    position: 'absolute',
    bottom: -5,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.navy.deep,
  },
  pulseHalo: { 
    position: 'absolute', 
    backgroundColor: colors.accent.pink 
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowColor: colors.navy.deep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 2,
  },
  disabledButton: { opacity: 0.4 },
  waveformContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 3, 
    height: 24 
  },
  waveformBar: { 
    width: 3.5, 
    height: 18, 
    borderRadius: 2, 
    backgroundColor: colors.surface.white 
  },
  stopIconInWave: {
    marginHorizontal: 1,
  }
});