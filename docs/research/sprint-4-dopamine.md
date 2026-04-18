# Sprint 4 — Behavioral Design Brief

**Audience:** Founder, MovieMatchApp (solo, ships quality).
**Scope:** Applying 2025–2026 behavioral-UX research to Sprint 4 (onboarding taste quiz, stories-strip + activity-feed scaffolding, empty/loading/error states, theming remaining screens) and priming Sprint 5 (match%, shared queues, deep-linked rec cards, AI why-you-match).
**Thesis:** MovieMatchApp is not a dating app, not a streak app, not a leaderboard app. It is a *taste-reconciliation* tool. The behavioral job is to make two friends' taste legible to each other — which means every dopamine surface in the product needs to reward *recognition* (oh, they get me) rather than *accumulation* (I have 47 points). The 2026 consumer-social consensus has moved away from pointsification toward sensory, identity-affirming micro-payoffs — which aligns with the founder's locked anti-gamification stance and the yellow/magenta-on-ink chromatic.

---

## 1. Variable-Reward Design — What 2026 Looks Like

### 1.1 The 2025–2026 pattern: variable *content*, stable *cadence*

The four paradigmatic variable-reward systems in consumer software — TikTok FYP, Spotify Blend/Weekly, Duolingo streak, BeReal window — have converged on a specific architecture: the **cadence is predictable, the payload is unpredictable**. TikTok's FYP reliably delivers a new video every swipe; *which* video is unknowable. Spotify's Discover Weekly arrives every Monday; *what* is inside is unknowable. BeReal fires once per day; *when* in the day is unknowable (Anas Khan et al., ResearchGate [1]; Passionates Agency [2]).

The 2026 update to this is that **pure variable-ratio reinforcement (slot-machine design) has become reputationally toxic**. Duolingo explicitly re-architected its streak system in 2024–2025 to decouple streak continuation from daily-goal completion and added streak freezes, described as "giving users permission to be human" (Duolingo blog [3]). The UX-Magazine essay on hot-streak psychology calls out the 2020s-era streak-as-shame pattern as design debt the category is now paying down [4].

### 1.2 What's fatigued

Three specific patterns are actively being abandoned:

- **Hollow streak loops** — users tapping buttons to preserve a streak without engaging. Duolingo's own PM writing admits this happened at scale [3][4].
- **Variable-ratio notifications** — randomized pings are increasingly flagged as manipulative in app-store review discourse and academic HCI work (Annabell & Rasmussen, *New Media & Society* 2025 on Spotify Wrapped [5]).
- **Badge-as-primary-reward** — industry consensus (Studio Krew 2025 trend writeup [6]; UX Magazine [4]) treats "pointsification" as a failure mode when rewards don't map to values the user already holds.

### 1.3 The rule for MovieMatch

The app should schedule payoffs on **weekly cadence, taste-personal payload**:
- "Your week in taste" recap (Sunday) — what you swiped toward, not how many you swiped.
- A *single* daily moment — the stories-strip refresh — with no guaranteed content. If no friends are active, the strip shows a curated rec rather than a false-positive notification.
- No randomized push. Push only fires on deterministic events (a friend matched with you; a rec you sent was watched).

---

## 2. Peak-End Rule — Where Peaks Must Land

Kahneman's peak-end rule — experiences are remembered by their most intense moment and their ending, not their average — is the single most cited heuristic in 2025 UX writing (NN/g [7]; Laws of UX [8]; Aleksandra Smith, Medium, Mar 2025 [9]). Two specifics matter for Sprint 4–5:

### 2.1 Timing research

LogRocket's 2025 peak-end writeup and Bricx Labs' micro-animation catalog converge on **300–500ms** as the sweet spot for celebratory reveals — long enough for the brain to register a moment, short enough to stay responsive [10][11]. The Android Haptics UX guidelines add that the haptic pulse must fire at the *visual peak*, not at input — even small delays feel uncanny [12].

### 2.2 The three MovieMatch peaks

Based on the flow structure the founder described, peaks must be engineered at exactly these moments:

