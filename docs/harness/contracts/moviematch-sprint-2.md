---
sprint: 2
feature: "Stop the bleeding + design-system foundations"
reference_contracts:
  - docs/harness/contracts/moviematch-sprint-1.md
reference_plan: "C:/Users/enrique/.claude/plans/expressive-jumping-reddy.md"
scope:
  - "Fix 8 known runtime bugs (see Known issues table in body)"
  - "Create theme/index.js exporting colors, spacing, typography, radii, shadows"
  - "Migrate LoginScreen, RegisterScreen, MyCaveScreen to theme tokens (no literal hex / no literal px where a token exists)"
  - "Commit per logical chunk; push to origin/main when the sprint closes"

out_of_scope:
  - "TypeScript migration (Sprint 3)"
  - "Jest / RNTL tests (Sprint 3)"
  - "GitHub Actions / CI (Sprint 3)"
  - "Migrating any screen other than Login/Register/MyCave (Sprint 4)"
  - "New features (taste quiz, match%, queues, rec cards, chat, AI surfaces — Sprints 4-5)"
  - "Viral mechanics, friend graph, shared queues (Sprint 5)"
  - "Recommendation engine changes (Sprint 6)"
  - "EAS Build / TestFlight / Sentry / Analytics (Sprint 7)"
  - "Address the 11 deferred ESLint warnings unless the file is already being touched"
  - "Firebase Storage / profile image upload (Sprint 5)"
  - "Deploying firestore.rules to live project (user task, noted in handoff)"

