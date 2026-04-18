import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import SearchIcon from './SearchIcon';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';

const NavigationBar = () => {
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    // Sprint 2 BUG-3: guard against auth.currentUser being null. This
    // component mounts inside an already-authenticated stack in normal
    // flow, but during sign-out transitions or a stale Firebase auth
    // state the deref crashes the tree. Early-return + optional-chain
    // the profileName.split.
    const user = auth.currentUser;
    if (!user) {
      setProfileName('');
      return undefined;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      const data = snap.data();
      const firstName = data?.profileName?.split(' ')?.[0] ?? '';
      setProfileName(firstName);
    });

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