1. **First match% reveal** (Sprint 5, but the *framing* is set in Sprint 4 onboarding). This is the aha moment. The number should not appear instantly — it should reveal after a ~200ms pre-delay, then count up (not snap) over ~400ms, landing on a hold frame of ~800ms before the CTA appears.
2. **Sending a rec card** (Sprint 5). The end state is more important than the send animation — the user needs to *feel the card leave*. Directional motion (card flies toward friend's avatar), then a soft haptic confirmation on arrival-visual.
3. **"Your turn to pick" moment** (Sprint 4 stories-strip scaffolding; Sprint 5 full behavior). Being handed agency in a shared context is itself a peak — turn-taking in co-decision feels like being chosen. Design this as a gentle pulse on the user's own avatar in the strip, not a red-dot notification.

### 2.3 The end

The peak-end rule is double: peak *and* end. The session-ending screen (whatever the user sees when they close the deck or background the app) is where retention is actually shaped. A blank deck-empty should feel like completion, not exhaustion (see §5).

---

## 3. Identity Expression — Authentic vs. Performative in 2026

### 3.1 The academic frame

The Annabell & Rasmussen 2025 paper in *New Media & Society* on Spotify Wrapped [5] introduces "wrappification" — the repackaging of behavioral data as identity — and documents **Wrapped anxiety**: users modifying listening behavior to shape what their Wrapped will show, with some maintaining burner accounts for "guilty pleasure" music. The BeReal HCI paper at CSCW 2024 (Liu et al., *PACM HCI* [13]) shows BeReal's reciprocity gate (you can't see others until you post) and random-time capture were designed specifically to prevent the same performance drift, but as the platform matured, "performative authenticity" emerged anyway — curated versions of rawness.

Letterboxd criticism in 2025 runs the same arc: the platform is experienced by many users as pressure to produce witty one-liners rather than log watches (Substack culture writing [14]; BC Heights op-ed [15]).

### 3.2 The design principle

**Authentic identity expression in 2026 = low-stakes data, ambiguous audience.** Three load-bearing tactics:

- **Show behavior, not totals.** "Loved *Arrival*" reads as identity. "Movie #142 / 500" reads as score. Prefer the first.
- **Default the audience to small.** Activity-feed visibility should default to mutual friends, not followers or public. This is the inverse of Letterboxd's open-by-default review model and aligns with the mission ("invisible wall between what friends watch").
- **No comparative surfaces.** Never show "you agree with X% of your friends' tastes" as a user-facing number unless it is framed as a bridge ("you and Ana both love quiet sci-fi"), never as a rank.

### 3.3 The MovieMatch identity primitive

The app's unit of identity is **"a pair of movies you picked over a pair of movies you didn't"** — the taste-quiz A/B answers. This is richer than a star rating, more private than a public review, and generates the data for match%. Show users their own answer pattern ("you picked the slower film 7/10 times") *to themselves* before showing it to anyone else.

---

## 4. Onboarding Activation — Hitting "20 swipes + ≥1 match"

### 4.1 The activation math

Activation is the behavior most correlated with retention (Chameleon [16]; Digia [17]). Tinder's aha is "swipe within seconds" and Bumble front-loads visibility with a free Spotlight post-onboarding so first-session users see *someone* [18]. Carnegie Mellon HCI work (summarized in Lollypop 2025 [19]) finds choice completion drops up to 60% when users face more than 3–4 simultaneous options.

### 4.2 Question patterns that work

Three reference patterns, each doing a different job:

- **Hinge prompts** — open-ended identity surfaces. Work because they are expression-shaped, not preference-shaped. Good for bio, bad for cold-start recommendation. *Adopt sparingly* — one free-text prompt at end of quiz ("a movie you'd rewatch on a sick day") is enough.
- **Duolingo placement test** — calibrates difficulty in 5–8 adaptive items. Works because each answer *narrows the space*. This is the right model for the taste quiz. [20]
- **Spotify "pick 3 artists"** — low-friction seed. Works because it's bounded (three, not five, not unlimited) and because picking *from* a set is lower cognitive load than recalling. Conversion benefit is well-documented (Smarth Vasdev, Medium [21]).

### 4.3 The MovieMatch taste quiz (design spec)

Six-to-eight A/B choices. Each choice is a movie *poster pair*, not text. Rules:

- Two posters, no tiebreak option. Forced choice surfaces preference faster than Likert scales.
- Each pair is contrastive on one axis (pacing, era, mood, stakes, tone, genre-fluency, realism, runtime-tolerance). Do not repeat an axis — eight pairs = eight axes of taste signal.
- No "skip" button. A visible "neither" opt-out *after* the first three forces engagement past the warmup.
- Each answer animates the unchosen poster dimming to 40% opacity over 180ms while the chosen poster lifts on the z-axis with a subtle haptic `selection` pulse. This is the peak micro-moment: it must feel decisive.
- Pair 4 shows a progress indication ("4 of 7") — not before. Early progress disclosure triggers abandonment; mid-flow disclosure triggers commitment (sunk-cost in service of the user).
- Post-quiz, show a one-sentence identity read-back before the first deck: *"You lean slow, strange, and low-stakes. Let's find you some people."* This is the peak. The read-back is AI-generated and load-bearing for the app's voice — this is where anti-gamification personality lives (Letterboxd-style copy, see §6).

