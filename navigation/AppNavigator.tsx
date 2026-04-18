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
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { ActivityIndicator, View } from 'react-native';
import type {
  AuthStackParamList,
  HomeStackParamList,
  ProfileSetupStackParamList,
  MyCaveStackParamList,
  MainTabsParamList,
} from './types';

const HomeStackNav = createStackNavigator<HomeStackParamList>();
const TabNav = createBottomTabNavigator<MainTabsParamList>();
const AuthStackNav = createStackNavigator<AuthStackParamList>();
const ProfileSetupStackNav =
  createStackNavigator<ProfileSetupStackParamList>();
const MyCaveStackNav = createStackNavigator<MyCaveStackParamList>();

// --- Navigator Screens ---

function AuthStackScreen(): React.ReactElement {
  return (
    <AuthStackNav.Navigator screenOptions={{ headerShown: false }}>
      <AuthStackNav.Screen name="Login" component={LoginScreen} />
      <AuthStackNav.Screen name="Register" component={RegisterScreen} />
      <AuthStackNav.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
      />
    </AuthStackNav.Navigator>
  );
}

function HomeStackScreen(): React.ReactElement {
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

// Stack for the initial Profile Setup flow
function ProfileSetupStackScreen(): React.ReactElement {
  return (
    <ProfileSetupStackNav.Navigator>
      <ProfileSetupStackNav.Screen
        name="ProfileSetupInitial"
        component={ProfileSetupScreen}
        options={{ headerShown: false }}
        initialParams={{ isEditing: false }}
      />
    </ProfileSetupStackNav.Navigator>
  );
}

// Stack used within the My Cave Tab
function MyCaveStackScreen(): React.ReactElement {
  return (
    <MyCaveStackNav.Navigator>
      <MyCaveStackNav.Screen
        name="MyCaveProfile"
        component={MyCaveScreen}
        options={{ headerShown: false }}
      />
      <MyCaveStackNav.Screen
        name="EditProfile"
        component={ProfileSetupScreen}
        options={{ title: 'Edit Profile' }}
      />
    </MyCaveStackNav.Navigator>
  );
}

// Main App Tabs shown after login and profile setup
function MainAppTabs(): React.ReactElement {
  return (
    <TabNav.Navigator screenOptions={{ headerShown: false }}>
      <TabNav.Screen name="Deck" component={HomeStackScreen} />
      <TabNav.Screen name="Matches" component={MatchesScreen} />
      <TabNav.Screen name="My Cave" component={MyCaveStackScreen} />
    </TabNav.Navigator>
  );
}

// --- App Navigator (Decision Logic) ---

const AppNavigator = (): React.ReactElement => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileSetupComplete, setIsProfileSetupComplete] = useState(false);

  // Auth subscription.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setIsProfileSetupComplete(false);
        setIsLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Profile-completion subscription. Firebase Auth's updateProfile does
  // NOT fire onAuthStateChanged, so we can't rely on displayName. Instead
  // we watch the Firestore user doc, which is the source of truth.
  useEffect(() => {
    if (!user) return undefined;
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        const data = snap.data() as
          | { profileName?: string; genres?: string[] }
          | undefined;
        setIsProfileSetupComplete(
          !!data?.profileName &&
            Array.isArray(data?.genres) &&
            data.genres.length > 0,
        );
        setIsLoading(false);
      },
      (err) => {
        console.error('Error watching user doc:', err);
        setIsProfileSetupComplete(false);
        setIsLoading(false);
      },
    );
    return unsubscribe;
  }, [user]);

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
    return <ProfileSetupStackScreen />;
  }

  return <MainAppTabs />;
};

export default AppNavigator;
