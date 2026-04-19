# Handoff: MovieMatchApp — Sprint 5b CLOSED (viral core, all 5 streams, 13-step iPhone smoke)

## TL;DR for next session

**First action**: read this file, then the Sprint 6 discovery-UX brief at
`docs/research/sprint-6-discovery-ux.md`, then start Sprint 6 contract
drafting. Sprint 5b is closed — viral-core viable on real device with real
users (User A `new1@gmail.com` / User B `testb` seeded via the script at
`scripts/seed-sprint-5b-smoke.js`).

**State**: all 5 Streams (A: match%, B: rec cards, C: AI surfaces, D: shared
queues, E: shareable match card) landed on-device. Jest 243/243, expo-doctor
17/17, TypeScript strict clean, ESLint 0 errors (2 pre-existing warnings),
Prettier clean, Sprint 5a composite verify 15/15. Independent evaluator
returned SOFT_FAIL with weighted design-criteria 7.85/10 (all individual
criteria cleared pass_thresholds); 3 blocking findings were surgically
fixed in main thread post-evaluation (FriendDetail PNG-capture path,
QueueStrip uid-as-displayName, MatchCard dummy type). Manual 13-step iPhone
smoke completed 2026-04-19 with 12 smoke-surfaced refinements landed
post-evaluator (see §Sprint 5b accomplishments).

## State of the repo

- **Branch**: `main`, **23 commits ahead of `origin/main`**, not pushed.
- **HEAD**: `304ac2a chore(sprint-5b): eslint clean — replace dynamic process.env access + gitignore .firebase/ cache`.
- **Sprint 5b commit range**: `fd5f965..304ac2a` (23 commits).
- **App builds in Expo Go SDK 54**. `npx expo start` (LAN, not `--tunnel`)
  recommended; ngrok tunnel has a Node v22 incompat issue flagged below.
- **expo-doctor**: 17/17.
- **TypeScript strict**: `npx tsc --noEmit` clean.
- **ESLint**: 0 errors, 2 warnings (pre-existing in `hooks/useWhyYouMatch.ts`
  lines 173-174 — `react-hooks/exhaustive-deps` on complex dependency
  expressions; inherited from salvage commit `86148e1`).
- **Prettier**: clean.
- **Jest**: 28 suites, 243 passing + 2 snapshots (Sprint 5a baseline was
  123, Sprint 5b added 120).
- **Sprint 5a discipline** (`node scripts/verify-sprint-5a.js`): 15/15 green.
- **CI**: `.github/workflows/ci.yml` wired from Sprint 3.
- **No open CVEs.**
- **Firebase rules + hosting**: both deployed live 2026-04-19 (user ran
  `npx firebase deploy --only firestore:rules,storage,hosting`).

## Sprint 5b accomplishments

### Phase 1: scaffolding (9 commits `fd5f965..0b05c37` — 5 parallel generator streams + Sprint 6 brief)