### 4.4 First-deck design

The first deck must guarantee a compatibility signal by swipe 20. Tactics:

- Seed the deck with ~6 "canary" titles chosen from the user's A/B answers — high-confidence likelies. One of these must cross a demo/onboarded-friends threshold so that a match% can fire by swipe 15–20.
- If the user has no friends yet (solo first session), match against a **pseudo-friend** — a curated persona the app ships with ("the Criterion-pilled friend," "the Sunday-afternoon rom-com friend"). This is transparent, not deceptive, and gets the user to the aha moment without requiring social graph bootstrap. It also demonstrates what a match feels like *before* they invite anyone.

---

## 5. Empty & Error States as Dopamine Surfaces

### 5.1 What top apps do

2025 empty-state writing (Mobbin [22]; UI Deploy [23]; SaaSFactor [24]) converges on three rules: empty states should (a) reduce ambiguity, (b) carry the brand's voice at full volume, and (c) point at exactly one next action. Linear, Notion, and Arc are cited repeatedly for monochrome restraint — the empty state blends into the product's aesthetic rather than inserting a third-party illustration pack.

Superhuman's "inbox zero" is the canonical case of an empty state *being* the reward. You work toward it.

### 5.2 MovieMatch empty states (design spec)

Six surfaces need empty states in Sprint 4. Handle each as follows:

| Surface | Empty payload | Next action |
|---|---|---|
| Deck exhausted (no more swipes today) | "You've mapped enough taste for one day." Chromatic magenta-on-ink illustration of a filled matrix grid. | "See tonight's picks" — opens activity feed. |
| Activity feed, no friends | "Your feed wakes up when a friend does." Yellow animated dot that pulses twice. | "Invite a friend" — primary CTA. |
| Stories strip, no stories | Show a single strip card of *yourself* with your own avatar and the day's top match% with your pseudo-friend. | Tap to re-enter deck. |
| No matches yet | "You're 4 swipes away from your first compatibility signal." Dynamic counter updates. | Return to deck. |
| Search, no results | "No match for that title. Try the vibe instead." Surfaces three mood chips. | Tap a chip. |
| Network/error | "We lost the signal for a second. Your swipes are safe." | Retry. |

Each state must speak in the same voice as the post-quiz read-back (§4.3). Error states in particular should never blame the user and never use exclamation points.

### 5.3 Loading states

Skeleton shimmers in the brand's yellow-on-ink gradient, capped at ~180ms before a spinner appears. For the deck: preload the next two cards so users never see a spinner mid-swipe. (Sprint 3 already wired pagination prefetch — extend that pattern.)

---

## 6. Micro-Rewards Without Gamification — The 2026 Replacement Stack

Industry consensus in 2025–2026 (Storyly [25]; Adjust [26]; Graphic Eagle [27]): **pure pointsification is dead, sensory micro-feedback is in.** The replacement stack has four layers.

### 6.1 Haptics as the primary reward layer

The 2025 haptics guide (Saropa [28]) and Android's Haptics UX guidelines [12] describe haptics as a *system*: confirmation, warning, progress, celebration — each with a distinct intensity, duration, and rhythm. Four specific events in MovieMatch get haptics:

- **Swipe commit** — `selection` light pulse. No sound.
- **Match% reveal** — `notification.success` at the moment the number lands (not when the card appears).
- **Rec card sent** — `impact.medium` on arrival-visual (card reaches friend avatar), not on tap.
- **Deck exhausted / day complete** — `impact.soft` triple, 80ms apart. This is the "Superhuman-done" feeling.

No haptic on every tap. Haptic inflation kills the reward gradient.

### 6.2 Sound design (optional, off by default)

Per the haptics-first consensus, sound is additive, not primary. Three curated sounds, all respecting silent mode: match reveal (a single soft chime), rec card send (directional whoosh), day-complete (a two-note descending figure). Default audio off. Surface the setting in onboarding as a checkbox, not buried in settings.

### 6.3 Text personality — the Letterboxd layer

Letterboxd's brand voice does the work that badges used to do in 2018-era apps. This is where the yellow/magenta-on-ink chromatic earns its personality. Copy rules:

