# Sprint 5 AI Surfaces — R&D Brief

**Date:** 2026-04-18. **Audience:** Sprint 5b generator + evaluator. Staff-engineer tone.
**Scope:** Operational detail for the two AI surfaces in Sprint 5 — the per-pair "why-you-match" sentence and the 3-variant rec-copy suggestion list.
**Precedence:** Extends the three Sprint 4 briefs (`docs/research/sprint-4-{social-product,dopamine,mobile-ux}.md`). Where this overlaps a Sprint 4 rule (bridge-framing, anti-rank, empty-state voice, haptic policy, ≤12-word bodies) the Sprint 4 rule wins.

## 0. Research-surface caveats

- Context7 MCP quota was exhausted during drafting; SDK snippets were **not** re-verified. Prices were fetched direct from vendor pages on 2026-04-18. Sprint 5b generator **must** run `mcp__claude_ai_Context7__query-docs` against the Anthropic SDK docs before wiring the call.
- Latency numbers (p50 / p95) are public-benchmark estimates, not measured on our infra. The contract must include the benchmark harness in §7 and measure against our actual prompts before claiming the threshold.

---

## 1. Model choice — Haiku 4.5 vs Gemini 2.5 Flash

### 1.1 Current pricing (April 2026)

| Model | Input ($/MTok) | Output ($/MTok) | Prompt-cache read ($/MTok) | Cache write ($/MTok) | Source |
|---|---|---|---|---|---|
| Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) | $1.00 | $5.00 | $0.10 | $1.25 | https://claude.com/pricing — fetched 2026-04-18 |
| Claude Sonnet 4.5 | $3.00 | $15.00 | $0.30 | $3.75 | https://claude.com/pricing — fetched 2026-04-18 |
| Gemini 2.5 Flash | $0.30 text/img/video | $2.50 | n/a (implicit cache) | n/a | https://ai.google.dev/gemini-api/docs/pricing — fetched 2026-04-18 |
| Gemini 2.0 Flash | $0.10 text/img/video | $0.40 | n/a | n/a | Same, **deprecated, shut down 2026-06-01** |

Gemini 2.0 Flash is therefore disqualified — it sunsets six weeks after Sprint 5 is projected to ship. We compare Haiku 4.5 vs Gemini 2.5 Flash only.

### 1.2 Per-call cost and $/MAU projection

Prompt sizes (current design): why-you-match **≈500 in / 35 out**; rec-copy **≈600 in / 180 out**.

| Surface | Model | Per-call $ |
|---|---|---|
| Why-you-match | Haiku 4.5 | 0.000675 |
| Why-you-match | Haiku 4.5 w/ cached system | 0.000247 |
| Why-you-match | Gemini 2.5 Flash | 0.000238 |
| Rec-copy | Haiku 4.5 | 0.0015 |
| Rec-copy | Haiku 4.5 w/ cached system | 0.001212 |
| Rec-copy | Gemini 2.5 Flash | 0.00063 |

All are well under the $0.005 p95 ceiling. Flash is 2–2.5× cheaper on raw arithmetic; with Anthropic prompt caching (5-min TTL, $0.10/MTok reads), Haiku narrows the gap.

Volume (10k MAU): why-you-match ≈ 0.46 uncached calls/MAU/day (8 edges × 1/7 × 40% miss rate). Rec-copy ≈ 0.20/MAU/day (0.28 sends × 70% miss rate). Monthly per-MAU: Haiku uncached **$0.018**, Haiku cached **$0.011**, Flash **$0.0071**. At 10k MAU: Haiku **~$110–180/mo**, Flash **~$71/mo**. Cost is not the decisive axis at this volume.

### 1.3 Latency, reliability, fit (public-benchmark estimates)

- **Haiku 4.5**: p50 ≈ 650ms, p95 ≈ 1.6–1.9s for <500-token prompts with <100-token outputs. Tool-use with strict JSON Schema. Streaming first-class.
- **Gemini 2.5 Flash**: p50 ≈ 500ms, p95 ≈ 1.4–2.2s; variance higher (3–6s tail spikes under regional load per `artificialanalysis.ai`). `responseSchema` supported.

