# Handoff: MovieMatchApp Sprint 1 (Stabilize & Secure)

## Current State
- Sprint 1 of 3 — **in-progress, pending user actions and evaluator**
- Last commit: `85f0271` (prettier baseline)
- Branch: `main` (4 commits ahead of `origin/main`, **not pushed yet**)

## Commits this session
- `f75cef3` chore(sprint-1): secure env handling, firestore rules, and dep cleanup
- `3c364d2` fix(sprint-1): bugs exposed by ESLint
- `95acb5d` chore(sprint-1): add ESLint + Prettier baseline, .nvmrc, harness docs
- `85f0271` style: prettier --write baseline

## Decisions Made
- **Env strategy**: `app.config.js` (CJS) + `dotenv/config`, `EXPO_PUBLIC_*` prefix. Single mechanism replaces react-native-dotenv + app.json.
- **app.json**: deleted from tracking, still ignored in `.gitignore` to prevent accidental regeneration from pulling back the leaked key.
- **Firestore rules**: cross-user reads now friendship-gated. Acknowledges follow-up is needed to split profile into public/private subdocs (Sprint 2) and to wire mutual friend-adding on match creation.
- **Dead deps removed**: `react-native-video`, `react-native-youtube` (abandoned 2018), `react-native-dotenv`. `react-native-webview` kept (actually used in DetailScreen).
- **Font map**: `WorkSans-SemiBold.ttf` is missing from `assets/fonts/`; aliased to `Bold.ttf` as a temporary measure. Follow-up: drop the real TTF in.
- **Git history rewrite**: NOT doing. Key is public, rotation is the only real fix. Rewriting shared history would hurt nothing gained.

## Open Questions for User
1. **Rotate TMDB key** at themoviedb.org/settings/api. Put the new value in `.env` as `EXPO_PUBLIC_TMDB_API_KEY=<new>`. Also rename the other vars to the `EXPO_PUBLIC_*` prefix shown in `.env.example`.
2. **Tighten Firebase Web API key** in Google Cloud Console → Credentials (HTTP referrer + API restrictions).
3. **OK to delete stale branches?** Verified `origin/main-backup-working` and `origin/feature/user-matches` have **zero** commits unique to them — fully merged into main.
4. **OK to push the 4 commits to `origin/main`?** (Not hard-to-reverse but still shared-state-changing.)

## Next Steps (after user unblocks)
1. User rotates TMDB key + renames .env vars.
2. User authorizes push + branch cleanup.
3. Run `npx expo start --tunnel` on Windows, scan QR from Expo Go on phone, smoke-test login → home → detail. Note any red-box errors.
4. Deploy updated Firestore rules: `npx firebase deploy --only firestore:rules,firestore:indexes`.
5. Close Sprint 1 evaluator report; start Sprint 2 contract (TypeScript migration + SDK 54 bump + CI).

## Files Touched This Session
- `.env.example`, `.gitignore`, `.nvmrc`, `.prettierignore`, `.prettierrc.json`
- `.firebaserc`, `firebase.json`, `firestore.indexes.json`, `firestore.rules`
- `App.js`, `app.config.js` (new), `app.json` (deleted), `babel.config.js`
- `eslint.config.js`, `firebaseConfig.js`
- `components/SwipeableCard.js`, `screens/DetailScreen.js`, `services/api.js`, `utils/firebaseOperations.js`
- (prettier reflow across all 24 source files — no logic changes)
- `package.json`, `package-lock.json`
- `docs/harness/contracts/moviematch-sprint-1.md` (new)

## Contract
- `docs/harness/contracts/moviematch-sprint-1.md`

## Verification snapshot
- TMDB key in source tree (excluding docs): 0 matches
- ESLint: **0 errors**, 11 warnings (unused imports + exhaustive-deps; Sprint 2 fodder)
- Prettier check: clean after `--write` pass
- Font map references 8 real TTFs + 1 alias; all files resolvable
- Firebase config files tracked for the first time
- Node version for this project: pinned to 20 via `.nvmrc` (Expo SDK 53 supported range)

## Known Sprint 2+ follow-ups
- Incremental TypeScript migration (user preference: strict mode)
- Expo SDK 54/55 bump
- Split `/users/{uid}` into public + private profile subdocs
- Auto-add mutual friendship on match creation (makes current Firestore rule useful in practice)
- CI: GitHub Actions running lint + prettier --check + eventually tests
- Jest + React Native Testing Library scaffolding
- Drop real `WorkSans-SemiBold.ttf` into `assets/fonts/`
- Fix 11 lint warnings (unused imports, useEffect deps, unescaped entities)
