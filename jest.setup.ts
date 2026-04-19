/**
 * Global jest setup.
 *
 * Firebase is mocked at the module boundary (firebase/app, firebase/auth,
 * firebase/firestore) so tests never touch the network or require a
 * live Firebase config. Individual tests override these mocks per case
 * with jest.mocked(fn).mockResolvedValue(...) / .mockReturnValue(...).
 *
 * expo-constants is mocked because firebaseConfig.ts reads the Firebase
 * config off Constants.expoConfig.extra.firebase at import time — absent
 * this shim, importing firebaseConfig from any tested module throws.
 */

/* eslint-disable @typescript-eslint/no-require-imports */

// --- expo-constants ---------------------------------------------------
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        firebase: {
          apiKey: 'test-api-key',
          authDomain: 'test.firebaseapp.com',
          projectId: 'test-project',
          storageBucket: 'test.appspot.com',
          messagingSenderId: '1234',
          appId: 'test-app-id',
        },
        tmdbApiKey: 'test-tmdb-key',
      },
    },
  },
}));

// --- @react-native-async-storage/async-storage ------------------------
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
    clear: jest.fn(async () => undefined),
  },
}));

// --- firebase/app -----------------------------------------------------
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: 'stub' })),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({ name: 'stub' })),
}));

// --- firebase/auth ----------------------------------------------------
// reason: firebase types are complex; the mock only needs callable jest.fn() stubs that individual tests override.
const authMock: any = {
  currentUser: null,
};

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => authMock),
  initializeAuth: jest.fn(() => authMock),
  getReactNativePersistence: jest.fn(() => ({ type: 'NONE' })),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  onAuthStateChanged: jest.fn((_auth: unknown, _cb: unknown) => () => {}),
  updateProfile: jest.fn(async () => undefined),
  signOut: jest.fn(async () => undefined),
}));

// --- firebase/firestore ----------------------------------------------
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn((...args: unknown[]) => ({ __type: 'docRef', args })),
  collection: jest.fn((...args: unknown[]) => ({
    __type: 'collectionRef',
    args,
  })),
  query: jest.fn((...args: unknown[]) => ({ __type: 'query', args })),
  where: jest.fn((...args: unknown[]) => ({ __type: 'where', args })),
  orderBy: jest.fn((...args: unknown[]) => ({ __type: 'orderBy', args })),
  limit: jest.fn((n: number) => ({ __type: 'limit', n })),
  getDoc: jest.fn(async () => ({
    exists: () => false,
    data: () => undefined,
  })),
  getDocs: jest.fn(async () => ({
    empty: true,
    docs: [],
    forEach: (_cb: unknown) => {},
  })),
  setDoc: jest.fn(async () => undefined),
  updateDoc: jest.fn(async () => undefined),
  deleteDoc: jest.fn(async () => undefined),
  addDoc: jest.fn(async () => ({ id: 'new-doc' })),
  arrayUnion: jest.fn((x: unknown) => ({ __op: 'arrayUnion', x })),
  serverTimestamp: jest.fn(() => ({ __ts: Date.now() })),
  onSnapshot: jest.fn((_ref: unknown, _cb: unknown) => () => {}),
  Timestamp: {
    now: jest.fn(() => ({ seconds: 0, nanoseconds: 0 })),
    fromDate: jest.fn((d: Date) => ({
      seconds: Math.floor(d.getTime() / 1000),
      nanoseconds: 0,
    })),
  },
}));

// --- axios (services/api) --------------------------------------------
// Kept minimal — tests that exercise api.ts mock it per case.
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      get: jest.fn(async () => ({ data: { results: [], genres: [] } })),
    })),
  },
}));

// --- react-native-gesture-handler -----------------------------------
// jest-expo ships a partial mock; make sure Swipeable + GestureHandlerRootView
// are just passthrough views for component tests.
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    __esModule: true,
    GestureHandlerRootView: View,
    Swipeable: View,
    Directions: {},
    State: {},
    ScrollView: View,
    PanGestureHandler: View,
  };
});