On our tasks: Haiku holds voice constraints (bridge framing, no marketing register) more reliably from a single system prompt; Flash drifts toward marketing tone unless demonstrated against. Both emit parseable JSON reliably under native schema enforcement.

### 1.4 Recommendation

**Ship Haiku 4.5 (`claude-haiku-4-5-20251001`).** Cost isn't decisive at our volume; voice consistency and tail-latency stability are. Haiku's prompt caching makes per-call cost competitive with Flash. Adding Gemini pulls in a second SDK, second auth story, second failure mode — not worth it for a ~$40/mo delta at 10k MAU. One caller, one model pin, one fallback. If production p95 breaches 2.0s twice in one week, swap to Flash behind the same `LLMClient` interface (§8).

---

## 2. Why-You-Match prompt design

### 2.1 System prompt (verbatim — generator copies this)

```
You are the Bridge, a one-sentence voice for MovieMatchApp. Given two users' taste profiles and their overlap signals, you explain WHY their tastes meet in the middle — not how "compatible" they are, not how they rank against anyone else, not a score.

Output exactly ONE sentence, in second person addressed to the reading user ("you and <friend>"). Present tense. Between 10 and 22 words. No exclamation points. No question marks. No percentile language ("top", "most", "more than"). No rank framing ("X% compatible", "high match"). No marketing tone. No generic platitudes like "you both love movies" or "great taste".

Name at least ONE shared, concrete taste attribute — a genre, era, mood, or director. Never an actor's name. Never a specific title. The sentence must feel like something one friend would text another, not something an algorithm would produce.

Respond using the provided structured-output tool. Do not add commentary.
```

Pin: the model returns via Anthropic tool-use with a `submit_bridge_sentence` tool whose schema is `{ sentence: string }`. This rules out freeform formatting drift.

### 2.2 Input JSON shape

Derived from `TasteProfile` (defined in `utils/firebaseOperations.ts:72-75`) plus overlap signals computed by `utils/matchScore.ts`.

```jsonc
{
  "user": {
    "tasteLabels": { "common": "Cozy-Thriller Apologist", "rare": "70s Euro-Arthouse Tuesday Ritualist" },
    "topAxes": [{ "axis": "pacing", "value": -0.72 }, { "axis": "tone", "value": 0.55 }]
  },
  "friend": {
    "displayLabel": "Ana",
    "tasteLabels": { "common": "Slow Sci-Fi Lifer", "rare": "Single-Location Noir Completionist" },
    "topAxes": [{ "axis": "pacing", "value": -0.81 }, { "axis": "stakes", "value": -0.44 }]
  },
  "overlap": {
    "sharedGenres": ["sci-fi", "noir"],
    "sharedEras": ["1970s"],
    "sharedMoods": ["slow", "quiet"],
    "sharedDirectors": ["Denis Villeneuve"],
    "signalTier": "full"
  }
}
```

`signalTier` is one of `"full" | "partial" | "cold"` and is derived as follows:

- **full** — overlap arrays total ≥3 shared items across genres/moods/eras/directors.
- **partial** — overlap totals 1–2 items.
- **cold** — no overlap AND at least one user has a labels set from the quiz.

