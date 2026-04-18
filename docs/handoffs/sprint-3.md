# Handoff: MovieMatchApp — Sprint 3 CLOSED, Sprint 4 starts here

## TL;DR for next session

**First action**: read this file. Then read the Sprint 4 R&D briefs at
`docs/research/sprint-4-social-product.md`, `docs/research/sprint-4-dopamine.md`,
and `docs/research/sprint-4-mobile-ux.md`. Then read the plan's Sprint 4 section
at `C:\Users\enrique\.claude\plans\expressive-jumping-reddy.md`. Then draft the
Sprint 4 contract at `docs/harness/contracts/moviematch-sprint-4.md` applying
the cross-cutting research rules (see "Sprint 4 design constraints from R&D" below).

**Do NOT** re-audit what Sprints 1-3 already fixed. Sprint 3 gave the codebase
TypeScript strict + Jest/RNTL + GitHub Actions CI. Treat that as load-bearing.

## State of the repo

- **Branch**: `main`, clean, 13 commits ahead of `origin/main` awaiting push.
- **HEAD**: `ba291b9 docs(sprint-3): land Sprint 3 contract + Sprint 4 R&D briefs`
- **Range this sprint**: `c3a3b2e..ba291b9` (13 commits)
- **Remote branches**: only `main`
- **App runs** on iPhone Expo Go via `npx expo start --tunnel`
- **expo-doctor**: 17/17 passing
- **TypeScript**: strict mode on; `npx tsc --noEmit` → clean
- **ESLint**: 0 errors, 0 warnings (improvement from Sprint 2's 9-warning baseline)
- **Prettier**: clean; `.gitattributes` enforces LF
- **Jest**: 6/6 test suites, 26 passing assertions + 1 intentional skip (Sprint 5 match% target)
- **CI**: `.github/workflows/ci.yml` wired — typecheck + lint + prettier + test on push/PR
- **No open CVEs**

## Sprint 3 accomplishments (13 commits)

### Generator pass (11 commits — TS migration in dep order + infra)

| Commit | Purpose |
|---|---|
| `62205ae` | chore(ts): bootstrap TypeScript + test + format infra (tsconfig, jest.config, jest.setup, scripts) |
| `c09af83` | feat(typescript): migrate services/api to TS with TMDB response types |
| `b62d09c` | feat(typescript): migrate utils/firebaseOperations to TS |
| `9606436` | feat(typescript): migrate context/MoviesContext to TSX (reducer action union) |
| `8669bcf` | feat(typescript): migrate theme/index to TS with typed tokens |
| `d71f67d` | feat(typescript): migrate components/ to TSX + introduce nav/types.ts (RootStackParamList) |
| `3de2d93` | feat(typescript): migrate all screens to TSX with typed nav params |
| `9e21b8d` | feat(typescript): migrate navigation + App + firebaseConfig to TS |
| `58014e4` | test(sprint-3): add jest + RTL + 6 test surfaces + CI workflow |
| `435bb45` | chore: enforce LF line endings + prettier pass across repo |
| `d00a23e` | chore(ci): annotate run steps + add test-surface verify script |

### Evaluator refinement pass (1 commit)

Independent `feature-dev:code-reviewer` returned SOFT_FAIL flagging three
craft issues. All resolved in:

| Commit | Purpose |
|---|---|
| `14c3830` | fix(sprint-3): evaluator refinement — (1) `LoginScreen.navigate('Forgot Password')` was typed-legal but ran against a non-existent route; renamed to `'ForgotPassword'` and dropped the alias from `AuthStackParamList`. (2) `ProfileSetupScreen` `(route.params as any)` replaced with a shared `SharedProfileParams` type applied to both parent stacks — codebase now has ZERO unjustified `any`. (3) `HomeScreen.pagination.test.tsx` rewritten from constant-simulation to a real HomeScreen render with mocked `../services/api` + spy on `fetchPopularTVShows` — the test now actually executes the prefetch effect and asserts page=2 is fetched when the deck nears `PREFETCH_THRESHOLD`. Real BUG-5 regression guard. |

### Docs commit (1)

| Commit | Purpose |
|---|---|
| `ba291b9` | docs(sprint-3): land Sprint 3 contract + 3 Sprint 4 R&D briefs (research-first discipline per `feedback_research_first` memory) |

## Contract verification — final state

**Hard-threshold automated**: 14/14 PASS
**Manual smoke**: pending user confirmation (criterion 15)

| # | Criterion | Result |
|---|---|---|
| 1 | tsconfig strict: true | PASS |
| 2 | No .js/.jsx in source trees (only config-tool files) | PASS |
| 3 | `tsc --noEmit` zero errors | PASS |
| 4 | ≤10 unjustified `any`, 0 in backbone | PASS (0 unjustified total) |
| 5 | Jest + jest-expo + RNTL + Firebase mocked | PASS |
| 6 | 6 test surfaces present | PASS |
| 7 | Jest green ≥20 passing assertions | PASS (26 passing) |
| 8 | `.github/workflows/ci.yml` 4 steps + push/PR triggers | PASS |
| 9 | package.json scripts (typecheck/test/test:ci/lint/format:check) | PASS |
| 10 | ESLint 0 errors, ≤9 warnings | PASS (0 warnings — improved past Sprint 2 baseline) |
| 11 | Prettier --check passes | PASS |
| 12 | `.gitattributes` enforces LF | PASS |
| 13 | expo-doctor 17/17 | PASS |
| 14 | `npm install` clean | PASS |
| 15 | Manual smoke on iPhone Expo Go | **pending** |

## Decisions that persist into Sprint 4+

- **TypeScript strict** is the permanent baseline. Every new file is `.ts`/`.tsx`.
  Sprint 4 screens being re-themed must remain strict; no `// @ts-nocheck` or
  unjustified `any` additions.
- **`jest.setup.ts`** mocks Firebase + expo-constants + async-storage +
  gesture-handler + phosphor + webview globally. New tests inherit these. Tests
  needing per-case behavior override via `jest.mocked(fn).mockReturnValue(...)`.
- **Navigation param list** lives in `navigation/types.ts`. `RootStackParamList`,
  `AuthStackParamList`, `HomeStackParamList`, `MyCaveStackParamList`,
  `ProfileSetupStackParamList`, `MainTabsParamList`. `SharedProfileParams` is
  used by both `ProfileSetupInitial` and `EditProfile` routes.
- **Screen props pattern**: `type Props = StackScreenProps<XStackParamList, 'Screen'>`
  → `route.params` fully typed. Adopt this pattern in Sprint 4 for any new screens.
- **CI runs on every push to main + every PR**. Don't push failing code — the
  workflow will publicly red-X. Local `npm run typecheck && npm run lint && npm run format:check && npm run test:ci`
  reproduces the CI gate.
- **`.gitattributes`** enforces `* text=auto eol=lf`. Sprint 2's CRLF drift
  across 16 files was cleared in `435bb45`. New files inherit LF automatically.
- **Zero `any` backbone** — `utils/` and `services/` must stay zero-`any`.
  Screen-layer escapes must have a `// reason:` comment (currently 0 in the tree).
- **Match% stub** exists at `utils/matchScore.ts` with a Sprint 5 `it.skip`
  documenting the spec. Sprint 5 will fill this in.

## Open questions / items deferred

### Still carrying from prior sprints

- **Firestore rules deployment**: `firestore.rules` is tracked locally + up to
  date, NOT yet deployed to live Firebase. User task —
  `npx firebase deploy --only firestore:rules,firestore:indexes` (requires
  `firebase login`). Same flag from Sprints 1, 2.
- **Firebase Web API key tightening** in GCP Console (HTTP referrer + API
  restrictions). Same flag from Sprints 1, 2.
- **WorkSans-SemiBold.ttf** still aliased to Bold.ttf — drop a real SemiBold file
  into `assets/fonts/` when convenient. Low priority.

### Sprint 4 scope (now tractable — everything below)

Per the plan's Sprint 4 section + the 3 R&D briefs:

- Theme migration of the 5 remaining screens (HomeScreen, DetailScreen,
  MatchesScreen, ProfileSetupScreen, ForgotPasswordScreen)
- Auth redesign (Login/Register visual pass 2, since Sprint 2's pass used
  placeholder polish)
- Onboarding taste quiz (6-8 A/B choices written into `tasteProfile` user-doc
  field) — the "wrappification anxiety" research recommends TWO identity labels
  per user (common + rare), not a single rank
- Stories-strip + activity-feed scaffolding (empty until Sprint 5) — follow the
  Granola / Warp empty-state patterns from the mobile-UX brief
- All loading / empty / error states + toast system
- A11y labels across all screens; tap targets ≥44pt
- Skeleton loaders (Moti-based per mobile-UX brief)
- Screen transitions — Reanimated spring primitives (crisp, not bouncy:
  `snappy` d18/s220 + `gentle` d20/s140 pair per mobile-UX brief)
- 6 Sprint-2-deferred visual issues:
  - DetailScreen light iOS stack header (set `headerShown: false` or theme it)
  - Bottom tab bar blue ▼ selector (theme via `tabBarActiveTintColor`)
  - SwipeableCard reveal colors `#006600` / `#ff6666` (keep green/red OR brand
    onto yellow/magenta — design call; mobile-UX brief leans toward keeping
    green/red for universal-convention reasons)
  - HomeScreen background `#f0f0f0` + lime spinner `#00ff00`
  - MatchesScreen stark empty state
  - MyCaveScreen header banner seam
- YouTube WebView Error 153 on DetailScreen — research + fix, likely switch to
  `react-native-youtube-iframe`

### Sprint 4 design constraints from R&D (non-negotiable unless overturned)

**From the dopamine brief** (`docs/research/sprint-4-dopamine.md`):
- Variable-ratio reward is category-toxic in 2026 — DO NOT build gambling/slot
  loops. Pattern: predictable cadence, unpredictable payload.
- Push notifications must be deterministic-only, never surprise-fires.
- Match% should be framed as a BRIDGE ("you both love quiet sci-fi"), NEVER a
  RANK ("73% compatible"). Rank framing triggers wrappification anxiety.
- Solo first-session activation needs a pseudo-friend seed (transparent curated
  personas) so new users experience match% before inviting anyone.
- First match% reveal = peak moment; design haptic + 200ms delay before the
  number lands.

**From the social-product brief** (`docs/research/sprint-4-social-product.md`):
- Rec cards in Sprint 5 MUST require a one-line note from sender
  (Hinge-pattern, 2× conversion vs optional).
- Taste quiz should return TWO identity labels per user: a common label (tribal
  belonging) + a rare label (distinctiveness). Single rank triggers performance
  drift.
- No streaks, no badges, no public "popular" feed, no follow-celebrities. All
  confirmed anti-patterns.
- BeReal-style reflex loops age well (resurrect after dormancy); gamification
  trees do not.

**From the mobile-UX brief** (`docs/research/sprint-4-mobile-ux.md`):
- Springs: crisp, not bouncy. Single pair `snappy` (d18/s220) + `gentle`
  (d20/s140) applied app-wide = biggest cohesion lever.
- Empty states: Phosphor icon on tinted circle + short microcopy. Do NOT
  commission custom illustrations. Restraint beats mid-tier art.
- Activity feed rows: 1-2 px left-accent bar to encode state without adding
  chrome (Warp pattern).
- Arc search-bar animation (asymmetric spring 0.09/0.38/0.08) as optional
  stretch move for the deck-card enter animation — costs 1-2 days, gives
  recognizable motion signature.
- Target 60fps on Reanimated 3 worklets; do not animate off `LayoutAnimation`.
- Accessibility: 44pt min tap target, WCAG AA contrast (Sprint 2's palette
  already passes), screen-reader labels everywhere.

## Lessons / harness-simplification review

Per the `harness-workflow` skill Step 6: what scaffolding was load-bearing vs
ceremony this sprint.

**Load-bearing (keep/strengthen):**
- **Assert-on-runtime-shape verify_commands** (Sprint 2's biggest lesson applied
  here): `tsc --noEmit` exit code + `jest --ci` + YAML structure parse + exact
  `any`-budget counting caught every issue the keyword-based checks would have
  missed. Every Sprint 3 hard threshold was objectively verifiable.
- **Separate evaluator subagent** — this is where Sprint 3 diverged from Sprint
  2's "ceremony" note. Sprint 2's manual smoke was the real evaluator; Sprint
  3's manual smoke is only ONE criterion out of 15. An independent
  `feature-dev:code-reviewer` caught 3 craft issues (forgot-password nav name,
  `any` cast, hollow pagination test) that automated verifies cleared. For
  sprints where 14/15 thresholds are automated, the evaluator subagent is
  genuinely load-bearing — it's the craft-quality check the generator can't do
  on itself.
- **Contract-first** with a single dep-order migration plan made the 11 commits
  bisectable. A regression in any one layer could be isolated by reverting that
  one commit.
- **Background-parallel R&D dispatch** — the 3 Sprint 4 briefs fired
  concurrent with the generator and landed before Sprint 3 closed. Research-
  first discipline is now tooling-supported, not ceremony.
- **Commit-per-logical-chunk** — each TS migration layer, then test infra,
  then CRLF cleanup, then CI polish. Matches the "bisectable failure" mandate.

**Ceremony this sprint (lighten next time):**
- The contract had 15 hard thresholds — a few are duplicative (the `any`-budget
  check and the tsc check effectively cover overlapping ground). Sprint 4's
  contract can collapse similar overlaps.
- I almost routed the 3 refinement fixes back through the generator subagent
  per harness-workflow Step 4, but the main-thread path (Sprint 2's pattern for
  `a484976` + `40253de`) was faster and cleaner for surgical, eval-specified
  changes. Sprint 4 contract should plan that explicitly: "evaluator-specified
  surgical fixes → main thread, not subagent re-dispatch."

**Tightening for Sprint 4 contract drafting:**
- UI/visual work is evaluated qualitatively, not just functionally. The
  contract must include `design_criteria` weights (Design Quality / Originality
  / Craft / Functionality — see harness-workflow Step 0) with pass_thresholds.
  Sprint 3 had no design criteria because TS migration is functional; Sprint 4
  is heavily visual and needs them.
- The R&D briefs are 12,000 words total. The Sprint 4 contract must distill
  the non-negotiable rules (listed above) so the generator doesn't have to
  re-synthesize them.
- Manual smoke on physical iPhone has to be planned as a hard criterion — the
  Expo Go visual test is the ultimate arbiter for UI sprints.

## Sprint 4 scope (per plan — detail comes with its own contract)

Summary from `C:\Users\enrique\.claude\plans\expressive-jumping-reddy.md`:

- Theme applied to every remaining screen (see list above)
- Auth redesign pass
- Onboarding taste quiz (6-8 A/B — with dual-label output per R&D)
- Stories-strip + activity-feed scaffolding (empty until Sprint 5)
- All loading/empty/error states + toast system
- A11y pass
- Skeleton loaders + screen transitions
- DetailScreen WebView trailer fix
- 6 Sprint-2-deferred visual issues

**Sessions expected**: 3.
**Out of scope** (Sprint 5): friend graph, match%, shared queues, rec cards,
AI surfaces, shareable match card, deep-link universal-links.

## Kick-off instructions for next session

1. Read THIS handoff file.
2. Read the 3 R&D briefs in `docs/research/`.
3. Read the plan's Sprint 4 section.
4. Invoke `superpowers:harness-workflow` (or `harness-workflow`) skill.
5. Draft `docs/harness/contracts/moviematch-sprint-4.md`:
   - 15-20 hard thresholds (functional)
   - 4 `design_criteria` (Design Quality / Originality / Craft / Functionality
     with weights + pass_thresholds — UI sprints need these)
   - Manual smoke on iPhone as a hard threshold with specific screen-by-screen
     checks
   - Non-negotiable rules from R&D briefs distilled into verify_commands where
     possible (e.g., "no `Math.random()` in push-notification scheduling")
6. Dispatch Sprint 4 generator (fresh `general-purpose` Agent) with contract +
   plan + 3 R&D briefs as required reading.
7. Evaluator via `feature-dev:code-reviewer` when generator completes.
8. Sprint 4 will likely take 2-3 generator passes because UI iteration depends
   on user smoke feedback. Budget accordingly.

## Environment notes

- Windows 11, bash (Git Bash) shell, working dir
  `C:\Users\enrique\Documents\Projects\MovieMatchApp`.
- Node 20 via `.nvmrc` (generator ran on Node 22.15.0 ambient; CI pins Node 20
  via the workflow; Jest passes on both).
- Metro on port 8082 most recently. Expo Go on iPhone is SDK 54.
- `package.json` net changes this sprint:
  - +typescript, +@types/react, +@types/jest, +@types/react-test-renderer
  - +jest, +jest-expo, +@testing-library/react-native,
    +@testing-library/jest-native, +react-test-renderer
  - +npm scripts: typecheck, test, test:ci, lint, format, format:check
  - no runtime deps added/removed

## References

- Plan: `C:\Users\enrique\.claude\plans\expressive-jumping-reddy.md`
- Sprint 1 contract: `docs/harness/contracts/moviematch-sprint-1.md`
- Sprint 2 contract: `docs/harness/contracts/moviematch-sprint-2.md`
- Sprint 3 contract: `docs/harness/contracts/moviematch-sprint-3.md`
- Sprint 1 handoff: `docs/handoffs/sprint-1.md` (superseded)
- Sprint 2 handoff: `docs/handoffs/sprint-2.md` (supersedes Sprint 1)
- Sprint 3 handoff: THIS FILE (supersedes Sprint 2)
- Sprint 4 R&D briefs: `docs/research/sprint-4-*.md` (3 files, ~12,000 words)
- Memory (persistent across sessions):
  `C:\Users\enrique\.claude\projects\C--Users-enrique-Documents-Projects\memory\MEMORY.md`
- Repo remote: https://github.com/ebarcly/MovieMatchApp
