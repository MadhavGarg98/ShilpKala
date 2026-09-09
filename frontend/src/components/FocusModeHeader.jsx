import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export default function FocusModeHeader({
  title,
  subtitle,
  onBack,
  onRightPress,
  navigation,
  rightIcon = 'ellipsis-vertical',
  style,
}) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.headerContainer, style]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy.deep} />
      
      {/* Back Chevron */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleBack}
        style={styles.iconButton}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="chevron-back" size={26} color={colors.surface.white} />
      </TouchableOpacity>

      {/* Dynamic Title / Subtitle */}
      <View style={styles.titleContainer}>
        <Text style={styles.titleText} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitleText} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Grip-Dots / Action Icon */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onRightPress}
        style={styles.iconButton}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name={rightIcon} size={22} color={colors.surface.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    height: 60,
    backgroundColor: colors.navy.deep,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  titleText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.surface.white,
    fontFamily: typography.fontFamilies?.body,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.72)',
    fontFamily: typography.fontFamilies?.latin,
    marginTop: 1,
    textAlign: 'center',
  },
});
