import Constants from 'expo-constants';
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
// reason: getReactNativePersistence is only exported from firebase/auth's
// react-native bundle — firebase v11 bundles it for RN at runtime via the
// package's `react-native` export condition, but the top-level 'firebase/auth'
// .d.ts omits it. Cast the module to a narrow shape to pick it up safely.
import * as firebaseAuthModule from 'firebase/auth';

interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

type RNPersistenceExports = {
  getReactNativePersistence: (storage: unknown) => Persistence;
};

const { getReactNativePersistence } =
  firebaseAuthModule as unknown as RNPersistenceExports;

const firebaseConfig: FirebaseWebConfig | undefined = Constants.expoConfig
  ?.extra?.firebase as FirebaseWebConfig | undefined;

if (!firebaseConfig?.apiKey) {
  throw new Error(
    'Firebase config missing. Set EXPO_PUBLIC_FIREBASE_* in .env (see .env.example).',
  );
}

const app: FirebaseApp = initializeApp(firebaseConfig);
const db: Firestore = getFirestore(app);
const auth: Auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export { db, auth };
