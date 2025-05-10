import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Checkbox from 'expo-checkbox';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from '../firebaseConfig'; // assuming this path is correct
import { useNavigation } from '@react-navigation/native';

const RegisterScreen = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const navigation = useNavigation();

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
  
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create an account</Text>
      <Text style={styles.subtitle}>Join EventMate and unlock personalized movie recommendations</Text>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          placeholder="Enter your name"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="Enter your E-mail"
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
          color={rememberMe ? 'blue' : 'grey'}
        />
        <Text style={styles.rememberMeText}>Remember me</Text>
      </View>
      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.login}>
        <Text style={styles.linkText}>Already have an account? Login</Text>
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
    marginBottom: 5,
    textAlign: 'center',
    fontFamily: 'WorkSans-Bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
    fontFamily: 'WorkSans-Regular',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 5,
    fontFamily: 'WorkSans-Regular',
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 5,
    fontSize: 17,
    fontFamily: 'WorkSans-Regular',
  },
  button: {
    backgroundColor: 'blue', // Replace with the exact color from the image
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'WorkSans-Bold',
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginLeft: 5,
  },
  rememberMeText: {
    color: '#fff',
    fontSize: 16,
    alignItems: 'center',
    marginTop: 16,
    fontFamily: 'WorkSans-Regular',
  },
  checkbox: {
    marginTop: 16,
    marginRight: 8,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  login: {
    marginTop: 15,
  },
  linkText: {
    color: '#fff', // Replace with the exact color from the image
    textAlign: 'center',
    fontFamily: 'WorkSans-Light',
    fontSize: 16,
  },
});

export default RegisterScreen;
