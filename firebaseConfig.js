import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "FIREBASE_API_KEY_REMOVED",
  authDomain: "moviematch-6367e.firebaseapp.com",
  projectId: "moviematch-6367e",
  storageBucket: "moviematch-6367e.appspot.com",
  messagingSenderId: "1081957518063",
  appId: "1:1081957518063:web:3a444249dc9c308562e91a"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Firebase Authentication and get a reference to the service
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

console.log("Firebase initialized");

export { db, auth };