success_criteria:
  # --- BUGS ---
  - criterion: "BUG-1 SwipeableCard: Skip button fires a LEFT swipe (reject), Watched button fires a RIGHT swipe (accept). Directions aligned with semantic intent."
    threshold: hard
    verify_command: "manual: on iPhone Expo Go — tap Skip on a title; confirm it does NOT appear in My Cave watchlist. Tap Watched (or the positive button) on another title; confirm it DOES appear in watchlist."

  - criterion: "BUG-2 DetailScreen: handleLike and handleWatched are either removed (and their UI entry points removed) OR wired to firebaseOperations (recordTitleInteraction + addToWatchlist) and dispatch the matching context actions."
    threshold: hard
    verify_command: "node -e \"const s=require('fs').readFileSync('screens/DetailScreen.js','utf8'); const localOnly=/const handleLike = \\(\\) => \\{\\s*setLikes\\(likes \\+ 1\\);\\s*\\};/.test(s) || /const handleWatched = \\(\\) => \\{\\s*setWatchedCount\\(watchedCount \\+ 1\\);\\s*\\};/.test(s); if (localOnly) { console.error('FAIL: local-only handlers still present'); process.exit(1); } console.log('OK');\""

  - criterion: "BUG-3 NavigationBar: no unguarded deref of auth.currentUser.uid; component renders without crash when currentUser is null."
    threshold: hard
    verify_command: "node -e \"const s=require('fs').readFileSync('components/NavigationBar.jsx','utf8'); if (/auth\\.currentUser\\.uid/.test(s) && !/auth\\.currentUser\\?\\.uid/.test(s) && !/if \\(!?auth\\.currentUser\\)/.test(s)) { console.error('FAIL: unguarded auth.currentUser.uid'); process.exit(1); } console.log('OK');\""

  - criterion: "BUG-4 Watchlist split-brain closed: fetchUserWatchlist reads from users/{uid}/watchlist subcollection (not the doc field). MoviesContext uses this fixed reader. No code path writes to or reads from a top-level 'watchlist' field on /users/{uid}."
    threshold: hard
    verify_command: "node -e \"const s=require('fs').readFileSync('utils/firebaseOperations.js','utf8'); const subcoll=/collection\\(\\s*db\\s*,\\s*['\\\"]users['\\\"]\\s*,\\s*userId\\s*,\\s*['\\\"]watchlist['\\\"]/.test(s); const docFieldRead=/docSnap\\.data\\(\\)\\.watchlist/.test(s); if (!subcoll || docFieldRead) { console.error('FAIL: fetchUserWatchlist must read subcollection, not doc field. subcoll=' + subcoll + ' docFieldRead=' + docFieldRead); process.exit(1); } console.log('OK');\""

  - criterion: "BUG-5 HomeScreen pagination: when all fetched items are filtered out by interactedTitles, the screen fetches the next TMDB page and retries filtering (up to a small retry cap), rather than setting empty content + 'No new content' error. No dead-end."
    threshold: hard
    verify_command: "node -e \"const s=require('fs').readFileSync('screens/HomeScreen.js','utf8'); const staticDeadEnd=/No new content to show\\. Try changing categories/.test(s); const hasPagination=/page|fetchNext|loadMore/i.test(s); if (staticDeadEnd || !hasPagination) { console.error('FAIL: dead-end still present or no pagination signal. deadEnd=' + staticDeadEnd + ' pagination=' + hasPagination); process.exit(1); } console.log('OK');\""

  - criterion: "BUG-6 DetailScreen trailer lookup: guarded against undefined data.videos / data.videos.results."
    threshold: hard
    verify_command: "node -e \"const s=require('fs').readFileSync('screens/DetailScreen.js','utf8'); const unguarded=/data\\.videos\\.results\\.find/.test(s); const guarded=/data\\.videos\\?\\.\\s*results\\?\\.\\s*find/.test(s) || /data\\?\\.\\s*videos\\?\\.\\s*results\\?\\.\\s*find/.test(s) || /data\\.videos &&/.test(s); if (unguarded && !guarded) { console.error('FAIL: data.videos.results.find is still unguarded'); process.exit(1); } console.log('OK');\""

  - criterion: "BUG-7 MoviesContext race: watchlist/friends fetches are gated on the user doc existing. Acceptable implementations: (a) onSnapshot on /users/{uid} that fires dispatches only once snapshot.exists() is true, or (b) pre-fetch guarded with a getDoc existence check + retry. NOT acceptable: fire dispatches unconditionally on onAuthStateChanged."
    threshold: hard
    verify_command: "node -e \"const s=require('fs').readFileSync('context/MoviesContext.js','utf8'); const usesSnapshot=/onSnapshot\\s*\\(/.test(s); const hasExistsGuard=/docSnap?\\w*\\.exists\\(\\)/.test(s); if (!usesSnapshot && !hasExistsGuard) { console.error('FAIL: no onSnapshot or exists() gate in MoviesContext'); process.exit(1); } console.log('OK');\""

  - criterion: "BUG-8 LoginScreen: submit is disabled while request is in flight; UI shows a loading indicator / disabled state; double-tap on the button submits once."
    threshold: hard
    verify_command: "node -e \"const s=require('fs').readFileSync('screens/LoginScreen.js','utf8'); const hasLoadingState=/useState\\(false\\)/.test(s) && /(isSubmitting|loading|submitting)/i.test(s); const hasDisabled=/disabled\\s*=\\s*\\{/.test(s); if (!hasLoadingState || !hasDisabled) { console.error('FAIL: LoginScreen lacks submitting state or disabled button. loading=' + hasLoadingState + ' disabled=' + hasDisabled); process.exit(1); } console.log('OK');\""

  # --- DESIGN TOKENS ---
  - criterion: "theme/index.js exists and exports colors, spacing, typography, radii, shadows as named exports or a single default with those keys."
    threshold: hard
    verify_command: "node -e \"const t=require('./theme'); const keys=['colors','spacing','typography','radii','shadows']; const missing=keys.filter(k => t[k]==null && (t.default==null || t.default[k]==null)); if (missing.length) { console.error('FAIL: theme missing keys:', missing); process.exit(1); } console.log('OK');\""

  - criterion: "theme.colors exposes every token in the locked palette: surface scale (ink, surface, surfaceRaised, borderStrong, borderSubtle, iconMuted, textTertiary, textSecondary, textBody, textHigh, overlay), primary accent (accent, accentHover, accentMuted, accentForeground), secondary accent (accentSecondary, accentSecondaryHover, accentSecondaryForeground), semantic (success, warning, error, info), and matchGradient."
    threshold: hard
    verify_command: "node -e \"const t=require('./theme'); const c=(t.colors||t.default.colors); const required=['ink','surface','surfaceRaised','borderStrong','borderSubtle','iconMuted','textTertiary','textSecondary','textBody','textHigh','overlay','accent','accentHover','accentMuted','accentForeground','accentSecondary','accentSecondaryHover','accentSecondaryForeground','success','warning','error','info','matchGradient']; const missing=required.filter(k=>c[k]==null); if (missing.length) { console.error('FAIL: missing color tokens:', missing); process.exit(1); } console.log('OK');\""

  - criterion: "theme.colors hex values match the locked palette exactly on the anchor tokens: accent=#FBEC5D, accentForeground=#0A0A12, accentSecondary=#FF3E9E, accentSecondaryForeground=#0A0A12 (both chromatics use ink foreground — bone-white fails WCAG AA on magenta at 3.00:1), ink=#0A0A12, textHigh=#F5F5FA, error=#FF3E6C, success=#00E090, info=#7FB3FF, warning=#FBEC5D (warning re-uses accent)."
    threshold: hard
    verify_command: "node -e \"const t=require('./theme'); const c=(t.colors||t.default.colors); const checks={accent:'#FBEC5D',accentForeground:'#0A0A12',accentSecondary:'#FF3E9E',accentSecondaryForeground:'#0A0A12',ink:'#0A0A12',textHigh:'#F5F5FA',error:'#FF3E6C',success:'#00E090',info:'#7FB3FF',warning:'#FBEC5D'}; const mismatches=Object.entries(checks).filter(([k,v])=>((c[k]||'').toString().toLowerCase()!==v.toLowerCase())); if (mismatches.length) { console.error('FAIL: hex mismatches:', JSON.stringify(mismatches)); process.exit(1); } console.log('OK');\""

  - criterion: "theme.spacing is a scale array [0, 4, 8, 12, 16, 24, 32, 48, 64] or a keyed object covering the same values."
    threshold: soft
    verify_command: "node -e \"const t=require('./theme'); const s=(t.spacing||t.default.spacing); const values=Array.isArray(s)?s:Object.values(s); const required=[0,4,8,12,16,24,32,48,64]; const missing=required.filter(v=>!values.includes(v)); if (missing.length) { console.error('FAIL: spacing missing values:', missing); process.exit(1); } console.log('OK');\""

  - criterion: "theme.typography exports at least display, titleLg, titleMd, titleSm, body, bodySm, label, caption, button presets, each with fontFamily, fontSize, lineHeight."
    threshold: hard
    verify_command: "node -e \"const t=require('./theme'); const typ=(t.typography||t.default.typography); const required=['display','titleLg','titleMd','titleSm','body','bodySm','label','caption','button']; const missing=required.filter(k=>!typ[k]||!typ[k].fontFamily||!typ[k].fontSize||!typ[k].lineHeight); if (missing.length) { console.error('FAIL: typography presets missing/incomplete:', missing); process.exit(1); } console.log('OK');\""

  # --- SCREEN MIGRATIONS ---
  - criterion: "LoginScreen imports from theme and uses tokens for color + spacing + typography (no literal hex colors in StyleSheet other than pass-through neutrals already in theme; all padding/margin values drawn from spacing)."
    threshold: hard
    verify_command: "node -e \"const s=require('fs').readFileSync('screens/LoginScreen.js','utf8'); const importsTheme=/from ['\\\"]\\.\\.\\/theme/.test(s)||/from ['\\\"]\\.\\.\\/\\.\\.\\/theme/.test(s); const rawHex=(s.match(/#[0-9a-fA-F]{3,8}/g)||[]); if (!importsTheme||rawHex.length>0) { console.error('FAIL: LoginScreen not migrated. importsTheme=' + importsTheme + ' rawHex=' + JSON.stringify(rawHex)); process.exit(1); } console.log('OK');\""

  - criterion: "RegisterScreen imports from theme and uses tokens for color + spacing + typography."
    threshold: hard
    verify_command: "node -e \"const s=require('fs').readFileSync('screens/RegisterScreen.js','utf8'); const importsTheme=/from ['\\\"]\\.\\.\\/theme/.test(s)||/from ['\\\"]\\.\\.\\/\\.\\.\\/theme/.test(s); const rawHex=(s.match(/#[0-9a-fA-F]{3,8}/g)||[]); if (!importsTheme||rawHex.length>0) { console.error('FAIL: RegisterScreen not migrated. importsTheme=' + importsTheme + ' rawHex=' + JSON.stringify(rawHex)); process.exit(1); } console.log('OK');\""

  - criterion: "MyCaveScreen imports from theme and uses tokens for color + spacing + typography."
    threshold: hard
    verify_command: "node -e \"const s=require('fs').readFileSync('screens/MyCaveScreen.js','utf8'); const importsTheme=/from ['\\\"]\\.\\.\\/theme/.test(s)||/from ['\\\"]\\.\\.\\/\\.\\.\\/theme/.test(s); const rawHex=(s.match(/#[0-9a-fA-F]{3,8}/g)||[]); if (!importsTheme||rawHex.length>0) { console.error('FAIL: MyCaveScreen not migrated. importsTheme=' + importsTheme + ' rawHex=' + JSON.stringify(rawHex)); process.exit(1); } console.log('OK');\""

  # --- CROSS-CUTTING ---
  - criterion: "ESLint runs clean — 0 errors. Warnings may exist but must not increase above Sprint 1's baseline of 10."
    threshold: hard
    verify_command: "npx eslint . --format compact"

  - criterion: "Prettier check passes."
    threshold: soft
    verify_command: "npx prettier --check ."

  - criterion: "expo-doctor passes 17/17."
    threshold: hard
    verify_command: "npx expo-doctor"

  - criterion: "npm install succeeds with no peer-dep failures."
    threshold: hard
    verify_command: "npm install --no-audit --no-fund"

  # --- MANUAL SMOKE (Sprint 1 pattern: user confirms) ---
  - criterion: "Manual smoke on iPhone Expo Go — fresh register → profile setup → home deck (no NavigationBar crash on null user during sign-out/in)."
    threshold: hard
    verify_command: "manual: user runs `npx expo start --tunnel`, registers fresh account, verifies flow through home deck and sign-out/in cycle."

  - criterion: "Manual smoke — swipe right on 20 titles; next page loads after deck exhaustion (no dead-end)."
    threshold: hard
    verify_command: "manual: user swipes through 20 titles and confirms deck continues."

  - criterion: "Manual smoke — tap a title, DetailScreen renders with or without trailer (no crash on missing data.videos)."
    threshold: hard
    verify_command: "manual: user taps ≥3 titles including at least one without a trailer; confirms no crash."

  - criterion: "Manual smoke — Firestore Console shows watchlist only in /users/{uid}/watchlist subcollection; no top-level watchlist doc field."
    threshold: hard
    verify_command: "manual: user inspects one user doc in Firestore Console and confirms."

  - criterion: "Manual smoke — Login, Register, MyCave visually match the locked token system: ink #0A0A12 background, laser-yellow #FBEC5D on primary CTAs, magenta #FF3E9E nowhere on these 3 screens (reserved for Sprint 4-5 social surfaces), bone-white #F5F5FA high-emphasis text, no pure #FFFFFF anywhere."
    threshold: hard
    verify_command: "manual: user navigates each screen on iPhone Expo Go and confirms: (a) backgrounds read inky blue-black, not warm gray; (b) primary CTAs are saturated yellow with dark text; (c) no magenta visible on Login/Register/MyCave (magenta should NOT appear — if it does, scope creep); (d) headings look slightly off-white, not sterile pure-white."

