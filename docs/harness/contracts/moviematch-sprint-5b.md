---
sprint: 5b
feature: "Viral-core feature parallelism — match% + rec cards + AI surfaces + shared queues + shareable match card"
reference_contracts:
  - docs/harness/contracts/moviematch-sprint-1.md
  - docs/harness/contracts/moviematch-sprint-2.md
  - docs/harness/contracts/moviematch-sprint-3.md
  - docs/harness/contracts/moviematch-sprint-4.md
  - docs/harness/contracts/moviematch-sprint-5a.md
reference_plan: "C:/Users/enrique/.claude/plans/expressive-jumping-reddy.md"
reference_research:
  - docs/research/sprint-4-social-product.md
  - docs/research/sprint-4-dopamine.md
  - docs/research/sprint-4-mobile-ux.md
  - docs/research/sprint-5-ai-surfaces.md   # authoritative for Stream C
reference_handoff: docs/handoffs/sprint-5.md

# Sprint 5b dispatches AFTER 5a evaluator-PASS lands (confirmed: commit 1053c44,
# handoff closed 2026-04-19). The backbone landed in 5a — /users/{uid}/public/profile
# subcollection, /friendships/{id} with deterministic ${min}_${max} ID, contact hashing,
# profile photo upload + Avatar primitive, Firestore + Storage rules. Any new
# cross-user read in 5b MUST hit /users/{uid}/public/profile, never the private root.

# Sprint 5b is STREAM-PARALLEL: A/B/C/D dispatch simultaneously on independent files.
# Stream E (shareable match-card image) is SERIAL after Stream A (needs match% number
# + top-3 overlap titles to render the card).

streams:
  A: "Match % compute + display — client-side dot-product over tasteProfile.axes + weighted overlap on interactedTitles/genres/streamingServices; renders on friend cards + stories-strip + friend-detail view. Shipable without A/B dependencies."
  B: "Rec cards + compose sheet — Firebase Hosting route /rec/{recId} (universal-link replaces the Sprint 5a placeholder), compose modal with required 30-280-char note, share sheet integration. Stream B consumes Stream C's rec-copy output via LLMClient interface (not concrete class) so the two streams dispatch in parallel."
  C: "AI surfaces — Haiku 4.5 pinned (claude-haiku-4-5-20251001), LLMClient interface + AnthropicLLMClient implementation, why-you-match (1 sentence, 10-22 words) + rec-copy (3 variants, 30-280 chars each, NON-STREAMING per ratified decision), Firestore-backed cache /aiCache/{hash}, $25/day cost cap with 80% warn + 100% degrade, strict PII (prompt never sees displayName/email/phone/uid; client substitutes displayLabel placeholder)."
  D: "Shared watch queues — /queues/{queueId} with 2-5 participants, ordered title refs, 1-tap reactions (👍🔥😴⏭️), 'your turn to pick' rotation. Horizontal strip on Home above the swipe deck."
  E: "Shareable match-card image (SERIAL AFTER A) — 9:16 Instagram-Story-native image via react-native-view-shot (NOT Skia per ratified decision). Dual-accent yellow/magenta on ink; both avatars + match % + tiered label + top 3 overlap titles. Pixel-accuracy snapshot test with ±5% tolerance."

