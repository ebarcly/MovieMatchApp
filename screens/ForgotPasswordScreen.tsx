import React, { useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import DotLoader from '../components/DotLoader';
import { colors, spacing, radii, typography } from '../theme';
import type { StackScreenProps } from '@react-navigation/stack';
import type { AuthStackParamList } from '../navigation/types';

type Props = StackScreenProps<AuthStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen = ({ navigation }: Props): React.ReactElement => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePasswordReset = async (): Promise<void> => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('We sent a reset link. Check your email.');
      setError('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setSuccess('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Forgot password</Text>
        <Text style={styles.instructions}>
          Enter your email and we&apos;ll send a reset link.
        </Text>
        <TextInput
          placeholder="Email"
          placeholderTextColor={colors.textTertiary}
          value={email}
          onChangeText={(t) => setEmail(t.toLowerCase())}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          accessibilityLabel="Email"
          editable={!isSubmitting}
        />
        {error ? (
          <View
            style={styles.errorBanner}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}
        {success ? (
          <View
            style={styles.successBanner}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}
        <Pressable
          accessibilityLabel="Send reset link"
          accessibilityRole="button"
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={handlePasswordReset}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <DotLoader size="sm" accessibilityLabel="Sending reset link" />
          ) : (
            <Text style={styles.buttonText}>Send reset link</Text>
          )}
        </Pressable>
        <Pressable
          accessibilityLabel="Back to login"
          accessibilityRole="button"
          onPress={() => navigation.navigate('Login')}
          style={styles.linkWrap}
        >
          <Text style={styles.linkText}>Back to login</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
  inner: {
    padding: spacing.lg,
  },
  title: {
    ...typography.titleLg,
    color: colors.textHigh,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  instructions: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surfaceRaised,
    color: colors.textBody,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    minHeight: 44,
  },
  errorBanner: {
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    backgroundColor: colors.surfaceRaised,
  },
  errorBannerText: {
    ...typography.bodySm,
    color: colors.textHigh,
  },
  successBanner: {
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
    backgroundColor: colors.surfaceRaised,
  },
  successText: {
    ...typography.bodySm,
    color: colors.textHigh,
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 52,
  },
  buttonPressed: {
    backgroundColor: colors.accentHover,
  },
  buttonText: {
    ...typography.button,
    color: colors.accentForeground,
  },
  linkWrap: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  linkText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default ForgotPasswordScreen;
