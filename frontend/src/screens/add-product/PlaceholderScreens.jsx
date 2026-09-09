import React from 'react';
import { SafeAreaView, View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import PrimaryButton from '../../components/PrimaryButton';
import StepFlowHeader from '../../components/StepFlowHeader';

export function ListingReview({ route, navigation }) {
  const { transcript } = route?.params || {};
  return (
    <SafeAreaView style={styles.safeArea}>
      <StepFlowHeader step={3} total={3} title="Listing Review" />
      <View style={styles.container}>
        <Text style={styles.title}>विवरण समीक्षा / Listing Review</Text>
        <Text style={styles.desc}>
          {transcript || 'Voice transcription ready for Heritage & GI matching in next phase.'}
        </Text>
        <PrimaryButton
          title="होम पर वापस जाएं / Back to Home"
          onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
          style={{ marginTop: 24 }}
        />
      </View>
    </SafeAreaView>
  );
}

export function HeritageMatch({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Heritage Match</Text>
      </View>
    </SafeAreaView>
  );
}

export function SmartPricing({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Smart Pricing</Text>
      </View>
    </SafeAreaView>
  );
}

export function ReviewPublish({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Review & Publish</Text>
      </View>
    </SafeAreaView>
  );
}

export function PublishSuccess({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Publish Success</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.cream,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.navy.deep,
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
