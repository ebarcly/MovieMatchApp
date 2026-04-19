import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';
import type { StackScreenProps } from '@react-navigation/stack';
import type { ProfileSetupStackParamList } from '../navigation/types';

// Sprint 5a placeholder — the full implementation lands in the follow-up
// commit (execution-order step 6). Kept minimal so the AppNavigator gate
// compiles cleanly while the contact-hashing + upload primitives land
// first. A one-line body + a "TODO" hint prevents the onboarding flow
// from showing a literal empty screen if the gate routes here before
// the full screen lands.

type Props = StackScreenProps<ProfileSetupStackParamList, 'ProfilePhoto'> & {
  onSkip?: () => void;
  userIdOverride?: string;
};

const ProfilePhotoScreen = (_props: Props): React.ReactElement => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile photo</Text>
      <Text style={styles.body}>Coming right up — upload lands next.</Text>
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
  },
});

export default ProfilePhotoScreen;
