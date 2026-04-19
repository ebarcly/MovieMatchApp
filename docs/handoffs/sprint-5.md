# Handoff: MovieMatchApp — Sprint 5 in flight (5a generator + AI brief dispatched)

## TL;DR for next session

**First action**: read this file, then check on the two background agents
that were dispatched at the end of the last session. If they've reported
back, run the evaluator on 5a. If not, wait for their notifications.

**State**: Sprint 4 closed. Sprint 5 has been SPLIT into 5a (serial
blockers — friend graph + user-doc split + profile upload + rules) and
5b (parallel features — match% + queues + rec cards + AI surfaces +
match card image). 5a contract is committed; 5a generator is running
in a background subagent; the AI-surfaces R&D brief for 5b is also
running in parallel.

## State of the repo

- **Branch**: `main`, 17 commits ahead of `origin/main` (not pushed).
- **HEAD at session close**: `9ee7d67 chore(sprint-5a): land Sprint 5a contract` (1 new commit this session — the contract).
- **Sprint 4 close commit**: `6423737 fix(sprint-4): tighten MatchesScreen empty body to ≤12 words`.
- **5a generator**: may have added commits to main while this session's main-thread agent was idle. Run `git log 9ee7d67..HEAD` to see what landed.
- **CI**: `.github/workflows/ci.yml` still wired.
- **No open CVEs.**

## Sprint 5 split decision + rationale

Handoff from Sprint 4 suggested parallelism was tractable: friend graph
first (serial), then match% + rec cards + AI surfaces + match-card image
in parallel. The split captures that:

- **Sprint 5a** = serial blockers that everything else depends on.
  Scope: friend graph primitive, contact onboarding with hashed
  contact-check, user-doc split (public/private subcollection),
  profile image upload + Avatar component, Firestore + Storage rules.
- **Sprint 5b** = parallel feature streams dispatched after 5a
  evaluator-PASS. Streams A/B/C/D: match% compute + display, shared
  queues, rec cards + AI rec-copy suggestions, AI why-you-match,
  shareable match card image gen.

**Why split?** Handoff's "Tightening for Sprint 5 contract drafting" section
explicitly recommended either (a) split into Sprint 5a/5b, or (b) dispatch
parallel generators for independent pieces. Option (a) is cleaner: tighter
contracts, faster evaluator feedback, and match%/rec cards/AI all read from
the `public/profile` subcollection that 5a establishes — so there's a real
dependency, not manufactured sequencing.

## In-flight background agents (as of session close)

| Agent | Purpose | Output path | Status at close |
|---|---|---|---|
| `a712b60f3239ea06c` | Sprint 5a generator (main sprint work) | `C:\Users\enrique\AppData\Local\Temp\claude\C--Users-enrique-Documents-Projects-MovieMatchApp\7a0e1d6e-c498-4990-ab6e-8d83fdff1f74\tasks\a712b60f3239ea06c.output` | dispatched, running |
| `a4b9295f215973513` | AI-surfaces R&D brief for Sprint 5b | `C:\Users\enrique\AppData\Local\Temp\claude\C--Users-enrique-Documents-Projects-MovieMatchApp\7a0e1d6e-c498-4990-ab6e-8d83fdff1f74\tasks\a4b9295f215973513.output` | dispatched, running |

**DO NOT read those output paths** — they're full subagent transcripts and
will overflow context. Wait for completion notifications, or check `git log`
and `docs/research/sprint-5-ai-surfaces.md` to see what landed.

## Sprint 5a contract — key decisions codified

- **Shape inherited from Sprint 4 contract** (yaml frontmatter, success_criteria with verify_command, design_criteria with weight/pass_threshold, manual smoke section).
- **Build-pipeline greens collapsed** into a single composite verify_command (`tsc && eslint && prettier && expo-doctor`). Jest remains separate (different output shape).
- **Regex footgun fixed** — all multi-line grep patterns use `[\s\S]*?` instead of the Sprint 4 `[^;]*` pattern that failed to match newlines.
- **Privacy Discipline** added as a 4th design criterion (weight 15, pass 8) because 5a introduces the first cross-user data reads. Verify raw phone/email never leave the device; public profile exposes only hashed contact keys + displayName + photoURL + tasteLabels.
- **Jest floor raised** from 64 (Sprint 4) to 90 — 26 new assertions minimum.
- **10-step manual iPhone smoke** scoped to the new surfaces (contact onboarding, profile photo, friendship round-trip, rules deployment).

## Next-session runbook (what to do when you return)

1. **Read this handoff** (first action after /clear).
2. **Check background agents**:
   - `git log 9ee7d67..HEAD --oneline` → see what 5a generator committed.
   - `ls docs/research/sprint-5-ai-surfaces.md` → confirm AI brief landed.
   - If either agent is still running, you'll see an open notification about it.