scope:
  # ===================================================================
  # STREAM A — Match % compute + display
  # ===================================================================
  - "Stream A / `utils/matchScore.ts` — replace the Sprint 3 stub (always returns 0). Real algorithm: dot product over TasteProfile.axes (8 axes, `-1..1`) weighted 0.5, plus weighted overlap on interactedTitles (weight 0.3), genres (0.15), streamingServices (0.05). Normalize to `0..1`. Returns `{ score, sharedTitleIds, sharedGenres, sharedServices, topAxes }`. Deterministic — same inputs always yield same output. Zero `any`."
  - "Stream A / `utils/__tests__/matchScore.test.ts` — expand coverage beyond signature stub. Cases: (1) two identical profiles → score ~1.0, (2) opposite profiles → score ~0.0, (3) orthogonal axes → score ~0.5, (4) sharedTitleIds returned in numerically sorted order, (5) missing fields gracefully default (missing streamingServices treated as empty). `matchScore.test.ts.skip` from Sprint 5a becomes `matchScore.test.ts`."
  - "Stream A / `components/MatchScoreChip.tsx` — the atom that renders a 0-100% number + tier label in the 4 accepted tiers (0-40 'Getting There', 40-60 'In Sync', 60-80 'Tight Loop', 80-100 'Soulmates'). Accepts `size` prop ('sm' = inline chip / 'md' = friend-card overlay / 'lg' = stories-strip hero). Tier color maps to `theme.colors.accentYellow` (0-60%) vs `theme.colors.accentMagenta` (60-100%) on `theme.colors.ink`. Bridge-framed copy — NEVER '% compatible' or 'X% match', always the tier label + number."
  - "Stream A / Wire match% into `components/FriendCard.tsx` (new or extend existing) — renders the chip over the avatar, computes score client-side using public-profile reads from both sides. Memoize via `useMemo` keyed on both uids + public-profile `updatedAt` timestamps."
  - "Stream A / Extend `components/StoriesStrip.tsx` (or create if not present) — horizontal strip of friend avatars with match% overlay in the 'lg' chip size. Tappable → friend-detail view."
  - "Stream A / `screens/FriendDetailScreen.tsx` — renders friend's displayName/avatar/tasteLabels + match% chip + 'why-you-match' slot (Stream C fills this) + top 3 shared titles (Stream A computes) + a 'send rec' CTA (Stream B fills this). Read-only for 5b; actions dispatch to other streams."
  - "Stream A / AppNavigator — add `FriendDetail` route with param `{ friendUid: string }`. Matches-tab pushes onto this screen."

  # ===================================================================
  # STREAM B — Rec cards + compose sheet
  # ===================================================================
  - "Stream B / Firebase Hosting route `/rec/{recId}` — public web preview of a rec. Shows poster + sender's displayName + note + 'install and open in MovieMatch' CTA. Reuses the universal-link scaffold from Sprint 5a (placeholder URL becomes real here). HTML/CSS only; no JS framework needed for the preview. Hosting config in `firebase.json` registers the route."
  - "Stream B / `screens/RecCardComposeScreen.tsx` — opened from DetailScreen 'Recommend to a friend' CTA. Modal-styled (Sprint 4 rules: not a native modal, an inline stack screen). Shows: poster thumbnail, 'to:' friend picker (uses friend-list from Sprint 5a), required note textarea (Hinge-rule: 30-280 chars, per sprint-4-social-product.md), and a '3 AI suggestions' row that consumes Stream C's `recCopy()`. Tap a suggestion → populates note. Edit freely after."
  - "Stream B / `components/RecCardShareSheet.tsx` — after compose, tap 'Send' → creates `/recs/{recId}` doc `{ from: uid, to: uid, titleId, note, createdAt, viewedAt? }` + opens native `Share` sheet with the `/rec/{recId}` link. 30-280 char enforcement is CLIENT-side before send (inline banner on violation, no modal)."
  - "Stream B / `utils/firebaseOperations.ts` — add `createRec(toUid, titleId, note)` returning `{ recId, shareUrl }`. Typed, tested."
  - "Stream B / Firestore rule for `/recs/{recId}` — sender can write; sender + recipient can read their own; others rejected. Content verified via verify_command; deployment is user task."
  - "Stream B / `utils/__tests__/createRec.test.ts` — covers: happy path, 30-char floor rejected, 280-char ceiling rejected, non-friend recipient rejected at rule-level (asserted in rules file, not runtime)."
  - "Stream B / DetailScreen extension — add 'Recommend' CTA next to 'Add to watchlist'. Tap → opens RecCardComposeScreen with preselected titleId."

  # ===================================================================
  # STREAM C — AI surfaces (Haiku 4.5)
  # ===================================================================
  - "Stream C / `utils/ai/LLMClient.ts` — interface with two methods: `whyYouMatch(input: WhyYouMatchInput): Promise<{ text: string; degraded: boolean; costCents: number }>` and `recCopy(input: RecCopyInput): Promise<{ variants: string[]; degraded: boolean; costCents: number }>`. This interface is the Sprint 6 migration seam — Cloud Functions swap only touches the DI root."
  - "Stream C / `utils/ai/impl/AnthropicLLMClient.ts` — concrete implementation. Model pinned to `claude-haiku-4-5-20251001`. Uses Anthropic SDK with tool-use for structured output (tool `submit_bridge_sentence` for why-you-match, tool `submit_rec_variants` for rec-copy). Rec-copy is **non-streaming** per ratified decision — SDK returns all 3 variants together, UI shows DotLoader then renders all three. Partial-JSON streaming is out of scope (Sprint 6 polish)."
  - "Stream C / `utils/ai/prompts/whyYouMatch.ts` — exports the system prompt verbatim from the R&D brief §2.1. Contains the required guard tokens: 'second person', 'present tense', 'No exclamation', 'bridge-framed', '10 and 22 words', 'name at least ONE'. Also exports `WHY_YOU_MATCH_PROMPT_VERSION` constant (bump for cache-bust)."
  - "Stream C / `utils/ai/prompts/recCopy.ts` — exports the system prompt verbatim from R&D brief §3.1. Contains guard tokens: 'EXACTLY 3 variants', '30 and 280 characters'. Also exports `REC_COPY_PROMPT_VERSION`."
  - "Stream C / `utils/ai/validators.ts` — runtime validators per brief §2.5 + §3.3: `sentenceIsValid(s)` regex check + word-count check for why-you-match; `variantIsValid(v)` regex/length check for each rec-copy variant; `assertRecCopyBatch(variants)` enforces exactly-3 + no-duplicate-first-word + all-pass-individual-check. On fail: one retry with `temperature` −0.2, then deterministic fallback."
  - "Stream C / `utils/ai/fallbacks.ts` — deterministic fallback strings keyed by `signalTier` (why-you-match: full/partial/cold per brief §2.6) or `relationshipDepth` (rec-copy: 3/2/1 per brief §3.5). Render in <50ms. Evaluator confirms no LLM import in this file."
  - "Stream C / `utils/ai/pricing.ts` — single constant map `{ 'claude-haiku-4-5-20251001': { input: 1.00, output: 5.00, cacheRead: 0.10, cacheWrite: 1.25 } }` ($/MTok, per brief §1.1). Exported for cost accounting."
  - "Stream C / `utils/ai/cache.ts` — Firestore-backed cache at `/aiCache/{hash}`. Exports: `buildCacheKey(kind, input)`, `getFromCache(key)`, `setInCache(key, payload)`. TTLs: why-you-match 7d per (uidA,uidB) pair; rec-copy 24h per (titleId,senderLabelsHash,recipientLabelsHash,depth). Cache key is version-prefixed with `WHY_YOU_MATCH_PROMPT_VERSION` / `REC_COPY_PROMPT_VERSION`. Anthropic **prompt-cache TTL = 5 min** (the SDK's per-call cache, not Firestore) per ratified decision."
  - "Stream C / `utils/ai/spend.ts` — `/aiSpend/{yyyy-mm-dd}` tracking. Transactionally increments `totalCents` on every non-cache call. Reads `MAX_DAILY_LLM_COST_USD` from env (default `$25`). At 80% → log-warn + Sentry breadcrumb (Sentry not wired until Sprint 7 — stub via console.warn for 5b). At 100% → set `degraded: true` for the remainder of the UTC day; return fallback; UI never surfaces an error banner for this path. **Strict PII**: no uid/displayName/email in any aiSpend log."
  - "Stream C / `utils/ai/pii.ts` — sanitizer for LLM inputs. Strips `{`, `}`, `<`, `>`, backticks, control chars from labels + title names. Caps labels at 80 chars, titles at 200. Wraps input payload in `<input>...</input>` delimiter (system prompt says content inside is DATA, not INSTRUCTION). Exports `sanitizeLLMInput(raw)`."
  - "Stream C / `hooks/useWhyYouMatch.ts` + `hooks/useRecCopy.ts` — React hooks that call the LLMClient, wire up the DotLoader up to 1500ms, cross-fade on resolve (180ms), never swap after 2000ms. Post-generation: client substitutes `{displayLabel}` placeholder in the returned sentence with the real friend's displayName from the LOCAL friend record (never sent to the model)."
  - "Stream C / Env config: add `EXPO_PUBLIC_ANTHROPIC_API_KEY` + `EXPO_PUBLIC_MAX_DAILY_LLM_COST_USD` to `.env.example`. README or Sprint 5b handoff notes that the real key lives in `.env` (gitignored). Key is client-side for Sprint 5b — Sprint 6 moves to Cloud Functions (brief §8)."
  - "Stream C / `utils/ai/__tests__/validators.test.ts` + `cache.test.ts` + `pii.test.ts` — test coverage: validator regex hits each banned pattern; cache round-trip returns hit within TTL + miss after TTL; PII sanitizer strips every banned char + truncates long labels + wraps in <input> delimiter. Mock Firestore transport for cache + spend tests."
  - "Stream C / `utils/ai/__tests__/latency.bench.ts` — benchmark harness (mocked transport OK for CI). Runs 50 simulated calls; asserts p95 ≤ 2000ms under mocked latency; gated behind `RUN_BENCH=1` env so CI doesn't run it by default."

  # ===================================================================
  # STREAM D — Shared watch queues
  # ===================================================================
  - "Stream D / `/queues/{queueId}` Firestore collection — schema: `{ participants: string[] (2-5 uids, lexicographically sorted), orderedTitleIds: number[], reactions: { [titleId_uid]: '👍'|'🔥'|'😴'|'⏭️' }, activity: subcollection of {actor, verb, titleId, at}, nextPickUid: uid, createdAt }`. Uniqueness NOT enforced by ID (users can share multiple queues with same participants); use auto-ID."
  - "Stream D / `utils/firebaseOperations.ts` — add: `createQueue(participants, name?)`, `addTitleToQueue(queueId, titleId)`, `reactToQueueTitle(queueId, titleId, reaction)`, `markTitleWatched(queueId, titleId)` (advances nextPickUid rotation), `listQueuesForUid(uid)`. All typed, all tested."
  - "Stream D / `components/QueueStrip.tsx` — horizontal strip on Home ABOVE the swipe deck. Shows up to 5 queues with: queue name / participant avatars stacked / up-next title thumbnail / reaction emoji if user has one. Tap → QueueDetailScreen."
  - "Stream D / `screens/QueueDetailScreen.tsx` — vertical list of titles in queue-order, each with 4 reaction taps + 'mark watched' on the next-up. DotLoader while the queue loads (never ActivityIndicator). Empty state uses Phosphor + tinted circle + ≤12 word body per Sprint 4."
  - "Stream D / Firestore rule for `/queues/{queueId}` — participants only can read/write. Adding a new title is open to any participant. Marking watched requires `nextPickUid === request.auth.uid`."
  - "Stream D / `utils/__tests__/queueOps.test.ts` — tests: create queue with 2-5 participants; 1-participant rejects; 6-participant rejects; addTitle is idempotent (same title added twice → no-op); reaction upsert per (title, user); markTitleWatched rotates nextPickUid round-robin by participants order."

  # ===================================================================
  # STREAM E — Shareable match-card image (SERIAL after Stream A)
  # ===================================================================
  - "Stream E / `components/MatchCard.tsx` — renders the 9:16 IG-Story-native card as a React Native view. 1080x1920 logical pixels (view-shot captures at screen density). Layout: ink background, dual-accent gradient (yellow → magenta), both avatars circular on top, match % centered in 120pt typography, tier label below in 32pt, top 3 overlap titles in a row with poster thumbnails + titles, MovieMatch watermark bottom-right."
  - "Stream E / `utils/shareMatchCard.ts` — `shareMatchCard(userUid, friendUid): Promise<void>`. Uses `react-native-view-shot` (NOT Skia per ratified decision) to capture `<MatchCard />` at 9:16 (1080x1920). Writes to local cache dir, opens native `Share` sheet with the PNG. Image MUST be legible on iMessage preview per Sprint 5 success criterion."
  - "Stream E / `package.json` — add `react-native-view-shot` (SDK 54-aligned version). Evaluator verifies peer-dep install is clean."
  - "Stream E / `components/__tests__/MatchCard.test.tsx` — snapshot test with ±5% pixel-accuracy tolerance. Uses `react-test-renderer` for props-to-element snapshot; pixel tolerance via an in-memory Pixelmatch over a rasterized reference (stored under `__fixtures__/`). The fixture is seeded once; re-generate only on intentional design change with `UPDATE_SNAPSHOT=1`."
  - "Stream E / `screens/FriendDetailScreen.tsx` — add 'Share match card' CTA (tertiary button, not primary). Tap → shareMatchCard(userUid, friendUid)."

  # ===================================================================
  # CROSS-STREAM — user-doc migration verification + AppNavigator
  # ===================================================================
  - "Cross-stream / Pre-flight check: Sprint 5a shipped the user-doc-split migration code path and it runs at AppNavigator gate. Sprint 5b generators must NOT re-read from the private /users/{uid} doc for any cross-user surface. Stream A + C + E all read public/profile. Evaluator verifies this invariant via grep."
  - "Cross-stream / AppNavigator — add `FriendDetail` and `QueueDetail` + `RecCardCompose` + `Rec` routes. No new gate — these are main-tab-reachable screens. Maintain the Sprint 5a gate order (auth → userDocSplit → tasteProfile → photoURL → Main)."
  - "Cross-stream / The 10-step Sprint 5a manual smoke is extended with 5b steps (see success_criteria_manual below)."

  # ===================================================================
  # COMMIT DISCIPLINE
  # ===================================================================
  - "Commit per logical chunk, conventional-commits prefix with stream marker: `feat(sprint-5b/A): …`, `feat(sprint-5b/C): …`, etc. Target ≥ 12 commits across the 5 streams (A:~3, B:~3, C:~5, D:~2, E:~2 including snapshot fixture)."

