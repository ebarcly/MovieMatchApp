import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../theme';

/**
 * TasteQuizScreen — placeholder. The full 7-pair A/B quiz over 8 axes,
 * dual-label read-back, and firebase writeTasteProfile integration
 * lands in a follow-up Sprint 4 commit. This stub exists so AppNavigator
 * can register the route and ProfileSetupStackParamList compiles.
 */

const TasteQuizScreen = (): React.ReactElement => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Let&apos;s find your taste</Text>
      <Text style={styles.body}>Quiz loading…</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.titleLg,
    color: colors.textHigh,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default TasteQuizScreen;
