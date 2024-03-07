import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import SearchIcon from './SearchIcon';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';

const NavigationBar = () => {
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'users', auth.currentUser.uid),
      (doc) => {
        setProfileName(doc.data().profileName.split(' ')[0]);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hi, {profileName}</Text>
      <SearchIcon />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 48,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  title: {
    fontSize: 20,
    fontFamily: 'WorkSans-Medium',
    color: '#000',
  },
});

export default NavigationBar;