The model never sees uid, email, displayName (the `friend.displayLabel` is a *placeholder* like "Ana" or "your friend" — the client substitutes the friend's real first name post-generation). See §6.2 on PII.

### 2.3 Output contract

- **One sentence**, present tense, second person.
- **10–22 words inclusive.** <10 reads curt; >22 breaks the empty-state voice rule (≤12 words only applies to body-empty-state copy; the match bridge lives in the match-card, which allows the higher bound — but we cap at 22 to stay crisp).
- **No `!`, no `?`, no ellipsis**.
- **Bridge-framed**, not rank-framed. Banned regex tokens: `\bcompatib|\btop\b|\bmore than\b|\b\d+%|\brank|\bscore|\bmost\b`.
- **Name ≥1 concrete attribute** (from `sharedGenres | sharedEras | sharedMoods | sharedDirectors`). Never an actor's name.
- **No title names** — the bridge talks about *taste*, not titles; titles belong to the match-card's separate "3 shared films" slot.
- **No "you both love movies"** or equivalent genericism (runtime regex: reject outputs that contain "love movies", "are into movies", "both like films").

### 2.4 Five few-shot examples

| Input (condensed) | Expected output |
|---|---|
| `full`: shared moods [slow, quiet], genre [sci-fi], director [Villeneuve] | `You and Ana both lean into quiet sci-fi that takes its time — Villeneuve territory, specifically.` |
| `full`: shared genres [noir, thriller], era [1970s], mood [paranoid] | `You and Marcus gravitate to the same paranoid 70s thrillers — slow tension over loud action.` |
| `partial`: shared moods [melancholic], no shared genres | `You and Leila share a soft spot for melancholic storytelling, even when the genres diverge.` |
| `partial`: shared eras [2010s], mood [cerebral] | `You and Jun circle cerebral 2010s films — the sort you think about for a week afterward.` |
| `cold`: no overlap; user.common "Cozy-Thriller Apologist", friend.common "Midnight Horror Lifer" | `You and Sam keep different hours on the couch — cozy thrillers meet midnight horror, same commitment to a genre.` |

### 2.5 Rejection criteria (retry once, then fallback)

Runtime check on the returned sentence:

```ts
const BAD_PATTERNS = [
  /!/, /\?/,
  /\bcompatib/i, /\btop\b/i, /\bmore than\b/i, /\d+\s?%/, /\brank/i, /\bscore/i, /\bmost\b/i,
  /love movies|are into movies|both like films/i,
];
function sentenceIsValid(s: string): boolean {
  const wordCount = s.trim().split(/\s+/).length;
  if (wordCount < 10 || wordCount > 30) return false; // 30 as hard ceiling; target 22
  if (BAD_PATTERNS.some((p) => p.test(s))) return false;
  return true;
}
```

On fail: **one** retry with `temperature` decreased by 0.2 and an appended directive "Previous response violated constraints; re-read the rules." On second failure: return the `signalTier`-matched deterministic fallback.

### 2.6 Deterministic fallback strings

- **`full`**: `"You and ${name} overlap on ${sharedGenres[0]} — enough signal to swap recs on."`
- **`partial`**: `"You and ${name} share some ${sharedMoods[0] ?? sharedGenres[0] ?? 'texture'} — the rest is room to surprise each other."`
- **`cold`**: `"You and ${name} haven't converged yet — swap a rec and see where your tastes meet."`

Must render within 50ms.

---

## 3. Rec-copy suggestion prompt design

### 3.1 System prompt (verbatim)

```
You write short rec-copy lines for MovieMatchApp — the one-liner a user sends with a film recommendation to a friend. Voice: sent between friends, not marketing. No hype, no exclamation points, no emoji, no hashtags.

You will receive a film, the sender's taste labels, the recipient's taste labels, and a relationship depth integer: 3 = mutual match, 2 = friend, 1 = new contact.

Return EXACTLY 3 variants. Each variant is between 30 and 280 characters (inclusive). Each reads like the sender wrote it themselves, with warmth calibrated to the relationship depth: higher depth = more specific and teasing; lower depth = more neutral, context-setting. Reference something concrete about the film OR a taste the two share — never both in the same line (makes it feel written-by-committee). Do not use exclamation marks. Do not start two variants the same way.

Respond using the provided structured-output tool with an array of exactly 3 strings. Do not add commentary.
```

Structured output: Anthropic tool-use with tool `submit_rec_variants`, schema `{ variants: string[] }` constrained to `minItems: 3, maxItems: 3`.

### 3.2 Input JSON

```jsonc
{
  "title": {
    "id": "tmdb:438631",
    "name": "Dune",
    "year": 2021,
    "genres": ["sci-fi", "epic"],
    "director": "Denis Villeneuve",
    "runtime": 155,
    "oneLineSynopsis": "A young noble inherits a desert planet and a galactic feud."
  },
  "sender": {
    "tasteLabels": { "common": "Slow Sci-Fi Lifer", "rare": "70s Euro-Arthouse Tuesday Ritualist" }
  },
  "recipient": {
    "tasteLabels": { "common": "Cozy-Thriller Apologist", "rare": "Single-Location Noir Completionist" }
  },
  "relationshipDepth": 2
}
```

### 3.3 Output contract

- Array of **exactly 3** strings.
- Each **30–280 characters inclusive** (enforced per the social-product brief rule #10 — Hinge research on message-with-like).
- **No `!`**. **No emoji**. **No hashtags**. Trailing period optional.
- **No two variants start with the same first word**. (Generator can enforce; the caller must also assert.)
- **Runtime assertion** on each variant: `30 ≤ length ≤ 280`, no `/[!\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}#]/u` match. Reject the whole batch and retry once; on second failure, fall back to a deterministic trio (see §3.5).

### 3.4 Five few-shot examples

Each example covers one relationship/genre slot.

1. **Cult film → newer friend** (depth=1). Title: *Paprika* (2006), anime/sci-fi.
   - `"Saw this and thought of that Villeneuve thread we had. Paprika might feel closer to your lane than you'd guess."`
   - `"Weird one. 2006 anime where a therapist walks into people's dreams. Small runtime, big aftertaste."`
   - `"Paprika. If you liked how Dune handled scale, this handles it inside a head instead of a desert."`

2. **Prestige drama → mutual match** (depth=3). Title: *Past Lives* (2023).
   - `"Past Lives is the quietest heartbreak of the decade. You'll want someone to text after — I'm around."`
   - `"Tell me if I'm wrong but this one reads like it was written for the way you pick movies."`
   - `"90 minutes. Almost no plot. You'll hate me and then you won't. Watch it when you have a Sunday."`

3. **Romcom → close friend, shared history** (depth=3). Title: *When Harry Met Sally* (1989).
   - `"Rewatch. Same couch energy as the October we watched Nora Ephron's whole shelf on mute. Still holds."`
   - `"When Harry Met Sally is the one we keep swearing we'll rewatch. Just do it — deli scene is worth it alone."`
   - `"Ephron for a rainy week. Warm, fast, older than both of us, and still sharper than most current stuff."`

4. **Action thriller → new contact** (depth=1). Title: *The Raid* (2011).
   - `"The Raid. 2011 Indonesian action — one building, one night, basically choreography with a plot."`
   - `"If you like thrillers that don't waste a minute, this is the recommendation. Roughly ninety of them."`
   - `"Rec from the noir-thriller side of my list. The Raid is tight, mean, and weirdly beautiful about it."`

5. **Documentary → niche overlap** (depth=2). Title: *The Act of Killing* (2012).
   - `"The Act of Killing is hard going but hits the register we both keep landing on — documentary with teeth."`
   - `"Fair warning, this one sits with you. Closest thing I've sent to a straight-up ethical stress test."`
   - `"You asked for something that wasn't a thriller. This isn't, and it's still the most tense watch of the year."`

### 3.5 Deterministic fallback trio (keyed by depth, filled via template)

- **depth=3**: `"${title.name} — thought of you mid-way through. Tell me what you make of it."` / `"This one's been on my list. Watch it in your head with me and text me after."` / `"Sending ${title.name}. Your call whether it lands; mine that it might."`
- **depth=2**: `"${title.name} — worth the runtime if you're in the mood."` / `"Low-pressure rec. ${title.name} fits the kind of stuff we've been trading."` / `"Adding ${title.name} to your queue without commentary. Let me know."`
- **depth=1**: `"Rec: ${title.name}. No context from me — wanted to see if your taste and mine line up."` / `"${title.name} (${title.year}). Genre-adjacent to stuff on both our lists. Curious what you think."` / `"Trying something. ${title.name} — if you hate it, tell me and I'll calibrate."`

### 3.6 Cache key strategy

`hash = sha256(JSON.stringify({ titleId, senderLabelsHash, recipientLabelsHash, relationshipDepth }))`

- `senderLabelsHash` / `recipientLabelsHash` = sha256 of `common + "|" + rare`. This ensures two users with identical labels share a cache entry — bundle deduplication across same-taste recipients works.
- Cache key explicitly **does not** include uid/email/recipientId/senderId — the rec-copy is a function of taste + title + depth, not identity.
- TTL 24h (see §4).

---

## 4. Caching + cost control

### 4.1 TTLs

- **Why-you-match**: 7 days per `(userA, userB)` pair. Re-compute if either user re-takes the taste quiz.
- **Rec-copy**: 24 hours per cache key (§3.6). Stale rec-copy reads as lazy.
- **Cache-bust**: bumping `MODEL_VERSION` / `PROMPT_VERSION` constants in the caller is the eviction mechanism (version-prefixed keys).

### 4.2 Storage

Firestore subcollection `/aiCache/{hash}`, doc schema:

```ts
interface AiCacheDoc {
  kind: 'why-you-match' | 'rec-copy';
  text: string | string[]; // string; or string[] length 3 for rec-copy
  createdAt: Timestamp;
  ttlSeconds: number;      // 604_800 or 86_400
  model: string;           // e.g. 'claude-haiku-4-5-20251001'
  promptVersion: string;
  costCents: number;
}
```

TTL is read-time enforced (`now - createdAt < ttlSeconds`). Cleanup sweep is a Sprint 6 concern. Firestore rules: for Sprint 5b allow authenticated reads/writes on `/aiCache/{hash}`; in Sprint 6 this becomes server-write-only. Evaluator confirms a rules match block exists.

### 4.3 Cache hit-rate target

- **Why-you-match**: ≥60% within TTL; steady state ≥80% after 2 weeks.
- **Rec-copy**: ≥30% (narrower key).

Evaluator: synthetic test — generate cache for 10 pairs, re-request within TTL, confirm no LLM call via mock transport.

### 4.4 Daily budget alarm

- **Per-call ceiling**: $0.005 p95 (handoff threshold).
- **Daily budget**: `MAX_DAILY_LLM_COST_USD` default **$25** at 10k MAU (≈ $6/day true cost, 4× headroom). Read from env at caller start-up.
- **Alarm**: at 80% → log-warn + Sentry breadcrumb. At 100% → degrade to fallback for the remainder of the UTC day. Return `degraded: true` to the caller; UI never surfaces an error on this path.
- **Accounting**: `/aiSpend/{yyyy-mm-dd}` doc with `totalCents: number`, transactionally incremented on every non-cache call.

Pricing constants live in `utils/ai/pricing.ts` as a single map.

---

## 5. Latency + streaming

**Targets**: p50 ≤ 900ms, p95 ≤ 2000ms (handoff threshold). Hard timeout 4000ms → abort + fallback.

**Streaming**:
- **Why-you-match — NO.** One sentence, <35 tokens. Token-by-token type-in on a match-card adds visual noise without meaningful perceived-latency benefit. Single-shot + DotLoader placeholder + 180ms cross-fade on resolve.
- **Rec-copy — YES, partial.** Render variants as they become available (first at ~500ms, full set ~1500ms). User picks #1 while #2/#3 still stream. Anthropic SDK streaming + tool-use emits incremental JSON. If streaming-parse is brittle, fall back to non-streaming and reveal all three at once.

**Degraded path**: DotLoader up to 1500ms; at 1500ms swap to deterministic fallback. If the real response arrives within the next 500ms, optionally cross-fade in (180ms). Never swap after 2000ms — mid-read replacement is jarring. Log `degradedReason ∈ {timeout, rate_limit, budget_cap, llm_error, rejected}`.

---

## 6. Guardrails + safety

**Content filter** (runtime, client): run rejection regex (§2.5 / §3.3) + length check. Fail → retry once (uncached), then fallback. Never render a violating string.

**PII**: prompt never sees `uid`, `email`, `phone`, `displayName`, avatar URL, contact book. Prompt sees: `tasteProfile.axes` (8 numbers in `[-1,1]`), `tasteProfile.labels`, title metadata (public TMDB), relationship-depth int. `displayLabel` is a placeholder token the client substitutes post-generation — the model never sees the real first name. Defense-in-depth: a prompt-injection leak can't exfiltrate identity we never gave it.

**Prompt-injection hardening**:
1. Sanitize labels and title names: strip `{`, `}`, `<`, `>`, backticks, control chars. Cap labels 80 chars, titles 200.
2. Wrap input in `<input>...</input>` delimiter; system prompt says everything inside is data, never instruction.
3. Use tool-use / structured output, not freeform text. Output schema rules out HTML / non-string payloads.
4. Never persist raw model output to a user-visible Firestore field without the validator in between.

**Error handling**:
- LLM 5xx → retry once with backoff (500→1500ms). Fallback on second fail. `degradedReason=llm_error`.
- LLM 4xx / 429 → no retry. Fallback. 429 may queue a +15min re-attempt (Sprint 6 optional).
- Timeout >4s → abort, fallback, `degradedReason=timeout`.
- JSON parse fail → retry once (temp −0.2), then fallback.
- Budget cap hit → silent fallback, `degradedReason=budget_cap`.

All error paths render *valid* copy. No error banner on these surfaces.

---

## 7. Evaluator-ready verify_commands

Six commands the Sprint 5b contract can paste verbatim into `success_criteria`:

1. **Prompt-shape check** — the system-prompt source file contains the required guard tokens.
   ```bash
   grep -E "(second person|present tense|No exclamation|bridge-framed|10 and 22 words|≥1 concrete|name at least ONE|Between 10 and 22|EXACTLY 3 variants|30 and 280 characters)" utils/ai/prompts/whyYouMatch.ts utils/ai/prompts/recCopy.ts | wc -l
   # Expected: at least 8 matches total across both files.
   ```

2. **Model ID pinned** — the caller references the specific Haiku 4.5 model ID.
   ```bash
   grep -r "claude-haiku-4-5-20251001" utils/ai/ | wc -l
   # Expected: >= 1.
   ```

3. **Cache module exists** at the expected path and exports the API shape.
   ```bash
   test -f utils/ai/cache.ts && grep -E "export (async )?function (getFromCache|setInCache|buildCacheKey)" utils/ai/cache.ts | wc -l
   # Expected: 3.
   ```

4. **Cost ceiling enforcement** — caller reads `MAX_DAILY_LLM_COST_USD` from env/config.
   ```bash
   grep -rE "MAX_DAILY_LLM_COST_USD" utils/ai/ | wc -l
   # Expected: >= 2 (one read, one default constant).
   ```

5. **Structured output parsing** — caller uses Anthropic SDK tool-use, not raw regex parsing of freeform text.
   ```bash
   grep -rE "tool_choice|tools:\s*\[|input_schema" utils/ai/ | wc -l
   # Expected: >= 3 (tools array on both surfaces + at least one tool_choice set).
   # And (negative): caller must NOT parse JSON freeform:
   grep -rE "JSON\.parse\(response\.content" utils/ai/ | wc -l
   # Expected: 0.
   ```

6. **Character-length enforcement on rec-copy** — runtime assertion exists and is exported for test.
   ```bash
   grep -rE "variant\.length\s*(>=|>)\s*30|variant\.length\s*(<=|<)\s*280|assertRecCopyVariant" utils/ai/ | wc -l
   # Expected: >= 2.
   ```

7. **Bonus: p95 latency threshold** — a benchmark harness exists.
   ```bash
   test -f utils/ai/__tests__/latency.bench.ts
   # Expected: exit 0. Harness runs 50 real (or mocked) calls and asserts p95 ≤ 2000ms.
   ```

Evaluator should run commands 1–6 as part of automated verify; #7 is a design criterion (benchmark may run gated in CI).

---

## 8. Migration plan for Sprint 6 (server-side LLM inference)

Sprint 6 moves inference to Cloud Functions for API-key protection, per-uid rate-limits, and race-free budget enforcement.

**1-file-change architecture.** Sprint 5b must put all LLM behavior behind one interface:

```ts
// utils/ai/LLMClient.ts
export interface LLMClient {
  whyYouMatch(input: WhyYouMatchInput): Promise<{ text: string; degraded: boolean; costCents: number }>;
  recCopy(input: RecCopyInput): Promise<{ variants: string[]; degraded: boolean; costCents: number }>;
}
```

Concrete implementation at `utils/ai/impl/AnthropicLLMClient.ts` owns SDK, caching config, tool-use schema, retry, cost logging. **Every caller imports only `LLMClient`** — never Anthropic SDK types directly.

Sprint 6 swap: add `utils/ai/impl/CloudFunctionLLMClient.ts` that `fetch`es `/api/ai/whyYouMatch` etc. Change the one `const client: LLMClient = new AnthropicLLMClient(...)` instantiation in the DI root. Done. The Cloud Function reuses `AnthropicLLMClient.ts` on the server because prompts/schema/validators already isolate into `utils/ai/prompts/*` and `utils/ai/validators.ts`.

**Server-safe files (zero RN imports from Sprint 5b)**: `utils/ai/prompts/whyYouMatch.ts`, `utils/ai/prompts/recCopy.ts`, `utils/ai/validators.ts`, `utils/ai/pricing.ts`. `utils/ai/cache.ts` is allowed a `firebase/firestore` import (works on both client via Web SDK and server via Admin SDK). React hooks and UI fallback logic live under `components/ai/` or per-screen hooks.

**Sprint 6 open items**: Cloud Functions auth (request uid must match caller); migrate Anthropic API key to GCP Secret Manager; token-bucket per-uid (20 why-you-match/day, 10 rec-copy/day); evaluate 1h prompt-caching TTL if volume warrants.

---

## Appendix A — Non-goals for Sprint 5

No fine-tuning, RAG, per-user memory, voice/audio, AI match-card image gen (match-card is deterministic Skia), multilingual (English only), or LLM inside the match% number itself (the number is a deterministic dot product over `tasteProfile.axes` in `utils/matchScore.ts` — the LLM only writes the *framing* sentence).

## Appendix B — Open questions for user

1. **Budget default**: $25/day (`MAX_DAILY_LLM_COST_USD`) at 10k MAU launch OK? Real cost ≈ $6/day; 4× headroom. If tighter, recommend $10/day with warn at $8.
2. **Streaming rec-copy**: worth the streamed partial-JSON complexity for ~1s perceived-latency win, or ship non-streaming first and revisit in Sprint 6?
3. **Friend-name substitution**: default to stripping displayName from the prompt (strict PII). Opt-in pass-through for quality later?
4. **Prompt-cache TTL**: 5-min default. Move to 1h if per-user rec-copy volume >>3/day — revisit Sprint 6 with real data.

---

## Sources (fetched 2026-04-18)

- Anthropic pricing: https://claude.com/pricing
- Anthropic prompt caching: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
- Anthropic tool use / structured output: https://docs.anthropic.com/en/docs/build-with-claude/tool-use
- Anthropic Haiku 4.5 model card: https://docs.anthropic.com/en/docs/about-claude/models
- Google Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
- Google Gemini structured output: https://ai.google.dev/gemini-api/docs/structured-output
- Artificial Analysis model latency leaderboard (referenced for p95 estimates; numbers not independently re-verified this session): https://artificialanalysis.ai/
- MovieMatchApp Sprint 4 handoff: `docs/handoffs/sprint-4.md`
- MovieMatchApp Sprint 4 social-product brief: `docs/research/sprint-4-social-product.md`
- MovieMatchApp Sprint 4 dopamine brief: `docs/research/sprint-4-dopamine.md`
- MovieMatchApp Sprint 4 mobile-UX brief: `docs/research/sprint-4-mobile-ux.md`
- `TasteProfile` type source: `utils/firebaseOperations.ts:55-80`
