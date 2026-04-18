---
sprint: 3
feature: "TypeScript migration + tests + CI"
reference_contracts:
  - docs/harness/contracts/moviematch-sprint-1.md
  - docs/harness/contracts/moviematch-sprint-2.md
reference_plan: "C:/Users/enrique/.claude/plans/expressive-jumping-reddy.md"

scope:
  - "Introduce TypeScript strict mode: tsconfig.json extending expo/tsconfig.base"
  - "Migrate all source files (.js/.jsx → .ts/.tsx) in dependency order: utils → services → context → components → screens → navigation → App"
  - "Keep config files as .js per their tool conventions (app.config.js, metro.config.js, eslint.config.js, babel.config.js, jest.config.js)"
  - "Install + configure Jest with jest-expo preset and @testing-library/react-native"
  - "Write test suites for 6 surfaces: (1) auth submit paths on LoginScreen, (2) MoviesContext reducer, (3) core firebaseOperations (recordTitleInteraction, addToWatchlist, fetchUserWatchlist), (4) SwipeableCard button direction semantics, (5) HomeScreen pagination (append on exhaustion), (6) match% stub ready for Sprint 5"
  - "Mock firebase/app, firebase/auth, firebase/firestore globally in a jest setup file"
  - "Add .github/workflows/ci.yml running on push + pull_request: typecheck (tsc --noEmit) + lint (eslint) + format (prettier --check) + test (jest --ci)"
  - "Add .gitattributes enforcing LF line endings for source + run `git add --renormalize .` + `prettier --write .` to clear CRLF drift flagged in Sprint 2 handoff"
  - "Add npm scripts: typecheck, test, test:ci, lint, format, format:check"
  - "Resolve the 9 pre-existing ESLint warnings that sit inside migrated files (they'll surface as touched files anyway — fix in flight, don't leave stragglers)"
  - "Commit per logical chunk with conventional-commits; push to origin/main when the sprint closes"

out_of_scope:
  - "New features of any kind (taste quiz, match% algorithm, queues, rec cards — Sprints 4-5)"
  - "Theme migration of remaining screens (HomeScreen, DetailScreen, MatchesScreen, ProfileSetupScreen, ForgotPasswordScreen — Sprint 4)"
  - "The 6 visual issues logged in Sprint 2 handoff 'Out-of-Sprint-2-scope visual issues' (DetailScreen light header, tab bar styling, swipe-reveal colors, HomeScreen bg + spinner color, MatchesScreen empty state, MyCaveScreen banner seam — all Sprint 4)"
  - "YouTube WebView Error 153 investigation (Sprint 4 alongside DetailScreen revamp)"
  - "Firebase rules deployment (user task, noted in Sprints 1-2 handoffs)"
  - "Firebase Web API key tightening in GCP (user task)"
  - "WorkSans-SemiBold.ttf real file (low priority font asset drop)"
  - "Profile image upload / Firebase Storage (Sprint 5)"
  - "EAS Build / TestFlight / Sentry / Analytics (Sprint 7)"
  - "Adding e2e tests (Detox / Maestro) — unit + RNTL component tests only this sprint"
  - "Migrating config files to TS (keep .js for tool compatibility)"
  - "Refactoring during migration beyond what strict mode forces"

