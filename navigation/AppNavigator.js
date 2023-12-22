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
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import { auth } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';

const HomeStack = createStackNavigator();
const Tab = createBottomTabNavigator();
const AuthStack = createStackNavigator();

function AuthStackScreen() {
  return (
    <AuthStack.Navigator>
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }}/>
      <AuthStack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }}/>
      <AuthStack.Screen name="Forgot Password" component={ForgotPasswordScreen} options={{ headerShown: false }}/>
      <AuthStack.Screen name="Profile Setup" component={ProfileSetupScreen} />
    </AuthStack.Navigator>
  );
}

function HomeStackScreen() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }}/>
      <HomeStack.Screen name="Detail" component={DetailScreen}/>
    </HomeStack.Navigator>
  );
}

const AppNavigator = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isProfileSetupCompleted, setIsProfileSetupCompleted] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setIsAuthenticated(!!user);
      setIsProfileSetupCompleted(!!user?.displayName);

      // If the user is authenticated but hasn't completed profile setup, navigate to Profile Setup
      if (user && !isProfileSetupCompleted) {
        useNavigation.navigate('Profile Setup');
      }

      // If the user is authenticated and has completed profile setup, navigate to the Home Screen
      if (user && isProfileSetupCompleted) {
        useNavigation.navigate('Home');
      }

      // If the user is not authenticated, navigate to the Login Screen
      if (!user) {
        useNavigation.navigate('Login');
      }

    });
    return () => unsubscribe();
  }, []);

  if (!isAuthenticated) {
    return <AuthStackScreen />;
  }

  return (
    <Tab.Navigator>
      <Tab.Screen name="Deck" component={HomeStackScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Matches" component={MatchesScreen} />
      <Tab.Screen name="My Cave" component={MyCaveScreen} />
    </Tab.Navigator>
  );
};

export default AppNavigator;
