import type { NavigatorScreenParams } from '@react-navigation/native';

/**
 * Root navigation graph types. Screens import these so route.params and
 * navigation.navigate() are fully checked.
 *
 * Shape mirrors AppNavigator.tsx:
 * - AuthStack (Login / Register / ForgotPassword)
 * - MainTabs (Deck / Matches / My Cave)
 *   - HomeStack: Home + Detail
 *   - MyCaveStack: MyCaveProfile + EditProfile
 * - ProfileSetupStack (ProfileSetupInitial)
 */

export type TitleType = 'movie' | 'tv';

// --- Auth stack -------------------------------------------------------
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  // "Forgot Password" with a space appears in some navigation.navigate
  // callsites; we accept both so forgot-password screen linking is safe.
  'Forgot Password': undefined;
};

// --- Home / Deck stack ------------------------------------------------
export type HomeStackParamList = {
  Home: undefined;
  Detail: { id: number | string; type: TitleType };
};

// --- My Cave stack ----------------------------------------------------
export type MyCaveStackParamList = {
  MyCaveProfile: undefined;
  EditProfile: { isEditing: boolean };
  Detail: { id: number | string; type: TitleType };
};

// --- Profile Setup stack ----------------------------------------------
export type ProfileSetupStackParamList = {
  ProfileSetupInitial: { isEditing: boolean };
};

// --- Main tabs --------------------------------------------------------
export type MainTabsParamList = {
  Deck: NavigatorScreenParams<HomeStackParamList>;
  Matches: undefined;
  'My Cave': NavigatorScreenParams<MyCaveStackParamList>;
};

// --- Root -------------------------------------------------------------
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  ProfileSetup: NavigatorScreenParams<ProfileSetupStackParamList>;
  Main: NavigatorScreenParams<MainTabsParamList>;
};

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
