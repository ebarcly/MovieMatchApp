# Handoff: MovieMatchApp — Sprint 1 CLOSED, Sprint 2 starts here

## TL;DR for next session

**First action**: read this file. Then read
`C:\Users\enrique\.claude\plans\expressive-jumping-reddy.md` (the approved
full roadmap). Then write the Sprint 2 contract at
`docs/harness/contracts/moviematch-sprint-2.md` and start execution. Do
NOT re-audit what Sprint 1 already fixed.

## State of the repo

- **Branch**: `main`, clean, pushed to `origin/main`.
- **Last commit**: `d9497b4 fix(nav): switch profile-complete signal from Auth displayName to Firestore snapshot`
- **Remote branches**: only `main` (backup + merged feature branches deleted)
- **App runs** on iPhone Expo Go via `npx expo start --tunnel`
- **No open vulnerabilities**, `expo-doctor` 17/17, ESLint 0 errors (10 warnings deferred to Sprint 3)

## Sprint 1 accomplishments (11 commits on main)

| Commit | Purpose |
|---|---|
| `f75cef3` | chore(sprint-1): secure env handling, firestore rules, and dep cleanup |
| `3c364d2` | fix(sprint-1): bugs exposed by ESLint |
| `95acb5d` | chore(sprint-1): add ESLint + Prettier baseline, .nvmrc, harness docs |
| `85f0271` | style: prettier --write baseline |
| `eb54789` | fix(sprint-1): address evaluator feedback (App.js initializeApp, README, C5 verify_command) |
| `8e223b2` | chore: add @expo/ngrok devDep for --tunnel support |
| `56cb10a` | chore(security): npm audit fix — close 10 vulnerabilities |
| `02cb59b` | feat(sdk): upgrade Expo SDK 53 → 54 (pulled forward from Sprint 2) |
| `be63534` | fix: drop babel.config.js — Expo SDK 54 auto-configures Babel |
| `78c2e6f` | fix(users): create /users/{uid} doc on register; idempotent profile save |
| `d9497b4` | fix(nav): switch profile-complete signal from Auth displayName to Firestore snapshot |

## Decisions that persist into Sprint 2+

- **Backend**: Firebase stays (Firestore + Auth + eventually Storage + Hosting). No Supabase migration.
- **Expo**: managed workflow; no bare-RN eject. TestFlight via EAS Build in Sprint 7.
- **SDK 54** with React 19.1 + RN 0.81 + New Architecture enabled by default.
  - Escape hatch if New Arch causes issues: `newArchEnabled: false` in `app.config.js`.
- **Env pattern**: `app.config.js` reads `process.env.EXPO_PUBLIC_*` via `dotenv/config`, exposes under `extra`. `firebaseConfig.js` + `services/api.js` read via `expo-constants`.
- **Profile-complete signal**: `AppNavigator` uses `onSnapshot` on `/users/{uid}` — Firebase Auth's `updateProfile` does NOT fire `onAuthStateChanged`.
- **Firestore rules**: cross-user reads on `/users/{uid}` are friendship-gated (requires requester in target's `friends[]`). Sprint 5 closes the related "make profile public/private split" follow-up.
- **Design direction (from plan)**: graphite-neutral palette + one vivid accent (candidate `#FF4D6D`; confirm in Sprint 2).

## What Sprint 2 is

The detailed scope lives in the plan file. Summary:

**Bugs to fix** (full table in plan, with file:line refs):
1. SwipeableCard button direction reversed
2. DetailScreen `handleLike`/`handleWatched` local-only; wire or hide
3. NavigationBar null guard on `auth.currentUser.uid`
4. Watchlist data-model split-brain (subcollection vs doc field — pick subcollection)
5. HomeScreen deck-exhausted dead-end → pagination
6. DetailScreen null guard on `data.videos`
7. MoviesContext race on first register
8. LoginScreen submit loading state

**Design tokens**: new `theme/index.js` with colors (graphite palette + accent), spacing scale, typography presets (using WorkSans weights), radii, shadows.

**Screen migrations in Sprint 2**: LoginScreen, RegisterScreen, MyCaveScreen only. Rest deferred to Sprint 4.

**Out of scope for Sprint 2**: TypeScript, tests, CI, any new features, viral mechanics, taste quiz, chat, AI surfaces, other screens.

## How to kick off Sprint 2 (concrete first steps)

1. Read `C:\Users\enrique\.claude\plans\expressive-jumping-reddy.md` fully. The Sprint 2 detail section has the exact bug list and the theme token shape.
2. Invoke the `superpowers:harness-workflow` skill to get the contract template.
3. Write `docs/harness/contracts/moviematch-sprint-2.md` with hard-threshold success criteria for each bug + for the token module. Use Sprint 1's contract (`docs/harness/contracts/moviematch-sprint-1.md`) as the structural reference.
4. Dispatch the generator (fresh `general-purpose` Agent) with contract + plan as context. It should commit per logical chunk.
5. Evaluator subagent at the end (`feature-dev:code-reviewer`) — no self-grading.

## Environment notes

- Windows 11, bash shell, working dir `C:\Users\enrique\Documents\Projects\MovieMatchApp`.
- Node 20 via `.nvmrc` (user may need `nvm use 20` if they dropped shell).
- Metro on port 8082 last time (8081 had a zombie holder — may or may not persist).
- Expo Go on user's iPhone is SDK 54.

## Open questions / items deferred

- **Brand accent color**: plan proposes `#FF4D6D` as candidate coral. User may want a mock comparison during Sprint 2 kickoff before locking.
- **eslint-config-expo version**: installed as `~10.0.0` for SDK 54; warning was `~9.2.0` expected — ignore, the `~10` is correct for SDK 54 (naming scheme unified).
- **WorkSans-SemiBold.ttf**: still missing from `assets/fonts/`; aliased to Bold.ttf. Drop the real file in whenever (low priority).
- **11 pre-existing ESLint warnings**: unused imports + react-hooks/exhaustive-deps + one unescaped-entity. Fix when touching those files during Sprint 2+.
- **Firestore rules deployment**: `firestore.rules` is tracked locally but **not yet deployed** to the live Firebase project. User should run `npx firebase deploy --only firestore:rules,firestore:indexes` when convenient (requires `firebase login`).
- **Firebase Web API key** tightening in Google Cloud Console (HTTP referrer + API restrictions) — still a recommended security hardening, not done.

## References

- Plan: `C:\Users\enrique\.claude\plans\expressive-jumping-reddy.md`
- Sprint 1 contract: `docs/harness/contracts/moviematch-sprint-1.md`
- Memory: `C:\Users\enrique\.claude\projects\C--Users-enrique-Documents-Projects\memory\MEMORY.md` (and `feedback_context_resets.md`)
- Repo remote: https://github.com/ebarcly/MovieMatchApp
