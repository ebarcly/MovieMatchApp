/**
 * Jest configuration for MovieMatchApp.
 *
 * Uses the jest-expo preset which layers Expo/RN-aware babel + jsdom-lite.
 * Firebase is globally mocked in jest.setup.ts so no screens reach the
 * network during tests. transformIgnorePatterns must explicitly list RN
 * ESM-shipping packages (phosphor-react-native, @react-navigation, etc.)
 * otherwise jest-babel chokes on their untranspiled `export` keywords.
 */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|expo(nent)?|@expo(nent)?/.*|expo-modules-core|phosphor-react-native|firebase|@firebase))',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/docs/', '/coverage/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/__tests__/**/*.test.(ts|tsx|js|jsx)'],
};
