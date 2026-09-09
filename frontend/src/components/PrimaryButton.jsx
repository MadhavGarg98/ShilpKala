import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export default function PrimaryButton({
  title,
  children,
  onPress,
  disabled = false,
  loading = false,
  leadingIcon,
  arrow = false,
  style,
  textStyle,
  testID,
}) {
  const isDisabled = disabled || loading;
  const label = title || children;

  return (
    <TouchableOpacity
      testID={testID}
      activeOpacity={0.8}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.button,
        isDisabled && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={colors.surface.white}
          style={styles.spinner}
        />
      ) : (
        <View style={styles.contentContainer}>
          {leadingIcon && (
            <View style={styles.leadingIconContainer}>
              {typeof leadingIcon === 'string' ? (
                <Ionicons name={leadingIcon} size={20} color={colors.surface.white} />
              ) : (
                leadingIcon
              )}
            </View>
          )}

          {typeof label === 'string' ? (
            <Text style={[styles.text, textStyle]}>{label}</Text>
          ) : (
            label
          )}

          {arrow && (
            <View style={styles.arrowContainer}>
              <Ionicons
                name="arrow-forward"
                size={20}
                color={colors.surface.white}
              />
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    minHeight: 52,
    backgroundColor: colors.primary.rust,
    borderRadius: 14, // 12-16px radius
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadingIconContainer: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.surface.white,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: typography.fontFamilies?.body,
    textAlign: 'center',
  },
  arrowContainer: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    paddingVertical: 2,
  },
});