| Commit | Purpose |
|---|---|
| `fd5f965` | **docs(sprint-6)**: discovery-UX research brief (3,900 words — killed exclusive CategoryTabs, proposed chip rail + 7 personalized shelves; deterministic mood-derivation from `tasteProfile.axes` — no LLM on discovery) |
| `31a68c3` | **docs(sprint-5b)**: contract — parallel streams A/B/C/D/E, codifies all 6 ratified decisions (LLM cap $25, Haiku 4.5 pinned, non-streaming rec-copy, strict PII, 5-min prompt-cache TTL, react-native-view-shot not Skia, 4-tier match labels) |
| `f341480` | **feat(sprint-5b/D)** partial: queue ops backbone — `createQueue/addTitleToQueue/reactToQueueTitle/markTitleWatched/listQueuesForUid` in `utils/firebaseOperations.ts` + 5 op tests + `queueReactionKey`/`nextPickerAfter` helpers |
| `86148e1` | **feat(sprint-5b/C)** partial: AI scaffolding — LLMClient interface at `utils/ai/LLMClient.ts`, AnthropicLLMClient impl pinned to `claude-haiku-4-5-20251001` with tool-use + non-streaming rec-copy + retry-temp-−0.2 + 4000ms timeout, prompts/whyYouMatch.ts + prompts/recCopy.ts (verbatim brief §2.1/§3.1 + PROMPT_VERSION constants), validators.ts (every banned regex from §2.5/§3.3 + no-duplicate-first-word assertRecCopyBatch), fallbacks.ts (signalTier + depth-keyed deterministic strings), pricing.ts, pii.ts (strips `{}<>` + backticks + control chars, wraps in `<input>...</input>`), cache.ts (/aiCache Firestore + version-prefixed keys + TTL enforcement), spend.ts (/aiSpend/{yyyy-mm-dd} transactional increment + 80% warn/100% degrade), hooks/useWhyYouMatch + hooks/useRecCopy (DotLoader up to 1500ms, 180ms cross-fade, never swap after 2000ms), @anthropic-ai/sdk dep |
| `cd95b79` | **feat(sprint-5b/B)** partial: `/recs/{recId}` Firestore rule (sender creates, sender+recipient read, recipient stamps viewedAt, 30-280 char note enforced server-side) |
| `2cdfc37` | **feat(sprint-5b/A)** salvage pass 1: MatchScoreChip + FriendCard + FriendDetailScreen + FriendDetail route + **fixed pre-existing `fetchUserMatches` private-root read** (Sprint 5a data-split had made it illegal; now reads `/users/{uid}/public/profile`) |
| `db5da64` | **feat(sprint-5b/D)** salvage pass 2: QueueStrip + QueueDetailScreen + `/queues/{id}` Firestore rule (participants-only, nextPickUid gate on markWatched) + HomeScreen integration |
| `fc29e0f` | **feat(sprint-5b/B)** salvage pass 3: RecCardComposeScreen + RecCardShareSheet + `createRec` op w/ `RecNoteLengthError` + DetailScreen Recommend CTA + 5 boundary tests (28/30/280/281) |
| `59d2410` | **feat(sprint-5b/C)** salvage pass 4: 66 new test assertions (validators/cache/pii/spend) + latency.bench.ts gated on RUN_BENCH=1 + `/aiCache` + `/aiSpend` Firestore rules + `.env.example` + **moved tool input_schema next to each prompt body** |
| `b5d53cd` | **feat(sprint-5b)** salvage pass 5: AppNavigator routes for QueueDetail + RecCardCompose in both Home and Matches stacks |
| `cd11cb5` | **feat(sprint-5b/E)** salvage pass 6: react-native-view-shot@4.0.3 + MatchCard.tsx (9:16 1080×1920 ink + dual-accent yellow/magenta washes + avatar rings + 120pt match% + 32pt tier + 3 poster row + watermark) + shareMatchCard.ts + structural snapshot test (2 tiers, not skipped) + FriendDetail "Share match card" CTA |

### Phase 2: evaluator SOFT_FAIL surgical refinements (1 commit `5490752`)

Independent `feature-dev:code-reviewer` returned **SOFT_FAIL** (weighted
design-criteria 7.85/10 — all individual rubrics cleared pass_thresholds)
with 3 blocking findings + 3 non-blocking craft nits. Surgical fixes in
main thread per the Sprint 3+4+5a `feedback_surgical_refinements` pattern:

| Commit | Fixes |
|---|---|
| `5490752` | (1) **FriendDetail PNG-capture path dead** — "Share match card" CTA called `shareMatchCard(URL fallback)` not `shareMatchCardFromRef(view-shot capture)`; MatchCard was never mounted for capture. Added off-screen `<MatchCard>` mount via absolute-positioned View with `collapsable={false}` + `pointerEvents='none'`. (2) **QueueStrip uid-as-displayName** — participant avatars rendered uid-derived initials instead of real names; now fetches `/users/{uid}/public/profile` per participant on mount, caches in component state. (3) **MatchCard dummy type gaming the verify** — `_TierLabelsForVerify` dummy type with ESLint-disable to satisfy the grep-for-4-tier-strings verify_command; dead type removed + contract verify_command rewritten to grep MatchScoreChip.tsx (genuine SSOT for tier literals) + require MatchCard to use `tierForScore` import. |

### Phase 3: manual iPhone smoke — 12 on-device refinements (13 commits `c180aff..304ac2a`)

Manual 13-step smoke on iPhone Expo Go SDK 54 (2026-04-19) surfaced 12
additional bugs. All fixed surgically in main thread per
`feedback_surgical_refinements` pattern; no generator re-dispatch.
**Most of these were pre-existing / cross-cutting; not Stream-scoped.**

