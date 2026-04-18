// Dynamic Expo config. All static fields live here (replaces app.json).
// Secrets are sourced from process.env and exposed via `extra` so the app
// reads them through `expo-constants` at runtime.
//
// `EXPO_PUBLIC_*` vars get inlined into the client bundle by Expo — expected
// for TMDB and Firebase web config. Firestore rules + Auth are the real
// security boundary; these keys are not secrets.

require('dotenv/config');

module.exports = () => ({
  expo: {
    name: 'MovieMatchApp',
    slug: 'MovieMatchApp',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.ebarcly.moviematchapp',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.ebarcly.moviematchapp',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      tmdbApiKey: process.env.EXPO_PUBLIC_TMDB_API_KEY,
      firebase: {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      },
    },
  },
});
