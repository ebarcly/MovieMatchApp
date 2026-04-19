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

// Shared params shape for the two routes that render ProfileSetupScreen
// (ProfileSetupInitial in the setup stack, EditProfile in the MyCave
// stack). Both pass a single `isEditing` boolean, so sharing the type
// lets the screen read `route.params.isEditing` without union-narrowing.
export type SharedProfileParams = { isEditing: boolean };

// --- Auth stack -------------------------------------------------------
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

// --- Home / Deck stack ------------------------------------------------
export type HomeStackParamList = {
  Home: undefined;
  Detail: { id: number | string; type: TitleType };
};

// --- My Cave stack ----------------------------------------------------
export type MyCaveStackParamList = {
  MyCaveProfile: undefined;
  EditProfile: SharedProfileParams;
  Detail: { id: number | string; type: TitleType };
};

// --- Profile Setup stack ----------------------------------------------
// Sprint 4 adds TasteQuiz; Sprint 5a adds ProfilePhoto (skippable) —
// ProfileSetup → TasteQuiz → ProfilePhoto → Main when any of those
// fields are missing. Idempotent on re-entry.
export type ProfileSetupStackParamList = {
  ProfileSetupInitial: SharedProfileParams;
  TasteQuiz: undefined;
  ProfilePhoto: undefined;
};

// --- Matches stack (Sprint 5a) ----------------------------------------
// Sprint 5a introduces the ContactOnboarding screen, reachable from the
// Matches-tab empty state's "Find friends" CTA. MatchesHome itself is
// the prior MatchesScreen; the stack is the host so the CTA can push
// onto it without reaching across tabs.
export type MatchesStackParamList = {
  MatchesHome: undefined;
  ContactOnboarding: undefined;
};

// --- Main tabs --------------------------------------------------------
export type MainTabsParamList = {
  Deck: NavigatorScreenParams<HomeStackParamList>;
  Matches: NavigatorScreenParams<MatchesStackParamList>;
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
