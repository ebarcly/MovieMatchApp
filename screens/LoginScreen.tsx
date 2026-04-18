import React, { useState } from 'react';
import {
  ActivityIndicator,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';
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
    <View style={styles.container}>
      <Text style={styles.title}>Welcome back!</Text>
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        onChangeText={(text) => setEmail(text.toLowerCase())}
        value={email}
        placeholder="Enter your E-mail"
        placeholderTextColor={colors.textTertiary}
        keyboardType="email-address"
        editable={!isSubmitting}
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
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <TouchableOpacity
        onPress={handleLogin}
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        disabled={isSubmitting}
        accessibilityRole="button"
        accessibilityLabel="Log In"
        accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.accentForeground} />
        ) : (
          <Text style={styles.buttonText}>Log In</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigation.navigate('ForgotPassword')}
        style={styles.forgotPassword}
        disabled={isSubmitting}
      >
        <Text style={styles.linkText}>Forgot your password?</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigation.navigate('Register')}
        style={styles.signup}
        disabled={isSubmitting}
      >
        <Text style={styles.linkText}>
          Don&apos;t have an account? Register
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.ink,
  },
  title: {
    ...typography.titleLg,
    color: colors.textHigh,
    marginBottom: spacing.lg,
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
  buttonDisabled: {
    backgroundColor: colors.accentHover,
    opacity: 0.7,
  },
  buttonText: {
    ...typography.button,
    color: colors.accentForeground,
  },
  linkText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  errorText: {
    ...typography.bodySm,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  forgotPassword: {
    marginTop: spacing.md,
  },
  signup: {
    marginTop: spacing.md,
  },
});

export default LoginScreen;