- Dry, specific, never cute. "You've mapped enough taste for one day" beats "Great job, swipe champion!"
- Second-person, present tense.
- Never reward quantity. Reward recognition: *"You and Ana both keep picking the quieter option."*
- Capitalize only the first letter. This is a voice cue inherited from Letterboxd/Are.na — it signals restraint.

### 6.4 Animated identity objects

The taste-quiz output is an identity object — a small visual summary of the user's 8-axis taste profile. Surface it in the profile screen as a slowly-rotating chromatic shape (magenta/yellow gradient, ink background). This is the *thing users screenshot* when Sprint 5 lands. It replaces badges. Important: do not gamify it — do not add XP, levels, or "complete your shape." It is already whole after the quiz. Subsequent swipes refine it subtly over weeks.

---

## Sprint 4 Design Rules

1. **The 6–8 A/B taste quiz uses movie-poster pairs, one axis per pair, no Likert, no skip button until item 4, progress indicator at item 4, AI read-back at the end.** Forced choice surfaces preference ~40% faster than scales, and mid-flow progress disclosure reduces abandonment (Lollypop 2025 [19]).

2. **Post-quiz read-back is the first Peak moment in the product — copy it in Letterboxd-voice and treat it as load-bearing.** Kahneman's peak-end research [7][8] and 2025 celebration-timing work [10][11] say this moment disproportionately shapes the user's entire memory of onboarding.

3. **First match% reveal (Sprint 5 behavior, Sprint 4 framing): 200ms pre-delay, 400ms count-up, 800ms hold, haptic fires at the visual peak (not input).** Android Haptics UX guidelines [12] specify that haptic-visual delay >30ms feels uncanny. Design the reveal component now so Sprint 5 can drop the number in.

4. **First session must guarantee ≥1 compatibility signal by swipe 20 via a pseudo-friend seed.** Solo users cannot see a match without social graph; a transparent curated persona solves the cold-start activation problem without faking data (Chameleon [16]; Bumble Spotlight precedent [18]).

5. **Stories strip empty state is self-referential — show the user their own taste shape and today's pseudo-friend match% — never hide the strip.** Linear/Superhuman-class empty states do not display emptiness, they display *state* (UI Deploy [23]).

6. **All six Sprint 4 empty states use the same dry, second-person, present-tense voice — no exclamation points in error copy, no blame.** 2025 empty-state consensus [22][23] treats voice as the *primary* engagement driver, not illustration.

7. **Haptics fire on exactly four events: swipe commit, match% reveal, rec card arrival-visual, day-complete triple.** Every other tap is silent. Haptic inflation destroys the reward gradient (Saropa 2025 [28]).

8. **No badges, no XP, no points, no levels, no streaks — the identity object is the taste-shape on the profile screen, and it is complete after the quiz.** This is the 2026 anti-gamification replacement (Studio Krew [6]; UX Magazine hot-streak essay [4]).

9. **Weekly cadence, taste-personal payload — one Sunday recap ("your week in taste"), deterministic push only (friend-matched or rec-watched), no randomized notifications.** Variable-ratio scheduling is now category-toxic (Annabell & Rasmussen 2025 [5]).

10. **All comparative surfaces are framed as bridges, never ranks. "You and Ana both love quiet sci-fi" is allowed; "you are 73% compatible with your friend group" is not.** Prevents wrappification/performative-identity drift documented in Letterboxd and Spotify Wrapped criticism [5][14][15].

11. **Deck-exhausted is a reward state, not a failure state — treat it like Superhuman's inbox zero.** Day-complete triple-haptic, chromatic "filled matrix" illustration, prompt to activity feed. Peak-end rule [7]: the ending is what users remember.

12. **Defer every badge, level, score, leaderboard, and streak question to Sprint 6+. If a stakeholder proposes one during Sprint 4, the answer is "anti-pattern per plan."** The founder's Sprint 2 lock-in is the single strongest design constraint in this brief — protecting it is the design job.

---

## Sources

