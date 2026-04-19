import React, { useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
// reason: alias the default import to ExpoCheckbox to resolve the legacy Sprint-2 ESLint warning on expo-checkbox (named + default collision).
import ExpoCheckbox from 'expo-checkbox';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { AuthStackParamList } from '../navigation/types';
import DotLoader from '../components/DotLoader';
import { colors, spacing, radii, typography } from '../theme';

type NavProp = StackNavigationProp<AuthStackParamList, 'Register'>;

const RegisterScreen = (): React.ReactElement => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigation = useNavigation<NavProp>();

  const handleRegister = async (): Promise<void> => {
    if (isSubmitting) return;
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name.trim() });

      // Create the /users/{uid} doc so downstream screens can updateDoc safely.
      await setDoc(doc(db, 'users', cred.user.uid), {
        profileName: name.trim(),
        email: cred.user.email,
        friends: [],
        createdAt: serverTimestamp(),
      });

      // AppNavigator watches /users/{uid} and auto-routes to the
      // ProfileSetup stack as soon as the doc exists without a `genres`
      // array.
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
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Create an account</Text>
        <Text style={styles.subtitle}>
          Join MovieMatch and unlock personalized recommendations.
        </Text>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            placeholder="Enter your name"
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
            style={styles.input}
            editable={!isSubmitting}
            accessibilityLabel="Name"
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            placeholder="Enter your E-mail"
            placeholderTextColor={colors.textTertiary}
            value={email}
            onChangeText={(t) => setEmail(t.toLowerCase())}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            editable={!isSubmitting}
            accessibilityLabel="Email"
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            placeholder="Enter your password"
            placeholderTextColor={colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            editable={!isSubmitting}
            accessibilityLabel="Password"
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            placeholder="Confirm Password"
            placeholderTextColor={colors.textTertiary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            style={styles.input}
            editable={!isSubmitting}
            accessibilityLabel="Confirm password"
          />
        </View>
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
          onPress={handleRegister}
          style={({ pressed }) => [
            styles.button,
            isSubmitting && styles.buttonDisabled,
            pressed && !isSubmitting && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Sign up"
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <DotLoader size="sm" accessibilityLabel="Creating your account" />
          ) : (
            <Text style={styles.buttonText}>Sign up</Text>
          )}
        </Pressable>
        <View style={styles.rememberMeContainer}>
          <ExpoCheckbox
            style={styles.checkbox}
            value={rememberMe}
            onValueChange={setRememberMe}
            color={rememberMe ? colors.accent : colors.iconMuted}
            accessibilityLabel="Remember me"
          />
          <Text style={styles.rememberMeText}>Remember me</Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate('Login')}
          style={styles.linkWrap}
          accessibilityRole="button"
          accessibilityLabel="Back to login"
        >
          <Text style={styles.linkText}>Already have an account? Log in</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  inner: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
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
  inputContainer: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surfaceRaised,
    color: colors.textBody,
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
    marginTop: spacing.md,
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
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  rememberMeText: {
    ...typography.body,
    color: colors.textSecondary,
    alignItems: 'center',
  },
  checkbox: {
    marginRight: spacing.xs,
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

export default RegisterScreen;