| Commit | Fix |
|---|---|
| `c180aff` | **Stream A gap** — user's own `interactedTitleIds` was hardcoded `[]` in `FriendDetailScreen.userTaste` useMemo, so `matchScore.sharedTitleIds` always resolved to empty regardless of friend signal. Fixed to read from the viewer's own public profile (symmetric with friend side). Also added `scripts/seed-sprint-5b-smoke.js` one-shot seeder for single-device smoke setup. |
| `66d74c8` | **Seed script resilience** — Firestore rules reject reads on non-existent docs (predicate `resource.data.participants` undefined → false). Catch `permission-denied` on the existence-check reads + treat as not-exists. |
| `675c605` | **Pre-existing DetailScreen bug** — TMDB cast array can contain duplicate IDs (same actor, multiple roles); FlatList keyExtractor `item.id.toString()` triggered React `"Encountered two children with the same key"`. Added `dedupeById` helper. |
| `fb5b4ab` | **Stream A gap** — FriendCard was built but **never wired into MatchesScreen**; the screen only showed title-match co-likes, so accepted friendships rendered nowhere + empty-state "No matches yet" fired even with friends present. Added "Your friends" horizontal section loading `listFriends(uid)` + each friend's public profile, rendered as FriendCard components tappable into FriendDetail. |
| `06aed8a` | **Rec send + share match card hangs** — `handleSend` awaited createRec + Share.share sequentially; iOS Share.share never resolves if user dismisses without tapping an action, so setSending never ran. Split: createRec under 10s timeout, share sheet fire-and-forget post-goBack. Same treatment for `handleShareMatchCard` w/ toast visibility for errors. |
| `8cb67fb` | **View-shot off-screen capture hung** — positioning at `top:-99999, left:-99999` prevented iOS from flushing the view into the native capture buffer; captureRef hung until timeout. Moved to `top:0, left:0, width:360, height:640` with explicit dimensions. Also wrapped RecCardCompose in `KeyboardAvoidingView`. |
| `cfcd753` | **Match card PNG was blank** — the prior fix traded one problem for another: rendering at opacity:0 zeroed the CALayer alpha before captureRef rasterized, so the 326KB PNG had valid pixel data but all transparent. iMessage showed blank; Save Image produced transparent file. Added `capturing` state that toggles wrapper opacity 0→1 briefly during capture (80ms settle + render window). |
| `6f1d1b0` | **Bogus "timed out after 8s" WARN log** — the 8s timeout wrapped both captureRef AND Share.share; user-driven share-sheet browsing legitimately exceeds 8s → misleading WARN fired on every successful share. Split `shareMatchCardFromRef` into `captureMatchCardToFile` (8s timeout OK) + `shareCapturedMatchCard` (no timeout; user-driven). |
| `2b36cf0` | **Rec-copy variants always fell back** — RecCardComposeScreen was passing hardcoded `{common:'texture', rare:'signal'}` placeholder for both sender + recipient tasteLabels. Low-signal identical input caused Haiku to generate bland variants that frequently violated the no-duplicate-first-word validator → retry → fail → deterministic fallback. Wired real tasteLabels from both users' public profiles. |
| `4462f36` + `db4b9d3` | **Dangerous "quick fix" reverted** — first commit auto-selected `friends[0]` when none preselected to unblock Send button; user rightly pushed back pointing at Instagram's share-sheet pattern (explicit selection, no preselection). Reverted the auto-select; kept the paired ProfileSetupScreen fix that mirrors `{displayName, genres, streamingServices, updatedAt}` onto `/users/{uid}/public/profile` (Sprint 5a data-split gap — MyCave edit wrote only to private root). User re-saved MyCave as A to backfill A's public displayName. |
| `304ac2a` | **ESLint clean** — `scripts/seed-sprint-5b-smoke.js` used dynamic `process.env[envKey]` which Expo's `expo/no-dynamic-env-var` rule blocks. Replaced with static-access `promptOrValue(process.env.SEED_A_PASSWORD, …)` at call sites. Gitignored `.firebase/` CLI deploy cache. |

## Contract verification — final state

