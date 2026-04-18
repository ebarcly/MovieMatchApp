import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { MoviesProvider } from './context/MoviesContext';
import AppNavigator from './navigation/AppNavigator';
// Import firebaseConfig for its side effect (initializes Firebase app + auth + db).
import './firebaseConfig';

SplashScreen.preventAutoHideAsync();

const loadFonts = async (): Promise<void> => {
  await Font.loadAsync({
    'WorkSans-Black': require('./assets/fonts/WorkSans-Black.ttf'),
    'WorkSans-Bold': require('./assets/fonts/WorkSans-Bold.ttf'),
    'WorkSans-ExtraLight': require('./assets/fonts/WorkSans-ExtraLight.ttf'),
    'WorkSans-Italic': require('./assets/fonts/WorkSans-Italic.ttf'),
    'WorkSans-Light': require('./assets/fonts/WorkSans-Light.ttf'),
    'WorkSans-Medium': require('./assets/fonts/WorkSans-Medium.ttf'),
    'WorkSans-Regular': require('./assets/fonts/WorkSans-Regular.ttf'),
    'WorkSans-Thin': require('./assets/fonts/WorkSans-Thin.ttf'),
    // NOTE: 'WorkSans-SemiBold' is referenced in ProfileSetupScreen.tsx but
    // the TTF is missing from assets/fonts/. Falls back to platform default
    // until the file is added. Track as follow-up.
    'WorkSans-SemiBold': require('./assets/fonts/WorkSans-Bold.ttf'),
  });
};

const App = (): React.ReactElement | null => {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function prepare(): Promise<void> {
      try {
        await loadFonts();
      } catch (e) {
        console.warn(e);
      } finally {
        setFontsLoaded(true);
        SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <NavigationContainer>
      <MoviesProvider>
        <AppNavigator />
      </MoviesProvider>
    </NavigationContainer>
  );
};

export default App;
