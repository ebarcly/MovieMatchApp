---
sprint: 1
feature: "Stabilize & Secure: bring MovieMatchApp back to a safe, runnable state on Windows"
scope:
  - "Rotate and lock down leaked credentials (TMDB key present in public git history at 66752a9)"
  - "Fix source of the leak: move TMDB key out of app.json into env, align with expo-constants via app.config.js"
  - "Reconcile .gitignore vs actual tracked files; make firestore.rules tracked (source of truth for security rules)"
  - "Tighten Firestore rules: over-broad /users/{userId} read lets any auth'd user read any profile"
  - "Remove dead/unmaintained deps (react-native-youtube, react-native-dotenv once migrated off)"
  - "Fix App.js font-mapping bug (SemiBold points at Italic.ttf, etc.)"
  - "Add baseline tooling: ESLint + Prettier config, jsconfig hygiene, .nvmrc"
  - "Clean up stale branches (main-backup-working) after verifying nothing unique lives there"
  - "Verify app runs on Windows via Expo Go (Android physical device or emulator)"
  - "Document Windows-specific dev setup in README"

out_of_scope:
  - "TypeScript migration (that's Sprint 2)"
  - "Expo SDK upgrade beyond what's needed to run (Sprint 2)"
  - "New features, UI changes, or refactors beyond the bug fixes listed above"
  - "CI/CD setup (Sprint 2)"
  - "Adding tests (Sprint 2 — only add test harness scaffolding if cheap)"

success_criteria:
  - criterion: "No API keys, tokens, or credentials present anywhere in the current working tree (rg for known-leaked key must return zero hits)"
    threshold: hard
    verify_command: "git grep -n '7205b20552feedbb43213ee5943ffeac' -- ':!docs' || echo CLEAN"
  - criterion: "TMDB key rotated at themoviedb.org; old key confirmed invalid via curl"
    threshold: hard
    verify_command: "curl -s 'https://api.themoviedb.org/3/configuration?api_key=7205b20552feedbb43213ee5943ffeac' | grep -q 'Invalid API key' && echo ROTATED"
  - criterion: "firebaseConfig.js and services/api.js both source secrets from the same mechanism (expo-constants via app.config.js reading process.env)"
    threshold: hard
    verify_command: "grep -l '@env' firebaseConfig.js services/api.js || echo CLEAN"
  - criterion: "firestore.rules tracked in git and deployed state matches file"
    threshold: hard
    verify_command: "git ls-files -- firestore.rules | grep -q firestore.rules && echo TRACKED"
  - criterion: "Firestore /users/{userId} rule does NOT allow arbitrary authenticated reads of other users' docs"
    threshold: hard
    verify_command: "! grep -E \"allow read: if request.auth != null && request.auth.uid != userId *;?$\" firestore.rules && grep -q 'request.auth.uid in resource.data.friends' firestore.rules && echo CLEAN"
  - criterion: "ESLint runs clean (or with documented warnings-only) on the whole source tree"
    threshold: hard
    verify_command: "npx eslint . --ext .js,.jsx"
  - criterion: "Prettier check passes"
    threshold: soft
    verify_command: "npx prettier --check ."
  - criterion: "npm install succeeds with no peer-dep failures on Node 20/22 + Windows"
    threshold: hard
    verify_command: "npm install --no-audit --no-fund"
  - criterion: "npx expo start --android launches Metro without fatal errors (user smoke-tests UI manually)"
    threshold: hard
    verify_command: "manual: user confirms app loads and login screen renders"
  - criterion: "App.js font map references files that actually exist in assets/fonts/"
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'); const src=fs.readFileSync('App.js','utf8'); const fonts=[...src.matchAll(/require\\('\\.\\/assets\\/fonts\\/(.+?)'\\)/g)].map(m=>m[1]); fonts.forEach(f=>{ if(!fs.existsSync('assets/fonts/'+f)) { console.error('MISSING:',f); process.exit(1);} }); console.log('OK')\""

pivot_after_failures: 2

notes:
  - "Windows host; iOS simulator not available. Testing path: Android emulator or Expo Go on physical device."
  - "Node 22 installed; Expo 53 officially supports 18/20. If issues, install 20.x via nvm-windows."
  - "The leaked TMDB key is the one unambiguous hard-to-reverse action — user authorization required before rotation."
---

# Sprint 1 — Stabilize & Secure

## Context for the generator

The user is picking up a ~9-month-old React Native (Expo SDK 53) project originally developed on macOS, now on Windows 11. They describe themselves as a beginner at the time of original authorship; code quality reflects that. The repo is public on GitHub at `https://github.com/ebarcly/MovieMatchApp.git`.

## Known issues (from CTO audit)

1. **Leaked TMDB key**: `7205b20552feedbb43213ee5943ffeac` hardcoded in `app.json`, which was committed in `66752a9`. Assume scraped.
2. **Dual env mechanisms**: `firebaseConfig.js` uses `react-native-dotenv` (`@env` import) while `services/api.js` uses `expo-constants` (`Constants.expoConfig.extra.TMDB_API_KEY`). Pick one. Recommendation: drop `react-native-dotenv`, use `app.config.js` that reads `process.env.*` and exposes under `extra`. That's the modern Expo path.
3. **Font bug** (`App.js:17-19`): `WorkSans-SemiBold` → `WorkSans-Italic.ttf`, `WorkSans-Italic` → `WorkSans-Thin.ttf`, `WorkSans-Thin` → `WorkSans-ExtraLight.ttf`. Must check which files exist in `assets/fonts/` and correct.
4. **Firestore rules over-broad read** (`firestore.rules:17-18`): allows any authenticated user to read any other user's full profile. Should be restricted to friends-only or to a minimal public-profile field projection.
5. **`.gitignore` ignores security-critical files**: `firestore.rules`, `firebase.json`, `.firebaserc` are listed as ignored. These SHOULD be tracked — they're source of truth for Firebase project state.
6. **Dead deps**: `react-native-youtube` (unmaintained since 2018), `react-native-video@5.2.1` (v6 is current; only remove if actually used — check imports first).
7. **Branch cleanup**: `main-backup-working` and already-merged `feature/user-matches` — verify no unique commits, then delete.

## Generator rules

- Commit per logical chunk. Small commits with descriptive messages.
- Do not run `npm audit fix --force` — breaks things. Audit, then targeted updates.
- Do not upgrade Expo SDK in this sprint.
- Do not introduce TypeScript in this sprint.
- Before touching Firestore rules, read the full file and all `allow` clauses — don't just edit the one line flagged.
- If a dead dep is actually imported somewhere, leave it; log it for Sprint 2.
- If anything requires user credentials or secrets, STOP and write to the handoff file — do not proceed blind.