// --- phosphor-react-native ------------------------------------------
// Icon components render as plain Views/Text to keep trees simple.
jest.mock('phosphor-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const factory = (name: string) => {
    const IconStub = (props: Record<string, unknown>) =>
      React.createElement(View, { accessibilityLabel: name, ...props });
    IconStub.displayName = `PhosphorStub(${name})`;
    return IconStub;
  };
  return {
    __esModule: true,
    SkipForward: factory('SkipForward'),
    Check: factory('Check'),
    ThumbsUp: factory('ThumbsUp'),
    ThumbsDown: factory('ThumbsDown'),
    MagnifyingGlass: factory('MagnifyingGlass'),
    PlayCircle: factory('PlayCircle'),
    FilmStrip: factory('FilmStrip'),
    FilmSlate: factory('FilmSlate'),
    Clock: factory('Clock'),
    Heart: factory('Heart'),
    UserCircle: factory('UserCircle'),
    User: factory('User'),
    Users: factory('Users'),
  };
});

// --- react-native-webview -------------------------------------------
jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: View };
});

// --- react-native-reanimated ----------------------------------------
// A full reanimated mock needs the UI-thread bridge, which jest can't
// load. Inline stubs are enough for smoke tests — they return the
// minimum surface DotLoader/Skeleton/Toast touch: Easing primitives,
// withSpring/withTiming pass-through, useSharedValue/useAnimatedStyle,
// and a passthrough Animated.View.
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View, Text, ScrollView } = require('react-native');
  const Easing = {
    linear: (t: number) => t,
    ease: (t: number) => t,
    quad: (t: number) => t * t,
    cubic: (t: number) => t * t * t,
    in: (fn: (t: number) => number) => fn,
    out: (fn: (t: number) => number) => fn,
    inOut: (fn: (t: number) => number) => fn,
    bezier: () => (t: number) => t,
  };
  const passthrough = (Base: unknown) => {
    const Component = React.forwardRef(
      (props: Record<string, unknown>, ref: unknown) =>
        React.createElement(Base as React.ComponentType<unknown>, {
          ...props,
          ref,
        }),
    );
    Component.displayName = 'ReanimatedStub';
    return Component;
  };
  const Animated = {
    View: passthrough(View),
    Text: passthrough(Text),
    ScrollView: passthrough(ScrollView),
    createAnimatedComponent: (Comp: unknown) => passthrough(Comp),
  };
  return {
    __esModule: true,
    default: Animated,
    Easing,
    View: Animated.View,
    Text: Animated.Text,
    ScrollView: Animated.ScrollView,
    createAnimatedComponent: Animated.createAnimatedComponent,
    useSharedValue: (v: unknown) => ({ value: v }),
    useAnimatedStyle: (fn: () => Record<string, unknown>) => fn(),
    useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
    withSpring: (v: unknown) => v,
    withTiming: (v: unknown) => v,
    withDelay: (_d: unknown, v: unknown) => v,
    withSequence: (...v: unknown[]) => v[v.length - 1],
    withRepeat: (v: unknown) => v,
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
    interpolate: (n: number) => n,
    Extrapolate: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    cancelAnimation: jest.fn(),
  };
});

// --- moti ------------------------------------------------------------
// Minimal mock — MotiView/MotiText render as plain RN counterparts so
// assertions on children still work, while animate-from/animate-to are
// ignored. Smoke tests don't exercise animation timings.
jest.mock('moti', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  const passthrough = (Base: unknown) => {
    const Component = React.forwardRef(
      (props: Record<string, unknown>, ref: unknown) => {
        const {
          animate: _a,
          from: _f,
          transition: _t,
          exit: _e,
          ...rest
        } = props;
        return React.createElement(Base as React.ComponentType<unknown>, {
          ...rest,
          ref,
        });
      },
    );
    Component.displayName = 'MotiStub';
    return Component;
  };
  return {
    __esModule: true,
    MotiView: passthrough(View),
    MotiText: passthrough(Text),
    useAnimationState: jest.fn(() => ({ transitionTo: jest.fn() })),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

// --- expo-haptics ----------------------------------------------------
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(async () => undefined),
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

// --- react-native-youtube-iframe ------------------------------------
jest.mock('react-native-youtube-iframe', () => {
  const React = require('react');
  const { View } = require('react-native');
  const YoutubeStub = (props: Record<string, unknown>) =>
    React.createElement(View, { accessibilityLabel: 'YouTubeStub', ...props });
  YoutubeStub.displayName = 'YoutubeStub';
  return { __esModule: true, default: YoutubeStub };
});

// Silence expo-splash-screen noise in tests.
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(async () => undefined),
  hideAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-font', () => ({
  loadAsync: jest.fn(async () => undefined),
  isLoaded: jest.fn(() => true),
}));
