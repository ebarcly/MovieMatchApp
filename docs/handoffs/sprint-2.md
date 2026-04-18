# Handoff: MovieMatchApp — Sprint 2 CLOSED, Sprint 3 starts here

## TL;DR for next session

**First action**: read this file. Then read
`C:\Users\enrique\.claude\plans\expressive-jumping-reddy.md` (Sprint 3
section). Then write the Sprint 3 contract at
`docs/harness/contracts/moviematch-sprint-3.md` and start execution.
Do NOT re-audit what Sprints 1-2 already fixed.

**During Sprint 3 execution**: dispatch R&D briefs (social-product +
dopamine + mobile-UX researchers) targeting Sprint 4 — briefs land in
`docs/research/sprint-4-*.md`. See user memory
`feedback_research_first.md` for full discipline.

## State of the repo

- **Branch**: `main`, clean, pushed to `origin/main`.
- **HEAD**: `f556522 feat(icons): migrate from react-native-vector-icons to Phosphor`
- **Range this sprint**: `bf1c5fa..f556522` (13 commits on main)
- **Remote branches**: only `main`
- **App runs** on iPhone Expo Go via `npx expo start --tunnel`
- **expo-doctor**: 17/17 passing
- **ESLint**: 0 errors, 9 warnings (dropped 1 from Sprint 1's baseline of 10; all 9 pre-existing)
- **No open CVEs**

## Sprint 2 accomplishments (13 commits)

### Generator pass (first dispatch — Sprint 2 contract base)

| Commit | Purpose |
|---|---|
| `ed0d1d3` | feat(theme): dual-accent token system locked (yellow #FBEC5D + magenta #FF3E9E + ink #0A0A12 + 9 typography presets + radii + shadows) |
| `53f3188` | fix(bug-3): NavigationBar null-guard on auth.currentUser |
| `3a25fc7` | fix(bug-4): fetchUserWatchlist reads subcollection (closes split-brain) |
| `41f18b8` | fix(bug-2,6): DetailScreen — remove local-only handlers + null-guard data.videos |
| `8e59ba3` | fix(bug-1): SwipeableCard button direction aligned with semantic intent (reject/accept convention) |
| `6e69819` | fix(bug-5): HomeScreen pagination retry-on-initial (later refined) |
| `0b31212` | fix(bug-7): MoviesContext gated on /users/{uid}.exists() via onSnapshot |
| `93112d8` | fix(bug-8) + refactor: LoginScreen migrated + isSubmitting state |
| `e4c9745` | refactor: RegisterScreen migrated to theme tokens |
| `95042b1` | refactor: MyCaveScreen migrated + BUG-4 writer-side cleanup |

### Refinement pass (after user manual smoke found HARD_FAILs)

| Commit | Purpose |
|---|---|
| `a484976` | fix(register): strip dead `navigation.navigate('ProfileSetup')` call (AppNavigator reactive route handles it) + fix "EventMate" → "MovieMatch" copy |
| `40253de` | fix(bug-5): WIRE REAL pagination — prefetch next page on swipe approaching deck end (original pass only retried on initial mount; user hit dead-end at swipe 18) |

### Scope-bleed (approved mid-sprint)

| Commit | Purpose |
|---|---|
| `ef5cda9` | fix(icons): stopgap MaterialIcons font registration (icons were rendering as martini-glass / "?" across every screen — broken glyph lookup for `react-native-vector-icons` in Expo managed workflow) |
| `f556522` | feat(icons): full migration to Phosphor (6 icons across 3 files); uninstalled react-native-vector-icons; weights chosen per theme direction (bold on CTAs, fill on emotional moments, regular on metadata) |

## Contract verification — final state

**Hard-threshold automated**: 13/13 PASS  
**Manual smokes**: 6/6 PASS (user confirmed on iPhone Expo Go after
refinement pass)

- ✅ BUG-1 Skip vs Watched button direction (user confirmed)
- ✅ BUG-2 DetailScreen handlers removed
- ✅ BUG-3 NavigationBar null guard
- ✅ BUG-4 watchlist subcollection source of truth
- ✅ BUG-5 pagination works past swipe 20, 40+
- ✅ BUG-6 DetailScreen data.videos guard
- ✅ BUG-7 MoviesContext exists()-gated dispatch
- ✅ BUG-8 LoginScreen isSubmitting + disabled
- ✅ Fresh register → no ProfileSetup nav error
- ✅ Subtitle says "Join MovieMatch..."
- ✅ Login/Register/MyCave visual palette matches locked spec
- ✅ Firestore Console: watchlist only in subcollection
- ✅ Phosphor icons render correctly everywhere

## Decisions that persist into Sprint 3+

- **Palette LOCKED** (see contract `moviematch-sprint-2.md` body for full
  token map and the project memory `project_moviematch_mission.md` for
  why the dual-accent choice). Do NOT renegotiate hex values.
- **Chromatic-always-pairs-with-ink rule**: yellow foreground = ink;
  magenta foreground = ink. Bone-white on magenta was rejected for
  failing WCAG AA at 3.00:1.
- **Icon library**: Phosphor (3.0.4). 6 weights available; CTAs use
  `bold`, emotional moments use `fill`, metadata uses `regular`. Sprint
  4 should continue this pattern when theming the remaining screens.
- **Pure #FFFFFF is forbidden** in screen code. Use `textHigh #F5F5FA`.
- **Profile-complete signal** is an onSnapshot on `/users/{uid}` that
  requires both `profileName` AND `genres[].length > 0`. RegisterScreen
  no longer directly navigates — AppNavigator's reactive route handles
  the ProfileSetup transition.
- **Watchlist source of truth** is `/users/{uid}/watchlist` subcollection
  (NOT a doc field). All readers/writers aligned.
- **Home deck pagination**: PREFETCH_THRESHOLD = 3, MAX_PAGINATION_RETRIES
  = 3. When within 3 cards of end, fetch next TMDB page and append.

## Open questions / items deferred

### Logged here for Sprint 3+ attention (NOT fixed this sprint)

- **Firestore rules deployment**: `firestore.rules` is tracked locally
  and up to date, but **not yet deployed** to the live Firebase project.
  User should run `npx firebase deploy --only firestore:rules,firestore:indexes`
  when convenient (requires `firebase login`). Same flag from Sprint 1.
- **Firebase Web API key tightening** in Google Cloud Console (HTTP
  referrer + API restrictions). Same flag from Sprint 1.
- **WorkSans-SemiBold.ttf**: still aliased to Bold.ttf — a real
  SemiBold file should be dropped in `assets/fonts/` whenever. Low
  priority.
- **11 (now 9) ESLint warnings**: unused imports + react-hooks
  exhaustive-deps + import/no-named-as-default on `expo-checkbox`
  default import. Fix when touching those files during Sprint 3+.
- **Prettier CRLF drift on 16 pre-existing files** (App.js,
  app.config.js, firebaseConfig.js, eslint.config.js, README.md, and
  several un-migrated components/screens). Introduce a
  `.gitattributes` + `git add --renormalize .` + `prettier --write`
  pass in Sprint 3. Soft-threshold so it didn't block Sprint 2.

### Out-of-Sprint-2-scope visual issues (surfaced in user smoke, Sprint 4)

- **DetailScreen light iOS stack header** sits on dark content — jarring.
  Fix: `options={{ headerShown: false }}` or themed header in
  `AppNavigator.js:46` HomeStackNav Detail screen.
- **Bottom tab bar blue ▼ selector** — default React Navigation styling,
  not theme-aware. Fix: `TabNav.Navigator screenOptions` with
  `tabBarActiveTintColor: colors.accent`, dark tab bar background.
- **Swipe-reveal colors** (`#006600` / `#ff6666` in SwipeableCard.js:168)
  don't match the theme. Interesting design call for Sprint 4: keep the
  green/red convention (immediately understood) OR lean into the brand
  (`accent` yellow for Watched, `accentSecondary` magenta for Skip —
  more on-brand but requires a micro-onboarding since users expect
  green/red).
- **HomeScreen background #f0f0f0 + lime-green spinner color #00ff00**
  (`HomeScreen.js:205, 167`) — full theming in Sprint 4.
- **MatchesScreen empty state** is stark black-on-light-gray. Sprint 4
  revamp per plan ("stories-strip + activity-feed scaffolding").
- **MyCaveScreen header banner** has a visible seam where the banner
  meets the profile section. Not critical; Sprint 4 visual polish.

### Infrastructure surprises

- **WebView trailer "Error 153 - Video player configuration error"** on
  DetailScreen. This is a YouTube-embed-in-WebView compatibility issue
  under SDK 54 / New Architecture. Could be: YouTube's embed policies
  tightened; the embed URL format; WebView's origin handling.
  Research-and-fix task — likely Sprint 4 alongside DetailScreen revamp.
  May require switching to `react-native-youtube-iframe`.
- **"Hi, Bebop"** username in screenshots = user's test-account seed,
  not a bug.

## Lessons / harness-simplification review

Per the `harness-workflow` skill Step 6: what scaffolding was load-bearing
vs ceremony this sprint.

**Load-bearing (keep/strengthen):**
- Written sprint contract with explicit `verify_command`s upfront —
  caught BUG-5's real failure only during user smoke because the
  contract-level verify was too permissive, but at least the manual
  smoke was planned into the contract
- Manual smoke as a hard-threshold criterion — caught what grep-level
  verifies couldn't (BUG-1 direction, BUG-5 behavior, ProfileSetup nav,
  EventMate copy, MaterialIcons glyphs)
- Handoff file as source of truth across `/clear` — Sprint 1's handoff
  fed Sprint 2 generator cleanly
- Commit-per-logical-chunk discipline — made it easy to refine BUG-5
  after first generator pass without reverting other work
- Separating drafter (main thread) from executor (fresh generator
  subagent) — kept main thread free to evaluate against user smoke
  without doing the mechanical coding

**Ceremony this sprint (lighten next time):**
- The full 25-criterion verify matrix in contract frontmatter had a few
  redundant checks (e.g., both "theme has 5 keys" AND "theme has 23
  tokens" + "theme anchor hexes exact"). Collapse to one structural
  check + one hex-anchor check next time.
- I dispatched a formal evaluator subagent in the task list but never
  actually ran one — user's manual smoke WAS the evaluation. For sprints
  where manual smoke is the dominant verify path, plan that explicitly
  instead of dual-staging evaluator subagent + user smoke.

**Tightening for Sprint 3 contract drafting:**
- For behavioral bugs (where "is the feature working?" is the real
  question, not "is the keyword present?"), write verify_commands that
  assert on the runtime shape — e.g., for pagination, grep for the
  prefetch effect + setContent-with-append call, not just "the word
  'page' appears." BUG-5's failure was a direct consequence of this.

## Sprint 3 scope (per plan — detail comes with its own contract)

Summary from `C:\Users\enrique\.claude\plans\expressive-jumping-reddy.md`:

- **TypeScript migration** in dependency order: `utils → services →
  context → components → screens`. Strict mode on from day one.
- **Tests**: Jest + React Native Testing Library. Firebase mocked.
  Target surfaces: auth flow, MoviesContext reducer, core firebase ops,
  SwipeableCard, HomeScreen pagination, match% logic (stub until
  Sprint 5).
- **CI**: GitHub Actions on every PR — typecheck + lint + prettier
  `--check` + test. Use the `.github/workflows/` path.
- **Sessions expected**: 2-3.
- **Out of scope** (Sprint 4 / 5): new features, any UI changes beyond
  TypeScript prop signatures, theming remaining screens.

## Kick-off instructions for next session

1. Read THIS handoff file.
2. Read the plan's Sprint 3 section.
3. Read Sprint 2 contract for structural reference:
   `docs/harness/contracts/moviematch-sprint-2.md`
4. Invoke `superpowers:harness-workflow` (or `harness-workflow`) skill.
5. Draft `docs/harness/contracts/moviematch-sprint-3.md` with
   hard-threshold verify_commands — apply the "assert on runtime shape,
   not keyword" lesson from Sprint 2.
6. **In parallel** with Sprint 3 execution: dispatch Sprint 4 R&D
   briefs (see `feedback_research_first.md` memory). Agents to fire:
   - Social-product researcher (Letterboxd / BeReal / Spotify Blend /
     Discord / Hinge / Tapestry / TikTok mechanics audit — what's
     retaining in 2026)
   - Dopamine / behavioral architect (variable-reward, peak-end,
     identity expression for taste-sharing)
   - Modern mobile-UX scout (Arc / Linear / Nothing / Superhuman /
     Raycast patterns translatable to consumer social)
   Briefs land at `docs/research/sprint-4-*.md` as permanent artifacts.
7. Dispatch Sprint 3 generator (fresh `general-purpose` Agent) with
   contract + plan. Evaluator via `feature-dev:code-reviewer` when
   done.

## Environment notes

- Windows 11, bash shell, working dir
  `C:\Users\enrique\Documents\Projects\MovieMatchApp`.
- Node 20 via `.nvmrc` (use `nvm use 20` if shell dropped).
- Metro on port 8082 most recently. Expo Go on iPhone is SDK 54.
- `package.json` net changes this sprint: +phosphor-react-native@3.0.4,
  +react-native-svg (peer dep); -react-native-vector-icons.

## References

- Plan: `C:\Users\enrique\.claude\plans\expressive-jumping-reddy.md`
- Sprint 1 contract: `docs/harness/contracts/moviematch-sprint-1.md`
- Sprint 2 contract: `docs/harness/contracts/moviematch-sprint-2.md`
- Sprint 1 handoff: `docs/handoffs/sprint-1.md` (supersedes itself with this file)
- Memory (persistent across sessions):
  `C:\Users\enrique\.claude\projects\C--Users-enrique-Documents-Projects\memory\MEMORY.md`
- Repo remote: https://github.com/ebarcly/MovieMatchApp
