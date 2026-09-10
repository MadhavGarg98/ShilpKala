import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { playTextToSpeech, stopTextToSpeech } from '../services/audio';
import { useTranslation } from '../i18n';

export default function AudioPlayerInline({
  textToSpeak = '',
  language = 'hi-IN',
  label,
  playingLabel,
  variant = 'bar', // 'bar' | 'compact' | 'bubble'
  style,
  onPlayStateChange,
}) {
  const { t, currentLanguage } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const waveAnim1 = useRef(new Animated.Value(0.4)).current;
  const waveAnim2 = useRef(new Animated.Value(0.8)).current;
  const waveAnim3 = useRef(new Animated.Value(0.5)).current;
  const waveAnim4 = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    let animLoop;
    if (isPlaying) {
      animLoop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(waveAnim1, { toValue: 1, duration: 250, useNativeDriver: true }),
            Animated.timing(waveAnim1, { toValue: 0.3, duration: 250, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(waveAnim2, { toValue: 0.3, duration: 300, useNativeDriver: true }),
            Animated.timing(waveAnim2, { toValue: 1, duration: 300, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(waveAnim3, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(waveAnim3, { toValue: 0.2, duration: 200, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(waveAnim4, { toValue: 0.4, duration: 350, useNativeDriver: true }),
            Animated.timing(waveAnim4, { toValue: 1, duration: 350, useNativeDriver: true }),
          ]),
        ])
      );
      animLoop.start();
    } else {
      waveAnim1.setValue(0.4);
      waveAnim2.setValue(0.8);
      waveAnim3.setValue(0.5);
      waveAnim4.setValue(0.9);
    }

    return () => {
      if (animLoop) animLoop.stop();
    };
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      stopTextToSpeech();
    };
  }, []);

  const handleToggle = () => {
    if (isPlaying) {
      stopTextToSpeech();
      setIsPlaying(false);
      onPlayStateChange?.(false);
    } else {
      if (textToSpeak) {
        playTextToSpeech(textToSpeak, language);
      }
      setIsPlaying(true);
      onPlayStateChange?.(true);
    }
  };

  const isBubble = variant === 'bubble';
  const isCompact = variant === 'compact';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handleToggle}
      style={[
        styles.container,
        isBubble && styles.bubbleContainer,
        isCompact && styles.compactContainer,
        isPlaying && styles.playingBorder,
        style,
      ]}
    >
      {/* Play/Stop Icon */}
      <View
        style={[
          styles.iconCircle,
          isPlaying ? styles.iconCirclePlaying : styles.iconCircleIdle,
          isBubble && styles.iconCircleBubble,
        ]}
      >
        <Ionicons
          name={isPlaying ? 'stop' : 'volume-high'}
          size={isBubble ? 14 : 16}
          color={isPlaying ? colors.surface.white : colors.primary.rust}
        />
      </View>

      {/* Label or Waveform */}
      <View style={styles.textTrack}>
        <Text
          style={[
            styles.labelText,
            isBubble && styles.bubbleLabelText,
            isPlaying && styles.labelPlayingText,
          ]}
          numberOfLines={1}
        >
          {isPlaying
            ? playingLabel || (currentLanguage === 'en' ? 'Playing...' : t('playingAudio'))
            : label || (currentLanguage === 'en' ? 'Listen' : t('listenAudio'))}
        </Text>

        {/* Waveform Bars */}
        <View style={styles.waveform}>
          <Animated.View
            style={[
              styles.waveBar,
              isPlaying && styles.waveBarActive,
              { transform: [{ scaleY: waveAnim1 }] },
            ]}
          />
          <Animated.View
            style={[
              styles.waveBar,
              isPlaying && styles.waveBarActive,
              { transform: [{ scaleY: waveAnim2 }] },
            ]}
          />
          <Animated.View
            style={[
              styles.waveBar,
              isPlaying && styles.waveBarActive,
              { transform: [{ scaleY: waveAnim3 }] },
            ]}
          />
          <Animated.View
            style={[
              styles.waveBar,
              isPlaying && styles.waveBarActive,
              { transform: [{ scaleY: waveAnim4 }] },
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8F4',
    borderWidth: 1,
    borderColor: '#F8D7C8',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 10,
  },
  bubbleContainer: {
    backgroundColor: 'rgba(193, 68, 14, 0.08)',
    borderColor: 'rgba(193, 68, 14, 0.25)',
    borderRadius: 18,
    paddingVertical: 5,
    paddingHorizontal: 10,
    gap: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  compactContainer: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 6,
  },
  playingBorder: {
    borderColor: colors.primary.rust,
    backgroundColor: '#FFF2EA',
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleIdle: {
    backgroundColor: '#FFEADF',
  },
  iconCirclePlaying: {
    backgroundColor: colors.primary.rust,
  },
  iconCircleBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  textTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary.rust,
    fontFamily: typography.fontFamilies?.body,
  },
  bubbleLabelText: {
    fontSize: 11,
  },
  labelPlayingText: {
    color: colors.primary.rust,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 16,
    gap: 2.5,
  },
  waveBar: {
    width: 3,
    height: 14,
    backgroundColor: '#D8A08A',
    borderRadius: 1.5,
  },
  waveBarActive: {
    backgroundColor: colors.primary.rust,
  },
});
