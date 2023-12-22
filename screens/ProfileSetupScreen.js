import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native'; // Import the Text component
import { auth } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';

const ProfileSetupScreen = () => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const navigation = useNavigation(); // Add this line to get the navigation object

  const handleProfileSetup = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        // Add the username to the user's Firestore document
        const userRef = firebase.firestore().collection('users').doc(user.uid);
        await userRef.set({
          username: username,
          // Add other profile fields here
        });

        // Navigate to the Home Screen after setting up the profile
        navigation.navigate('Home'); // Replace useNavigation with navigation
      } catch (error) {
        setError(error.message);
      }
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null} // Wrap the error message in a Text component
      <Button title="Complete Profile" onPress={handleProfileSetup} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  input: {
    marginBottom: 10,
    borderWidth: 1,
    padding: 10,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
});

export default ProfileSetupScreen;
