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
import ProfilePhotoScreen from '../screens/ProfilePhotoScreen';
import ContactOnboardingScreen from '../screens/ContactOnboardingScreen';
import DotLoader from '../components/DotLoader';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { runUserDocSplitMigration } from '../utils/migrations/2026-04-userDocSplit';
import { View, StyleSheet } from 'react-native';
import { FilmSlate, Heart, User as UserIcon } from 'phosphor-react-native';
import { colors } from '../theme';
import type {
  AuthStackParamList,
  HomeStackParamList,
  ProfileSetupStackParamList,
  MyCaveStackParamList,
  MainTabsParamList,
  MatchesStackParamList,
} from './types';

const HomeStackNav = createStackNavigator<HomeStackParamList>();
const TabNav = createBottomTabNavigator<MainTabsParamList>();
const AuthStackNav = createStackNavigator<AuthStackParamList>();
const ProfileSetupStackNav = createStackNavigator<ProfileSetupStackParamList>();
const MyCaveStackNav = createStackNavigator<MyCaveStackParamList>();
const MatchesStackNav = createStackNavigator<MatchesStackParamList>();

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

// Stack for the initial Profile Setup flow + onboarding TasteQuiz +
// Sprint 5a ProfilePhotoScreen. AppNavigator routes the user to the
// correct initial screen on mount via `initialRouteName`, so each
// screen only needs to handle "what happens after I'm done."
function ProfileSetupStackScreen({
  initialRoute,
}: {
  initialRoute: keyof ProfileSetupStackParamList;
}): React.ReactElement {
  return (
    <ProfileSetupStackNav.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRoute}
    >
      <ProfileSetupStackNav.Screen
        name="ProfileSetupInitial"
        component={ProfileSetupScreen}
        initialParams={{ isEditing: false }}
      />
      <ProfileSetupStackNav.Screen
        name="TasteQuiz"
        component={TasteQuizScreen}
      />
      <ProfileSetupStackNav.Screen
        name="ProfilePhoto"
        component={ProfilePhotoScreen}
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
      <TabNav.Screen name="Matches" component={MatchesStackScreen} />
      <TabNav.Screen name="My Cave" component={MyCaveStackScreen} />
    </TabNav.Navigator>
  );
}

// Matches tab stack — hosts MatchesScreen + ContactOnboardingScreen
// (reachable from the Matches empty-state "Find friends" CTA).
function MatchesStackScreen(): React.ReactElement {
  return (
    <MatchesStackNav.Navigator screenOptions={themedStackHeader}>
      <MatchesStackNav.Screen
        name="MatchesHome"
        component={MatchesScreen}
        options={{ headerShown: false }}
      />
      <MatchesStackNav.Screen
        name="ContactOnboarding"
        component={ContactOnboardingScreen}
        options={{ title: 'Find friends' }}
      />
    </MatchesStackNav.Navigator>
  );
}

// --- App Navigator (Decision Logic) ---

const AppNavigator = (): React.ReactElement => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileSetupComplete, setIsProfileSetupComplete] = useState(false);
  const [hasTasteProfile, setHasTasteProfile] = useState(false);
  const [hasPhotoURL, setHasPhotoURL] = useState(false);
  // Skip for now — allows the user to defer the photo upload screen and
  // still reach Main. Resets on sign-out so a new account still sees it.
  const [photoSkipped, setPhotoSkipped] = useState(false);
  // Tracks whether the one-shot user-doc split migration (Sprint 5a)
  // has completed for the current user this session. We run it once
  // per auth handshake; it's internally idempotent.
  const [migrationDone, setMigrationDone] = useState(false);

  // Auth subscription.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setIsProfileSetupComplete(false);
        setHasTasteProfile(false);
        setHasPhotoURL(false);
        setPhotoSkipped(false);
        setMigrationDone(false);
        setIsLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Sprint 5a: run the userDocSplit migration on first sign-in per
  // session. Idempotent — on a second run the function is a no-op.
  // Runs BEFORE any friend-graph / match% surface renders so the
  // /users/{uid}/public/profile subcollection always exists first.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        await runUserDocSplitMigration(user.uid);
      } catch (err) {
        console.error('userDocSplit migration failed:', err);
      }
      if (!cancelled) setMigrationDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Profile + tasteProfile + photoURL subscription. Firebase Auth's
  // updateProfile does NOT fire onAuthStateChanged, so we can't rely
  // on displayName. Instead we watch the Firestore user doc, which is
  // the source of truth. Sprint 5a extends the gate with photoURL
  // (skippable) — the hasPhotoURL flag reads from the PUBLIC subdoc
  // which the migration populates on first run.
  useEffect(() => {
    if (!user || !migrationDone) return undefined;
    const privateUnsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        const data = snap.data() as
          | {
              profileName?: string;
              genres?: string[];
              tasteProfile?: unknown;
            }
          | undefined;
        setIsProfileSetupComplete(
          !!data?.profileName &&
            Array.isArray(data?.genres) &&
            data.genres.length > 0,
        );
        setHasTasteProfile(Boolean(data?.tasteProfile));
        setIsLoading(false);
      },
      (err) => {
        console.error('Error watching user doc:', err);
        setIsProfileSetupComplete(false);
        setHasTasteProfile(false);
        setIsLoading(false);
      },
    );
    const publicUnsubscribe = onSnapshot(
      doc(db, 'users', user.uid, 'public', 'profile'),
      (snap) => {
        const data = snap.data() as { photoURL?: string | null } | undefined;
        setHasPhotoURL(Boolean(data?.photoURL));
      },
      (err) => {
        console.warn('Error watching public profile:', err);
        setHasPhotoURL(false);
      },
    );
    return () => {
      privateUnsubscribe();
      publicUnsubscribe();
    };
  }, [user, migrationDone]);

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

  // Sprint 5a gate order:
  //   auth → userDocSplit migration → tasteProfile → photoURL (skippable)
  //   → Main.
  //
  // ProfileSetupInitial collects displayName + genres (baseline profile),
  // TasteQuiz writes tasteProfile, ProfilePhoto is the optional avatar
  // step and exposes a "Skip for now" path via handlePhotoSkip.
  const handlePhotoSkip = (): void => {
    setPhotoSkipped(true);
  };

  if (!isProfileSetupComplete) {
    return <ProfileSetupStackScreen initialRoute="ProfileSetupInitial" />;
  }

  if (!hasTasteProfile) {
    return <ProfileSetupStackScreen initialRoute="TasteQuiz" />;
  }

  if (!hasPhotoURL && !photoSkipped) {
    return <ProfilePhotoGate onSkip={handlePhotoSkip} userId={user.uid} />;
  }

  return <MainAppTabs />;
};

// Lightweight wrapper so ProfilePhotoScreen can be rendered outside of
// a stack navigator during the onboarding gate without plumbing params
// through React Navigation. onSkip flips the skipped flag and falls
// through to Main.
function ProfilePhotoGate({
  onSkip,
  userId,
}: {
  onSkip: () => void;
  userId: string;
}): React.ReactElement {
  return (
    <ProfileSetupStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ProfileSetupStackNav.Screen name="ProfilePhoto">
        {(props): React.ReactElement => (
          <ProfilePhotoScreen
            {...props}
            onSkip={onSkip}
            userIdOverride={userId}
          />
        )}
      </ProfileSetupStackNav.Screen>
    </ProfileSetupStackNav.Navigator>
  );
}

export default AppNavigator;
