import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import Checkbox from 'expo-checkbox';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { AuthStackParamList } from '../navigation/types';
import { colors, spacing, radii, typography } from '../theme';

type NavProp = StackNavigationProp<AuthStackParamList, 'Register'>;

const RegisterScreen = (): React.ReactElement => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const navigation = useNavigation<NavProp>();

  const handleRegister = async (): Promise<void> => {
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

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
      // array. Direct navigation from here was a leftover from a flatter
      // nav tree and called a screen name that no longer exists
      // ('ProfileSetup' — the real screen is 'ProfileSetupInitial' inside
      // ProfileSetupStackScreen, which AppNavigator renders reactively).
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create an account</Text>
      <Text style={styles.subtitle}>
        Join MovieMatch and unlock personalized movie recommendations
      </Text>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          placeholder="Enter your name"
          placeholderTextColor={colors.textTertiary}
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="Enter your E-mail"
          placeholderTextColor={colors.textTertiary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          style={styles.input}
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
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <TouchableOpacity onPress={handleRegister} style={styles.button}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>
      <View style={styles.rememberMeContainer}>
        <Checkbox
          style={styles.checkbox}
          value={rememberMe}
          onValueChange={setRememberMe}
          color={rememberMe ? colors.accent : colors.iconMuted}
        />
        <Text style={styles.rememberMeText}>Remember me</Text>
      </View>
      <TouchableOpacity
        onPress={() => navigation.navigate('Login')}
        style={styles.login}
      >
        <Text style={styles.linkText}>Already have an account? Login</Text>
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
  },
  button: {
    backgroundColor: colors.accent,
    padding: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    marginTop: spacing.md,
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
  errorText: {
    ...typography.bodySm,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  login: {
    marginTop: spacing.md,
  },
  linkText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default RegisterScreen;