**Hard thresholds**: **15/15 PASS** (composite build-pipeline green + Jest
green + Sprint 4/5a composite discipline + 13 stream-scoped thresholds).
Three initial "fails" during manual verification were shell-escape bugs in
my inline Node one-liners, confirmed passing via `grep` re-verify.

**Design criteria** (independent evaluator):

| Criterion | Weight | Pass | Score | Verdict |
|---|---|---|---|---|
| Design Quality | 30 | 7 | 8 | PASS |
| Craft | 25 | 7 | 7 | PASS (borderline) |
| Functionality | 25 | 8 | 8 | PASS (borderline) |
| Privacy Discipline | 10 | 8 | 9 | PASS |
| AI Voice (bridge-framed) | 10 | 8 | 8 | PASS (borderline) |
| **Weighted average** | 100 | — | **7.85** | — |

All 5 criteria cleared individual pass_thresholds after the 3 surgical
refinements in `5490752`. Evaluator's original SOFT_FAIL was escalated on
manual-smoke blockers (Stream E dead PNG path, QueueStrip uid display,
MatchCard dummy type).

**Manual iPhone smoke**: **13/13 PASS** on-device with User A + User B
round-trip. Real Haiku 4.5 generations observed for both why-you-match
(single-sentence bridge-framed) + rec-copy (3-variant per pair, distinct
first words, voice-compliant). Real PNG match card (~300-500KB) shared
legibly via iMessage. Firebase Hosting `/rec/{id}` public preview served.

## Decisions that persist into Sprint 6+

### Cross-user data locality (extends Sprint 5a decision)

- **`/users/{uid}` = PRIVATE** (email, phone, tasteProfile.axes, settings).
  Cross-user reads rejected by rules.
- **`/users/{uid}/public/profile` = PUBLIC**. Sprint 5b CODIFIES that
  match-signal fields live here: `displayName`, `photoURL`, `tasteLabels`,
  `contactHashes`, `createdAt`, `updatedAt` (Sprint 5a) + **NEW** in 5b:
  `interactedTitleIds`, `genres`, `streamingServices`. `tasteProfile.axes`
  stays on private root (owner-only; the 8-axis quiz signature is the most
  intimate taste data).
- **ProfileSetupScreen mirrors** displayName/genres/streamingServices onto
  public profile on every save (`db4b9d3`). Onboarding writes them too.
- **Any Sprint 6 cross-user surface** MUST read from public profile. Main
  thread enforcement is the MatchesScreen + FriendDetailScreen pattern
  with public-first / private-fallback resolvers.

### LLM architecture (Stream C)

- **Model**: `claude-haiku-4-5-20251001` pinned (single string across codebase).
- **Singleton LLMClient** at `utils/ai/impl/AnthropicLLMClient.ts` —
  getDefaultLLMClient() factory, Sprint 6 migration seam (swap to
  CloudFunctionLLMClient() in one line).
- **Strict PII**: prompt NEVER sees `displayName`/`email`/`phone`/`uid`.
  Client substitutes `{displayLabel}` placeholder post-generation in the
  useWhyYouMatch hook.
- **Cost control**: `/aiSpend/{yyyy-mm-dd}` transactional total, 25 USD
  daily cap default, 80% log-warn, 100% degrade to deterministic fallback.
- **Cache**: `/aiCache/{sha256(version+key)}` Firestore, 7d TTL for
  why-you-match (per uid pair), 24h TTL for rec-copy (per titleId + labels
  + depth). Version-prefixed keys enable prompt-rev cache-bust.
- **Validators**: runtime enforcement of brief §2.5 + §3.3 (banned regex,
  word/char bounds, no-duplicate-first-word). Retry once with temp −0.2;
  fallback on second fail. Fallbacks NEVER cached (only successful
  non-degraded results).
- **Rec-copy non-streaming** per ratified 2026-04-18 decision. Partial
  streaming deferred to Sprint 6 polish.
- **Prompt-cache TTL** = 5 min (Anthropic SDK default).

### Match-card image (Stream E)

- **react-native-view-shot@4.0.3** (NOT `@shopify/react-native-skia` per
  ratified decision). Installed via `npx expo install`.
- **Off-screen capture pattern**: MatchCard mounted in FriendDetailScreen
  at `position:absolute, top:0, left:0, width:360, height:640`,
  `collapsable={false}`, opacity toggled 0→1 during capture via state +
  80ms settle. Brief visual flash during capture is acceptable UX.