- [1] Anas Khan et al., *Reinforcement Schedule in the Digital Age*, ResearchGate, 2025. https://www.researchgate.net/publication/395115230_Reinforcement_Schedule_in_the_Digital_Age
- [2] Passionates Agency, *The TikTok Revolution: How Smart Design Choices Built a $250B Empire*. https://passionates.com/tiktok-revolution-smart-design-built-250b-empire/
- [3] Duolingo Blog, *Improving the streak: Forming habits one lesson at a time*. https://blog.duolingo.com/improving-the-streak/
- [4] UX Magazine, *The Psychology of Hot Streak Game Design: How to Keep Players Coming Back Every Day Without Shame*. https://uxmag.com/articles/the-psychology-of-hot-streak-game-design-how-to-keep-players-coming-back-every-day-without-shame
- [5] Taylor Annabell & Nina Vindum Rasmussen, *An algorithmic event: The celebration and critique of Spotify Wrapped*, New Media & Society, 2025. https://journals.sagepub.com/doi/10.1177/14614448251391301
- [6] Studio Krew, *Top Gamification Trends of 2025*. https://studiokrew.com/blog/app-gamification-strategies-2025/
- [7] Nielsen Norman Group, *The Peak–End Rule: How Impressions Become Memories*. https://www.nngroup.com/articles/peak-end-rule/
- [8] Laws of UX, *Peak-End Rule*. https://lawsofux.com/peak-end-rule/
- [9] Aleksandra Smith, *Designing for Lasting Impressions: The Peak-End Rule*, Medium, Mar 2025. https://medium.com/@aleksandrasygasmith/designing-for-lasting-impressions-the-peak-end-rule-ae2fd9e998cd
- [10] LogRocket, *What's the peak-end rule? How to use it to improve UX*. https://blog.logrocket.com/ux-design/whats-peak-end-rule/
- [11] Bricx Labs, *12 Micro Animation Examples Bringing Apps to Life in 2025*. https://bricxlabs.com/blogs/micro-interactions-2025-examples
- [12] Android Open Source Project, *Haptics UX design*. https://source.android.com/docs/core/interaction/haptics/haptics-ux-design
- [13] Liu et al., *"Sharing, Not Showing Off": How BeReal Approaches Authentic Self-Presentation on Social Media Through Its Design*, PACM HCI (CSCW), 2024. https://dl.acm.org/doi/10.1145/3686909
- [14] Ben Davies, *Why Are We Scared to Forget Our Consumption? From Letterboxd to Goodreads*, Medium. https://medium.com/@ben.davies2001/why-are-we-scared-to-forget-our-consumption-from-letterboxd-to-goodreads-c5d92d345804
- [15] BC Heights, *A Call for Authenticity on Art-Based Social Media Apps*, May 2025. https://www.bcheights.com/2025/05/04/social-authenticity-column/
- [16] Chameleon, *How to find your product's "Aha" moment, test it, and improve it for retention*. https://www.chameleon.io/blog/successful-user-onboarding
- [17] Digia, *Mobile App Onboarding Guide: Activation, Patterns, and Retention*. https://www.digia.tech/post/mobile-app-onboarding-activation-retention
- [18] The App Fuel, *Dating apps' recipes for success*. https://www.theappfuel.com/casestudies/dating-apps-recipes-for-success
- [19] Lollypop Design, *The Power of Progressive Disclosure in SaaS UX Design*, May 2025. https://lollypop.design/blog/2025/may/progressive-disclosure/
- [20] Lingoly, *How to Take Placement Test On Duolingo*. https://lingoly.io/duolingo-placement-test/
- [21] Smarth Vasdev, *Deep-dive into Spotify's User Onboarding Experience*, Medium. https://medium.com/@smarthvasdev/deep-dive-into-spotifys-user-onboarding-experience-f2eefb8619d6
- [22] Mobbin, *Empty State UI Design: Best practices, Design variants & Examples*. https://mobbin.com/glossary/empty-state
- [23] UI Deploy, *Complete Guide to Empty State UX Design: Turn Nothing into Something [2025]*. https://ui-deploy.com/blog/complete-guide-to-empty-state-ux-design-turn-nothing-into-something-2025
- [24] SaaSFactor, *Empty State UX: Turn Blank Screens Into Higher Activation and SaaS Revenue*. https://www.saasfactor.co/blogs/empty-state-ux-turn-blank-screens-into-higher-activation-and-saas-revenue
- [25] Storyly, *Gamification Strategies to Boost Mobile App Engagement*. https://www.storyly.io/post/gamification-strategies-to-increase-app-engagement
- [26] Adjust, *The ultimate gamification guide*. https://www.adjust.com/resources/guides/app-gamification/
- [27] Graphic Eagle, *Gamification Techniques in App Design*. https://www.graphiceagle.com/gamification-techniques-in-app-design-boost-engagement-the-smart-way/
- [28] Saropa, *2025 Guide to Haptics: Enhancing Mobile UX with Tactile Feedback*, Medium. https://saropa-contacts.medium.com/2025-guide-to-haptics-enhancing-mobile-ux-with-tactile-feedback-676dd5937774
- [29] Growth.Design, *Superhuman's Secret 1-on-1 Onboarding Revealed*. https://growth.design/case-studies/superhuman-user-onboarding
