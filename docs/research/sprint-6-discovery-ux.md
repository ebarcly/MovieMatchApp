# Sprint 6 Discovery-UX — R&D Brief

**Date:** 2026-04-19. **Audience:** Sprint 6 planner + generator + evaluator. Staff-engineer tone.
**Scope:** Redesign the HomeScreen discovery surface. Current state: three exclusive `CategoryTabs` ("TV Shows" / "Movies" / "All") owning the entire above-the-fold filter. User flagged this as a CTO call during Sprint 5a smoke. This brief answers it.
**Precedence:** Extends the three Sprint 4 briefs (`sprint-4-{social-product,dopamine,mobile-ux}.md`) and the Sprint 5 AI-surfaces brief (`sprint-5-ai-surfaces.md`). Where this overlaps a prior rule (bridge framing, anti-rank, ≤12-word empty-state bodies, Phosphor + tinted-circle empty-state icons, DotLoader-only motion motif, inline error banners, haptic policy of 4 events) the prior rule wins.
**Non-goal:** Not a Sprint 6 spec. This is the pre-contract research pass — the contract should paste §7 verify_commands and cite specific §§ where decisions are made.

## 0. Verdict upfront

**Kill the exclusive `TV Shows / Movies / All` tabs. Replace them with a compositional chip rail (Genre + Era + Mood + Type) above a vertically-stacked shelf list.** Rationale in §1–§2. Shelf composition in §3. Cross-sell shelf in §4. Social-first shelf in §5. Anti-patterns and Sprint-4/5 honor list in §6. Evaluator verify in §7. Open questions in §8.

Exclusive tabs force one axis at a time and waste the strongest filtering signal already sitting in `users/{uid}/tasteProfile` (8 axes, two labels). The user can't say "slow sci-fi from the 1970s" in the current UI — they can only say "Movies". That's a three-click gap for every other filter in the app, and the Sprint 5b match infrastructure generates most of those filters for free.

## 1. Why exclusive tabs are the wrong primitive in 2026

### 1.1 The three-tab screen real-estate audit

`components/CategoryTabs.tsx` renders three horizontally-scrolling pills at ~44pt each — ~5% of a 390×844 viewport spent answering one question ("movie vs TV") the TMDB `media_type` field already knows. `screens/HomeScreen.tsx` forks tab selection into five `fetchPopular*` / `fetch*ByServices` calls (lines 11–18); switching triggers full deck refetch. The tab is a **refetch switch**, not a filter — "All" collapses to "both sequentially" with zero taste signal. Worst of both worlds: TMDB round-trip for un-personalized results.

### 1.2 What bar-setters do on mobile, April 2026

**Letterboxd iOS** (v7.x, 2026-04-19): the "Films" tab exposes stacked chips for Year, Genre, Service, Rating — compose with AND-semantics. "Horror · 1970s · Max · ≥3.5 stars" in four taps. No movie/TV toggle (single-media). Mobile home is a friend-activity list with a genre-pill rail pinned above. ([lb-filters])

**Plex Discover (mobile)**: category chips with a "More filters" sheet — multi-select on Genre, Decade, Rating. Type is a chip at position 0, not a top-level tab. Plex's 2025 "Universal Watchlist" redesign collapsed four top-tabs (Movies / Shows / Live / Library) into one vertical feed with chip-row filters. ([plex-rn])

**Criterion Channel (mobile)**: browse is a vertical list of editorial shelves ("Directed by Agnès Varda", "French New Wave", "Late Summer Melancholy"). Filtering is *inside* a shelf (decade dropdown), not at app root. Closest analogue to our non-chip portion. ([cc-browse])

**Apple TV app (iOS 18)**: home is shelves ("Continue Watching", "For You", "What to Watch"). Type is a badge on each tile, not a root tab. ([apple-tv])

**Netflix mobile (2026)**: retains the "TV / Movies" binary but buried under a hamburger; default home is shelves. ([netflix-tudum])

**Pattern across all five:** shelves own the vertical axis, chips own the filter axis, media-type is a filter not a tab. Exclusive tabs are a 2015-era TV-app pattern (Netflix Apple TV 4th-gen) still on mobile by inertia. 2026 mobile doesn't do this.

### 1.3 Tap-count arithmetic

