/**
 * Babel configuration for MovieMatchApp (Expo SDK 54).
 *
 * The Reanimated plugin MUST be the LAST plugin listed. It hoists the
 * `'worklet'` directive and rewrites callbacks to run on the UI thread;
 * putting anything after it breaks worklet transforms.
 *
 * Sprint 4 added Reanimated + Moti for motion primitives, DotLoader,
 * Skeleton, Toast, and the TasteQuiz animations.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
