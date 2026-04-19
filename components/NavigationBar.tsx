import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import SearchIcon from './SearchIcon';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { colors, spacing, typography } from '../theme';

const NavigationBar = (): React.ReactElement => {
  const [profileName, setProfileName] = useState<string>('');

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
      const data = snap.data() as { profileName?: string } | undefined;
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
    marginTop: spacing.xxl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    // Sprint 4 theme migration — fixes the MyCaveScreen / HomeScreen
    // header seam noted in the Sprint 3 handoff (was opaque #f0f0f0 on
    // an ink-backed scroll view).
    backgroundColor: 'transparent',
  },
  title: {
    ...typography.titleSm,
    color: colors.textHigh,
  },
});

export default NavigationBar;