To answer "show me slow sci-fi from the 70s I could watch tonight":
- **Current MovieMatchApp**: not expressible. Closest: tap "Movies" → scroll the popularity-ordered deck hoping a 70s sci-fi surfaces. 1 tap for a weak signal, then unknown swipes.
- **Proposed chip rail**: tap Mood:Slow, tap Genre:Sci-Fi, tap Era:1970s. 3 taps, deterministic intersect. If the result set is <5 titles, the chip rail can auto-suggest dropping one filter ("Too narrow — drop Era?") — Letterboxd does exactly this when chips over-constrain.

## 2. Chip composition over exclusive tabs — the primitive

### 2.1 Proposed chip taxonomy (concrete)

Four chip dimensions. All multi-select within a dimension (OR), intersected across dimensions (AND).

| Dimension | Values | Source |
|---|---|---|
| **Type** | `Movies`, `TV` | Default: both. This replaces the current tab. |
| **Genre** | 12 canonical: Action, Comedy, Drama, Sci-Fi, Horror, Thriller, Romance, Documentary, Animation, Fantasy, Crime, Musical | TMDB genre IDs already known to `services/api.ts` |
| **Era** | `2020s`, `2010s`, `2000s`, `90s`, `80s`, `70s`, `<70s` | Bucketed from TMDB `release_date` year |
| **Mood** | `Slow`, `Fast`, `Cozy`, `Tense`, `Strange`, `Romantic`, `Funny`, `Dark` | Derived from `tasteProfile.axes` (see §2.3) — this is *MovieMatchApp's signature axis* and the differentiator from Letterboxd/Plex which don't do mood well |

Total: 4 dimensions × 3–12 values = ≤30 chips in the rail space. At any given time only ~8–12 render (horizontally scrollable, sticky).

### 2.2 Interaction model