pivot_after_failures: 2

notes:
  - "Sprint 1 closed with commit d9497b4; this sprint builds on top of main clean."
  - "Brand palette LOCKED on 2026-04-18: dual-accent (yellow #FBEC5D primary + magenta #FF3E9E secondary) on cool-ink neutrals. See 'Design-system foundations' body section for full token map. Do NOT deviate."
  - "Dual-accent discipline: `accent` carries taste/match/action signals; `accentSecondary` carries social/connection signals. Sprint 2 only touches 3 screens, so the secondary accent mostly sits in the token file unused — but it must exist so Sprints 4-5 can reach for it without a second migration."
  - "Generator should run the `verify_command`s locally before claiming success and report pass/fail per criterion."
  - "For BUG-1, the verify is manual because button direction semantics depend on how handleSwipe interprets 'left' vs 'right'. The generator must choose a consistent convention across Skip/Watched handlers and document it in the commit message."
  - "For BUG-5 pagination: cap retry at 3 pages to avoid infinite loops on extremely thin TMDB result sets; if still empty after 3 pages, THEN show the 'no new content' empty state."
  - "For BUG-7: onSnapshot is preferred since it also fixes profile-complete signal gap referenced in the Sprint 1 handoff; however, a gated getDoc + retry is acceptable if it keeps the fix contained."
  - "WorkSans-SemiBold.ttf is still aliased to Bold.ttf; typography presets using 'SemiBold' will visually read as Bold until the file is dropped in (low priority, not in sprint)."
  - "Windows 11 host, bash shell; verify_command shell is bash (Git Bash). Node 20 via .nvmrc."