- **Capture vs Share split**: `captureMatchCardToFile(ref) → uri` under
  8s timeout (native rasterization); `shareCapturedMatchCard(uri) → void`
  no timeout (user-driven share sheet).

### Tier labels (Stream A + E)

4-tier ratified copy is the **single source of truth** at
`components/MatchScoreChip.tsx`. `MatchCard.tsx` imports `tierForScore`
from it — no string duplication. Contract's Stream E-2 verify greps
MatchScoreChip for the 4 literals, and requires MatchCard to import
`tierForScore`.

### Firebase Hosting / rec-preview

- Route `/rec/{recId}` registered in `firebase.json` rewrites → serves
  `hosting/rec-preview.html` (static generic preview: MOVIEMATCH wordmark
  + "A friend sent you a rec" + "Install and open in MovieMatch" CTA).
- **Per-rec templating deferred to Sprint 6** (requires Cloud Function
  renderer per brief §8) — current preview is generic for every rec ID.
  Acceptable for 5b beta.
- Rule for `/recs/{recId}`: sender creates, sender+recipient read,
  recipient-only update stamps viewedAt, no deletes.

## Known cleanup queue for Sprint 6

Ordered by blast radius + user impact. All 14 items flagged during smoke;
none block 5b close. Numbers (1)–(4) are named design-question items worth
their own Sprint 6 research brief or contract scope.

1. **Rec compose flow redesign → bottom-sheet pattern** (user-flagged).
   Current compose is a stack screen with horizontal friend-chip picker;
   scales poorly past ~5 friends and requires explicit tap-to-select.
   Instagram Reel share (2026) / Airbnb listing share / Hinge "message
   with like" (Sprint 4 social-product brief §) all use modal bottom
   sheets with search + avatar grid + multi-select. Sprint 6 scope:
   commission a research brief (same pattern as the AI-surfaces brief)
   titled *"Sprint 6 rec-share flow — modal bottom sheet"* covering
   search + multi-select semantics + 30-280 note retention + external
   share row.

2. **Discovery-UX redesign** — `docs/research/sprint-6-discovery-ux.md`
   already committed (commit `fd5f965`, 3,900 words, 2026-04-19). TL;DR:
   kill the exclusive `TV Shows/Movies/All` CategoryTabs, replace with a
   4-dimension chip rail (Type/Genre/Era/Mood) + 7 personalized shelves
   in priority order + deterministic mood derivation from
   `tasteProfile.axes` (no LLM on discovery surface per cost discipline).
   Sprint 6 contract drafts from this brief.

3. **Per-rec Hosting preview templating** — current preview is static
   HTML with "Poster loads in app" placeholder. Sprint 6 adds a Cloud
   Function at `hosting/functions/renderRec.ts` that reads the rec doc,
   fetches TMDB title metadata, and renders a per-rec preview with
   sender displayName + poster + note excerpt. Brief §8 references this.

4. **Server-side LLM inference** (brief §8) — migrate `AnthropicLLMClient`
   → `CloudFunctionLLMClient` swap; Sprint 6 adds per-uid token-bucket
   rate limits (20 why-you-match/day, 10 rec-copy/day) + GCP Secret
   Manager for the Anthropic API key (currently EXPO_PUBLIC_ client-side,
   acceptable for beta but an obvious leak vector at scale).

5. **Partial streaming rec-copy** (deferred per ratified 2026-04-18) — if
   beta users report the 1.5s DotLoader-then-reveal feels dead. Currently
   acceptable.

6. **Home header displayName onSnapshot** — MyCave edit → ProfileSetup
   save DOES now mirror displayName onto public profile (commit
   `db4b9d3`), but Home header (`"Hi, ${displayName}"`) still reads from
   `auth.currentUser.displayName` (cached), not from the public profile
   subscription. User has to sign out + back in to refresh. Fix: Home
   reads displayName via `onSnapshot(doc(db, 'users', uid, 'public',
   'profile'))` same pattern as MyCave's Sprint 5a photo-sync fix.

