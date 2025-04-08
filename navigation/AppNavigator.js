import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import DetailScreen from '../screens/DetailScreen';
import MyCaveScreen from '../screens/MyCaveScreen';
import MatchesScreen from '../screens/MatchesScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen'; // Ensure this is imported
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { ActivityIndicator, View } from 'react-native';

// Define navigators outside the component
const HomeStackNav = createStackNavigator();
const TabNav = createBottomTabNavigator();
const AuthStackNav = createStackNavigator();
const ProfileSetupStackNav = createStackNavigator();
const MyCaveStackNav = createStackNavigator(); // Navigator for the "My Cave" tab

// --- Navigator Screens ---

function AuthStackScreen() {
  return (
    <AuthStackNav.Navigator screenOptions={{ headerShown: false }}>
      <AuthStackNav.Screen name="Login" component={LoginScreen} />
      <AuthStackNav.Screen name="Register" component={RegisterScreen} />
      <AuthStackNav.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStackNav.Navigator>
  );
}

function HomeStackScreen() {
  return (
    <HomeStackNav.Navigator>
      <HomeStackNav.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <HomeStackNav.Screen name="Detail" component={DetailScreen} />
    </HomeStackNav.Navigator>
  );
}

// Stack specifically for the initial Profile Setup flow
function ProfileSetupStackScreen() {
  return (
    <ProfileSetupStackNav.Navigator>
      <ProfileSetupStackNav.Screen
          name="ProfileSetupInitial"
          component={ProfileSetupScreen}
          options={{ headerShown: false }}
          initialParams={{ isEditing: false }} // Pass a flag to indicate initial setup mode
          initialRouteName="ProfileSetup"
          screenOptions={{ headerShown: false }}
          navigationKey="profileSetup"
          path="profileSetup"
          mode="modal"
          headerMode="none"
          headerShown={false}
        />
    </ProfileSetupStackNav.Navigator>
  );
}


// Stack used *within* the 'My Cave' Tab
function MyCaveStackScreen() {
  return (
    // Use the MyCaveStackNav here
    <MyCaveStackNav.Navigator>
      <MyCaveStackNav.Screen
        name="MyCaveProfile" // Screen that shows the user's profile (MyCaveScreen component)
        component={MyCaveScreen}
        options={{ headerShown: false }} // Hide header for the main profile view
      />
      {/* *** ADD THIS SCREEN FOR EDITING *** */}
      <MyCaveStackNav.Screen
        name="EditProfile" // New screen name within this stack for editing
        component={ProfileSetupScreen} // Reuse the ProfileSetupScreen component
        options={{ title: 'Edit Profile' }} // Show a header title for the edit screen
      />
    </MyCaveStackNav.Navigator>
  );
}

// Main App Tabs shown after login and profile setup
function MainAppTabs() {
  return (
    <TabNav.Navigator screenOptions={{ headerShown: false }}>
      <TabNav.Screen name="Deck" component={HomeStackScreen} />
      <TabNav.Screen name="Matches" component={MatchesScreen} />
      {/* The "My Cave" tab now renders the MyCaveStackScreen function */}
      <TabNav.Screen name="My Cave" component={MyCaveStackScreen} />
    </TabNav.Navigator>
  );
}

// --- App Navigator (Decision Logic) ---

const AppNavigator = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileSetupComplete, setIsProfileSetupComplete] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsProfileSetupComplete(!!currentUser?.displayName);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return <AuthStackScreen />;
  }

  if (user && !isProfileSetupComplete) {
    return <ProfileSetupStackScreen />; // Show initial setup stack
  }

  // User logged in AND profile complete
  return <MainAppTabs />; // Show main app with tabs
};

export default AppNavigator;
