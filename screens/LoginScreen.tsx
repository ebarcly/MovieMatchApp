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
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import DotLoader from '../components/DotLoader';
import { colors, spacing, radii, typography } from '../theme';
import type { StackScreenProps } from '@react-navigation/stack';
import type { AuthStackParamList } from '../navigation/types';

type Props = StackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen = ({ navigation }: Props): React.ReactElement => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  // Sprint 2 BUG-8: loading / disabled state so a double-tap on the
  // Log In button can't submit the form twice.
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (): Promise<void> => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
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
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>
          Sign in to pick up where you left off.
        </Text>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          onChangeText={(text) => setEmail(text.toLowerCase())}
          value={email}
          placeholder="Enter your E-mail"
          placeholderTextColor={colors.textTertiary}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isSubmitting}
          accessibilityLabel="Email"
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          onChangeText={setPassword}
          value={password}
          placeholder="Enter your password"
          placeholderTextColor={colors.textTertiary}
          secureTextEntry
          editable={!isSubmitting}
          accessibilityLabel="Password"
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
        <Pressable
          accessibilityLabel="Log In"
          accessibilityRole="button"
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
          onPress={handleLogin}
          style={({ pressed }) => [
            styles.button,
            isSubmitting && styles.buttonDisabled,
            pressed && !isSubmitting && styles.buttonPressed,
          ]}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <DotLoader size="sm" accessibilityLabel="Signing in" />
          ) : (
            <Text style={styles.buttonText}>Log in</Text>
          )}
        </Pressable>
        <Pressable
          accessibilityLabel="Forgot your password"
          accessibilityRole="button"
          onPress={() => navigation.navigate('ForgotPassword')}
          style={styles.linkWrap}
          disabled={isSubmitting}
        >
          <Text style={styles.linkText}>Forgot your password?</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Register a new account"
          accessibilityRole="button"
          onPress={() => navigation.navigate('Register')}
          style={styles.linkWrap}
          disabled={isSubmitting}
        >
          <Text style={styles.linkText}>
            Don&apos;t have an account? Register
          </Text>
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
    marginBottom: spacing.xxs,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
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
  button: {
    backgroundColor: colors.accent,
    padding: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    minHeight: 52,
  },
  buttonPressed: {
    backgroundColor: colors.accentHover,
  },
  buttonDisabled: {
    backgroundColor: colors.accentHover,
    opacity: 0.7,
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
  errorBanner: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
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
});

export default LoginScreen;