out_of_scope:
  # --- Sprint 6 (server-side + polish) — strictly excluded ---
  - "Server-side AI inference via Cloud Functions (Sprint 6 — brief §8 migration plan)"
  - "Partial-JSON streaming for rec-copy (ratified deferred to Sprint 6 polish pass)"
  - "Per-uid token-bucket rate limits on AI calls (Sprint 6)"
  - "1h prompt-cache TTL migration based on real volume data (Sprint 6)"
  - "Cleanup sweep for /aiCache (Sprint 6)"
  - "Discovery-UX redesign (chip composition, personalized shelves, Because-you-matched rows — separate Sprint 6 research brief commissioned in parallel with 5b execution)"
  - "Watch-together scheduling (Sprint 6)"
  - "Push notifications (Sprint 6-7)"
  - "EAS Build / TestFlight / Sentry wiring (Sprint 7)"
  - "Analytics (Sprint 7)"

  # --- Anti-patterns inherited from Sprint 4 — must NOT regress ---
  - "Streaks, badges, XP, levels, points, leaderboards"
  - "Follow-celebrities, public global feed, 'Popular' tab"
  - "Instagram-style 24h-decay ephemeral stories"
  - "Variable-ratio push scheduling / `Math.random()` in any scheduler module"
  - "Bouncy-overshoot springs (use only theme/motion.ts)"
  - "Custom hand-drawn empty-state illustrations (Phosphor + tinted circle only)"
  - "Rank-framed match% copy — ONLY bridge-framed + the 4 tier labels"
  - "Modal error dialogs — inline banners only"
  - "Hardcoded `#FFFFFF` / legacy hex in screens/components/nav"
  - "New `any` in utils/ or services/ backbone"
  - "`// @ts-nocheck`; `// @ts-expect-error` without `// reason:` comment"
  - "Raw contact data off-device — still mandatory from 5a"
  - "Real phone/email/displayName on public profile or in LLM prompts — strict PII from ratified decision"
  - "ActivityIndicator anywhere in screens/components (DotLoader only)"

  # --- Stream-specific exclusions ---
  - "Stream A / server-side match% computation — keep it client-side for 5b (<200ms target achieved via client compute; Sprint 6 evaluates server computation if needed)."
  - "Stream A / ranking multiple friends against each other — rank-framed, forbidden. Match % is per-pair only."
  - "Stream B / native share sheet customization per iOS/Android — accept the default sheet; match-card image (Stream E) is the design-rich share path."
  - "Stream B / cross-platform universal-link on Android App Links — iOS-first for beta; Android App Links deferred to Sprint 7."
  - "Stream C / alternative models (Gemini, GPT) — Haiku 4.5 pinned per brief §1.4. LLMClient interface exists for future swap."
  - "Stream C / fine-tuning, RAG, per-user memory, voice/audio — brief Appendix A."
  - "Stream C / multilingual (English only for 5b)."
  - "Stream C / LLM inside the match% number itself — the number is a deterministic dot product per utils/matchScore.ts (brief Appendix A)."
  - "Stream D / chat/messaging inside queues — queues are reaction-only for 5b; Sprint 6+ considers chat."
  - "Stream D / queue scheduling ('watch Tuesday at 9pm') — Sprint 6."
  - "Stream E / Skia-backed match card — ratified NOT this sprint; view-shot is the decision."
  - "Stream E / animated/video match card — static PNG only for 5b."

