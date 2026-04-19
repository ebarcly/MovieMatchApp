import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';
import type { StackScreenProps } from '@react-navigation/stack';
import type { MatchesStackParamList } from '../navigation/types';

// Sprint 5a placeholder — full screen lands in execution-order step 7.
// The AppNavigator Matches stack wires this in up-front so the CTA in
// MatchesScreen's empty state can push onto it without a nav error.

type Props = StackScreenProps<MatchesStackParamList, 'ContactOnboarding'>;

const ContactOnboardingScreen = (_props: Props): React.ReactElement => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find friends</Text>
      <Text style={styles.body}>
        Contact match lands in a follow-up commit this sprint.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    ...typography.titleLg,
    color: colors.textHigh,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
});

export default ContactOnboardingScreen;