3. **If 5a generator reported back**:
   - Dispatch evaluator via `Agent(subagent_type="feature-dev:code-reviewer")`.
   - Evaluator reads `docs/harness/contracts/moviematch-sprint-5a.md` + the generator's commit range + runs every `verify_command`.
   - Relay the 10-step manual smoke to user.
   - Verdict: PASS / SOFT_FAIL / HARD_FAIL per `harness-workflow` Step 3.
4. **If 5a evaluator returns HARD_FAIL**: follow the Sprint 4 pattern —
   surgical fixes in main thread, NOT a generator re-dispatch. Sprint 4's
   `6a41567` is the template.
5. **If 5a evaluator returns PASS**: draft `docs/harness/contracts/moviematch-sprint-5b.md` using:
   - The AI brief at `docs/research/sprint-5-ai-surfaces.md` (prompts, model choice, cache strategy, cost/latency thresholds, guardrails).
   - 5a's landed backbone ops as fixed import sources (match% reads from `public/profile`; friend list comes from `listFriends`; Avatar is the photo fallback).
   - Parallel stream structure: A (match%), B (rec cards + compose sheet), C (AI surfaces), D (shared queues), + E (match card image generation after A lands).
6. **Dispatch 5b generators in parallel** via `superpowers:dispatching-parallel-agents` OR serialize if dependencies are tighter than estimated.
7. **Evaluate each 5b stream independently** — one evaluator per stream.

## Decisions deferred (user input may be needed for 5b)

Per the synthesis subagent, these are open for Sprint 5b:

1. **LLM model**: Haiku 4.5 vs Gemini Flash. Default to Haiku 4.5
   (`claude-haiku-4-5-20251001`) unless AI brief's cost math favors
   Gemini. Cost cap $0.005/call p95.
2. **Match-card image library**: Skia vs `react-native-view-shot`.
   Default to view-shot for battle-tested RN compatibility; Skia is
   more performant but +3MB bundle.
3. **Tiered match-card labels**: Propose 4 tiers — "Getting There"
   (0-40%), "In Sync" (40-60%), "Tight Loop" (60-80%), "Soulmates"
   (80-100%). User can override in the 5b contract.
4. **Firestore rules deployment**: 5a flags it as user task. Same
   pattern as Sprints 1-4. User must run
   `npx firebase deploy --only firestore:rules,firestore:indexes,storage`
   before 5a manual smoke can complete.

## Sprint 5 invariants that carry forward (from Sprint 4 handoff)

- `theme/motion.ts` springs (`snappy` d18/s220 + `gentle` d20/s140) — single source.
- `DotLoader` is the one motion motif — no new spinners.
- `TasteProfile` types live in `utils/firebaseOperations.ts`; `pseudoFriends.ts` re-exports.
- Haptics policy: 4 events only (swipe, quiz-pick, toast, explicit confirm — friendship accept qualifies in 5a).
- Empty-state rule: Phosphor on tinted circle + ≤12 words declarative second-person body.
- Error banners: INLINE, never modal. Bolded verb CTA.
- AppNavigator gate: in 5a this extends to `migration → tasteProfile → photoURL (skippable) → Main`.
- React 19 + Reanimated 4 + Expo SDK 54 jest mock is load-bearing; don't swap.
- Rank-framed match % copy is FORBIDDEN — only bridge-framed ("you both love slow sci-fi"). 5b enforces this in the AI prompt + deterministic fallbacks.

## Environment notes

- Windows 11 Home, bash (Git Bash) shell.
- Node 20 via .nvmrc (ambient runner may be 22.15.0; CI pins Node 20).
- Expo Go on iPhone is SDK 54.
- Current branch: `main`; remote: https://github.com/ebarcly/MovieMatchApp.
- `firestore.rules` tracked locally — 5a updates it; deployment is user task.
- `storage.rules` — NEW file in 5a if the generator added it per contract.

## References

- **Sprint 5a contract**: `docs/harness/contracts/moviematch-sprint-5a.md` (committed at `9ee7d67`).
- Sprint 4 handoff (decisions that persist): `docs/handoffs/sprint-4.md`.
- Sprint 5 AI-surfaces R&D brief (in flight): `docs/research/sprint-5-ai-surfaces.md`.
- Sprint 4 R&D briefs (still authoritative): `docs/research/sprint-4-{social-product,dopamine,mobile-ux}.md`.
- Plan: `C:\Users\enrique\.claude\plans\expressive-jumping-reddy.md`.
- harness-workflow skill: invoke via `Skill("harness-workflow")` or read `C:\Users\enrique\.claude\skills\harness-workflow\SKILL.md`.