7. **Auth error humanization** — Login screen shows raw `"Firebase: Error
   (auth/invalid-credential)"` (user screenshot on failed login during
   smoke). Map Firebase Auth error codes → friendly copy ("Wrong email or
   password — try again"). One-liner in `AuthScreen.tsx` catch block.

8. **Keyboard avoidance on other screens** — Sprint 5b added
   `KeyboardAvoidingView` to RecCardComposeScreen (commit `8cb67fb`).
   Other screens user flagged: LoginScreen, RegisterScreen,
   ProfileSetupScreen. Consider `react-native-keyboard-aware-scroll-view`
   for a one-import fix.

9. **SafeAreaView migration** — expo terminal WARN during smoke:
   `SafeAreaView has been deprecated and will be removed in a future
   release. Please use 'react-native-safe-area-context' instead.`
   Straightforward codemod-level migration.

10. **Home deck layout / CategoryTabs overlap** — SwipeableCard appears
    to render atop the CategoryTabs on some screen sizes (visible in
    every smoke screenshot that captured the Home deck). z-index or
    absolute positioning issue in `SwipeableCard.tsx`. Not introduced by
    5b; visible since Sprint 5a smoke. Sprint 6 redesign (item 2)
    supersedes.

11. **Friend chip visual polish** — MatchScoreChip (sm size) overlay on
    the FriendCard avatar is oversized relative to the lg avatar;
    covers too much of the face. Reduce chip sm dimensions OR reduce
    overlap offset. Pure style.

12. **Rec-copy validator tuning** — smoke observed some title+label pairs
    always fall back (e.g., "The Music Box Kid" fell back while "Outcome"
    succeeded, same user pair). Root cause likely: Haiku's temp-0.8
    generations occasionally all start with the same first word ("This"
    / "The" / "You") and fail the no-duplicate-first-word validator;
    retry at temp-0.6 produces similar failure mode. Sprint 6: switch
    retry strategy from temperature-drop to explicit
    rejection-sampling-with-diverse-first-word prompt ("Respond again;
    variants must start with different first words").

13. **`/aiSpend` FAILED_PRECONDITION WARN** — occasional Firestore WARN
    during smoke: `RestConnection RPC 'Commit' ... failed with error:
    {"code":"failed-precondition"}` on `aiSpend/{yyyy-mm-dd}.totalCents`.
    This is Firestore optimistic-concurrency contention when two LLM
    calls try to increment the same day-doc simultaneously. `runTransaction`
    retries automatically, so user-facing behavior is correct — but the
    WARN is noisy. Sprint 6 cleanup: wrap in try/catch + suppress the
    warn if retry succeeded, OR use `FieldValue.increment(n)` which
    avoids the precondition altogether.

14. **`useWhyYouMatch` complex deps warnings** — pre-existing ESLint
    warnings (2) at `hooks/useWhyYouMatch.ts:173-174`. Extract complex
    dependency expressions to separate variables. Inherited from salvage
    commit `86148e1`; not 5b-introduced but worth resolving to keep the
    ESLint output clean.

### Also carrying from prior sprints (same flags, unchanged)

- **Firebase Web API key tightening** in GCP Console (HTTP referrer + API
  restrictions). Same flag as Sprints 1-5a.
- **WorkSans-SemiBold.ttf** still aliased to Bold.ttf — low priority.
- **Expo Go `--tunnel` mode broken on Node v22** — `@expo/ngrok@4.1.3`
  fetch-wrapper incompat with Node 22 (`.nvmrc` pins 20). Latest
  `@expo/ngrok` available is 4.1.3; no upgrade path. Workaround for
  cross-network testing: switch to Node 20 OR use LAN mode (works
  in-home). Flagged during smoke; user ran full smoke on LAN.

## Open questions / items deferred

### Sprint 5a deferred items — still applicable

- **Fine-tuning / RAG / per-user memory** — not in 5b scope per brief
  Appendix A. Sprint 6+ discretionary.
- **Watch-together scheduling** — Sprint 6 per plan.
- **Push notifications / EAS Build / TestFlight / Sentry / Analytics** —
  Sprint 6-7 per plan.

## Sprint 6 kick-off instructions for next session

1. Read this handoff first.
2. Read the discovery-UX brief at `docs/research/sprint-6-discovery-ux.md`
   (committed `fd5f965`). It's the authoritative scope for half of Sprint
   6; the other half is the rec-share redesign (item 1) which needs a
   separate research brief commissioned in parallel.
3. Check memory index at `C:\Users\enrique\.claude\projects\C--Users-enrique-Documents-Projects-MovieMatchApp\memory\MEMORY.md`
   for persistent feedback (no-co-author trailers, no-quick-fixes,
   per-phase verification, surgical-fixes-in-main-thread, etc.).
4. Decide Sprint 6 scope split — discovery-UX + rec-share is ambitious;
   the server-side LLM migration (brief §8) may warrant its own sprint.
   Defer to the harness Plan/Generator/Evaluator loop from the
   `harness-workflow` skill.
5. Commission a Sprint 6 "rec-share redesign" research brief during
   Sprint 6a execution (same pattern as the Sprint 5 AI-surfaces brief
   commissioned during Sprint 5a). Include 2026 Instagram Reel share +
   Airbnb listing share + Hinge message-with-like as reference patterns.
6. Draft `docs/harness/contracts/moviematch-sprint-6.md` (or split into
   6a/6b if scope is too large, same pattern as 5a/5b).
7. Sprint 6 opens with the cleanup queue items 6-14 batched into a
   "Sprint 6 polish pass" that can run early in parallel with the bigger
   discovery-UX + rec-share redesign streams.

## Manual iPhone smoke — PASSED 2026-04-19 (13 steps)

User completed the 13-step contract-spec smoke in LAN mode (not tunnel).
All 13 steps confirmed on-device with real data; 12 refinements captured
above as post-evaluator fixes.

**Screenshots archived** at `C:\Users\enrique\.claude\image-cache\c72d5973-de02-4105-9931-5494fd1f2a98\`
(29 screenshots across the smoke run — friend card + chip, FriendDetail
why-you-match real Haiku sentence, rec compose with 3-variant AI
suggestions, iMessage share of match card PNG, Safari rec preview, queue
reactions + rotation across A↔B, etc.).

### Smoke seed script

`scripts/seed-sprint-5b-smoke.js` — one-shot seeder for the 13-step smoke
on a single device. Reads `.env` via `node --env-file=.env`. Bumps the
hardcoded A_UID/B_UID/A_EMAIL to the next sprint's test users OR accepts
credentials via `SEED_A_PASSWORD` / `SEED_B_EMAIL` / `SEED_B_PASSWORD` env
vars to skip prompts. Seeds: friendship (accepted), public-profile
interactedTitleIds + genres + streamingServices for both users, and a
pre-made `/queues/smoke-test-queue` with 3 titles + both as participants.
Idempotent — safe to re-run.

## Environment notes

- **Windows 11 Home**, bash (Git Bash) shell, working dir
  `C:\Users\enrique\Documents\Projects\MovieMatchApp`.
- **Node v22.15.0 ambient** (`.nvmrc` pins 20; CI is 20). Known breakage:
  `npx expo start --tunnel` — use LAN mode.
- **Expo Go SDK 54** on iPhone (user's device).
- **Firebase project**: `moviematch-6367e` on Blaze plan (upgraded in
  Sprint 5a for Storage rules). Hosting + Firestore rules deployed
  2026-04-19.
- **Anthropic API key**: currently client-side via
  `EXPO_PUBLIC_ANTHROPIC_API_KEY`. Sprint 6 migrates to GCP Secret
  Manager via Cloud Functions.
- **Expo-level `.env` loading**: EXPO_PUBLIC_* vars bake into the bundle
  at Metro server start, NOT on hot reload. Adding a new env var
  requires `Ctrl+C` + `npx expo start` (not just shake + Reload).
- **`package.json` net changes this sprint** (selected):
  - `+@anthropic-ai/sdk ^0.90.0`
  - `+react-native-view-shot@4.0.3`
  - No other deps changed; no ejection from Expo Go.

## References

- **Sprint 5b contract**: `docs/harness/contracts/moviematch-sprint-5b.md`
  (committed at `31a68c3`; updated at `5490752` for MatchCard verify).
- **Sprint 5 AI-surfaces R&D brief**: `docs/research/sprint-5-ai-surfaces.md`
  (still authoritative — §7 verify_commands, §2.4 + §3.4 few-shot voice
  anchors, §8 Sprint 6 migration plan).
- **Sprint 6 discovery-UX R&D brief**: `docs/research/sprint-6-discovery-ux.md`
  (committed at `fd5f965`; authoritative for half of Sprint 6 scope).
- **Sprint 5a handoff**: `docs/handoffs/sprint-5.md` (superseded — kept
  for data-split decisions that still hold).
- **R&D briefs from Sprint 4** (still authoritative for voice + social
  rules): `docs/research/sprint-4-social-product.md`,
  `docs/research/sprint-4-dopamine.md`,
  `docs/research/sprint-4-mobile-ux.md`.
- **Plan**: `C:\Users\enrique\.claude\plans\expressive-jumping-reddy.md`
  (Sprint 6 + 7 outlines).
- **Memory** (persistent across sessions):
  `C:\Users\enrique\.claude\projects\C--Users-enrique-Documents-Projects-MovieMatchApp\memory\MEMORY.md`.
- **Repo remote**: https://github.com/ebarcly/MovieMatchApp (Sprint 5b
  branch `main` is **23 commits ahead** of `origin/main`, not pushed).

## Lessons / harness-simplification review

Per `harness-workflow` skill Step 6:

**Load-bearing (keep):**
- **Evaluator caught real problems again** — specifically the FriendDetail
  dead PNG-capture path, the QueueStrip uid-as-displayName bug, and the
  MatchCard gaming-the-verify dummy type. Zero of these showed up in
  automated verify_commands (hard thresholds were green); all three
  required the staff-engineer read-the-code lens. Four sprints in a row
  confirming the article thesis. Independent evaluator remains
  load-bearing; do not skip.
- **Surgical fixes in main thread** (13 fixes in Phase 3) — single
  generator re-dispatch would have burned enormous context + probably
  hit rate limits. Main-thread refinement is the right cost structure
  when each fix is 5-50 lines. Confirmed Sprint 3/4/5a pattern.
- **Sprint split (5a serial / 5b parallel)** — the data-locality backbone
  (Sprint 5a) had to land first so the 5b parallel streams could dispatch
  without merge contention. Didn't quite work cleanly — salvage was
  required when 4 parallel generator agents hit rate limits mid-sprint
  — but the *shape* was right. For Sprint 6, either (a) accept that
  rate-limit-bound salvage is part of the pattern, or (b) reduce
  parallelism to 2-3 concurrent generators max.
- **Seed scripts unblock single-device smoke** — `scripts/seed-sprint-5b-smoke.js`
  was the single biggest pragmatic win of the smoke phase. Expect to
  write one per sprint that introduces cross-user interactions. Reusable
  across every future sprint smoke.

**Ceremony (lighten in Sprint 6):**
- **15 contract hard thresholds is still a lot** — some are redundant
  (the Stream C tool-use + model-ID + cache-module checks overlap
  heavily). Sprint 6 can collapse the Stream-C sextet into a single
  composite per the Sprint 5b lesson of collapsing Sprint 4's 6 discipline
  checks. Pattern: tighter contracts, better signal-to-noise.
- **Design-criteria rubrics** repeated long prose definitions. Sprint 6:
  keep rubrics to 3-line tables (score 7/8/9 anchor examples) + defer
  to the research briefs for voice/style.
- **Manual smoke single-device friction** — smoke required sign-out/in
  toggling between A + B twice (queue rotation verify, friend acceptance
  verify). Sprint 6: either commission a truly 2-device smoke (cheaper
  than it sounds — Expo Go on a tablet counts) OR accept the toggle
  friction and pre-script the test journey more explicitly.
- **Per-rec hosting preview deferred cleanly** — brief §8 called this out
  as a Sprint 6 concern; no one tried to shim it in 5b. Clean deferral
  worked.

### Harness evolution across Sprints 3/4/5a/5b

The harness has gotten *slightly* smaller each sprint:
- Sprint 3: 8 hard thresholds / 5 design criteria / 6-step smoke.
- Sprint 4: 17 hard thresholds / 4 design criteria / 7-step smoke.
- Sprint 5a: 15 hard thresholds (after composite collapse) / 4 design
  criteria / 10-step smoke.
- Sprint 5b: 15 hard thresholds / 5 design criteria / 13-step smoke.

The direction is right (tighter thresholds, richer design rubrics, more
operational smoke). Sprint 6 should aim for ≤12 thresholds + ≤5 design
criteria + per-feature smoke scripts rather than one giant checklist.
