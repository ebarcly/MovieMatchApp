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
import TasteQuizScreen from '../screens/TasteQuizScreen';
import DotLoader from '../components/DotLoader';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { View, StyleSheet } from 'react-native';
import { FilmSlate, Heart, User as UserIcon } from 'phosphor-react-native';
import { colors } from '../theme';
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
const ProfileSetupStackNav = createStackNavigator<ProfileSetupStackParamList>();
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

// Shared themed stack header options — Sprint 4 DetailScreen iOS header
// fix. Stacks were leaking the platform default light header on iOS.
const themedStackHeader = {
  headerStyle: { backgroundColor: colors.ink, shadowColor: 'transparent' },
  headerTintColor: colors.textHigh,
  headerTitleStyle: { color: colors.textHigh },
} as const;

function HomeStackScreen(): React.ReactElement {
  return (
    <HomeStackNav.Navigator screenOptions={themedStackHeader}>
      <HomeStackNav.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <HomeStackNav.Screen
        name="Detail"
        component={DetailScreen}
        options={{ title: '' }}
      />
    </HomeStackNav.Navigator>
  );
}

// Stack for the initial Profile Setup flow + onboarding TasteQuiz.
function ProfileSetupStackScreen(): React.ReactElement {
  return (
    <ProfileSetupStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ProfileSetupStackNav.Screen
        name="ProfileSetupInitial"
        component={ProfileSetupScreen}
        initialParams={{ isEditing: false }}
      />
      <ProfileSetupStackNav.Screen
        name="TasteQuiz"
        component={TasteQuizScreen}
      />
    </ProfileSetupStackNav.Navigator>
  );
}

// Stack used within the My Cave Tab
function MyCaveStackScreen(): React.ReactElement {
  return (
    <MyCaveStackNav.Navigator screenOptions={themedStackHeader}>
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
      <MyCaveStackNav.Screen
        name="Detail"
        component={DetailScreen}
        options={{ title: '' }}
      />
    </MyCaveStackNav.Navigator>
  );
}

// Main App Tabs shown after login and profile setup.
// Sprint 4 tab bar fix: the Sprint-2-era blue ▼ selector was the
// platform default tint. Override with accent-yellow active tint, ink
// bar, textTertiary inactive, accent icon on focus.
function MainAppTabs(): React.ReactElement {
  return (
    <TabNav.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.ink,
          borderTopColor: colors.borderStrong,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarIcon: ({ color, size }: { color: string; size: number }) => {
          if (route.name === 'Deck') {
            return <FilmSlate size={size} color={color} weight="regular" />;
          }
          if (route.name === 'Matches') {
            return <Heart size={size} color={color} weight="regular" />;
          }
          return <UserIcon size={size} color={color} weight="regular" />;
        },
      })}
    >
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
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.ink,
        }}
      >
        <DotLoader size="lg" accessibilityLabel="Loading app" />
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
