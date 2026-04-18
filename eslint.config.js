// ESLint flat config. Expo's recommended rules + Prettier.
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  ...expoConfig,
  prettierConfig,
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'web-build/**',
      'docs/**',
      'coverage/**',
    ],
  },
  {
    rules: {
      // Sprint 1 baseline — keep permissive, tighten in Sprint 2 after TS migration.
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'react/no-unescaped-entities': 'warn',
    },
  },
];
