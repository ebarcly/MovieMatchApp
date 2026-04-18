# Sprint 4 Mobile-UX Research: 2025-2026 Bar-Setters

> Scouting brief for MovieMatchApp (React Native 0.81.5, Expo SDK 54, React 19, Reanimated 3, phosphor-react-native). Goal: ship Sprint 4 (theming, stories + activity feed, loading/empty/error states, toasts, skeletons, screen transitions, a11y) with a "2026, not 2023" feel on the locked palette — laser yellow #FBEC5D + hot magenta #FF3E9E on inky blue-black #0A0A12.

Each app below is studied for **(1)** distinctive interaction patterns, **(2)** animation primitives, **(3)** typographic/spatial craft, **(4)** the "only-this-app-does-this" moment, and **(5)** what's translatable to RN/Expo in 2026. Concrete Sprint 4 rules and stretch moves at the bottom.

---

## Tier A: The Bar-Setters

### Linear

#### Interaction patterns
Linear's defining move isn't what it animates — it's what it *doesn't* make you wait for. State changes (checkbox, status, priority) fire optimistically with a 80-120 ms cross-fade and defer network reconciliation. Loading is mostly invisible because the app ships pre-rendered skeleton frames that match final layout to within ~4 px, so the user barely notices the swap. Microcopy is declarative, not apologetic: "No issues in this view" rather than "Sorry, no issues found yet." Error states offer a single bolded action verb and a muted retry link — never a dialog.

#### Animation primitives
Spring with moderate damping for panel slides; linear-timed 120-150 ms cross-fade for content swaps; subtle 8 px translate-in on list items on first render, staggered ~20 ms apart. No bouncy overshoot — Linear explicitly avoids the "Disney" feel.

#### Typographic / spatial craft
Inter at tight tracking (~-0.01 em), 13-14 px body, 11 px meta row. Density is deliberately high but rescued by generous **vertical** breathing — 12 px row height inside dense lists, then a 24 px gap to the next section. The app proves high density doesn't have to feel cramped when the hierarchy is strict: three type sizes, two weights, one accent color per context.