success_criteria:
  # --- TYPESCRIPT STRUCTURE ---
  - criterion: "tsconfig.json exists at repo root and enables strict mode."
    threshold: hard
    verify_command: "node -e \"const t=require('./tsconfig.json'); const strict = t.compilerOptions && t.compilerOptions.strict===true; if(!strict){console.error('FAIL: tsconfig strict is not true',t.compilerOptions);process.exit(1)} console.log('OK')\""

  - criterion: "Every source file under App.tsx, components/, context/, navigation/, screens/, services/, utils/, theme/, firebaseConfig is .ts or .tsx. No remaining .js/.jsx in these trees except App.js/App.tsx single-source entry."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); const dirs=['components','context','navigation','screens','services','utils','theme']; let bad=[]; for(const d of dirs){try{for(const f of fs.readdirSync(d)){if(/\\.(js|jsx)$/.test(f)) bad.push(path.join(d,f))}}catch(e){}} if(fs.existsSync('App.js')) bad.push('App.js'); if(fs.existsSync('firebaseConfig.js')) bad.push('firebaseConfig.js'); if(bad.length){console.error('FAIL: non-TS source files remain:',bad);process.exit(1)} console.log('OK')\""

  - criterion: "Type check passes with zero errors under strict mode."
    threshold: hard
    verify_command: "npx tsc --noEmit"

  - criterion: "Escape-hatch discipline: inline `any` (annotation OR cast) appears in at most 10 locations across the entire src tree, and none in utils/ or services/ (the backbone must be truly typed). A justified `any` is acceptable when paired with a `// reason:` comment on the same or previous line."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); const walk=(d)=>{let r=[]; for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name==='node_modules'||e.name==='.expo'||e.name==='docs'||e.name==='.git') continue; const p=path.join(d,e.name); if(e.isDirectory()) r=r.concat(walk(p)); else if(/\\.(ts|tsx)$/.test(e.name)) r.push(p)} return r}; const files=walk('.'); let backbone=0, total=0; const re=/(?<![A-Za-z0-9_])any(?![A-Za-z0-9_])/g; for(const f of files){const src=fs.readFileSync(f,'utf8'); const lines=src.split(/\\r?\\n/); lines.forEach((line,i)=>{ const hits=(line.match(re)||[]).length; if(!hits) return; const isAnnot=/:\\s*any\\b|as\\s+any\\b|<any>|Array<any>|Record<[^,]+,\\s*any>/.test(line); if(!isAnnot) return; const prev=lines[i-1]||''; const just=/\\/\\/\\s*reason:/i.test(line)||/\\/\\/\\s*reason:/i.test(prev); if(just) return; total+=hits; if(/^(utils|services)\\b/.test(f.replace(/\\\\/g,'/').replace(/^\\.\\//,''))) backbone+=hits }) } if(backbone>0){console.error('FAIL: backbone has unjustified any in utils/ or services/:',backbone);process.exit(1)} if(total>10){console.error('FAIL: unjustified any count',total,'exceeds 10');process.exit(1)} console.log('OK',total)\""

  # --- TEST INFRASTRUCTURE ---
  - criterion: "Jest configured with jest-expo preset; a setup file mocks firebase/app, firebase/auth, firebase/firestore; @testing-library/react-native installed."
    threshold: hard
    verify_command: "node -e \"const pkg=require('./package.json'); const deps={...pkg.dependencies,...pkg.devDependencies}; const missing=['jest','jest-expo','@testing-library/react-native','typescript','@types/react','@types/jest'].filter(k=>!deps[k]); if(missing.length){console.error('FAIL: missing deps',missing);process.exit(1)} const fs=require('fs'); const hasJestConfig=fs.existsSync('jest.config.js')||fs.existsSync('jest.config.ts')||(pkg.jest!=null); if(!hasJestConfig){console.error('FAIL: no jest config');process.exit(1)} const setup=fs.readdirSync('.').find(f=>/^jest\\.setup\\.(js|ts)$/.test(f))||fs.existsSync('tests/setup.ts')&&'tests/setup.ts'||fs.existsSync('__mocks__/firebase.ts')&&'__mocks__/firebase.ts'; const setupSrc = setup?fs.readFileSync(setup,'utf8'):''; const mocksFirebase=/firebase\\/(app|auth|firestore)/.test(setupSrc)||fs.existsSync('__mocks__'); if(!mocksFirebase){console.error('FAIL: firebase not mocked in setup');process.exit(1)} console.log('OK')\""

  - criterion: "Test suites exist for all 6 required surfaces: auth (LoginScreen submit), MoviesContext reducer, firebaseOperations (recordTitleInteraction + addToWatchlist + fetchUserWatchlist), SwipeableCard (button direction), HomeScreen (pagination-on-exhaustion), match% (stub). At least one .test.ts(x) file per surface."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); const walk=(d)=>{let r=[]; if(!fs.existsSync(d)) return r; for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name==='node_modules'||e.name==='.git') continue; const p=path.join(d,e.name); if(e.isDirectory()) r=r.concat(walk(p)); else if(/\\.test\\.(ts|tsx)$/.test(e.name)) r.push(p)} return r}; const testFiles=walk('.'); const expectHits=(re)=>testFiles.some(f=>re.test(f.replace(/\\\\/g,'/'))||re.test(fs.readFileSync(f,'utf8'))); const surfaces=[['auth',/LoginScreen|signIn|authenticate/i],['reducer',/MoviesContext|reducer/i],['firebaseOps',/firebaseOperations|recordTitleInteraction|addToWatchlist|fetchUserWatchlist/i],['swipeCard',/SwipeableCard/i],['pagination',/HomeScreen|pagination|prefetch/i],['matchPct',/match%|matchPct|matchPercent|matchScore/i]]; const missing=surfaces.filter(([n,re])=>!expectHits(re)).map(s=>s[0]); if(missing.length){console.error('FAIL: missing test surfaces:',missing);process.exit(1)} console.log('OK',testFiles.length,'test files')\""

  - criterion: "Jest runs green in CI mode (exit code 0, no pending/skipped that obscures required surfaces, at least 20 passing assertions total)."
    threshold: hard
    verify_command: "npm test -- --ci --json --outputFile=/tmp/jest-result.json --passWithNoTests=false && node -e \"const r=require('/tmp/jest-result.json'); if(!r.success){console.error('FAIL: jest did not succeed');process.exit(1)} const assertions=r.testResults.reduce((s,t)=>s+(t.assertionResults||[]).filter(a=>a.status==='passed').length,0); if(assertions<20){console.error('FAIL: only',assertions,'passing assertions');process.exit(1)} console.log('OK',assertions,'passing assertions across',r.numPassedTests,'tests')\""

  # --- CI PIPELINE ---
  - criterion: ".github/workflows/ci.yml exists and runs typecheck + lint + prettier-check + test on push and pull_request."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'); if(!fs.existsSync('.github/workflows/ci.yml')){console.error('FAIL: ci.yml missing');process.exit(1)} const y=fs.readFileSync('.github/workflows/ci.yml','utf8'); const checks=[['push trigger',/on:[\\s\\S]*?push/],['PR trigger',/pull_request/],['typecheck',/tsc\\s+--noEmit|typecheck/],['lint',/eslint/],['prettier',/prettier\\s+--check|format:check/],['test',/(jest|npm (run )?test|test:ci)/]]; const missing=checks.filter(([n,re])=>!re.test(y)).map(c=>c[0]); if(missing.length){console.error('FAIL: ci.yml missing:',missing);process.exit(1)} console.log('OK')\""

  - criterion: "package.json scripts: typecheck, test, test:ci, lint, format:check all present and executable."
    threshold: hard
    verify_command: "node -e \"const s=require('./package.json').scripts||{}; const req=['typecheck','test','test:ci','lint','format:check']; const missing=req.filter(k=>!s[k]); if(missing.length){console.error('FAIL: missing scripts',missing);process.exit(1)} console.log('OK')\""

  # --- CODE QUALITY CROSS-CUTTING ---
  - criterion: "ESLint runs clean: 0 errors, no more than 9 warnings (Sprint 2 baseline — must not regress)."
    threshold: hard
    verify_command: "npx eslint . --format compact"

  - criterion: "Prettier --check passes across the repo (CRLF drift cleared via .gitattributes + renormalize + format)."
    threshold: hard
    verify_command: "npx prettier --check ."

  - criterion: ".gitattributes exists and enforces LF endings for source files."
    threshold: soft
    verify_command: "node -e \"const fs=require('fs'); if(!fs.existsSync('.gitattributes')){console.error('FAIL: .gitattributes missing');process.exit(1)} const g=fs.readFileSync('.gitattributes','utf8'); if(!/eol=lf/i.test(g)&&!/text=auto/i.test(g)){console.error('FAIL: .gitattributes does not enforce LF');process.exit(1)} console.log('OK')\""

  - criterion: "expo-doctor passes 17/17."
    threshold: hard
    verify_command: "npx expo-doctor"

  - criterion: "npm install succeeds with no peer-dep failures."
    threshold: hard
    verify_command: "npm install --no-audit --no-fund"

  # --- RUNTIME REGRESSION GUARD (manual smoke) ---
  - criterion: "Manual smoke on iPhone Expo Go — app boots without redbox/yellowbox regressions. No stripped or dropped behavior from Sprint 2's 6/6 passing smokes (register, swipe direction semantics, DetailScreen, pagination past 20+, watchlist subcollection, sign-out/in cycle). TS migration must not alter runtime behavior."
    threshold: hard
    verify_command: "manual: user runs `npx expo start --tunnel`, signs in with existing account, confirms: (1) app boots clean, (2) swipe right adds to My Cave, (3) swipe left does not, (4) tap a title → DetailScreen renders, (5) swipe past 20 titles without dead-end, (6) sign-out + sign-in cycle does not crash NavigationBar."

pivot_after_failures: 2

notes:
  - "Sprint 2 closed with commit c3a3b2e; main is clean. Sprint 3 branches off main."
  - "Lesson from Sprint 2: verify_commands assert on RUNTIME SHAPE (tsc exit 0, jest exit 0 + assertion count, ci.yml YAML structure), not keyword presence in source. Following that discipline throughout this contract."
  - "Dependency-order migration (utils → services → context → components → screens → navigation → App) prevents type errors from cascading backward during the migration. Commit between layers so failures are bisectable."
  - "Firebase mock strategy: a single `__mocks__/firebase.ts` exporting stub versions of initializeApp / getAuth / getFirestore / collection / doc / getDoc / setDoc / updateDoc / onSnapshot / etc., returning deterministic stub objects. Tests import real modules; Jest replaces via jest.mock('firebase/app'), jest.mock('firebase/auth'), jest.mock('firebase/firestore'). Any test needing custom behavior uses the .mockReturnValue() pattern."
  - "match% test is a STUB: write a test that imports a (non-existent-yet) utils/matchScore.ts module with a simple function signature and asserts TODO behavior — or write a placeholder test that documents the Sprint 5 spec. Do NOT implement match% logic this sprint."
  - "`jsx: 'react-native'` in tsconfig; `expo/tsconfig.base` sets most compiler flags. Only strict + noEmit needed on top, maybe skipLibCheck for speed."
  - "react-test-renderer should match React 19.1.0 major version for RNTL compatibility. If @testing-library/react-native's peer deps conflict, use --legacy-peer-deps sparingly and document in commit."
  - "For the CI YAML: target Node 20 to match .nvmrc, cache npm, run steps in parallel jobs or as sequential steps in a single job — generator's choice. Fast feedback preferred (one job with all checks is fine at this repo size)."
  - "Phosphor icons (Sprint 2) import as typed components — generator should confirm 'phosphor-react-native' ships its own types or add a minimal type shim."
  - "Firebase v11 has built-in types; no @types/firebase needed."
  - "axios, @react-navigation/*, expo-constants, expo-font, expo-image-picker, expo-checkbox, expo-splash-screen, expo-status-bar, react-native-webview, react-native-svg, react-native-gesture-handler, react-native-screens, react-native-safe-area-context, phosphor-react-native — all ship types; no additional @types needed."
  - "If a migrated file surfaces a real bug behind a type error (e.g., optional chain that was actually null-derefing), fix it and cross-reference Sprint 2's handoff's 'Open questions' to see if it was already flagged — don't double-log."
  - "Windows 11 host, bash (Git Bash) shell; verify_commands run in bash. Node 20 via .nvmrc."

# --- Evaluator expectations ---
#
# The evaluator runs each hard-threshold verify_command and reports pass/fail
# with evidence. For manual: prefixed criteria, the evaluator asks the user to
# run them and relays results. Verdict: PASS | SOFT_FAIL | HARD_FAIL.
#
# Two consecutive HARD_FAILs on the same sprint → escalate to planner per
# harness-workflow Step 4.
#
# Also answer: "Would a staff engineer approve this? Is there a more elegant
# way?" — Sprint 3 success is not just "it compiles" but "the codebase
# is actually typed, not `any`-sprayed to pass tsc."
---

# Sprint 3 — TypeScript migration + tests + CI

## Context for the generator

You are picking up MovieMatchApp immediately after Sprint 2 closed.

Source-of-truth handoff: `docs/handoffs/sprint-2.md` ("Sprint 2 CLOSED, Sprint 3 starts here").

Sprints 1-2 delivered:
- Leaked-keys/half-broken → runs on iOS Expo Go, SDK 54, lint-clean, 0 CVEs, env via `app.config.js` + `expo-constants`, Firestore rules tightened.
- 8 runtime bugs fixed (watchlist split-brain closed, pagination wired, NavigationBar null-guarded, LoginScreen submitting state, etc.).
- `theme/index.js` locked with dual-accent palette (yellow #FBEC5D + magenta #FF3E9E on ink #0A0A12), 9 typography presets, radii, shadows.
- 3 screens migrated to theme tokens: Login, Register, MyCave. Other screens are Sprint 4.
- Icons migrated from `react-native-vector-icons` to `phosphor-react-native`.

Your job THIS sprint is exactly three things:

1. **Full TypeScript migration** in dependency order. Strict mode on from day one. No-`any` discipline — escape hatches must be justified in a `// reason:` comment, and the backbone (`utils/`, `services/`) must be zero-`any`.
2. **Test infrastructure + 6 test surfaces.** Jest with `jest-expo` preset, `@testing-library/react-native`, Firebase mocked globally. Tests for: auth submit path (LoginScreen), MoviesContext reducer, core firebaseOperations (recordTitleInteraction + addToWatchlist + fetchUserWatchlist), SwipeableCard button direction, HomeScreen pagination, match% stub (placeholder for Sprint 5).
3. **GitHub Actions CI pipeline** running on `push` + `pull_request`: typecheck + lint + prettier-check + test. Fail-fast feedback.

You are NOT building features. You are NOT theming other screens. You are NOT deploying Firestore rules. See `out_of_scope` above — treat it as a hard fence.

The full roadmap (Sprints 2-7) lives at `C:\Users\enrique\.claude\plans\expressive-jumping-reddy.md`. Sprint 3 is the "quality bar" sprint — everything else builds on top of it.

## Migration order (strict — do not rearrange)

1. **Setup**: `tsconfig.json` (extends `expo/tsconfig.base`, `strict: true`), install `typescript`, `@types/react`, `@types/jest`. Verify `npx tsc --noEmit` runs (will surface errors — that's expected).
2. **utils/firebaseOperations.js → utils/firebaseOperations.ts** — type the Firestore operation signatures (userId: string, titleId: string | number, etc.). Backbone must be fully typed, zero `any`.
3. **services/api.js → services/api.ts** — type the TMDB response shapes (Movie, TvShow, VideoResult). Backbone must be fully typed.
4. **context/MoviesContext.js → context/MoviesContext.tsx** — type reducer state, action union, context value. This is the most load-bearing type surface.
5. **theme/index.js → theme/index.ts** — export inferred types (`export type Theme = typeof theme`) so downstream screens can type their `StyleSheet.create` inputs.
6. **components/ → .tsx** — CategoryButton, CategoryTabs, NavigationBar, SearchIcon, SwipeableCard. Each gets typed props interface.
7. **screens/ → .tsx** — all 8 screens. Each gets typed route params + navigation prop via `@react-navigation/native-stack` or `@react-navigation/stack` generics.
8. **navigation/AppNavigator.js → .tsx** — the root param-list type (often called `RootStackParamList`) that screens consume.
9. **App.js → App.tsx** and **firebaseConfig.js → firebaseConfig.ts**.

Commit between each layer (at least 6 commits across the migration). That way any regression is bisectable.

## Test strategy

Global Jest config in `jest.config.js`:
```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEach: ['./jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-navigation|expo(nent)?|@expo(nent)?/.*|expo-modules-core|phosphor-react-native))'
  ],
};
```

`jest.setup.ts` mocks Firebase:
```ts
jest.mock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})), getApps: jest.fn(() => []) }));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: null })),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  onAuthStateChanged: jest.fn(() => () => {}),
  // ...
}));
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn(() => ({})),
  collection: jest.fn(() => ({})),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  onSnapshot: jest.fn(() => () => {}),
  // ...
}));
```

Individual tests override with `jest.mocked(fn).mockResolvedValue(...)` per case.

### Test surfaces — what to assert

| Surface | File | Minimum assertions |
|---|---|---|
| Auth (LoginScreen submit) | `__tests__/LoginScreen.test.tsx` | submit button disabled during in-flight request; fires signInWithEmailAndPassword once on double-tap; error path renders error state |
| MoviesContext reducer | `__tests__/MoviesContext.test.ts` | each action type produces expected state transition; SET_WATCHLIST replaces, ADD_TO_WATCHLIST appends |
| firebaseOperations | `__tests__/firebaseOperations.test.ts` | recordTitleInteraction writes to correct path; addToWatchlist writes subcollection; fetchUserWatchlist reads subcollection (not doc field — regression guard for BUG-4) |
| SwipeableCard direction | `__tests__/SwipeableCard.test.tsx` | pressing Skip fires handleSwipe with LEFT semantic; pressing Watched fires handleSwipe with RIGHT semantic (regression guard for BUG-1) |
| HomeScreen pagination | `__tests__/HomeScreen.pagination.test.tsx` | when swipe approaches end-of-deck (PREFETCH_THRESHOLD), next page is fetched and appended (regression guard for BUG-5 refinement) |
| match% stub | `__tests__/matchScore.stub.test.ts` | placeholder test documenting the Sprint 5 spec — e.g., `it.skip('computes overlap of interactedTitles between two users')` or `it('stub exists for Sprint 5')` |

## CI YAML — target shape

`.github/workflows/ci.yml`:
```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run format:check
      - run: npm run test:ci
```

Single job is fine at this repo size. Parallel jobs are nicer but not worth the YAML sprawl yet.

## CRLF cleanup (flagged in Sprint 2 handoff)

Add `.gitattributes`:
```
* text=auto eol=lf
*.png binary
*.jpg binary
*.ttf binary
*.otf binary
```

Then:
```bash
git add --renormalize .
npx prettier --write .
git add -u
git commit -m "chore: enforce LF line endings + prettier pass across repo"
```

This should be one of the final commits in the sprint, after TS migration is stable.

## Generator rules

- Dependency-order migration. Commit per layer (≥6 commits). No single mega-commit.
- `any` escape hatches require a `// reason: <text>` comment. Zero `any` in `utils/` or `services/`.
- Run `npx tsc --noEmit` + `npm test` locally before each commit; report in commit message body.
- Do NOT touch files outside the scope defined above (no theming, no feature work, no bug fixing unless a type error reveals a bug — if so, call it out in the commit).
- Do NOT bypass strict mode with `// @ts-nocheck` or `// @ts-expect-error` without a `reason:` comment.
- If a dependency install triggers peer-dep failures, use `--legacy-peer-deps` sparingly and document in the commit.
- If you discover a 9th requirement or scope gap during work, STOP and append to `docs/handoffs/sprint-2.md` under "Open questions". Do not expand scope silently.

## Evaluator expectations

The evaluator (`feature-dev:code-reviewer`) will:

1. Read this contract + the Sprint 2 handoff.
2. For each `hard` criterion: run the `verify_command`; report pass/fail with stdout evidence.
3. Relay the `manual:` smoke criterion to the user; record result.
4. Spot-check: open 3 random migrated files; inspect type quality — are types real or `any`-adjacent? Does the reducer type cover every action? Does the screen component type its route.params?
5. Return `PASS` / `SOFT_FAIL` / `HARD_FAIL`.
6. Answer: "Would a staff engineer approve this? Is there a more elegant way?"

Two consecutive `HARD_FAIL`s → escalate to planner for replan.