success_criteria:
  # ======================================================================
  # COMPOSITE BUILD-PIPELINE GREEN
  # Inherits Sprint 5a's collapse of tsc/eslint/prettier/expo-doctor into
  # ONE composite + Jest as a separate green.
  # ======================================================================

  - criterion: "Build pipeline green: tsc --noEmit + eslint (0/0) + prettier --check + expo-doctor (17/17)."
    threshold: hard
    verify_command: "npx tsc --noEmit && npx eslint . --format compact && npx prettier --check . && npx expo-doctor"

  - criterion: "Jest green in CI mode; at least 175 passing assertions (Sprint 5a baseline 123 + 52 new minimum across 5 streams). Every new module in 5b has a smoke test or better."
    threshold: hard
    verify_command: "npm test -- --ci --json --outputFile=/tmp/jest-result.json && node -e \"const r=require('/tmp/jest-result.json'); if(!r.success){console.error('FAIL jest');process.exit(1)} const a=r.testResults.reduce((s,t)=>s+(t.assertionResults||[]).filter(x=>x.status==='passed').length,0); if(a<175){console.error('FAIL: only',a,'passing assertions (5b floor 175)');process.exit(1)} console.log('OK',a)\""

  # ======================================================================
  # INHERITED SPRINT 4/5a DISCIPLINE — COMPOSITE (per 5a lesson: collapse)
  # ======================================================================

  - criterion: "Sprint 4 + 5a discipline preserved: no hardcoded white, no legacy hex, no inline springs, no ActivityIndicator, no anti-pattern naming, no Math.random() in schedulers, ≥90% a11y label coverage on interactive components."
    threshold: hard
    verify_command: "node scripts/verify-sprint-5a.js"
    # scripts/verify-sprint-5a.js already consolidates all 6 discipline checks (see Sprint 5a
    # generator commit dbc1647). For 5b we re-run it verbatim; any new violation fails.

  # ======================================================================
  # STREAM A — match% compute + display
  # ======================================================================

  - criterion: "Stream A / matchScore.ts is no longer a stub: computeMatchScore returns a non-zero score for two non-empty identical profiles. Algorithm uses tasteProfile.axes dot product + weighted overlap on interactedTitles/genres/streamingServices."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'); const src=fs.readFileSync('utils/matchScore.ts','utf8'); if(/stub|always returns 0/i.test(src) && /return\\s*\\{\\s*score:\\s*0/.test(src)){console.error('FAIL: matchScore is still a stub');process.exit(1)} if(!/axes/.test(src)){console.error('FAIL: matchScore must use tasteProfile.axes');process.exit(1)} if(!/interactedTitles|sharedTitleIds/.test(src)){console.error('FAIL: matchScore must weight shared titles');process.exit(1)} console.log('OK')\""

  - criterion: "Stream A / matchScore.test.ts covers: identical profiles → ~1.0, opposite profiles → ~0.0, missing-fields default to empty. No .skip on the test."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'); const p='utils/__tests__/matchScore.test.ts'; if(!fs.existsSync(p)){console.error('FAIL: matchScore.test.ts missing at',p);process.exit(1)} const src=fs.readFileSync(p,'utf8'); if(/\\.skip\\s*\\(/.test(src) || /xdescribe|xit\\b/.test(src)){console.error('FAIL: remove .skip/xit from matchScore tests');process.exit(1)} const checks=[/identical/i, /opposite/i, /(missing|empty|undefined)/i]; const missing=checks.filter(re=>!re.test(src)); if(missing.length){console.error('FAIL: matchScore test missing case coverage:',missing.map(r=>r.toString()).join(', '));process.exit(1)} console.log('OK')\""

  - criterion: "Stream A / MatchScoreChip renders the exact 4 tier labels: 'Getting There', 'In Sync', 'Tight Loop', 'Soulmates'. No '% compatible' / 'X% match' rank language."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'); const p='components/MatchScoreChip.tsx'; if(!fs.existsSync(p)){console.error('FAIL: MatchScoreChip missing');process.exit(1)} const src=fs.readFileSync(p,'utf8'); const tiers=['Getting There','In Sync','Tight Loop','Soulmates']; const missing=tiers.filter(t=>!src.includes(t)); if(missing.length){console.error('FAIL: MatchScoreChip missing tier labels:',missing.join(', '));process.exit(1)} if(/%\\s*(compatible|match\\b)/i.test(src)){console.error('FAIL: rank-framed copy detected (% compatible / % match)');process.exit(1)} console.log('OK')\""

  - criterion: "Stream A / Match% reads ONLY from /users/{uid}/public/profile — no private-root reads for cross-user data."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); const walk=(d)=>{let r=[]; if(!fs.existsSync(d)) return r; for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name==='node_modules'||e.name==='__tests__'||e.name==='.git') continue; const p=path.join(d,e.name); if(e.isDirectory()) r=r.concat(walk(p)); else if(/\\.(ts|tsx)$/.test(e.name)) r.push(p)} return r}; const files=walk('.'); let bad=[]; for(const f of files){const src=fs.readFileSync(f,'utf8'); if(!/(match|friend|avatar)/i.test(src)) continue; if(/doc\\s*\\(\\s*db\\s*,\\s*['\\\"]users['\\\"]\\s*,\\s*\\w+\\s*\\)/.test(src) && !/public\\/profile/.test(src)){bad.push(f+' :: reads users/{uid} root')}} if(bad.length){console.error('FAIL: cross-user surface reading private doc:\\n'+bad.join('\\n'));process.exit(1)} console.log('OK')\""

  # ======================================================================
  # STREAM B — rec cards + compose sheet
  # ======================================================================

  - criterion: "Stream B / Firebase Hosting route /rec/{recId} is registered in firebase.json hosting rewrites."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'); const cfg=JSON.parse(fs.readFileSync('firebase.json','utf8')); const h=cfg.hosting; const rewrites=Array.isArray(h)?h.flatMap(x=>x.rewrites||[]):(h&&h.rewrites)||[]; const hit=rewrites.some(r=>/\\/rec\\//.test(r.source||'')); if(!hit){console.error('FAIL: firebase.json missing /rec/{recId} hosting rewrite');process.exit(1)} console.log('OK')\""

  - criterion: "Stream B / RecCardComposeScreen enforces 30-280 char note. Client-side validation + inline error banner (no modal)."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'); const p='screens/RecCardComposeScreen.tsx'; if(!fs.existsSync(p)){console.error('FAIL: RecCardComposeScreen missing');process.exit(1)} const src=fs.readFileSync(p,'utf8'); if(!/(30)[\\s\\S]{0,60}(280|note\\.length)/.test(src) && !/\\b30\\b[\\s\\S]{0,100}\\b280\\b/.test(src)){console.error('FAIL: RecCardComposeScreen must enforce 30-280 char note');process.exit(1)} if(/Alert\\.alert|Modal\\s+visible/i.test(src) && !/inline|Banner/i.test(src)){console.error('FAIL: RecCardCompose uses Alert/Modal instead of inline banner');process.exit(1)} console.log('OK')\""

  - criterion: "Stream B / createRec op in firebaseOperations.ts is typed + tested + enforces 30-280 char bounds at op layer."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); const src=fs.readFileSync('utils/firebaseOperations.ts','utf8'); if(!/export[\\s\\S]{0,80}?createRec/.test(src)){console.error('FAIL: createRec export missing');process.exit(1)} const walk=(d)=>{let r=[]; if(!fs.existsSync(d)) return r; for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.isDirectory()) r=r.concat(walk(path.join(d,e.name))); else if(/\\.test\\.tsx?$/.test(e.name)) r.push(path.join(d,e.name))} return r}; const tests=walk('.').filter(f=>!f.includes('node_modules')); const hit=tests.some(t=>/createRec/.test(fs.readFileSync(t,'utf8'))); if(!hit){console.error('FAIL: createRec not tested');process.exit(1)} console.log('OK')\""

  # ======================================================================
  # STREAM C — AI surfaces (pasted ~verbatim from brief §7 verify_commands)
  # ======================================================================

  - criterion: "Stream C / Prompt-shape check — system-prompt source files contain the required guard tokens."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'); const a=fs.existsSync('utils/ai/prompts/whyYouMatch.ts')?fs.readFileSync('utils/ai/prompts/whyYouMatch.ts','utf8'):''; const b=fs.existsSync('utils/ai/prompts/recCopy.ts')?fs.readFileSync('utils/ai/prompts/recCopy.ts','utf8'):''; const src=a+'\\n'+b; const tokens=['second person','present tense','No exclamation','bridge-framed','10 and 22 words','name at least ONE','Between 10 and 22','EXACTLY 3 variants','30 and 280 characters']; const hits=tokens.filter(t=>src.includes(t)); if(hits.length<8){console.error('FAIL: prompt guard tokens — only',hits.length,'of',tokens.length,'present. Need >=8');process.exit(1)} console.log('OK',hits.length,'of',tokens.length)\""

  - criterion: "Stream C / Model ID pinned — caller references claude-haiku-4-5-20251001."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); const walk=(d)=>{let r=[]; if(!fs.existsSync(d)) return r; for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.isDirectory()) r=r.concat(walk(path.join(d,e.name))); else if(/\\.(ts|tsx)$/.test(e.name)) r.push(path.join(d,e.name))} return r}; const files=walk('utils/ai'); const hit=files.some(f=>fs.readFileSync(f,'utf8').includes('claude-haiku-4-5-20251001')); if(!hit){console.error('FAIL: claude-haiku-4-5-20251001 not pinned in utils/ai/');process.exit(1)} console.log('OK')\""

  - criterion: "Stream C / Cache module exists at expected path and exports the 3 API functions."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'); const p='utils/ai/cache.ts'; if(!fs.existsSync(p)){console.error('FAIL: utils/ai/cache.ts missing');process.exit(1)} const src=fs.readFileSync(p,'utf8'); const need=['getFromCache','setInCache','buildCacheKey']; const missing=need.filter(n=>!new RegExp('export[\\\\s\\\\S]{0,80}?(async\\\\s+)?function\\\\s+'+n).test(src) && !new RegExp('export\\\\s+const\\\\s+'+n).test(src)); if(missing.length){console.error('FAIL: cache.ts missing exports:',missing.join(', '));process.exit(1)} console.log('OK')\""

  - criterion: "Stream C / Cost ceiling enforcement — MAX_DAILY_LLM_COST_USD read in caller (ratified $25 default)."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); const walk=(d)=>{let r=[]; if(!fs.existsSync(d)) return r; for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.isDirectory()) r=r.concat(walk(path.join(d,e.name))); else if(/\\.(ts|tsx)$/.test(e.name)) r.push(path.join(d,e.name))} return r}; const refs=walk('utils/ai').filter(f=>/MAX_DAILY_LLM_COST_USD/.test(fs.readFileSync(f,'utf8'))); if(refs.length<2){console.error('FAIL: MAX_DAILY_LLM_COST_USD references — need >=2 (one read + one default), got',refs.length);process.exit(1)} console.log('OK')\""

  - criterion: "Stream C / Structured output — Anthropic SDK tool-use, not freeform JSON.parse."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); const walk=(d)=>{let r=[]; if(!fs.existsSync(d)) return r; for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.isDirectory()) r=r.concat(walk(path.join(d,e.name))); else if(/\\.(ts|tsx)$/.test(e.name)) r.push(path.join(d,e.name))} return r}; const files=walk('utils/ai'); const toolUse=files.filter(f=>{const s=fs.readFileSync(f,'utf8'); return /tool_choice|tools:\\s*\\[|input_schema/.test(s)}).length; if(toolUse<3){console.error('FAIL: structured output markers — need >=3 (tools array + tool_choice), got',toolUse);process.exit(1)} const freeform=files.filter(f=>/JSON\\.parse\\(response\\.content/.test(fs.readFileSync(f,'utf8'))); if(freeform.length){console.error('FAIL: freeform JSON.parse on response.content:',freeform.join(', '));process.exit(1)} console.log('OK')\""

  - criterion: "Stream C / Rec-copy char-length enforcement — runtime assertion exists."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); const walk=(d)=>{let r=[]; if(!fs.existsSync(d)) return r; for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.isDirectory()) r=r.concat(walk(path.join(d,e.name))); else if(/\\.(ts|tsx)$/.test(e.name)) r.push(path.join(d,e.name))} return r}; const files=walk('utils/ai'); const hits=files.filter(f=>/variant\\.length\\s*(>=|>)\\s*30|variant\\.length\\s*(<=|<)\\s*280|assertRecCopyVariant|assertRecCopyBatch/.test(fs.readFileSync(f,'utf8'))); if(hits.length<2){console.error('FAIL: need >=2 refs to 30/280 length or assertRecCopy*; got',hits.length);process.exit(1)} console.log('OK')\""

  - criterion: "Stream C / Strict PII — LLM prompt sanitizer strips displayName/email/phone/uid and wraps in <input> delimiter."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'); const p='utils/ai/pii.ts'; if(!fs.existsSync(p)){console.error('FAIL: utils/ai/pii.ts missing — strict-PII sanitizer required per ratified decision');process.exit(1)} const src=fs.readFileSync(p,'utf8'); if(!/<input>/.test(src)){console.error('FAIL: pii.ts must wrap input in <input>...</input> delimiter');process.exit(1)} if(!/sanitizeLLMInput/.test(src)){console.error('FAIL: pii.ts must export sanitizeLLMInput');process.exit(1)} const fs2=require('fs'),path=require('path'); const walk=(d)=>{let r=[]; if(!fs2.existsSync(d)) return r; for(const e of fs2.readdirSync(d,{withFileTypes:true})){if(e.isDirectory()) r=r.concat(walk(path.join(d,e.name))); else if(/\\.(ts|tsx)$/.test(e.name)&&!/test/i.test(e.name)) r.push(path.join(d,e.name))} return r}; const ai=walk('utils/ai').filter(f=>!/pii\\.ts|validators|pricing|fallbacks|cache|spend/.test(f)); const leaks=ai.filter(f=>{const s=fs2.readFileSync(f,'utf8'); return /(displayName|email|phone|uid)\\s*:\\s*[a-zA-Z_]/.test(s) && !/displayLabel|placeholder|substitute/i.test(s)}); if(leaks.length){console.error('FAIL: potential PII leak into LLM caller:\\n'+leaks.join('\\n'));process.exit(1)} console.log('OK')\""

  - criterion: "Stream C / LLMClient interface exists at utils/ai/LLMClient.ts and is the import path everywhere (not Anthropic SDK types)."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); const p='utils/ai/LLMClient.ts'; if(!fs.existsSync(p)){console.error('FAIL: LLMClient.ts missing — Sprint 6 migration seam required');process.exit(1)} const src=fs.readFileSync(p,'utf8'); if(!/interface\\s+LLMClient/.test(src)){console.error('FAIL: LLMClient interface not declared');process.exit(1)} if(!/whyYouMatch/.test(src)||!/recCopy/.test(src)){console.error('FAIL: LLMClient interface missing whyYouMatch or recCopy');process.exit(1)} const walk=(d)=>{let r=[]; if(!fs.existsSync(d)) return r; for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name==='node_modules'||e.name==='ai') continue; const q=path.join(d,e.name); if(e.isDirectory()) r=r.concat(walk(q)); else if(/\\.(ts|tsx)$/.test(e.name)) r.push(q)} return r}; const callers=[...walk('screens'), ...walk('components'), ...walk('hooks')].filter(f=>/whyYouMatch|recCopy/i.test(fs.readFileSync(f,'utf8'))); const bad=callers.filter(f=>/from ['\\\"]@anthropic-ai/.test(fs.readFileSync(f,'utf8'))); if(bad.length){console.error('FAIL: UI layer imports Anthropic SDK directly instead of LLMClient:\\n'+bad.join('\\n'));process.exit(1)} console.log('OK')\""

  # ======================================================================
  # STREAM D — shared watch queues
  # ======================================================================

  - criterion: "Stream D / Queue ops in firebaseOperations.ts: createQueue + addTitleToQueue + reactToQueueTitle + markTitleWatched + listQueuesForUid, all typed + tested."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); const src=fs.readFileSync('utils/firebaseOperations.ts','utf8'); const need=['createQueue','addTitleToQueue','reactToQueueTitle','markTitleWatched','listQueuesForUid']; const missing=need.filter(n=>!new RegExp('export[\\\\s\\\\S]{0,80}?'+n).test(src)); if(missing.length){console.error('FAIL missing queue exports:',missing.join(', '));process.exit(1)} const walk=(d)=>{let r=[]; if(!fs.existsSync(d)) return r; for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.isDirectory()) r=r.concat(walk(path.join(d,e.name))); else if(/\\.test\\.tsx?$/.test(e.name)) r.push(path.join(d,e.name))} return r}; const tests=walk('.').filter(f=>!f.includes('node_modules')); const covered=need.filter(n=>tests.some(t=>fs.readFileSync(t,'utf8').includes(n))); if(covered.length<need.length){console.error('FAIL: untested queue ops:',need.filter(n=>!covered.includes(n)).join(', '));process.exit(1)} console.log('OK')\""

  - criterion: "Stream D / Firestore rule for /queues/{queueId} restricts reads/writes to participants; markTitleWatched requires nextPickUid === auth.uid."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'); const r=fs.readFileSync('firestore.rules','utf8'); if(!/\\/queues\\//.test(r) && !/queues\\//.test(r)){console.error('FAIL: firestore.rules missing /queues/ rule');process.exit(1)} if(!/participants/i.test(r) && !/queue/i.test(r)){console.error('FAIL: queues rule must check participants');process.exit(1)} if(!/nextPickUid|nextPick/i.test(r)){console.error('FAIL: queues rule must gate markWatched on nextPickUid');process.exit(1)} console.log('OK')\""

  # ======================================================================
  # STREAM E — shareable match-card image
  # ======================================================================

  - criterion: "Stream E / react-native-view-shot dependency installed (NOT Skia per ratified decision)."
    threshold: hard
    verify_command: "node -e \"const p=require('./package.json'); const deps={...p.dependencies}; if(!deps['react-native-view-shot']){console.error('FAIL: react-native-view-shot not installed');process.exit(1)} if(deps['@shopify/react-native-skia']){console.error('FAIL: @shopify/react-native-skia installed — ratified decision is view-shot only for 5b');process.exit(1)} console.log('OK')\""

  - criterion: "Stream E / MatchCard component exists + renders the 4 tier labels + shareMatchCard util exists."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'); if(!fs.existsSync('components/MatchCard.tsx')){console.error('FAIL: components/MatchCard.tsx missing');process.exit(1)} if(!fs.existsSync('utils/shareMatchCard.ts')){console.error('FAIL: utils/shareMatchCard.ts missing');process.exit(1)} const mc=fs.readFileSync('components/MatchCard.tsx','utf8'); const tiers=['Getting There','In Sync','Tight Loop','Soulmates']; const hits=tiers.filter(t=>mc.includes(t)); if(hits.length<4){console.error('FAIL: MatchCard missing tier labels; present:',hits.join(', '));process.exit(1)} const sh=fs.readFileSync('utils/shareMatchCard.ts','utf8'); if(!/react-native-view-shot/.test(sh)){console.error('FAIL: shareMatchCard.ts must import react-native-view-shot');process.exit(1)} console.log('OK')\""

  - criterion: "Stream E / MatchCard snapshot test exists with ±5% pixel-accuracy tolerance OR a structural snapshot test, and is NOT skipped."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); const walk=(d)=>{let r=[]; if(!fs.existsSync(d)) return r; for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.isDirectory()) r=r.concat(walk(path.join(d,e.name))); else if(/MatchCard.*\\.test\\.tsx?$/.test(e.name)) r.push(path.join(d,e.name))} return r}; const tests=walk('.').filter(f=>!f.includes('node_modules')); if(!tests.length){console.error('FAIL: no MatchCard test file');process.exit(1)} const src=fs.readFileSync(tests[0],'utf8'); if(/\\.skip\\s*\\(|xdescribe|xit\\b/.test(src)){console.error('FAIL: MatchCard test is skipped');process.exit(1)} if(!/toMatchSnapshot|toMatchInlineSnapshot|pixelmatch|tolerance/i.test(src)){console.error('FAIL: MatchCard test must assert snapshot or pixel-match');process.exit(1)} console.log('OK')\""

  # ======================================================================
  # CROSS-STREAM invariants
  # ======================================================================

  - criterion: "Cross-stream / Public profile invariant: displayName never appears in LLM prompt builder; private /users/{uid} root never joined across users for any Stream A/C/E surface."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); const walk=(d)=>{let r=[]; if(!fs.existsSync(d)) return r; for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name==='node_modules'||e.name==='__tests__') continue; const p=path.join(d,e.name); if(e.isDirectory()) r=r.concat(walk(p)); else if(/\\.(ts|tsx)$/.test(e.name)) r.push(p)} return r}; const prompts=walk('utils/ai'); const promptBuilders=prompts.filter(f=>/prompts\\//.test(f.replace(/\\\\/g,'/'))||/LLMClient|AnthropicLLMClient/.test(f)); let bad=[]; for(const f of promptBuilders){const src=fs.readFileSync(f,'utf8'); if(/displayName\\b/.test(src)&&!/displayLabel|substitute|post.?generation/i.test(src)){bad.push(f+' :: displayName leak into prompt path')}} if(bad.length){console.error('FAIL: strict-PII violation:\\n'+bad.join('\\n'));process.exit(1)} console.log('OK')\""

  - criterion: "Cross-stream / Runtime deps: @anthropic-ai/sdk + react-native-view-shot present; no @shopify/react-native-skia."
    threshold: hard
    verify_command: "node -e \"const p=require('./package.json'); const deps={...p.dependencies}; const must=['@anthropic-ai/sdk','react-native-view-shot']; const missing=must.filter(k=>!deps[k]); if(missing.length){console.error('FAIL missing runtime deps:',missing.join(', '));process.exit(1)} if(deps['@shopify/react-native-skia']){console.error('FAIL: Skia should not be installed (ratified: view-shot only)');process.exit(1)} console.log('OK')\""

design_criteria:
  - name: "Design Quality"
    weight: 30
    pass_threshold: 7
    rubric: |
      Score visual quality of 5b's NEW surfaces — MatchScoreChip, FriendCard,
      StoriesStrip, FriendDetailScreen, RecCardComposeScreen, QueueStrip,
      QueueDetailScreen, MatchCard — on 0-10 scale. Evaluator cites at least 3
      file:line observations for any score <8. Key rubric anchors:
      - 10 = 2026 flagship tier; chips feel native; dual-accent yellow/magenta
        on ink in MatchCard; all Sprint 4 theme + motion rules visibly honored.
      - 7 = confidently modern; tier labels + colors intentional; no theme drift.
      - <7 = visible theme drift or generic styling.

  - name: "Craft"
    weight: 25
    pass_threshold: 7
    rubric: |
      Staff-engineer polish across 5 streams. LLMClient interface properly
      isolates the SDK; cache + spend docs use transactions not reads-then-writes;
      validators have retry-then-fallback; view-shot capture handles the Android
      vs iOS density delta; match-score algorithm comments explain weight choices.
      - 10 = zero theme drift, migration idempotence preserved from 5a, snapshot
        fixtures reproducible, docs brief §7 verify-commands all green on first pass.
      - 7 = very few nits.
      - <7 = visible sloppiness (inline spring literals, ActivityIndicator
        regression, missing retry, JSON.parse on freeform content, etc.).
      Evaluator cites file:line for every craft nit below 8.

  - name: "Functionality"
    weight: 25
    pass_threshold: 8
    rubric: |
      Does 5b's behavior work end-to-end in the manual smoke?
      - 10 = Stream A match% renders ≤200ms; Stream B rec round-trips via
        Firebase Hosting preview; Stream C why-you-match renders <2s p95,
        rec-copy returns 3 variants <2s p95, $25 cap observed, fallback renders
        valid copy on forced budget-cap; Stream D queues support 5 participants
        with round-robin; Stream E match card generates <500ms and renders
        legibly on iMessage preview.
      - 8 = one minor gap described in ≤1 sentence.
      - <8 = any scoped behavior missing or broken → HARD_FAIL.

  - name: "Privacy Discipline"
    weight: 10
    pass_threshold: 8
    rubric: |
      Evaluator verifies:
      - 10 = LLM prompt never sees displayName/email/phone/uid; client-side
        displayLabel substitution works; /aiCache has no PII in keys (hashes
        only); /aiSpend has no uid; cost cap degrade returns deterministic
        fallback; Firestore rules for /aiCache + /queues + /recs correct;
        sanitizer strips {} <> backticks.
      - 8 = one minor leak covered by a follow-up commit.
      - <8 = any raw PII in prompt path or public surface → HARD_FAIL.

  - name: "AI Voice (Bridge-framed, not marketing)"
    weight: 10
    pass_threshold: 8
    rubric: |
      The hardest thing to measure: does the model's output voice hold?
      Evaluator runs 10 synthetic calls against each surface (mocked
      transport, real prompt):
      - 10 = why-you-match reads like a friend texting (per brief §2.4
        few-shot), 10-22 words, names ≥1 concrete taste attribute, no
        banned regex tokens (/compatib/, /top/, /more than/, /\\d+%/,
        /rank/, /score/, /most/). Rec-copy 3 variants feel distinct, each
        30-280 chars, no '!', no emoji, no duplicate-first-word.
      - 8 = one variant/sentence brushes the boundary but still passes
        regex + length checks; overall voice holds.
      - <8 = marketing drift, rank framing, or structural failure → HARD_FAIL.
      Evaluator cites the specific output line(s) for every score below 9.

success_criteria_manual:
  - criterion: "Manual iPhone smoke — 5b stream round-trip + Sprint 4/5a regression guard."
    threshold: hard
    verify_command: |
      manual: user runs `npx expo start --tunnel`, scans QR on iPhone Expo Go SDK 54,
      completes this checklist:

      Regression (Sprint 4/5a guard):
        1. App boots clean; auth works; deck renders; swipes work; DetailScreen works.
        2. Taste quiz + profile photo + contact onboarding flows still work per 5a.
        3. Empty states use Phosphor + tinted circle + ≤12 word body.
        4. Error paths render as INLINE banner, not modal.

      Stream A (match%):
        5. On Matches tab, friend cards show match% chip in one of the 4 tier labels.
        6. Tap a friend card → FriendDetailScreen shows big match% + tier label +
           "Why you match" slot (may show DotLoader briefly then Stream C fills it)
           + top 3 shared titles.

      Stream B (rec cards):
        7. From a DetailScreen, tap "Recommend" → compose screen opens. Required note
           enforced at 30-280 chars (try 20 chars → inline banner; try 300 → banner).
           Tap an AI-suggested line → note populates. Edit. Tap "Send" → share sheet
           opens with the `/rec/{recId}` URL.
        8. Paste the URL into Safari (still logged out) → preview page loads from
           Firebase Hosting with poster + sender name + note + install CTA.

      Stream C (AI):
        9. "Why you match" text appears ≤2s, reads bridge-framed (no "X% compatible"),
           mentions a concrete shared taste attribute. Sign out + in → cached path
           <500ms visible.
       10. AI rec-copy suggestions in compose screen: 3 distinct variants, none start
           with the same word, none contain "!", each 30-280 chars.

      Stream D (queues):
       11. Create a queue with 2 test accounts + add a title. Second account sees it
           in their QueueStrip above the swipe deck. Add a reaction emoji → it appears
           on the title. Mark watched → rotation advances nextPickUid.

      Stream E (match card):
       12. From FriendDetail, tap "Share match card" → generate completes ≤2s, native
           share sheet opens. Share to iMessage preview → both avatars + match % +
           tier label + top 3 overlap films are legible.

      Rules deployment (user task):
       13. `npx firebase deploy --only firestore:rules,firestore:indexes,storage,hosting`.
           Verify: queue rule rejects a non-participant's read; rec rule rejects a
           third party's read; /rec/{recId} route serves the preview HTML; aiCache
           doc reads work for authenticated users.

pivot_after_failures: 2

notes:
  - "Sprint 5b dispatches AFTER 5a evaluator-PASS (confirmed 2026-04-19 at commit 1053c44). Streams A/B/C/D are independent and MUST dispatch in parallel via superpowers:dispatching-parallel-agents. Stream E is SERIAL after Stream A because MatchCard renders real match-score data."
  - "Ratified decisions (from 2026-04-18 user session, logged in memory/project_sprint_5b_decisions.md) — DO NOT re-ask: (1) MAX_DAILY_LLM_COST_USD=$25, (2) rec-copy NON-streaming, (3) strict PII (no displayName in prompt), (4) 5-min prompt-cache TTL, (5) view-shot NOT Skia, (6) 4-tier labels as above."
  - "Per 5a handoff's 'ceremony to lighten' note: 5b collapses the 6 inherited Sprint 4/5a discipline checks into ONE composite verify (scripts/verify-sprint-5a.js, already exists). Individual Sprint 4 locks are still enforced by that script — we just stop listing them as 6 separate thresholds."
  - "Per 5a handoff: the AI brief is 3707 words; the evaluator SHOULD read only brief §7 (verify_commands) + §2.4 + §3.4 (few-shot voice anchors) + Appendix B (decisions already ratified). The contract above has all the operational rules the evaluator needs inline."
  - "LLM API key is CLIENT-SIDE for Sprint 5b via EXPO_PUBLIC_ANTHROPIC_API_KEY. Sprint 6 moves inference to Cloud Functions (brief §8) — the LLMClient interface is the migration seam. If the generator is tempted to wire server-side now, resist: it's out of scope and blocks 5b parallelism."
  - "The Sprint 5a matchScore.ts stub (always returns 0) has an intentional skip in Jest; Stream A MUST replace both the stub AND the .skip in one commit so tests don't pass trivially."
  - "Stream dispatch parallelism: the 5 streams touch largely disjoint files. Crossover risk zones: (a) `utils/firebaseOperations.ts` — Streams B + D both add ops; serialize their commits via lexicographic merge (B's ops come first, D's after). (b) `navigation/AppNavigator.tsx` — Streams A/B/D each add a route; each stream adds ONLY its own route, never reorders gates. (c) `package.json` — Streams C + E each add one dep; run `npm install` per stream, commit lockfile per stream."
  - "Manual smoke steps 5-13 extend Sprint 5a's 10-step checklist. User runs it in one session after evaluator-PASS on all streams."
  - "Commission a SEPARATE research subagent during 5b execution to produce docs/research/sprint-6-discovery-ux.md — category tabs redesign brief per memory/project_sprint_6_discovery_brief.md. Ships BEFORE Sprint 6 kickoff, not inside 5b."
  - "Stop at any genuine cross-stream blocker; write to docs/handoffs/sprint-5b.md and append to this contract in a small commit."

# ======================================================================
# Evaluator expectations
# ======================================================================
#
# 5 stream-scoped evaluators run in parallel once all generators report commits.
# Each evaluator:
#   - Reads this contract + brief §7 + §2.4/§3.4 few-shots + Appendix B.
#   - Runs the stream's verify_commands on the generator's commit range.
#   - Scores its subset of design_criteria against the rubric.
#   - Returns PASS / SOFT_FAIL / HARD_FAIL with at least 3 file:line observations
#     for any score below pass_threshold.
#
# Stream E evaluator runs AFTER Stream A evaluator PASSes, because E consumes A's
# MatchScoreChip + top-3 overlap output.
#
# Meta-evaluator: after all 5 stream evaluators return PASS, run a composite
# verify across the entire contract's hard thresholds + run the manual smoke
# (13 steps). Only then is Sprint 5b closed.
#
# Two consecutive HARD_FAILs on any single stream → escalate to planner for
# that stream's replan; other streams continue.
#
---

# Sprint 5b — Viral-core feature parallelism

## Context for the generators

Sprint 5a landed the backbone (commit range `b4f80be..1053c44`, 13 commits). Public
profile subcollection, friend graph, contact hashing, profile upload, rules files.
Manual smoke passed 2026-04-19. Read `docs/handoffs/sprint-5.md` FIRST — it documents
every decision that persists into 5b.

Sprint 5b ships the **5 viral features** in PARALLEL streams. Each stream has a
dedicated generator subagent. Streams A, B, C, D dispatch simultaneously; Stream E
dispatches serially after A lands because MatchCard consumes real match-score data.

**Your stream is specified in your dispatch prompt.** Stay inside your stream's
scope. If a change requires touching another stream's files, stop and note it in
`docs/handoffs/sprint-5b.md` — don't silently cross streams.

## Per-stream generator execution order

### Stream A — match% compute + display

1. Replace `utils/matchScore.ts` stub with real algorithm (dot product on axes +
   weighted overlap). Remove `.skip` from Jest.
2. `components/MatchScoreChip.tsx` + 4-tier label mapping.
3. `components/FriendCard.tsx` wire match% overlay.
4. `components/StoriesStrip.tsx` horizontal strip (create or extend).
5. `screens/FriendDetailScreen.tsx` + route wire in AppNavigator.

### Stream B — rec cards + compose sheet

1. Firestore rule for `/recs/{recId}` + `firebase.json` hosting rewrite for
   `/rec/{recId}`.
2. `screens/RecCardComposeScreen.tsx` with 30-280 char note + AI suggestions slot.
3. `components/RecCardShareSheet.tsx` + native Share integration.
4. `utils/firebaseOperations.ts` — add `createRec`.
5. DetailScreen extension — "Recommend" CTA.
6. Firebase Hosting public-preview HTML under `hosting/rec-preview.html` or
   equivalent (keep tiny — no framework).

### Stream C — AI surfaces (Haiku 4.5, non-streaming)

1. `utils/ai/LLMClient.ts` interface.
2. `utils/ai/prompts/whyYouMatch.ts` + `recCopy.ts` (verbatim from brief §2.1 + §3.1).
3. `utils/ai/validators.ts` + `fallbacks.ts` + `pricing.ts` + `pii.ts`.
4. `utils/ai/cache.ts` + `spend.ts` (Firestore, transactional increment, version-
   prefixed keys).
5. `utils/ai/impl/AnthropicLLMClient.ts` — Anthropic SDK + tool-use + non-streaming.
6. `hooks/useWhyYouMatch.ts` + `hooks/useRecCopy.ts` (DotLoader policy, 180ms
   cross-fade, never swap after 2000ms).
7. Env config: `.env.example` + README note.
8. Tests for validators/cache/pii + `latency.bench.ts`.

### Stream D — shared watch queues

1. Firestore rule for `/queues/{queueId}`.
2. `utils/firebaseOperations.ts` — queue ops.
3. `components/QueueStrip.tsx` + Home integration.
4. `screens/QueueDetailScreen.tsx` + reactions + mark-watched.

### Stream E — shareable match-card image (SERIAL)

1. `package.json` — add `react-native-view-shot`.
2. `components/MatchCard.tsx` — 9:16 layout with dual-accent gradient + both
   avatars + match% + tier label + top 3 overlap titles.
3. `utils/shareMatchCard.ts` — view-shot capture + native Share.
4. `components/__tests__/MatchCard.test.tsx` — snapshot (pixel or structural) at
   ±5% tolerance.
5. `screens/FriendDetailScreen.tsx` — "Share match card" CTA (tertiary).

## Generator rules (per stream)

- Commit per logical chunk, conventional-commits with stream marker:
  `feat(sprint-5b/A): add MatchScoreChip` etc.
- `npx tsc --noEmit && npx eslint . && npx prettier --check . && npm test -- --ci`
  before every commit.
- Zero new `any` in `utils/` or `services/`.
- Do NOT do another stream's work.
- Do NOT wire server-side LLM inference (Sprint 6).
- Stop at any genuine blocker; append a note to `docs/handoffs/sprint-5b.md`
  and this contract in a small commit.

## Evaluator expectations (5 parallel + 1 composite)

Each stream evaluator runs after its generator reports commits, on the commit
range scoped to that stream (via `git log --grep 'sprint-5b/<stream>'`).

1. Read this contract + brief §7 + §2.4/§3.4 few-shots + Appendix B.
2. Run the stream's verify_commands. Report pass/fail with evidence.
3. For each design_criterion relevant to your stream: score 0-10. <pass = HARD_FAIL.
4. Return PASS / SOFT_FAIL / HARD_FAIL with ≥3 file:line observations below 8.

After all 5 stream evaluators PASS, composite evaluator re-runs the full verify
suite + kicks off the 13-step manual smoke with the user. Sprint 5b closes only
after the composite + manual smoke pass.

Two consecutive HARD_FAILs on any single stream → escalate to planner for
that stream's replan; other streams continue independently.
