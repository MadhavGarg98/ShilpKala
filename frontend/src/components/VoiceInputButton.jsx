import React, { useState, useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function VoiceInputButton({
  isRecording = false,
  isProcessing = false,
  onPress,
  onTranscribed,
  mockText = 'हस्तनिर्मित बनारसी साड़ी',
  delayMs = 1500,
  size = 52,
  disabled = false,
  style,
  testID,
}) {
  const [internalListening, setInternalListening] = useState(false);
  const activeListening = onPress ? isRecording : internalListening;

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;
  const bar1 = useRef(new Animated.Value(0.4)).current;
  const bar2 = useRef(new Animated.Value(0.8)).current;
  const bar3 = useRef(new Animated.Value(0.5)).current;
  const bar4 = useRef(new Animated.Value(0.9)).current;

  const timerRef = useRef(null);
  const animLoopRef = useRef(null);

  useEffect(() => {
    if (activeListening) {
      startAnimation();
    } else {
      stopAnimation();
    }
  }, [activeListening]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (animLoopRef.current) animLoopRef.current.stop();
    };
  }, []);

  const startAnimation = () => {
    if (animLoopRef.current) animLoopRef.current.stop();
    // Pulse animation for outer ring
    const pulse = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.45,
            duration: 800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, {
            toValue: 0.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.6,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // Waveform bar animations
    const createBarAnim = (anim, minVal, maxVal, dur) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: maxVal,
            duration: dur,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: minVal,
            duration: dur,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
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
    if (animLoopRef.current) {
      animLoopRef.current.stop();
    }
    pulseAnim.setValue(1);
    pulseOpacity.setValue(0.6);
    bar1.setValue(0.4);
    bar2.setValue(0.8);
    bar3.setValue(0.5);
    bar4.setValue(0.9);
  };

  const handlePress = () => {
    if (disabled || isProcessing) return;

    if (onPress) {
      onPress();
      return;
    }

    if (internalListening) return;
    setInternalListening(true);

    timerRef.current = setTimeout(() => {
      setInternalListening(false);
      if (onTranscribed) {
        onTranscribed(mockText);
      }
    }, delayMs);
  };

  const buttonSize = typeof size === 'number' ? size : 52;
  const iconSize = Math.round(buttonSize * 0.46);

  return (
    <View style={[styles.wrapper, { width: buttonSize + 24, height: buttonSize + 24 }, style]}>
      {/* Animated pulsing halo in listening state */}
      {activeListening && (
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

      {/* Main Mic Button */}
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
            backgroundColor: activeListening ? colors.primary.rust : colors.background.cream,
            borderColor: activeListening ? colors.primary.rust : colors.status.amber,
          },
          disabled && styles.disabledButton,
        ]}
      >
        {isProcessing ? (
          <ActivityIndicator size="small" color={colors.primary.rust} />
        ) : activeListening ? (
          /* Waveform animation state */
          <View style={styles.waveformContainer}>
            <Animated.View
              style={[
                styles.waveformBar,
                { transform: [{ scaleY: bar1 }] },
              ]}
            />
            <Animated.View
              style={[
                styles.waveformBar,
                { transform: [{ scaleY: bar2 }] },
              ]}
            />
            <Animated.View
              style={[
                styles.waveformBar,
                { transform: [{ scaleY: bar3 }] },
              ]}
            />
            <Animated.View
              style={[
                styles.waveformBar,
                { transform: [{ scaleY: bar4 }] },
              ]}
            />
          </View>
        ) : (
          <Ionicons
            name="mic"
            size={iconSize}
            color={colors.primary.rust}
          />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseHalo: {
    position: 'absolute',
    backgroundColor: colors.accent.pink,
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
  },
  disabledButton: {
    opacity: 0.4,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 24,
  },
  waveformBar: {
    width: 3.5,
    height: 18,
    borderRadius: 2,
    backgroundColor: colors.surface.white,
  },
});
