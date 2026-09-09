import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export default function DotStepper({
  totalSteps = 3,
  currentStep = 1,
  completedColor = colors.navy.deep,
  activeColor = colors.primary.rust,
  style,
  testID,
}) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <View testID={testID} style={[styles.container, style]}>
      {steps.map((step, index) => {
        const isCompleted = step < currentStep;
        const isCurrent = step === currentStep;
        const isUpcoming = step > currentStep;
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={`step-${step}`}>
            {/* Step Dot */}
            <View
              style={[
                styles.dot,
                isCompleted && [
                  styles.completedDot,
                  { backgroundColor: completedColor },
                ],
                isCurrent && [
                  styles.currentDot,
                  { backgroundColor: activeColor },
                ],
                isUpcoming && styles.upcomingDot,
              ]}
            >
              {isCompleted ? (
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={colors.surface.white}
                />
              ) : (
                <Text
                  style={[
                    styles.stepText,
                    isCurrent && styles.currentStepText,
                    isUpcoming && styles.upcomingStepText,
                  ]}
                >
                  {step}
                </Text>
              )}
            </View>

            {/* Connecting thin line between dots */}
            {!isLast && (
              <View
                style={[
                  styles.line,
                  isCompleted ? [styles.completedLine, { backgroundColor: completedColor }] : styles.upcomingLine,
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 8,
  },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedDot: {
    backgroundColor: colors.navy.deep,
  },
  currentDot: {
    backgroundColor: colors.primary.rust,
    shadowColor: colors.primary.rust,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  upcomingDot: {
    backgroundColor: colors.surface.white,
    borderWidth: 1.5,
    borderColor: '#D1D5DB', // gray outline
  },
  stepText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.fontFamilies?.body,
  },
  currentStepText: {
    color: colors.surface.white,
  },
  upcomingStepText: {
    color: colors.text.muted,
  },
  line: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
  },
  completedLine: {
    backgroundColor: colors.navy.deep,
  },
  upcomingLine: {
    backgroundColor: '#E5E7EB',
  },
});