---

# Sprint 2 — Stop the bleeding + design-system foundations

## Context for the generator

You are picking up MovieMatchApp immediately after Sprint 1 closed. Sprint 1
took the repo from leaked-keys/half-broken to lint-clean, 0 CVEs, SDK 54,
Firestore rules tightened, env config unified via `app.config.js` +
`expo-constants`. Source of truth for that state is
`docs/handoffs/sprint-1.md` (titled "Sprint 1 CLOSED, Sprint 2 starts here").

Your job this sprint is exactly two things:

1. Fix the 8 known runtime bugs (table below) so the app has no known
   runtime crashes in any core flow.
2. Lay the foundation for the design system: a `theme/` module and migrate
   the three most offending screens (Login, Register, MyCave) onto it.

You are NOT building new features. You are NOT migrating other screens.
See `out_of_scope` above — treat it as a hard fence.

The full roadmap (Sprints 2-7) lives at
`C:\Users\enrique\.claude\plans\expressive-jumping-reddy.md`. Read the
Sprint 2 section first; the rest is context for why this sprint's scope is
shaped the way it is.

## Known issues (bug detail)

| # | File:line (at sprint start) | Issue | Fix direction |
|---|-----------------------------|-------|---------------|
| 1 | `components/SwipeableCard.js:236-254` | Skip button calls `handleSwipe('right', index)`; Watched calls `handleSwipe('left', index)`. If `right` = accept, this is reversed. | Pick a convention for `direction`, align both buttons and the gesture swipe. Document in commit message. |
| 2 | `screens/DetailScreen.js:122-128` | `handleLike` / `handleWatched` only `setLikes`/`setWatchedCount` locally. | Either remove the handlers + their UI entry points (if DetailScreen doesn't expose those buttons in Sprint 2 scope) OR wire them to `recordTitleInteraction` + `addToWatchlist` and dispatch the matching MoviesContext actions. Pick one; don't ship the stub. |
| 3 | `components/NavigationBar.jsx:10-16` | `onSnapshot(doc(db, 'users', auth.currentUser.uid), ...)` crashes when `currentUser` is null. Also `doc.data().profileName.split(' ')[0]` unguarded if data() or profileName is null. | Null-guard on `auth.currentUser`; early-return or render placeholder. Optional-chain the `split`. |
| 4 | `utils/firebaseOperations.js:80-118` + `context/MoviesContext.js:134` | `addToWatchlist` writes subcollection; `fetchUserWatchlist` reads `docSnap.data().watchlist`. Split-brain. | Pick the subcollection as source of truth. Rewrite `fetchUserWatchlist` to `getDocs` on the subcollection. MoviesContext stays as-is (it already dispatches SET_WATCHLIST with the return value). Remove any doc-field writes if present. |
| 5 | `screens/HomeScreen.js:95-107` | When `filteredData.length === 0` (all fetched items already interacted-with), the screen sets empty content + `'No new content to show'` error. Dead-end. | Add a page counter; on empty-after-filter, fetch the next TMDB page and re-filter. Cap retries at 3. Only after 3 empty pages, show the empty state. |
| 6 | `screens/DetailScreen.js:33-34` | `data.videos.results.find(...)` crashes on undefined `data.videos`. | Optional-chain: `data.videos?.results?.find(...)`. |
| 7 | `context/MoviesContext.js:128-156` | `onAuthStateChanged` unconditionally dispatches `SET_WATCHLIST`/`SET_FRIENDS_LIST`. On fresh register, the /users/{uid} doc may not exist yet when this fires (race). | Replace the unconditional fetch with an `onSnapshot` on /users/{uid} that only dispatches once `snapshot.exists()` is true. Clean up the snapshot listener on sign-out. |
| 8 | `screens/LoginScreen.js` | No loading/disabled state on submit. Double-tap submits twice. | Add `isSubmitting` state. Disable the login button while submitting. Show a spinner or change label. |

## Design-system foundations

Create `theme/index.js` (new file). Export (named or default, generator's
choice — both supported by verify_commands):

- **colors** — locked palette, dual-accent (yellow + magenta), dark-first.
  Use these exact hex values:

  Surface & text scale (cool-undertone ink, not gray):
  ```
  ink              #0A0A12   // app background; inky, slight blue undertone
  surface          #111118   // cards, bottom sheets
  surfaceRaised    #1A1A24   // elevated modals, sticky headers
  borderStrong     #2A2A38   // divider between cards
  borderSubtle     #3D3D4F   // input borders, hairlines
  iconMuted        #5F5F74   // disabled icons, low-emphasis
  textTertiary     #8A8AA0   // timestamps, metadata
  textSecondary    #B4B4CA   // supporting text, labels
  textBody         #EAEAF2   // default body text
  textHigh         #F5F5FA   // bone-white, NOT pure white — headings
  overlay          rgba(10, 10, 18, 0.7)   // scrims, modal backdrops
  ```

  Primary accent (laser lemon — high-emphasis actions, match %, CTAs):
  ```
  accent             #FBEC5D
  accentHover        #E5D94A
  accentMuted        rgba(251, 236, 93, 0.15)
  accentForeground   #0A0A12    // MANDATORY pairing — text on accent
  ```

  Secondary accent (hot magenta — social / connection / "new" signals,
  mid-tier match %, share highlights):
  ```
  accentSecondary             #FF3E9E
  accentSecondaryHover        #E82F8C
  accentSecondaryForeground   #0A0A12    // MANDATORY pairing — INK on magenta (bone-white fails WCAG AA at 3.00:1; ink passes at 6.09:1)
  ```

  Semantic (shifted electric to stop competing with the accent):
  ```
  success   #00E090    // electric mint — NOT corporate green
  warning   #FBEC5D    // reuse accent — yellow IS warning
  error     #FF3E6C    // pink-red, harmonizes with magenta
  info      #7FB3FF    // soft periwinkle — NOT Twitter blue
  ```

  Match-badge gradient (tri-stop heat ramp — read as dim → hot → solar):
  ```
  matchGradient   ['#5F5F74', '#FF3E9E', '#FBEC5D']
  ```

  Rules:
  - On `accent` backgrounds, text MUST be `accentForeground` (#0A0A12).
    Yellow + white fails WCAG.
  - On `accentSecondary` backgrounds, text MUST be
    `accentSecondaryForeground` (#0A0A12 ink). Pale-on-magenta was rejected
    during contract lock-in for 3.00:1 contrast (fails WCAG AA 4.5:1).
  - CONSISTENCY RULE: both chromatic accents use ink foregrounds. Chromatic
    never pairs with bone-white in this system.
  - Pure `#FFFFFF` is FORBIDDEN anywhere in the screens. Use `textHigh`
    (#F5F5FA) — authenticity signal, avoids sterile-corporate read.
  - `accent` and `accentSecondary` should never sit adjacent on the same
    surface at equal emphasis. One leads, the other punctuates.
- **spacing** — array `[0, 4, 8, 12, 16, 24, 32, 48, 64]` (or equivalent
  keyed object).
- **typography** — 9 presets: `display`, `titleLg`, `titleMd`, `titleSm`,
  `body`, `bodySm`, `label`, `caption`, `button`. Each has
  `fontFamily` (use the WorkSans variants already loaded in App.js),
  `fontSize`, `lineHeight`, and (where relevant) `fontWeight` /
  `letterSpacing`. iOS/Android line-height correction: use explicit
  `lineHeight` values, not `lineHeight: undefined`.
- **radii** — `{sm: 4, md: 8, lg: 12, xl: 20, pill: 999}`.
- **shadows** — iOS + Android presets (`shadowColor`/`shadowOffset`/
  `shadowOpacity`/`shadowRadius` for iOS, `elevation` for Android); at
  minimum `sm`, `md`, `lg`.

### Screen migrations (exactly 3 screens, no more)

- `screens/LoginScreen.js`
- `screens/RegisterScreen.js`
- `screens/MyCaveScreen.js`

For each migrated screen: zero literal hex colors in the StyleSheet, all
spacing values drawn from `theme.spacing`, text styles use `theme.typography.*`
presets (spread or referenced). The rest of the screens stay untouched
until Sprint 4.

## Generator rules

- Commit per logical chunk with conventional-commits style (`fix(bugN):`,
  `feat(theme):`, `refactor(login): migrate to tokens`, etc.). Small commits.
- Before committing, run the sprint's hard-threshold `verify_command`s that
  apply to the files you touched, and report results in the commit message
  body.
- Do NOT touch any file outside the 8 bugs + theme + 3 screens unless it
  is a mechanical propagation needed by one of those (e.g., removing a
  stale import, updating a call site of a function you changed).
- Do NOT introduce TypeScript, tests, or CI in this sprint.
- Do NOT add new dependencies without noting why in the commit message.
- If you hit a blocker that requires user input (e.g., confirming the accent
  hex), STOP and append to `docs/handoffs/sprint-1.md` under "Open questions"
  — do not guess.
- Stage Sprint 1's environment: Node 20 via `.nvmrc` (`nvm use 20`), then
  `npm install` once at the top of the session.
- If you find a 9th bug during work, do NOT fix it in this sprint — log it
  under "Open questions" and move on. The point is scope discipline.

## Evaluator expectations

The evaluator will:

1. Read this contract.
2. For each `hard` criterion: run the `verify_command`; report
   pass/fail with evidence (stdout snippet or file excerpt).
3. Ask the user to execute each `manual:` verify and report results.
4. Return one of `PASS` / `SOFT_FAIL` / `HARD_FAIL`.
5. Also answer: "Would a staff engineer approve this? Is there a more
   elegant way?"

Two consecutive `HARD_FAIL`s → escalate to planner per
`harness-workflow` skill Step 4.
