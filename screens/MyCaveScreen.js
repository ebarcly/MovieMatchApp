import React from 'react';
import { View, Text, Button } from 'react-native';
import { useNavigation } from '@react-navigation/native'; // Import the useNavigation hook
import { auth } from '../firebaseConfig';

const MyCaveScreen = () => {
  const navigation = useNavigation(); // Initialize the navigation object

  const handleLogout = () => {
    auth.signOut();
  };

  return (
    <View>
      <Text>My Cave Screen</Text>
      <Button title="Edit Profile" onPress={() => navigation.navigate('Profile Setup')} />
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
};

export default MyCaveScreen;