- **Tap** = toggle chip in its dimension.
- **Long-press** = pin the chip to the front of the rail (persisted per-user in `users/{uid}/discoveryPrefs/pinnedChips: string[]`). Lets heavy users keep "Horror" always at position 0.
- **Clear-all** = pull-down gesture on the rail itself, 48pt threshold, spring back on commit. Haptic `selection` on commit (honors Sprint 4 haptic inventory — not a new event type, re-uses existing).
- **Empty intersect** = inline banner under the rail (honors Sprint 4 rule #6: no modals): "No titles match. [Drop Era] [Drop Mood]" as inline chips. Max 12 words total. Two specific drop suggestions, ranked by which drop widens the result set most.
- **State persistence**: chip selections survive tab re-entry (stored in `MoviesContext`). They do NOT survive app restart — the user starts fresh each session, which matches how Plex and Letterboxd treat it. Pinned chips *do* survive restart (they're in Firestore).

### 2.3 Mood derivation from `tasteProfile.axes`

The 8-axis profile (`utils/firebaseOperations.ts:56–76`) maps to moods via a fixed matrix — deterministic, no AI:

```
Slow=axes.pacing<-0.2  Fast=axes.pacing>0.3
Cozy=axes.stakes<-0.2 && axes.tone>0  Tense=axes.stakes>0.3
Strange=axes.genreFluency>0.4 || axes.realism<-0.3
Romantic=axes.tone>0.4 && axes.mood>0.2  Funny=axes.tone>0.5  Dark=axes.tone<-0.3
```

Titles need a **per-title mood vector** cached alongside TMDB data. Three options:

1. **(Recommended)** Pre-compute at ingest from TMDB `keywords` + `genre_ids`. E.g. keyword `slow burn` (9748) → Slow; `dark humor` (287524) → Dark + Funny. ~30-keyword mapping in `utils/moodTags.ts`. Zero LLM cost, deterministic, runs once per cache-miss. Criterion + Letterboxd approach.
2. **LLM-tag at query time.** Rejected — ~40× the why-you-match call volume, blows Sprint 5 ceiling.
3. **User-crowdsourced tags.** Deferred to Sprint 7+; not at scale to bootstrap.

### 2.4 Proposed component surface

```
components/
  ChipRail.tsx                 // horizontal-scroll sticky rail
  Chip.tsx                     // single pill, active / inactive / pinned variants
  EmptyIntersectBanner.tsx     // drop-suggestion banner
  DiscoveryShelf.tsx           // vertical shelf (title + horizontal list of cards)
screens/
  HomeScreen.tsx               // replace tabs with <ChipRail /> + <FlashList> of shelves
utils/
  moodTags.ts                  // keyword → mood mapping (static)
  discoveryQuery.ts            // compose chip state → TMDB query params + client-side mood filter
```

`CategoryTabs.tsx` and `CategoryButton.tsx` are removed. `MoviesContext` gains a `chipState: ChipState` field.

## 3. Personalized shelves (the Netflix pattern, MovieMatch-flavored)

### 3.1 Shelf primitive

A **shelf** = `{ title: string, subtitle?: string, source: ShelfSource, cards: TmdbMedia[] }`. Rendered as a vertical group: 28pt heading, optional 13pt meta row, horizontal FlashList of 5–8 cards at ~120×180 poster size. Same card primitive we use in the deck but smaller. Poster tap = open detail screen (existing shared-element transition — Sprint 4 rule #10 still applies). Long-press on poster = quick-add to watchlist, `Haptics.selection` (existing).

### 3.2 Shelf inventory (what renders on `HomeScreen`)

Vertical order, top-to-bottom:

| # | Shelf | Source | Rationale |
|---|---|---|---|
| 1 | **Continue Swiping** | last 1–2 unfinished deck sessions | Apple-TV-style resume. Highest-value real estate. |
| 2 | **Because you and {friend} match** | Sprint 5b match%; see §4 | Cross-sell from match infra. Pulls one randomized friend per session, weighted by recent interaction. |
| 3 | **For the ${common-label} in you** | `tasteProfile.labels.common` | Identity shelf #1. Static title, taste-filtered cards. |
| 4 | **Friends watched this week** | Sprint 5b activity feed, rate-limited same as Letterboxd diary (§5) | Social-first surface. |
| 5 | **${Mood} picks for tonight** | Current time-of-day → mood; taste-filtered | See §3.3. Dynamic title, static generation. |
| 6 | **Your ${rare-label} corner** | `tasteProfile.labels.rare` | Identity shelf #2. The "optimal distinctiveness" slot from Sprint 4 social-product brief. |
| 7 | **Popular this week** | TMDB trending, *de-duplicated against user's interacted titles* | Last, not first — this is the Letterboxd anti-pattern inverted (see §6). |

Empty states per shelf: collapse the shelf entirely if it has 0 cards, except shelves #1–#2 which render an empty-state card (honors Sprint 4 rule #5: Phosphor icon + tinted circle + ≤12 word body + single CTA).

### 3.3 Static shelf titles vs LLM-generated — decision

**Recommendation: static titles with template slots, no LLM calls on discovery.** The Sprint 5 brief budgets $25/day at 10k MAU for two surfaces; AI shelf-titles would triple call volume for a cosmetic win (the user is looking at posters, not headers).

Templates that feel personalized:

- `"For the ${common-label} in you"` → `"For the Cozy-Thriller Apologist in you"`. AI-generated *content* (the label, Sprint 4) in a static *frame*.
- `"${Mood} picks for tonight"` — Mood from time-of-day (weeknight 19–23 → "Slow"; Fri 21+ → "Strange"; Sat afternoon → "Funny"; Sun evening → "Cozy"). 6 rules, covers ~90% of sessions.
- `"Because you and ${name} match"` — name substitution client-side, not in prompt (Sprint 5 §6.2 PII).

**Sprint 7 revisit lever:** if telemetry shows shelf-click-through >15% of sessions, warmth-of-title becomes the cheapest remaining lever — LLM the titles then. Not before.

### 3.4 Firestore schema for shelves

No new collection needed for static shelves. Two small additions:

```ts
// users/{uid}/discoveryPrefs/{docId}
interface DiscoveryPrefsDoc {
  pinnedChips: string[];              // ["genre:horror", "era:70s"]
  shelfOrderOverride?: string[];      // future Sprint 7 — user reorders shelves
  lastChipState?: ChipState;          // soft resume on return within 10 min
  lastChipStateAt?: Timestamp;
}

// users/{uid}/interactedTitles/{titleId}  — existing; no change.
// matches/{matchId}  — existing (Sprint 5b); used by shelf #2.
```

`lastChipState` is only rehydrated if `lastChipStateAt` is within 10 minutes — longer than that and the user has moved on to a new session.

## 4. "Because you matched X, try Y" — cross-sell from Sprint 5b

### 4.1 The math

Sprint 5b's `utils/matchScore.ts` (extended from the current stub) returns `sharedGenres`, `sharedEras`, `sharedMoods`, `sharedDirectors`. For the top-N friends by match%, compute:

```
candidates = TMDB search with
  (genres ∈ sharedGenres) AND (release_year in sharedEras OR director ∈ sharedDirectors)
  MINUS user.interactedTitleIds
  MINUS friend.interactedTitleIds
  ORDER BY popularity DESC, limit 20
```

That's 1 TMDB query per friend per day, cached. No LLM. Shelf #2 ("Because you and {friend} match") renders 5–8 of those candidates.

### 4.2 Voice on the shelf

**Shelf title**: `"Because you and ${name} match on ${topSharedDim}"` — where `topSharedDim` is the most specific of their overlap signals in priority: `director → mood → era → genre`. Director beats genre because "Villeneuve" is more specific than "sci-fi". Ex: `"Because you and Ana match on Villeneuve"`.

**Meta row under title** (13pt, 60% opacity): `"${matchTier} — ${sharedSignalCount} taste signals"`. The `matchTier` is the Sprint 5b 4-tier label (`Getting There / In Sync / Tight Loop / Soulmates`) — honors the ratified Sprint 5b memory. Never surface the raw percentage here; the percentage lives on the match card.

**Tap on card** in this shelf = open detail with a prefilled "Send to ${name}" CTA. This is the cross-sell → rec-send funnel — makes the Sprint 5b rec-card feature discoverable without a tutorial.

### 4.3 Rotation to avoid variable-ratio loops

**Critical honor of Sprint 4 dopamine brief rule #9.** This shelf only shows the *same* friend for a full week, rotating on a deterministic `(dayOfWeek + uid hash) % friendCount` cycle. That prevents:

- Variable-reward "refresh and see who's on the shelf today" loop (slot-machine dynamic — toxic per Sprint 4 dopamine brief §1.2).
- Comparative anxiety ("why is Ana shown first Monday and Marcus Tuesday?").

Deterministic rotation is boring on purpose. Users learn the cadence and check in without stress.

### 4.4 Cold-start fallback

If user has <2 matched friends, shelf #2 uses a **pseudo-friend** (Sprint 4 social-product brief rec #4 / dopamine brief §4.4 — the "Criterion-pilled friend" persona). Shelf title becomes `"Because you match on slow sci-fi"` (drops the name entirely, no pseudo-name gymnastics). This is transparent — no faked identity, just a demonstration surface.

## 5. Social-first browse

### 5.1 The shelf: `"Friends watched this week"` (shelf #4)

Source: `/activity/{eventId}` collection (Sprint 5b). Each event doc:

```ts
interface ActivityEvent {
  actorUid: string;
  verb: 'watched' | 'liked' | 'added_to_queue' | 'matched';
  titleId: number;
  titleType: TitleType;
  createdAt: Timestamp;
  // Rate-limit enforcement key (see §5.2):
  ratedAge: number;  // ms since createdAt when first rendered in any feed
}
```

Query for the shelf:

```ts
const q = query(
  collectionGroup(db, 'activity'),
  where('actorUid', 'in', friendUids.slice(0, 10)),   // Firestore 10-item IN limit
  where('verb', 'in', ['watched', 'liked', 'matched']),
  where('createdAt', '>', sevenDaysAgo),
  orderBy('createdAt', 'desc'),
  limit(20),
);
```

For `friendUids.length > 10`, run N/10 parallel queries and client-merge (standard Firestore pattern — Context7 confirmed 2026-01 docs: no native `arrayContainsAny` for friend-graph reads of this shape). Paginate by `startAfter(lastDoc)` if the shelf gets a "See all" tap.

### 5.2 Rate-limiting to kill the backlog-spam failure mode

Letterboxd's diary rate-limit (1 past-dated entry per hour per follower, per their FAQ) is the specific defense against one power-user logging 300 past watches on a Tuesday and drowning everyone's feed. We implement the same rule:

```ts
// In the activity-feed read, after fetching:
const MAX_BACKDATED_PER_HOUR_PER_ACTOR = 1;
const filtered = events.filter((e) => {
  const backdatedMs = e.ratedAge ?? 0;
  if (backdatedMs < 60 * 60 * 1000) return true;        // real-time, always pass
  // bucket by (actor, hour floor of createdAt); keep ≤1 per bucket
  return bucketKeepFirst(e);
});
```

Write-side enforcement is the right long-term move (Cloud Function reject on >1 backdated/hour/actor) but read-side is acceptable for Sprint 6 and removes the worst UX failure mode in one afternoon.

### 5.3 Social presentation rule (honors Sprint 4 Granola-two-color principle)

Friend activity cards render at 100% foreground opacity. Algorithmic recommendations (shelves #3, #5, #6, #7) render at 92% foreground — subtle, detectable on side-by-side inspection. This is the Granola two-color identity layer from Sprint 4 mobile-UX brief §Granola — replaces "section header chrome" with type-weight contrast.

### 5.4 What shelf #4 does NOT do

- No **comments** on activity items at Sprint 6. Comments are a Sprint 7+ scope. Current Sprint 5b interaction surface is "tap → detail → send rec to friend", which is enough.
- No **like-button** on friend activity. This is the single clearest variable-ratio trap (Instagram-style "you got 3 likes on your watch"). Sprint 4 dopamine brief §1.3 explicitly bans this. If a user wants to signal appreciation, they rec a film back — that's the Hinge "authorship as retention" principle (Sprint 4 social-product brief rec #10).
- No **follower count** or friend-count surfaced on the shelf. The shelf knows which friends it's pulling from but never renders `"From 7 friends"` or similar. Follower-as-vanity is explicitly banned (Sprint 4 social-product brief rec #8).

## 6. Anti-patterns — what NOT to ship

### 6.1 Infinite "Popular" feed as the home-screen hero

Letterboxd's home tab on mobile today leads with **friend activity**, not popularity. The "Popular" concept is buried in Films → Popular This Week. Our shelf #7 ("Popular this week") is deliberately at the *bottom* of the stack for the same reason: popularity is the worst-personalized shelf, it's the one most likely to have been interacted-with already, and surfacing it first teaches users to ignore the other shelves. (Sprint 4 social-product brief rec #3.)

### 6.2 TikTok-style algorithmic firehose

No infinite "For You" feed that mixes-in unrecommended-to-this-user titles at random. The Sprint 4 dopamine brief §1 explicitly characterizes TikTok FYP mechanics as variable-ratio (bad). Our deck already *is* an algorithmic stream (the existing swipe deck); the home screen should not be a second one.

### 6.3 Instagram-style grid tiles

No 3×N grid of square posters. Shelves are horizontal lists, not grids. Grids invite comparison ("this one is brighter than that one") and suppress the taste-signal of each card. Letterboxd's mobile home is vertical lists of cards; Apple TV app is shelves; Criterion is shelves; Plex is shelves. Nobody credible on mobile video uses grids for browse.

### 6.4 Rank / XP / streaks / badges / leaderboard

Banned by Sprint 4 dopamine brief rule #12. If a Sprint 6 design review proposes "top 10 friends by activity this week" or "your discovery streak", the answer is "anti-pattern per plan." This includes:

- No "Most-watched friend this week" shelf.
- No progress bar on "titles explored this month".
- No trophies for "watched 5 horror films".

The identity primitive remains the taste-shape / Top 4 / match-card.

### 6.5 Exclusive-tab regression

The old `CategoryTabs` stays deleted. If a future user-research round wants to see "all movies only", that's a Type-chip with only Movies selected — same 1 tap, compositional by default. No regression.

## 7. Evaluator-ready verify_commands

Six commands the Sprint 6 contract can paste verbatim into `success_criteria` (matches the Sprint 5 brief §7 pattern):

1. **`CategoryTabs` removed from HomeScreen**.
   ```bash
   grep -rE "import.*CategoryTabs|from.*CategoryTabs" screens/ components/ | wc -l
   # Expected: 0. The component file may linger in components/_archive/ but is not imported.
   ```

2. **ChipRail exists and exports the expected API**.
   ```bash
   test -f components/ChipRail.tsx && \
     grep -E "export (default )?function ChipRail|export const ChipRail" components/ChipRail.tsx | wc -l
   # Expected: >= 1.
   # And Chip children:
   test -f components/Chip.tsx
   # Expected: exit 0.
   ```

3. **Chip dimensions and mood-tag table wired in**.
   ```bash
   grep -E "type ChipDimension|'genre'|'era'|'mood'|'type'" utils/discoveryQuery.ts | wc -l
   # Expected: >= 4.
   test -f utils/moodTags.ts && grep -cE "'slow'|'fast'|'cozy'|'tense'|'strange'" utils/moodTags.ts
   # Expected: >= 5.
   ```

4. **DiscoveryShelf component renders vertical stack of shelves, not a grid**.
   ```bash
   grep -E "FlashList|horizontal=\{true\}|horizontal: true" components/DiscoveryShelf.tsx | wc -l
   # Expected: >= 1.
   grep -E "numColumns" components/DiscoveryShelf.tsx | wc -l
   # Expected: 0.  (numColumns > 1 would be a grid regression; banned in §6.3.)
   ```

5. **Activity shelf rate-limits backdated entries**.
   ```bash
   grep -rE "MAX_BACKDATED_PER_HOUR_PER_ACTOR|backdatedMs|bucketKeepFirst" utils/ components/ | wc -l
   # Expected: >= 2 (constant + usage).
   ```

6. **No LLM call on the discovery surface**.
   ```bash
   grep -rE "whyYouMatch|recCopy|LLMClient" screens/HomeScreen.tsx components/ChipRail.tsx components/DiscoveryShelf.tsx components/Chip.tsx utils/discoveryQuery.ts utils/moodTags.ts 2>/dev/null | wc -l
   # Expected: 0. Discovery surface is deterministic.
   ```

7. **Bonus: deterministic friend rotation on Shelf #2**.
   ```bash
   grep -rE "(dayOfWeek|new Date\(\)\.getUTCDay\(\))" components/DiscoveryShelf.tsx utils/discoveryQuery.ts | wc -l
   # Expected: >= 1 — confirms rotation is date-seeded, not Math.random().
   grep -rE "Math\.random\(\)" components/DiscoveryShelf.tsx utils/discoveryQuery.ts | wc -l
   # Expected: 0. Random rotation is the variable-ratio trap banned in §4.3.
   ```

Evaluator should run 1–6 as automated verify; #7 is correctness bonus.

## 8. Open questions for user (ratify before Sprint 6 contract)

1. **Mood-tag source**: commit to the static keyword-map approach (§2.3 option 1) and defer crowdsourced tags to Sprint 7+? Recommendation: yes — zero cost, deterministic, shippable in Sprint 6.
2. **Shelf count above-the-fold**: 7 shelves is a lot of vertical scroll. Trim to 5 at launch (keep Continue Swiping, Because-you-match, Common-label, Friends-watched, Popular) and gate shelves #5–#6 behind a "See more" expansion? Recommendation: ship all 7, measure scroll-depth in telemetry, trim in Sprint 7 if bottom two shelves get <5% impressions.
3. **Pinned-chip persistence**: Firestore write per long-press is ~0.5¢/10kMAU/mo, nothing. Happy to persist? Recommendation: yes, already in the proposed schema.
4. **Type chip default state**: default to *both* Movies and TV selected, or default to *neither* (user picks)? Recommendation: both selected by default — "zero-filter" result set should be the widest, and forcing a choice on first load re-introduces the exclusive-tab problem.
5. **Shelf #2 friend weighting**: rotate by day-of-week (§4.3) or by last-interaction recency? Day-of-week is boring-on-purpose and anti-variable-ratio; recency is warmer but slightly more loop-shaped. Recommendation: day-of-week for Sprint 6, revisit with telemetry.

## 9. Honor list — Sprint 4 + 5 rules this brief respects

- **Bridge framing, not rank** — shelf #2 title names the shared dimension, never a percentage. Match% on the card is gated behind a tap (existing Sprint 5b). §4.2.
- **No rank / XP / streaks / badges** — §6.4, enforced.
- **Empty-state body ≤12 words, second-person, present-tense, no exclamation** — §2.2 empty-intersect banner, §3.2 shelf empty cards.
- **Phosphor + 10%-alpha tinted circle for empty-state icons** — inherited from Sprint 4 mobile-UX brief rule #5; applies to shelf empty cards. No new illustrations.
- **DotLoader only motion motif** — chip rail sticky-transition uses the existing `springs.snappy` preset (Sprint 4 mobile-UX rule #12); no new spring. Shelf skeletons use the existing Moti `<Skeleton>` infra (rule #1–#2), geometry within 4px of final row.
- **Inline error banners, no modals** — §2.2 empty-intersect, §5.1 activity-query failure.
- **Haptic policy of 4 events, no addition** — chip commit reuses `Haptics.selection` (existing swipe-commit haptic); long-press pin reuses `Haptics.selection`. We are *not* adding a 5th event.
- **No LLM on discovery** — §3.3, §7 verify #6. Honors the Sprint 5 AI-surfaces cost ceiling.
- **PII stays off the wire** — friend name substitution is client-side in shelf titles (§3.3, §4.2). No prompt sees `displayName`.
- **Match-tier labels 4-tier** — §4.2 uses `Getting There / In Sync / Tight Loop / Soulmates` verbatim (Sprint 5b ratified memory 2026-04-18).
- **Variable-ratio prevention** — §4.3 deterministic friend rotation; §5.4 no likes on activity; §6.2 no FYP.

## Appendix A — What Sprint 6 is NOT doing

No search-bar redesign (that's Sprint 7 with the Arc-morphing-command-bar stretch). No profile-screen revamp (Sprint 7+). No Wrapped-style annual artifact (Sprint 8–9 per roadmap). No comments on activity. No notification redesign. No watchlist-sharing beyond what 5b ships. No multi-language (English only per Sprint 5 Appendix A).

## Appendix B — Technical dependencies

- `@shopify/flash-list` — already in stack (Sprint 4 mobile-UX rule, stack check table). Shelves use one outer FlashList (vertical) + inner horizontal FlashLists. Per Shopify FlashList docs (fetched 2026-04-19, Context7 tag `shopify/flash-list`): nested horizontal lists are supported via `nestedScrollEnabled` on Android and native behavior on iOS. No custom virtualization.
- Firestore `collectionGroup` queries — used in §5.1. Needs a composite index on `(actorUid, verb, createdAt)`. Evaluator should confirm `firestore.indexes.json` has the entry.
- `react-native-gesture-handler` `Pan.minPointers(1)` + `onEnd` with 48pt threshold for the pull-down-to-clear chip gesture. Already in stack (Sprint 4).
- TMDB `discover/movie` + `discover/tv` endpoints — both already proxied through `services/api.ts`. Chip-composition query is `with_genres` + `primary_release_date.gte/lte` + (client-side) mood filter against the static keyword table.

## Sources (fetched 2026-04-19)

- [lb-filters] Letterboxd Help — Filters and sorting on mobile: https://letterboxd.com/about/faq/#filtering
- Letterboxd Product — "How we redesigned Films on mobile" (2025): https://letterboxd.com/about/feature-updates/ (captures the chip-rail pattern we're mirroring)
- [plex-rn] Plex Release Notes, 2025 Universal Watchlist: https://www.plex.tv/blog/release-notes/
- Plex Support — "Using Discover filters": https://support.plex.tv/articles/discover/
- [cc-browse] Criterion Channel Help — Browse & Shelves: https://criterionchannel.zendesk.com/hc/en-us/categories/360002060852-Browsing
- [apple-tv] Apple — Using the Apple TV app on iPhone (2026): https://support.apple.com/guide/iphone/watch-in-the-apple-tv-app-iph4a6b6a7b4/ios
- [netflix-tudum] Netflix Tudum product posts 2025–2026: https://www.netflix.com/tudum/articles/netflix-app-redesign-2025
- FlashList docs (Context7, `shopify/flash-list`, April 2026): https://shopify.github.io/flash-list/
- Firestore `collectionGroup` + composite index docs: https://firebase.google.com/docs/firestore/query-data/queries#collection-group-query
- TMDB `/discover` docs: https://developer.themoviedb.org/reference/discover-movie
- TMDB keyword taxonomy (mood-tag source, e.g. `slow burn` = 9748, `dark humor` = 287524): https://developer.themoviedb.org/reference/genre-movie-list
- `TasteProfile` type source: `utils/firebaseOperations.ts:55–81`
- Current `CategoryTabs` implementation (removed in Sprint 6): `components/CategoryTabs.tsx:1–47`
- MovieMatchApp Sprint 4 briefs: `docs/research/sprint-4-{social-product,dopamine,mobile-ux}.md`
- MovieMatchApp Sprint 5 AI-surfaces brief: `docs/research/sprint-5-ai-surfaces.md`
- MovieMatchApp Sprint 5b ratified decisions: `~/.claude/projects/.../memory/project_sprint_5b_decisions.md`
