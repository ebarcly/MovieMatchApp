import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Navigate to Home or Profile Setup screen
    } catch (error) {
      setError(error.message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome back!</Text>
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        onChangeText={(text) => setEmail(text.toLowerCase())}
        value={email}
        placeholder="Enter your E-mail"
        keyboardType="email-address"
      />
      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        onChangeText={setPassword}
        value={password}
        placeholder="Enter your password"
        secureTextEntry
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <TouchableOpacity onPress={handleLogin} style={styles.button}>
        <Text style={styles.buttonText}>Log In</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Forgot Password')} style={styles.forgotPassword}>
        <Text style={styles.linkText}>Forgot your password?</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.signup}>
        <Text style={styles.linkText}>Don't have an account? Register</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#19192b', // Assuming the background is black
  },
  title: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'WorkSans-Bold',
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 5,
    fontFamily: 'WorkSans-Regular',
  },
  input: {
    backgroundColor: '#fff',
    marginBottom: 15,
    padding: 15,
    borderRadius: 5,
    fontSize: 17,
    fontFamily: 'WorkSans-Regular',
  },
  button: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#19192b',
    fontSize: 18,
    fontFamily: 'WorkSans-Bold',
  },
  linkText: {
    color: '#fff', 
    marginTop: 15,
    textAlign: 'center',
    fontFamily: 'WorkSans-Regular',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  forgotPassword: {
    marginTop: 15,
  },
  signup: {
    marginTop: 15,
  },
});

export default LoginScreen;