#### Only-this-app-does-this
The **command bar (⌘K)** that treats every navigation as a typed intent, not a click target. Every list action has a keyboard shortcut shown inline on hover — passive learning, muscle-memory training. ([Linear Method](https://linear.app/method), [Figma Blog — The Linear Method](https://www.figma.com/blog/the-linear-method-opinionated-software/))

#### Translatable to RN/Expo
- Optimistic state updates: trivial with React Query / Zustand.
- Pre-shaped skeleton frames that match final layout: Moti `<Skeleton>` + shared layout metrics ([Moti Skeleton](https://moti.fyi/skeleton)).
- Staggered list entry: Reanimated `FadeInDown.delay(index * 20)`.
- Command-bar metaphor: not core to Sprint 4, but the *declarative-microcopy* principle ports 1:1.

---

### Arc Browser

#### Interaction patterns
Arc's sidebar auto-collapse and Spaces swipe are the interaction signatures. Everything feels like it was *launched* with physical intent — no linear fades. The command bar expands from a pill into a full search surface in a single spring motion that morphs width, height, and corner radius simultaneously.

#### Animation primitives
Published breakdown of Arc's search-bar animation: **spring easing for the decrease phase at 0.09 s, easeOut at 0.38 s for the increase, easeInOut at 0.08 s for the validating phase** ([Paul Bancarel — Reproducing Arc's search-bar animation in SwiftUI](https://medium.com/@bancarel.paul/from-concept-to-code-reproducing-arc-browsers-search-bar-animation-in-swiftui-cd9fdb60e7a5)). The asymmetry matters: fast out, slower in, very fast to commit. Arc also uses soft rounded corners everywhere and transitions them as animatable properties — corners morph with the same spring as position ([LogRocket — UX analysis of Arc](https://blog.logrocket.com/ux-design/ux-analysis-arc-opera-edge/)).

#### Typographic / spatial craft
Very little chrome; content dominates. Sidebar items rendered at ~13 px with heavy reliance on favicon + color to distinguish, keeping text minimal. Generous internal padding (12 px vertical per row) prevents the tight stack from feeling dense.

#### Only-this-app-does-this
**Two-finger swipe between Spaces** — a gesture most browsers don't expose, paired with a parallax drift of the sidebar content that makes each Space feel like a physical room you walked into ([Arc Browser designer's lens, Medium](https://medium.com/design-bootcamp/arc-browser-rethinking-the-web-through-a-designers-lens-f3922ef2133e)).

#### Translatable to RN/Expo
- Morphing corner radius + size on the same spring: Reanimated `withSpring` on `borderRadius` and `width` is trivial on Fabric.
- Asymmetric spring phases (fast-out/slow-in/fast-commit): compose three `withSequence` steps.
- Two-finger pan between surfaces: `Gesture.Pan().minPointers(2)` on gesture-handler, already in our stack.

---

### Superhuman

#### Interaction patterns
Superhuman is the canonical "100 ms rule" app: every digital interaction must be faster than 100 ms, and internally they target **50-60 ms** — "the difference between 'fast' and 'feels like thought'" ([Superhuman Blog — 100ms rule](https://blog.superhuman.com/superhuman-is-built-for-speed/)). The command palette (⌘K) shows the keyboard shortcut next to every result so users learn shortcuts passively ([Superhuman — building a remarkable command palette](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/)).

#### Animation primitives
Sparse on purpose. Most transitions are sub-200 ms cross-fades; the perceptible craft is **latency**, not motion. Undo is a 3-second timed banner with a subtle shrink animation on the progress indicator.

#### Typographic / spatial craft
Dense but airy — the inbox row is ~32 px high with a strict two-weight hierarchy (sender bold, preview regular), tight line-height. A single accent color per state (unread, snoozed, done).

#### Only-this-app-does-this
The **Cmd+K palette that teaches itself**. Every command exposes its shortcut inline; the palette is an onboarding surface disguised as a search bar.

#### Translatable to RN/Expo
- 100 ms budget: aggressive avoidance of `InteractionManager` blocks; use `runOnUI` for all gesture work.
- Shortcut-teaching metaphor → port as **gesture hints** on swipe cards: show the gesture result as a translucent label while the card is mid-swipe ("Like", "Pass").

---

### Nothing OS

#### Interaction patterns
Nothing OS 3.0 doubled down on its **Dot Engine** — menus and transitions route through a dot-matrix motion layer that gives everything a characteristic "resolving dots" feel. Typography was refined from pure dot-matrix novelty toward a reader-friendly sans, while keeping dot accents in glyphs that need personality (numerals, icons) ([Nothing OS 3.0 overview](https://intl.nothing.tech/pages/nothing-os-3)).

#### Animation primitives
Smooth tween-based micro-animations, minimal bounce, heavy use of monochrome transitions. The big lesson: **a single repeating motion motif** (the dot) applied everywhere — loading, pulling, waiting — creates unmistakable brand recall.

#### Typographic / spatial craft
Monochrome-first with one accent. Low clutter, heavy grid. Dot-matrix numerals for timestamps and meters. ([Wikipedia — Nothing OS](https://en.wikipedia.org/wiki/Nothing_OS))

#### Only-this-app-does-this
**A glyph language** that works as both clock and notification. The back of the phone literally animates — but in software, the equivalent is a consistent geometric motif (circles, dots) used for every waiting state.

#### Translatable to RN/Expo
- Apply **one motion motif** everywhere a wait exists. For MovieMatch, the motif could be a pair of alternating magenta/yellow dots at the same sizes and timing across every loader. Skia makes this cheap; even pure Reanimated does it.

---

### Raycast

#### Interaction patterns
Raycast is text-first — 99% of its UI is characters — yet it feels tactile because every list row has an `ActionPanel` that surfaces keyboard actions contextually ([Raycast API — User Interface](https://developers.raycast.com/api-reference/user-interface)). Empty states aren't illustrations; they're useful prompts ("Type to search", "⌘+N for new").

#### Animation primitives
Very little motion. Spring-damped panel expansion, instant cross-fades. The craft is **information density in a tiny viewport** without feeling crammed.

#### Typographic / spatial craft
Monospace-adjacent rhythm with consistent row heights. Hints (⌘K, ⏎) are rendered as tiny rounded-rect keycaps inline — visually quiet, functionally loud.

#### Only-this-app-does-this
**Keycap-styled hint chips** inline with text. A designer's trick: make affordances look like physical keys.

#### Translatable to RN/Expo
- Keycap chip component = `<View>` with 1 px border, 4 px radius, 10 px font. Trivial. Great for swipe-gesture hints on our card stack.

---

### Lex

#### Interaction patterns
Lex's hallmark is **zero learning curve** — it's Google Docs with an AI shelf that only appears when invoked ([Lex — Product Hunt](https://www.producthunt.com/products/lex-4)). The cursor is the UI. AI suggestions appear as soft-gray inline text you can accept with Tab, à la Copilot — the accept animation is a 120 ms slide-up + opacity change.

#### Animation primitives
Writing apps are where motion should disappear. Lex does one thing well: the **AI-suggestion accept animation**. Inline gray text becomes black text with a tiny rightward shift, imperceptible but satisfying.

#### Typographic / spatial craft
Generous line-height (1.7-1.8), serif body at ~18 px, column capped at ~640 px, center-justified on the viewport.

#### Only-this-app-does-this
The **ghost-text preview** that feels like your own thought finishing itself.

#### Translatable to RN/Expo
- Not directly Sprint 4, but the principle — **show the result of an action as a translucent preview before commit** — ports to our swipe card: show "MATCH!" as 20%-opacity text the moment the swipe crosses 40% of threshold, then snap to 100% on commit.

---

### Granola

#### Interaction patterns
Granola's interface during a meeting is a blank note canvas — "zero learning curve", intentionally indistinguishable from Apple Notes on first open ([Wonder Tools — Granola review](https://wondertools.substack.com/p/granolaguide), [Intelligent Interfaces — Granola UX](https://intelligentinterfaces.substack.com/p/how-granola-enhances-note-taking)). Post-meeting, AI summary weaves in your own points in **black** vs. AI notes in **gray** — a two-color semantic layer that replaces iconography.

#### Animation primitives
Quiet. Live transcript streams line-by-line with a 100-120 ms opacity fade per line. No shimmer, no pulse — just steady appearance.

#### Typographic / spatial craft
Plain-text-first. Two-color hierarchy (user-black / AI-gray) does the work iconography would otherwise do. Radical absence of chrome.

#### Only-this-app-does-this
The **post-meeting rewrite**: your scrawled bullets are re-woven into a full summary where your phrasing stays in black. It's invisible UX — the absence of a "Generate" button — that makes it land.

#### Translatable to RN/Expo
- Two-color hierarchy idea: for MovieMatch's activity feed, render **friend activity** at 100% foreground and **algorithmic recommendations** at 60% foreground. No separate section headers needed.

---

### Warp

#### Interaction patterns
Warp's signature is **block-based command UI** — every command + output pair is a collapsible, labeled, shareable block ([Warp — Modern Terminal](https://www.warp.dev/modern-terminal)). GPU-accelerated scrolling keeps 10,000-line tails buttery.

#### Animation primitives
Cursor behavior is animated subtly — a smooth blink rather than a hard toggle. Command blocks collapse with a spring-eased height animation, not a linear one.

#### Typographic / spatial craft
Monospace with visible character baselines. Each block has a 1 px left accent bar in a status color (success/failure/running). It's a pattern worth stealing.

#### Only-this-app-does-this
**Typing in the terminal feels like typing in a text editor** — multi-line editing, cursor navigation, inline autocomplete, all inside a tool that is historically a one-line-at-a-time experience ([Design System Inspired by Warp](https://getdesign.md/warp/design-md)).

#### Translatable to RN/Expo
- **Left-accent status bar** (1-2 px) on list rows is a stupidly cheap way to encode state without adding chrome. Perfect for the activity feed: magenta bar for matches, yellow for likes received, transparent for ambient.

---

## Tier B: Supporting Cast

### Things 3

Cultured Code's Things 3 is "pure craft" — every animation has a purpose. Opening a to-do smoothly transforms the row into a clear white paper surface, with detail fields tucked away until summoned ([Cultured Code — Things Big and Small](https://culturedcode.com/things/blog/2023/09/things-big-and-small/)). It follows iOS Dynamic Type automatically, and icons are vector so everything scales together. Translatable: **row-to-detail morph transitions** — use Reanimated's shared element transitions to morph a list row into a full card view ([Reanimated shared-element transitions](https://docs.swmansion.com/react-native-reanimated/docs/shared-element-transitions/overview/)).

### Bear

Bear shipped **Bear Sans**, a custom typeface derived from Clarika, tuned for legibility over distance — "Bear Sans should sit silently, supporting your prose without taking from its meaning" ([Bear Blog — Bear Sans](https://blog.bear.app/2023/08/learn-about-our-new-custom-font-bear-sans/)). Translatable principle: **one opinionated typeface carries more brand weight than ten UI animations**. We already have our Inter/Display picks — the lesson is to *not* over-mix.

### Sora (OpenAI)

Sora's mobile app is Flutter-built with a tight creation-first feed — "designed to maximize creation, not consumption" — and prioritizes content you might remix ([OpenAI — Sora 2](https://openai.com/index/sora-2/), [OpenAI — Shipping Sora for Android](https://openai.com/index/shipping-sora-for-android-with-codex/)). Translatable: the **Remix branch** metaphor — every user action that would traditionally destroy previous state instead creates a branch. For MovieMatch: "Undo last swipe" shouldn't just reverse state, it should surface the card as a preserved branch.

### Reflect

Reflect's 2025 redesign is simple-clean-distraction-free; daily-note page and settings fully refreshed ([Reflect Changelog](https://reflect.app/changelog)). The lesson: **even design refreshes can be launched without a splash** if the change is systemic and consistent. Our Sprint 4 theming pass should ship as a single coherent change, not a staged rollout per screen.

### Amie

Amie's calendar view-picker sheet is a widely-referenced iOS interaction ([60fps.design — Amie Calendar View Picker Sheet](https://60fps.design/shots/amie-calendar-view-picker-sheet)). It uses a bottom sheet that expands with a spring and reveals segmented view options with staggered entry. Translatable: segmented-control animations with stagger are cheap with Moti.

---

## Sprint 4 Implementation Rules

### Skeletons & loading

1. **Skeleton pulse: opacity 0.45 → 0.85 at 1.2-1.5 Hz** (≈ 700-830 ms per cycle), `Easing.inOut(Easing.ease)`. This lands between Linear's barely-there pulse and iOS/Moti defaults. Do *not* use shimmer-gradient unless the row is >120 px wide — on compact mobile rows a gradient draws more attention than the content would. Use Moti's `<Skeleton>` for rectangles and `<Skeleton.Group>` for staggered lists ([Moti Skeleton](https://moti.fyi/skeleton), [Reactiive — Skeleton animation in RN with Moti](https://reactiive.io/articles/skeleton-loader)).

2. **Skeleton geometry must match final layout within 4 px.** Measure the rendered row once in Figma and commit those pixel values as skeleton dimensions. Mismatched skeletons produce a "jump" that breaks Linear's illusion.

3. **Skeletons render inline, never as full-screen replacements.** Header + nav stay real the whole time; only the data region skeletonizes. This is how Linear and Raycast feel instant — the chrome never flickers.

### Empty, error, and microcopy

4. **Empty states follow Mobbin's four-part pattern**: icon/illustration → concise headline → one-line supporting text → primary CTA button ([Mobbin — Empty state glossary](https://mobbin.com/glossary/empty-state)). Headline is **declarative**, not apologetic: "No matches yet" beats "Sorry, you have no matches." Microcopy voice across the app: confident, present-tense, second person. Max 12 words per empty-state body.

5. **Empty-state "illustrations" are Phosphor icons at 48 px, not custom art** — duotone weight, laser-yellow primary on 10%-alpha magenta circle background. Granola proved that *restraint* converts better than bespoke art when the app doesn't already have an illustration system. This costs zero artist hours and stays on-brand.

6. **Errors never use modal dialogs.** Inline banner at top of affected region, single bold verb CTA ("Retry"), muted link for secondary action ("Report"). Auto-dismiss on success. Linear and Superhuman both enforce this.

### Toasts

7. **Sonner-style toast behavior**, ported to RN: bottom-placement, thumb-reachable, swipe-down to dismiss, auto-expire at 4 s (success) / 6 s (error), stack from the bottom with a parallax offset of ~8 px per toast. Use Sonner-Native or a thin wrapper over `react-native-toast-message` ([Sonner — shadcn integration](https://www.shadcn.io/ui/sonner), [LogRocket — React toast libraries 2025](https://blog.logrocket.com/react-toast-libraries-compared-2025/)).

8. **Every toast pairs with a haptic**: `Haptics.notificationAsync(Success | Error | Warning)` on fire. Match the semantic: success = light, error = heavy. Do **not** haptic on informational toasts — haptic fatigue is real ([Expo Haptics](https://docs.expo.dev/versions/latest/sdk/haptics/)).

### Screen transitions

9. **Tab transitions use spring, not slide.** Config: `withSpring(toValue, { damping: 18, stiffness: 180, mass: 0.9 })` on horizontal translate — gives a firm settle without bounce. Linear and Arc both avoid overshoot; the 2026 default is spring-crisp, not spring-bouncy ([Reanimated — withSpring](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/), [dev.to — Reanimated 3 ultimate guide 2025](https://dev.to/erenelagz/react-native-reanimated-3-the-ultimate-guide-to-high-performance-animations-in-2025-4ae4)).

10. **Row-to-detail uses a shared-element transition** (movie card → movie detail), not a modal push. Tag the poster `<Animated.View sharedTransitionTag={`poster-${id}`}>` and animate across navigation. Reanimated 3 supports this on the old arch today; Fabric is behind a feature flag as of 4.2 ([Reanimated — Shared Element Transitions](https://docs.swmansion.com/react-native-reanimated/docs/shared-element-transitions/overview/)).

11. **List entry uses `FadeInDown` staggered at 20 ms per item, capped at the 12th item.** Beyond 12 the stagger becomes noticeable waiting, not delight. First page only — no re-stagger on paginated loads.

### Animation primitives

12. **One spring recipe, applied everywhere.** Define two configs in the theme: `springs.snappy` (damping 18, stiffness 220) for taps/toggles and `springs.gentle` (damping 20, stiffness 140) for panels/sheets. Every screen uses these. This is the single biggest cohesion lever — disparate springs are why most RN apps feel off-the-shelf.

13. **A single recurring motion motif** borrowed from Nothing OS: a pair of alternating dots (magenta + yellow) for every indeterminate wait. Same duration (900 ms cycle), same sizes (8 px), same positions in every loader. Users stop reading "loading" and start reading "the brand is thinking."

### Typography & spatial craft

14. **Strict three-size type scale in each screen context.** Title (24-28), body (15-16), meta (11-12). Two weights only (regular + semibold). Linear-style tight tracking (-0.01 em) on display; normal tracking on body. No "helpful" fourth size. This single rule fixes 80% of amateur-feeling screens.

15. **Row density target: 56-64 px with 12 px internal vertical padding.** Below 56 is too cramped for thumb targets; above 64 feels like a tutorial app. Between rows: 1 px divider at 8% foreground opacity — not a full line. Warp's 1-2 px left-accent status bar ports here for the activity feed (magenta = match, yellow = like received, transparent = ambient).

### Accessibility

16. **Every interactive element gets `accessibilityLabel` + `accessibilityRole`; every swipe gesture gets an `accessibilityHint` describing the alternative flow.** Real-device testing with VoiceOver + TalkBack is non-negotiable before ship ([React Native Accessibility docs](https://reactnative.dev/docs/accessibility), [OneUptime — Screen readers in RN](https://oneuptime.com/blog/post/2026-01-15-react-native-screen-reader-support/view)). Loading regions use `accessibilityLiveRegion="polite"` so announcements don't step on narration.

---

## Stretch Moves (Ambitious-but-Shippable)

### S1. Haptic-synced swipe threshold
Fire a light haptic at the **40% swipe threshold** (when the card starts revealing its intent tint — magenta for like, yellow-muted for pass) and a medium haptic on commit. Pair the 40% moment with a ghost-text label ("MATCH?") at 20% opacity that grows to 100% as the swipe progresses — the Lex ghost-text principle applied to gesture. Gesture handler + `Haptics.impactAsync(Light)` at the threshold, `Medium` on commit. Cost: half a day. Payoff: the single most memorable thing about the swipe deck.

### S2. Morphing command-bar for search
Arc's asymmetric spring on corner radius + size, applied to a bottom pill that morphs into a full search sheet on tap. Reanimated `withSpring` on `borderRadius`, `height`, and `paddingTop` simultaneously. Use the published Arc timings as a starting point (0.09 s decrease, 0.38 s expand, 0.08 s commit) ([Paul Bancarel — Arc search-bar in SwiftUI](https://medium.com/@bancarel.paul/from-concept-to-code-reproducing-arc-browsers-search-bar-animation-in-swiftui-cd9fdb60e7a5)). Cost: 1-2 days. Payoff: the app has a "signature" motion.

### S3. Shared-element poster transition, card → detail
Movie poster morphs from its grid/deck position into the detail screen's hero position, with surrounding UI crossfading beneath. Tag the poster with `sharedTransitionTag`, ensure the detail screen mounts the poster first, let Reanimated interpolate. Ship it behind a feature flag for iOS first (where it's more stable on the old arch), Android second. Cost: 2-3 days (including the Fabric caveat). Payoff: the difference between "2023 RN app" and "2026 native-grade."

### S4. One-motif loading language
Replace every `ActivityIndicator` in the app with a single shared component: two 8 px dots (magenta + yellow) that cross-fade at 900 ms with a spring-eased scale pulse. Use it for list loaders, button spinners, full-screen pre-fetch. Cost: half a day. Payoff: brand recall that competitors can't replicate without copying outright (Nothing OS proved this).

### S5. Stories-strip with tactile pause
Borrow the press-to-pause convention from Instagram/TikTok stories, but add: (a) a subtle corner-radius morph when paused (stories feel "held"), (b) a haptic light-tick on segment advance, (c) progress bars that use `withSpring` for the fill, not linear tween — the bar *chases* rather than ticks. All achievable with gesture-handler (already in stack) and Reanimated. Cost: 2 days. Payoff: stories feel like 2026 Instagram, not 2022.

---

## What NOT to Do (Anti-Patterns from This Research)

- **No skeuomorphic loaders** (spinning gears, progress rings beyond 1 per screen). Nothing, Linear, Arc all avoid them.
- **No bouncy overshoot springs.** 2026 springs are crisp. Overshoot reads as Disney-era 2017.
- **No modal error dialogs.** Inline banner or nothing.
- **No custom illustrations unless you already have an illustration system.** Granola proved text + icon beats mid-tier custom art.
- **No mixing fonts.** One display pairing, maximum. Bear's point: a single opinionated type choice carries more than ten animations.
- **No full-screen skeletons over persistent chrome.** Header + tab bar stay real, always.

---

## Translatable-in-2026 Stack Check

| Pattern | RN/Expo primitive | Already in stack? |
|---|---|---|
| Spring physics everywhere | Reanimated 3 `withSpring` | Yes (via gesture-handler) |
| Skeleton pulse/shimmer | Moti `<Skeleton>` | Needs `moti` + `expo-linear-gradient` |
| Shared-element transitions | Reanimated `sharedTransitionTag` | Yes (RN 0.81.5) |
| Haptic feedback | `expo-haptics` | Easy add, SDK 54 native |
| Toasts | Sonner-Native / `react-native-toast-message` | Needs adding |
| GPU-accelerated list rendering | FlashList (Shopify) | Recommended add for feed |
| Complex motion paths | Skia (`@shopify/react-native-skia`) | Optional for S4 one-motif loader |
| Screen transitions | Expo Router + Reanimated | Yes |

Nothing web-only in the above. Everything in the Sprint 4 rule list ships natively on iOS + Android via our current stack plus Moti and expo-haptics.

---

## Sources

- [Linear — Practices for building (Linear Method)](https://linear.app/method)
- [Figma Blog — The Linear Method: Opinionated Software](https://www.figma.com/blog/the-linear-method-opinionated-software/)
- [Paul Bancarel — Reproducing Arc Browser's search-bar animation in SwiftUI](https://medium.com/@bancarel.paul/from-concept-to-code-reproducing-arc-browsers-search-bar-animation-in-swiftui-cd9fdb60e7a5)
- [LogRocket — A UX analysis of Arc, Opera, and Edge](https://blog.logrocket.com/ux-design/ux-analysis-arc-opera-edge/)
- [Arc Browser: Rethinking the Web Through a Designer's Lens](https://medium.com/design-bootcamp/arc-browser-rethinking-the-web-through-a-designers-lens-f3922ef2133e)
- [Superhuman Blog — Superhuman is built for speed (the 100ms rule)](https://blog.superhuman.com/superhuman-is-built-for-speed/)
- [Superhuman Blog — How to build a remarkable command palette](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/)
- [Speed Up With Shortcuts — Superhuman Help](https://help.superhuman.com/hc/en-us/articles/45191759067411-Speed-Up-With-Shortcuts)
- [Nothing OS 3.0 — Nothing Intl](https://intl.nothing.tech/pages/nothing-os-3)
- [Wikipedia — Nothing OS](https://en.wikipedia.org/wiki/Nothing_OS)
- [Raycast API — User Interface](https://developers.raycast.com/api-reference/user-interface)
- [Raycast — Your shortcut to everything](https://www.raycast.com/)
- [Lex — Product Hunt](https://www.producthunt.com/products/lex-4)
- [Granola — AI Notepad](https://www.granola.ai/)
- [Wonder Tools — Granola review 2026](https://wondertools.substack.com/p/granolaguide)
- [Intelligent Interfaces — How Granola enhances note-taking](https://intelligentinterfaces.substack.com/p/how-granola-enhances-note-taking)
- [Warp — Modern Terminal](https://www.warp.dev/modern-terminal)
- [Design System Inspired by Warp](https://getdesign.md/warp/design-md)
- [Cultured Code — Things Big and Small](https://culturedcode.com/things/blog/2023/09/things-big-and-small/)
- [Bear Blog — Meet Bear Sans](https://blog.bear.app/2023/08/learn-about-our-new-custom-font-bear-sans/)
- [OpenAI — Sora 2](https://openai.com/index/sora-2/)
- [OpenAI — Shipping Sora for Android with Codex](https://openai.com/index/shipping-sora-for-android-with-codex/)
- [Reflect — Changelog](https://reflect.app/changelog)
- [60fps.design — Amie Calendar View Picker Sheet](https://60fps.design/shots/amie-calendar-view-picker-sheet)
- [Moti — Skeleton component](https://moti.fyi/skeleton)
- [Reactiive — Skeleton animation in React Native with Moti](https://reactiive.io/articles/skeleton-loader)
- [Reanimated — withSpring](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/)
- [Reanimated — Customizing animations](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/customizing-animation/)
- [Reanimated — Shared Element Transitions](https://docs.swmansion.com/react-native-reanimated/docs/shared-element-transitions/overview/)
- [dev.to — React Native Reanimated 3: Ultimate Guide 2025](https://dev.to/erenelagz/react-native-reanimated-3-the-ultimate-guide-to-high-performance-animations-in-2025-4ae4)
- [Expo Haptics](https://docs.expo.dev/versions/latest/sdk/haptics/)
- [Expo Router — Zoom transition](https://docs.expo.dev/router/advanced/zoom-transition/)
- [Mobbin — Empty state UI design](https://mobbin.com/glossary/empty-state)
- [Mobbin — Toast UI design](https://mobbin.com/glossary/toast)
- [LogRocket — Comparing the top React toast libraries (2025)](https://blog.logrocket.com/react-toast-libraries-compared-2025/)
- [Shadcn — Sonner](https://www.shadcn.io/ui/sonner)
- [React Native — Accessibility](https://reactnative.dev/docs/accessibility)
- [OneUptime — How to support screen readers in RN (2026)](https://oneuptime.com/blog/post/2026-01-15-react-native-screen-reader-support/view)
- [Accessibility Checker — React Native Accessibility Best Practices 2025](https://www.accessibilitychecker.org/blog/react-native-accessibility/)
