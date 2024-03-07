import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import HomeScreen from '../screens/HomeScreen';
import DetailScreen from '../screens/DetailScreen';
import MyCaveScreen from '../screens/MyCaveScreen';
import MatchesScreen from '../screens/MatchesScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import { auth } from '../firebaseConfig';

const HomeStack = createStackNavigator();
const Tab = createBottomTabNavigator();
const AuthStack = createStackNavigator();
const ProfileStack = createStackNavigator();

function AuthStackScreen() {
  return (
    <AuthStack.Navigator>
      <AuthStack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <AuthStack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ headerShown: false }}
      />
      <AuthStack.Screen
        name="Forgot Password"
        component={ForgotPasswordScreen}
        options={{ headerShown: false }}
      />
    </AuthStack.Navigator>
  );
}

function HomeStackScreen() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen name="Detail" component={DetailScreen} />
    </HomeStack.Navigator>
  );
}

function MyCaveStackScreen() {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen
        name="Profile"
        component={MyCaveScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="Profile Setup"
        component={ProfileSetupScreen}
      />
    </ProfileStack.Navigator>
  );
}

const AppNavigator = () => {
  const navigation = useNavigation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isProfileSetupCompleted, setIsProfileSetupCompleted] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
      setIsProfileSetupCompleted(!!user?.displayName);

      // If the user is authenticated but hasn't completed profile setup, navigate to Profile Setup
      if (user && !isProfileSetupCompleted) {
        navigation.navigate('Profile Setup'); // Fix this later: navigation.navigate('My Cave', { screen: 'Profile Setup' });
      }

      // If the user is authenticated and has completed profile setup, navigate to the Home Screen
      if (user && isProfileSetupCompleted) {
        navigation.navigate('Home');
      }

      // If the user is not authenticated, navigate to the Login Screen
      if (!user) {
        navigation.navigate('Login');
      }
    });

    return () => unsubscribe();
  }, []);

  if (!isAuthenticated) {
    return <AuthStackScreen />;
  }

  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Deck" component={HomeStackScreen} />
      <Tab.Screen name="Matches" component={MatchesScreen} />
      <Tab.Screen name="My Cave" component={MyCaveStackScreen} />
    </Tab.Navigator>
  );
};

export default AppNavigator;
