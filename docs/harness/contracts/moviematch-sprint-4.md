---
sprint: 4
feature: "UI/UX revamp + onboarding taste quiz + social-feed skeleton"
reference_contracts:
  - docs/harness/contracts/moviematch-sprint-1.md
  - docs/harness/contracts/moviematch-sprint-2.md
  - docs/harness/contracts/moviematch-sprint-3.md
reference_plan: "C:/Users/enrique/.claude/plans/expressive-jumping-reddy.md"
reference_research:
  - docs/research/sprint-4-social-product.md
  - docs/research/sprint-4-dopamine.md
  - docs/research/sprint-4-mobile-ux.md

scope:
  # --- Theme migration (close the last 5 screens) ---
  - "Migrate HomeScreen, DetailScreen, MatchesScreen, ProfileSetupScreen, ForgotPasswordScreen from raw colors/sizes to theme tokens (colors/spacing/typography/radii/shadows)."
  - "Fix the 6 Sprint-2-deferred visual issues logged in sprint-3 handoff: (a) DetailScreen light iOS stack header (theme headerStyle + tintColor, or set headerShown:false and render our own ink header), (b) Bottom tab bar blue ▼ selector (tabBarActiveTintColor = accent, tabBarInactiveTintColor = textTertiary, tabBarStyle = ink), (c) SwipeableCard reveal colors keep green/red but source from `colors.success` / `colors.error` not hard-coded #006600/#ff6666, (d) HomeScreen background `#f0f0f0` → `colors.ink` + lime spinner → branded loader (see Dot Loader below), (e) MatchesScreen stark empty state → Phosphor-icon + tinted-circle empty state per mobile-UX brief rule #4, (f) MyCaveScreen header banner seam."

  # --- Motion & animation primitives (locked shared config) ---
  - "Add `theme/motion.ts` exporting two spring configs: `springs.snappy = { damping: 18, stiffness: 220, mass: 0.9 }` (taps/toggles) and `springs.gentle = { damping: 20, stiffness: 140, mass: 1 }` (panels/sheets). Every animated surface in Sprint 4 MUST import from `theme/motion.ts` — no inline spring literals. This is mobile-UX brief Rule #12 (the biggest cohesion lever)."
  - "Add `react-native-reanimated` (Expo SDK 54 bundled) + `moti` + `expo-haptics`. Wire Reanimated's Babel plugin in `babel.config.js`. Keep Fabric (new arch) off for Sprint 4 — shared-element transitions ship behind a feature flag in Sprint 5+."
  - "Add a single `components/DotLoader.tsx` — paired 8px magenta+yellow dots, 900ms cross-fade + spring scale pulse. Replace every `<ActivityIndicator>` in the app. One motion motif per Nothing-OS pattern (mobile-UX brief Rule #13 / Stretch S4)."

  # --- Onboarding taste quiz (the headline new feature) ---
  - "Build `screens/TasteQuizScreen.tsx` — 7 movie-poster A/B pairs over 8 taste axes (pacing, era, mood, stakes, tone, genre-fluency, realism, runtime). Each pair is two posters, no Likert, no tiebreak. Dopamine brief Rule #1: no 'skip' before pair 4; progress indicator ('4 of 7') appears at pair 4, not before. Chosen poster lifts on z-axis; unchosen dims to 40% opacity over 180ms with `Haptics.selectionAsync()`."
  - "At quiz completion, write `tasteProfile` into the user doc: `{ axes: { pacing: -1..1, era: -1..1, ... }, labels: { common: string, rare: string }, completedAt: timestamp }`. The two identity labels (one common 'tribal belonging', one rare 'distinctiveness') follow optimal-distinctiveness theory from the social-product brief Bonus finding + dopamine brief Rule #10."
  - "Post-quiz 'read-back' screen (the Peak moment per dopamine brief Rule #2): one sentence in Letterboxd-voice using the two labels, e.g. *'You lean slow, strange, and low-stakes. Let's find you some people.'* Hold ~800ms then CTA appears. Copy is template-driven (no LLM call this sprint — Sprint 5 adds AI voice-tuning)."
  - "Quiz is shown to users whose `tasteProfile` field is absent, AFTER ProfileSetup and BEFORE first deck render. Route: add `TasteQuiz` to the existing ProfileSetup stack so the flow is Profile → Quiz → Main. Skip to Main if `tasteProfile` already exists. Idempotent."

  # --- Stories-strip + activity-feed scaffolding (empty until Sprint 5) ---
  - "Add `components/StoriesStrip.tsx` — a horizontal strip above the HomeScreen deck. Currently-empty state shows ONE self-referential card: user's own avatar + their two taste labels. Tap → re-enters deck. Never show a literal 'no stories' empty state (mobile-UX Rule #5, social-product brief #3). Dopamine brief Rule #5: the strip is self-referential when empty."
  - "Add `components/ActivityFeed.tsx` — a vertical list section below the deck (or on the Matches tab for now; generator picks based on layout fit). Empty state uses Phosphor icon + tinted circle + microcopy ('Your friends' last watches will show up here. Invite Maya, Nico, or Sam →' style) + 1-tap invite CTA. Per Warp pattern (mobile-UX brief Rule #15), activity rows reserve a 1-2px left accent bar slot for future match/like/ambient state encoding."
  - "Both components render real-shape data when Sprint 5 lands. For Sprint 4, emit clean empty states with the pseudo-friend seed (below) available for preview/testing."

  # --- Pseudo-friend seed (solo-activation cold start) ---
  - "Add `utils/pseudoFriends.ts` exporting 3 transparent curated personas (e.g. 'The Criterion-pilled', 'The Sunday rom-com', 'The 3am sci-fi'). Each persona has a baked `tasteProfile` and a color avatar (no AI generation, no external images — ink background + accent letter + label). Used by the StoriesStrip empty state and the pre-Sprint-5 match% preview slot. Persona identity is always visible ('curated profile') — never impersonate a real user (dopamine brief Rule #4)."

  # --- Loading / empty / error / toast infrastructure ---
  - "Add `components/Toast/` — Sonner-style bottom-placement toasts: auto-dismiss 4s success / 6s error, swipe-down to dismiss, stack with 8px parallax offset. Use `react-native-toast-message` wrapped, or a thin Reanimated implementation. Every toast calls `Haptics.notificationAsync(Success|Error)` on fire — not on informational toasts. Mobile-UX brief Rules #7-8."
  - "Add `components/Skeleton/` — Moti-based pulse (opacity 0.45 → 0.85 at ~1.3Hz, `Easing.inOut(Easing.ease)`). Skeleton geometry matches final layout within ~4px. Skeletons render INLINE (chrome stays real); no full-screen replacements. Mobile-UX brief Rules #1-3."
  - "Wire skeletons into HomeScreen (deck preload), DetailScreen (hero + meta), MyCaveScreen (watchlist grid), MatchesScreen (list rows). Kill every lingering `ActivityIndicator` — replaced by DotLoader for button/inline spinners + Skeleton for whole-region loads."
  - "Unify empty states across 6 surfaces per the dopamine brief §5.2 matrix: deck-exhausted, activity-feed-no-friends, stories-strip-no-stories (self-referential), no-matches-yet, search-no-results, network/error. All use the same voice rules: declarative, second-person, present tense, no exclamation points, no user-blame, max 12 words body."
  - "Error banners are INLINE at top of affected region — never modal. Single bolded verb CTA ('Retry'), muted secondary ('Report'). Auto-dismiss on success. Mobile-UX Rule #6."

  # --- Accessibility pass ---
  - "Every interactive component gets `accessibilityLabel` + `accessibilityRole`. Every gesture-based interaction (swipe card left/right/up) gets an `accessibilityHint` describing the button alternative. Mobile-UX Rule #16."
  - "Tap targets ≥44pt across the app (auditable via `minHeight: 44` on Pressable/TouchableOpacity + spacing check). Loading regions use `accessibilityLiveRegion='polite'`."
  - "Contrast audit: no hardcoded `#FFFFFF` in screens (must use `colors.textHigh`); foreground on `colors.accent` and `colors.accentSecondary` MUST be `accentForeground` (ink), per theme/index.ts doc block — Sprint 4 must not regress."

  # --- DetailScreen YouTube trailer fix ---
  - "Replace the WebView-based trailer embed on DetailScreen with `react-native-youtube-iframe` (stated in Sprint 3 handoff as likely fix for Error 153). Preserve existing graceful no-trailer fallback. Validate via manual smoke: open a title with a known YouTube video key; trailer plays inline."

  # --- Auth redesign pass 2 ---
  - "Revisit LoginScreen + RegisterScreen (already on theme from Sprint 2 — this is visual polish pass 2, not re-migration). Apply the new motion primitives (springs.snappy for button press states, springs.gentle for keyboard avoidance). Add `accessibilityLabel` to every input. Ensure submit buttons show in-flight state with DotLoader inline."

  # --- Commit discipline ---
  - "Commit per logical chunk with conventional-commit prefixes. Target ≥10 commits across the sprint so regressions are bisectable."

out_of_scope:
  # --- Sprint 5 (viral core) — STRICTLY excluded ---
  - "Match% computation logic (Sprint 5 — only the display-component scaffold and framing vocabulary is in scope this sprint)"
  - "Friend graph / friendships collection (Sprint 5)"
  - "Shared watch queues (Sprint 5)"
  - "Deep-linked rec cards / universal links / Firebase Hosting (Sprint 5)"
  - "AI-powered 'Why you match' / Gemini / Haiku LLM calls (Sprint 5)"
  - "Shareable match card image generation via Skia / view-shot (Sprint 5)"
  - "Split users/{uid} into public/private profile docs (Sprint 5)"
  - "Profile image upload / Firebase Storage (Sprint 5)"

  # --- Sprint 6+ ---
  - "Hybrid recommendation engine (Sprint 6)"
  - "Watch-together scheduling (Sprint 6)"
  - "Real push-notification scheduling — only the architecture note is captured this sprint (Sprint 6-7)"
  - "EAS Build / TestFlight / Sentry / Analytics (Sprint 7)"

  # --- Anti-patterns explicitly forbidden (design lock) ---
  - "Streaks, badges, XP, levels, points, leaderboards — forbidden per dopamine brief Rule #8. Do not ship any such surface. If a PR proposes one, reject with 'anti-pattern per brief'."
  - "Follow-celebrities feature, public global feed, 'Popular' tab (plan anti-patterns)"
  - "Instagram-style 24h-decay ephemeral stories (social-product brief Rule #3 — we build persistent friend-activity strip, not ephemeral stories)"
  - "Variable-ratio / randomized push scheduling (dopamine brief Rule #9 — deterministic push only, no `Math.random()` feeding any scheduler)"
  - "Bouncy-overshoot springs (mobile-UX Rule #12 — snappy-not-Disney)"
  - "Custom hand-drawn empty-state illustrations (mobile-UX Rule #5 — Phosphor + tinted circle only)"
  - "Rank-framed match% copy ('73% compatible') — only bridge-framed ('you both love quiet sci-fi') — dopamine Rule #10"
  - "Modal error dialogs (mobile-UX Rule #6 — inline banners only)"
  - "Hardcoded `#FFFFFF` in screen styles (theme Rule — must use `colors.textHigh`)"
  - "New `any` additions in `utils/` or `services/` backbone (Sprint 3 lock — zero-any backbone)"
  - "Dropping TypeScript strict or adding `// @ts-nocheck` without a `reason:` comment (Sprint 3 lock)"

  # --- Infra — defer unless blocking ---
  - "Firestore rules deployment (user task)"
  - "Firebase Web API key tightening (user task)"
  - "Real WorkSans-SemiBold.ttf font file (low priority)"

success_criteria:
  # =====================================================================
  # FUNCTIONAL HARD THRESHOLDS (14)
  # Same verify-on-runtime-shape discipline established in Sprints 2-3.
  # =====================================================================

  # --- Build & quality gates (don't regress Sprint 3) ---
  - criterion: "TypeScript strict: `tsc --noEmit` passes with zero errors."
    threshold: hard
    verify_command: "npx tsc --noEmit"

  - criterion: "ESLint: 0 errors and 0 warnings (do not regress the Sprint 3 baseline of 0 warnings)."
    threshold: hard
    verify_command: "npx eslint . --format compact"

  - criterion: "Prettier --check passes across the repo."
    threshold: hard
    verify_command: "npx prettier --check ."

  - criterion: "expo-doctor passes 17/17."
    threshold: hard
    verify_command: "npx expo-doctor"

  - criterion: "Jest green in CI mode; at least 26 passing assertions preserved from Sprint 3; every new module with non-trivial logic (pseudoFriends, tasteProfile reducer, toast, skeleton, motion springs export) has at least a smoke test."
    threshold: hard
    verify_command: "npm test -- --ci --json --outputFile=/tmp/jest-result.json && node -e \"const r=require('/tmp/jest-result.json'); if(!r.success){console.error('FAIL jest');process.exit(1)} const a=r.testResults.reduce((s,t)=>s+(t.assertionResults||[]).filter(x=>x.status==='passed').length,0); if(a<26){console.error('FAIL: only',a,'passing assertions (Sprint 3 baseline 26)');process.exit(1)} console.log('OK',a)\""

  # --- Theme migration completeness ---
  - criterion: "No hardcoded `#FFFFFF` or `#ffffff` bleed in screens/, components/, or navigation/ (theme text MUST route through `colors.textHigh`). Exception: splash-screen native configuration files are not part of these trees."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); const walk=(d)=>{let r=[]; if(!fs.existsSync(d)) return r; for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name==='node_modules'||e.name==='.git') continue; const p=path.join(d,e.name); if(e.isDirectory()) r=r.concat(walk(p)); else if(/\\.(ts|tsx)$/.test(e.name)) r.push(p)} return r}; const dirs=['screens','components','navigation']; let bad=[]; for(const d of dirs){for(const f of walk(d)){const src=fs.readFileSync(f,'utf8'); const lines=src.split(/\\r?\\n/); lines.forEach((ln,i)=>{const hit=/(['\\\"#])(#[Ff][Ff][Ff][Ff][Ff][Ff]|#[Ff][Ff][Ff])(['\\\"])/.test(ln)||/['\\\"]#[Ff][Ff][Ff][Ff][Ff][Ff]['\\\"]/.test(ln); if(hit){bad.push(f+':'+(i+1)+'  '+ln.trim().slice(0,80))}})}} if(bad.length){console.error('FAIL hardcoded white (use colors.textHigh):\\n'+bad.join('\\n'));process.exit(1)} console.log('OK')\""

  - criterion: "No Sprint-2-era hardcoded lime `#00ff00` / `#00FF00` spinner color, no `#f0f0f0` background, no `#006600` / `#ff6666` reveal hex — theme must source semantic success/error for swipe reveals."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); const walk=(d)=>{let r=[]; if(!fs.existsSync(d)) return r; for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name==='node_modules'||e.name==='.git') continue; const p=path.join(d,e.name); if(e.isDirectory()) r=r.concat(walk(p)); else if(/\\.(ts|tsx)$/.test(e.name)) r.push(p)} return r}; const dirs=['screens','components','navigation']; const banned=[/['\\\"]#00[Ff][Ff]00['\\\"]/,/['\\\"]#006600['\\\"]/,/['\\\"]#[Ff][Ff]6666['\\\"]/,/['\\\"]#f0f0f0['\\\"]/i]; let bad=[]; for(const d of dirs){for(const f of walk(d)){const src=fs.readFileSync(f,'utf8'); banned.forEach(re=>{if(re.test(src)){bad.push(f+' :: '+re)}})}} if(bad.length){console.error('FAIL legacy hex leaks still present:\\n'+bad.join('\\n'));process.exit(1)} console.log('OK')\""

  # --- Taste quiz present & wired ---
  - criterion: "`screens/TasteQuizScreen.tsx` exists with 8 taste axes referenced, renders at least 7 A/B pairs, writes `tasteProfile` (with `labels.common` + `labels.rare`) via firebaseOperations, and is declared in navigation/types.ts as a route in the ProfileSetupStack."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'); const p='screens/TasteQuizScreen.tsx'; if(!fs.existsSync(p)){console.error('FAIL: TasteQuizScreen missing');process.exit(1)} const src=fs.readFileSync(p,'utf8'); const axes=['pacing','era','mood','stakes','tone','realism','runtime']; const missing=axes.filter(a=>!src.toLowerCase().includes(a)); if(missing.length>2){console.error('FAIL: quiz missing axes '+missing.join(','));process.exit(1)} if(!/tasteProfile/.test(src)){console.error('FAIL: quiz does not reference tasteProfile');process.exit(1)} if(!/labels/.test(src)){console.error('FAIL: quiz does not produce labels');process.exit(1)} const nav=fs.readFileSync('navigation/types.ts','utf8'); if(!/TasteQuiz/.test(nav)){console.error('FAIL: TasteQuiz route not declared in navigation/types.ts');process.exit(1)} console.log('OK')\""

  - criterion: "firebaseOperations exposes `writeTasteProfile(uid, tasteProfile)` and `fetchTasteProfile(uid)`; both typed, both unit-tested (smoke-level at minimum)."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'); const src=fs.readFileSync('utils/firebaseOperations.ts','utf8'); const need=['writeTasteProfile','fetchTasteProfile']; const missing=need.filter(n=>!src.includes('export')||!new RegExp('export[^\\\\n]*'+n).test(src)); if(missing.length){console.error('FAIL: firebaseOperations missing exports: '+missing.join(','));process.exit(1)} const fsAll=require('fs'); const path=require('path'); const walk=(d)=>{let r=[]; if(!fsAll.existsSync(d)) return r; for(const e of fsAll.readdirSync(d,{withFileTypes:true})){if(e.isDirectory()) r=r.concat(walk(path.join(d,e.name))); else if(/\\.test\\.tsx?$/.test(e.name)) r.push(path.join(d,e.name))} return r}; const tests=walk('.').filter(f=>!f.includes('node_modules')); const tasteTestFound=tests.some(f=>fsAll.readFileSync(f,'utf8').includes('writeTasteProfile')||fsAll.readFileSync(f,'utf8').includes('tasteProfile')); if(!tasteTestFound){console.error('FAIL: no test covers tasteProfile write/read');process.exit(1)} console.log('OK')\""

  # --- Motion / animation primitives ---
  - criterion: "`theme/motion.ts` exports exactly two named springs: `snappy` (damping 18, stiffness 220) and `gentle` (damping 20, stiffness 140). No other spring literals in the codebase outside this file."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); const p='theme/motion.ts'; if(!fs.existsSync(p)){console.error('FAIL: theme/motion.ts missing');process.exit(1)} const src=fs.readFileSync(p,'utf8'); if(!/snappy/.test(src)||!/gentle/.test(src)){console.error('FAIL: motion.ts missing snappy/gentle');process.exit(1)} if(!/damping:\\s*18/.test(src)||!/stiffness:\\s*220/.test(src)){console.error('FAIL: snappy config wrong');process.exit(1)} if(!/damping:\\s*20/.test(src)||!/stiffness:\\s*140/.test(src)){console.error('FAIL: gentle config wrong');process.exit(1)} const walk=(d)=>{let r=[]; if(!fs.existsSync(d)) return r; for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name==='node_modules'||e.name==='.git'||e.name==='theme') continue; const q=path.join(d,e.name); if(e.isDirectory()) r=r.concat(walk(q)); else if(/\\.(ts|tsx)$/.test(e.name)) r.push(q)} return r}; const others=walk('.').filter(f=>/withSpring\\(|SpringConfig|damping:/.test(fs.readFileSync(f,'utf8'))); const leaks=others.filter(f=>!/from ['\\\"]\\.{1,2}\\/theme\\/motion['\\\"]/.test(fs.readFileSync(f,'utf8'))&&!/from ['\\\"]\\.{0,2}theme\\/motion['\\\"]/.test(fs.readFileSync(f,'utf8'))&&/damping:/.test(fs.readFileSync(f,'utf8'))); if(leaks.length){console.error('FAIL: inline spring literals outside theme/motion.ts in: '+leaks.join(','));process.exit(1)} console.log('OK')\""

  # --- One-motif loader / DotLoader replaces ActivityIndicator ---
  - criterion: "`components/DotLoader.tsx` exists; no `ActivityIndicator` import remains in screens/ or components/ trees (every inline spinner routes through DotLoader)."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); if(!fs.existsSync('components/DotLoader.tsx')){console.error('FAIL: DotLoader missing');process.exit(1)} const walk=(d)=>{let r=[]; if(!fs.existsSync(d)) return r; for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name==='node_modules') continue; const p=path.join(d,e.name); if(e.isDirectory()) r=r.concat(walk(p)); else if(/\\.tsx?$/.test(e.name)&&!/DotLoader/.test(e.name)) r.push(p)} return r}; let bad=[]; for(const d of ['screens','components']){for(const f of walk(d)){const s=fs.readFileSync(f,'utf8'); if(/import[^;]*ActivityIndicator[^;]*from ['\\\"]react-native['\\\"]/.test(s)||/<ActivityIndicator\\b/.test(s)){bad.push(f)}}} if(bad.length){console.error('FAIL: ActivityIndicator still used in: '+bad.join(','));process.exit(1)} console.log('OK')\""

  # --- Toast + skeleton infrastructure ---
  - criterion: "`components/Toast/` and `components/Skeleton/` directories exist with index.ts(x); at least one component exports a usable render surface from each."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'); const must=['components/Toast','components/Skeleton']; for(const d of must){if(!fs.existsSync(d)){console.error('FAIL: '+d+' missing');process.exit(1)} const idx=['index.ts','index.tsx'].map(x=>d+'/'+x).find(x=>fs.existsSync(x)); if(!idx){console.error('FAIL: '+d+'/index missing');process.exit(1)} const src=fs.readFileSync(idx,'utf8'); if(!/export/.test(src)){console.error('FAIL: '+idx+' no exports');process.exit(1)}} console.log('OK')\""

  - criterion: "Runtime-deps additions: `react-native-reanimated`, `moti`, `expo-haptics`, `react-native-youtube-iframe` (or equivalent trailer lib) present in package.json dependencies. Reanimated Babel plugin wired in `babel.config.js`."
    threshold: hard
    verify_command: "node -e \"const p=require('./package.json'); const deps={...p.dependencies}; const must=['react-native-reanimated','moti','expo-haptics']; const missing=must.filter(k=>!deps[k]); if(missing.length){console.error('FAIL: missing runtime deps: '+missing.join(','));process.exit(1)} const trailer=deps['react-native-youtube-iframe']||deps['react-native-youtube']||deps['@react-native-community/youtube']; if(!trailer){console.error('FAIL: no youtube trailer library');process.exit(1)} const fs=require('fs'); const babel=fs.readFileSync('babel.config.js','utf8'); if(!/react-native-reanimated\\/plugin/.test(babel)){console.error('FAIL: reanimated plugin not in babel.config.js');process.exit(1)} console.log('OK')\""

  # --- Anti-pattern lock: no streaks/badges/points/levels/XP in source ---
  - criterion: "No streaks, badges, XP, levels, points, leaderboards, or `Math.random()` feeding any scheduling/push surface. Code greppable anti-pattern guard — dopamine brief Rules #8 and #9."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); const walk=(d)=>{let r=[]; if(!fs.existsSync(d)) return r; for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name==='node_modules'||e.name==='.git'||e.name==='docs'||e.name==='.expo') continue; const p=path.join(d,e.name); if(e.isDirectory()) r=r.concat(walk(p)); else if(/\\.(ts|tsx)$/.test(e.name)) r.push(p)} return r}; const files=walk('.'); const banned=[/\\b(streak|streaks|badge|badges|leaderboard|XpPoints|xpPoints)\\b/i, /\\b(levelUp|levelUp|earnXP|awardBadge|updateStreak)\\b/]; let bad=[]; for(const f of files){const src=fs.readFileSync(f,'utf8'); for(const re of banned){if(re.test(src)){bad.push(f+' :: '+re)}}} if(bad.length){console.error('FAIL: anti-pattern naming leak:\\n'+bad.join('\\n'));process.exit(1)} const schedulers=files.filter(f=>/notification|schedule|push/i.test(f)&&!/test/i.test(f)); const randLeaks=schedulers.filter(f=>/Math\\.random\\(\\)/.test(fs.readFileSync(f,'utf8'))); if(randLeaks.length){console.error('FAIL: Math.random() in push/notification scheduler:\\n'+randLeaks.join('\\n'));process.exit(1)} console.log('OK')\""

  # --- Accessibility floor ---
  - criterion: "Every `<Pressable>` and `<TouchableOpacity>` in screens/ and components/ has an `accessibilityLabel` OR `accessibilityHint` OR `accessible={false}` (justified opt-out). Mobile-UX brief Rule #16."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); const walk=(d)=>{let r=[]; if(!fs.existsSync(d)) return r; for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name==='node_modules') continue; const p=path.join(d,e.name); if(e.isDirectory()) r=r.concat(walk(p)); else if(/\\.tsx$/.test(e.name)) r.push(p)} return r}; let total=0,unlabeled=0; const pattern=/<(Pressable|TouchableOpacity)([^>]*)>/g; for(const f of walk('screens').concat(walk('components'))){const src=fs.readFileSync(f,'utf8'); let m; while((m=pattern.exec(src))){total++; const attrs=m[2]||''; if(!/accessibilityLabel|accessibilityHint|accessible\\s*=\\s*\\{false\\}/.test(attrs)){unlabeled++}}} if(total===0){console.log('OK (no interactive components found)');process.exit(0)} const pct=unlabeled/total; if(pct>0.1){console.error('FAIL: '+unlabeled+'/'+total+' interactive elements missing accessibility props ('+(pct*100).toFixed(0)+'%) — must be ≤10%');process.exit(1)} console.log('OK',unlabeled+'/'+total+' unlabeled ('+(pct*100).toFixed(0)+'%)')\""

  # =====================================================================
  # DESIGN CRITERIA (scored 0-10 by evaluator; UI-sprint specific)
  # =====================================================================

design_criteria:
  - name: "Design Quality"
    weight: 35
    pass_threshold: 7
    rubric: |
      Score the visual quality of the app after Sprint 4 on a 0-10 scale.
      - 10 = indistinguishable from a 2026 flagship (Linear, Arc, Granola tier).
      - 7 = confidently modern; mobile-UX brief Rules #1-#16 all visibly applied.
      - 5 = clean but generic; could be any React Native app from 2023.
      - <5 = visible theme drift, hardcoded colors, or Sprint 2 baseline not improved.

      Evaluator judges on at minimum: (a) the 5 newly-themed screens hold dual-accent
      palette cleanly on ink, (b) typography follows the 3-size / 2-weight Linear rule,
      (c) motion is spring-crisp not bouncy, (d) the DotLoader carries brand recall,
      (e) skeletons match final layout within ~4px.

  - name: "Originality"
    weight: 25
    pass_threshold: 7
    rubric: |
      How distinct is this from a generic dating/swipe/review app?
      - 10 = clear signature moves (stretch S1 haptic-synced swipe threshold, S4 one-motif
        loader, self-referential empty stories — mobile-UX brief stretch picks).
      - 7 = dual-accent + Dot motif executed + taste-quiz poster pairs feel specific.
      - 5 = competent but unmemorable.
      - <5 = reads as a Tinder clone with movie posters.

      Evaluator checks for: (a) DotLoader motif appearing consistently across surfaces,
      (b) the two-identity-label readback voice, (c) the self-referential empty state
      on stories-strip, (d) at least ONE stretch move from the mobile-UX brief taken.

  - name: "Craft"
    weight: 25
    pass_threshold: 7
    rubric: |
      Staff-engineer-grade polish: the details a 2026 flagship gets right.
      - 10 = perfect theme discipline, zero hardcoded hex, consistent spacing rhythm (56-64px
        row density, 12px internal pad, 8%-opacity dividers per Warp), motion synced to haptics,
        no visible regressions from Sprint 3 baseline.
      - 7 = very few nits; most rules applied consistently.
      - 5 = several visible inconsistencies; spacing/density drifts per screen.
      - <5 = sloppy.

      Evaluator verifies: (a) theme/motion.ts is the ONLY spring source (verify_command enforces),
      (b) no rogue `ActivityIndicator` imports (verify_command enforces), (c) accessibilityLabel
      coverage (verify_command enforces), (d) tap-target ≥44pt on screens spot-checked.

  - name: "Functionality"
    weight: 15
    pass_threshold: 8
    rubric: |
      Does the sprint's new behavior actually work end-to-end?
      - 10 = every scoped surface works on first cold-boot run; taste quiz writes profile;
        DetailScreen plays trailer; stories-strip and activity-feed render correctly empty;
        toasts fire on all async paths; no new crashes.
      - 8 = one minor behavior gap the user can describe in ≤1 sentence.
      - <8 = a scoped behavior is missing or broken → HARD_FAIL.

      Evaluator runs the manual iPhone smoke (below) to score this criterion.

# =====================================================================
# MANUAL SMOKE — iPhone Expo Go (scripted regression guard + UI sprint primary arbiter)
# =====================================================================

success_criteria_manual:
  - criterion: "Manual iPhone smoke on Expo Go — the UI-sprint primary arbiter."
    threshold: hard
    verify_command: |
      manual: user runs `npx expo start --tunnel`, scans QR on iPhone Expo Go SDK 54,
      completes this 12-step regression + new-feature checklist:

      Regression (Sprint 3 guard):
        1. App boots clean. No redbox, no WebView warnings blocking the screen.
        2. Login existing account → lands on Home deck without crash.
        3. Swipe right adds to My Cave; swipe left does not.
        4. Tap a title → DetailScreen renders; back is smooth.
        5. Swipe past 20 titles without dead-end (pagination fires).
        6. Sign out + sign back in cycle — NavigationBar does not crash.

      Sprint 4 new:
        7. On a fresh register (or with tasteProfile nulled via Firestore console), the
           TasteQuiz appears after ProfileSetup and before Main. 7 poster pairs. Progress
           indicator appears at pair 4. Haptic selection fires on each pick.
        8. Quiz completes with a one-sentence read-back using the two identity labels;
           then user lands on Home deck.
        9. HomeScreen uses the inky palette (no gray `#f0f0f0`); spinner is the DotLoader,
           not a lime `#00ff00` wheel.
       10. DetailScreen header is dark + themed (no light iOS default); trailer plays
           (or falls back gracefully when no trailer); MatchesScreen has a proper
           Phosphor-icon empty state; bottom-tab selector is accent-yellow not blue.
       11. Stories-strip above the deck shows the user's own avatar + two taste labels
           (self-referential empty state). Activity feed (Matches tab) shows a proper
           empty state with Phosphor icon + invite CTA.
       12. Trigger one error (airplane mode then tap a refresh) — error renders as an
           inline banner, not a modal dialog; retry works once online.

pivot_after_failures: 2

notes:
  - "Sprint 3 closed at commit 514c59b (poster_path fix landed after the handoff was written — no scope change, cleanup follow-up). Main is clean and pushed to origin."
  - "This sprint is UI-dominant; the evaluator MUST run on a real device via manual smoke to score Design Quality, Originality, Craft, and Functionality. Automated hard thresholds are the floor — they prevent regression but they do not score craft."
  - "Follow Sprint 3's lesson: evaluator-specified surgical fixes → main thread, not generator re-dispatch. Generator takes the sprint as a cohesive block; evaluator fix-ups flow back to the main thread for surgical application."
  - "The contract distills the 12,000-word R&D briefs into the non-negotiable rules above. Generator should still read the briefs before starting — they carry the 'why' behind each rule. Briefs live at docs/research/sprint-4-*.md."
  - "Motion primitives (theme/motion.ts) land FIRST in the generator's work order so the rest of the sprint's animations can import from day one. This is the lowest-regret ordering."
  - "The quiz can use real TMDB posters (fetch a small curated pool at build-time or lazy-fetch) — prefer not to ship poster images in the repo binary tree. The 7 A/B poster pairs are chosen to cover the 8 axes; pair 7 can cover two axes (runtime + mood, e.g.) if needed."
  - "tasteProfile axes use -1..1 scale (signed continuous) rather than categorical — Sprint 5 match% computes as dot-product over axis vectors."
  - "`writeTasteProfile` / `fetchTasteProfile` go in utils/firebaseOperations.ts alongside existing backbone ops. Backbone zero-`any` discipline stays."
  - "Stretch moves: if time permits after the mandatory scope, the mobile-UX brief stretch list (S1 haptic-synced swipe threshold, S4 one-motif loader — actually a must-have per DotLoader criterion — S5 stories-strip tactile pause) are optional. S2 morphing search-bar and S3 shared-element transitions are Sprint 5+."
  - "Windows 11 host, bash (Git Bash) shell, Node 20 via .nvmrc. CI target is Node 20 ubuntu-latest."
  - "If the generator encounters a real blocker (dep conflict, Reanimated v4 + Expo SDK 54 interaction, Moti incompatibility), STOP and add a note to this contract's `notes:` section in a follow-up commit. Do not work around silently."

# =====================================================================
# Evaluator expectations
# =====================================================================
#
# For each `hard` success_criterion: run verify_command, report pass/fail + evidence.
#
# For each design_criterion: score 0-10 against the rubric. If any score < pass_threshold
# for that criterion → HARD_FAIL.
#
# Run the manual iPhone smoke as the 15th hard criterion. Relay steps to user and record
# the checklist.
#
# Final verdict: PASS | SOFT_FAIL | HARD_FAIL.
#
# Also answer: "Would a staff engineer approve this? Is there a more elegant way?" with
# at least 3 specific observations pointing at files:line.
#
# Two consecutive HARD_FAILs on Sprint 4 → escalate to planner per harness-workflow Step 4.
#
---

# Sprint 4 — UI/UX revamp + taste quiz + social-feed skeleton

## Context for the generator

You are picking up MovieMatchApp immediately after Sprint 3 closed.

Source-of-truth handoff: `docs/handoffs/sprint-3.md` ("Sprint 3 CLOSED, Sprint 4 starts here").

Sprints 1-3 delivered:
- Runs on iPhone Expo Go SDK 54, lint-clean, 0 CVEs, source-of-truth env.
- 8 runtime bugs fixed (watchlist split-brain closed, pagination wired,
  NavigationBar null-guarded, LoginScreen submit state, etc.).
- `theme/index.ts` locked with dual-accent palette: laser-lemon `#FBEC5D`
  + hot-magenta `#FF3E9E` on cool-ink `#0A0A12`. 9 typography presets.
  Radii, shadows, `colors.matchGradient`.
- 3 screens already migrated to theme tokens: Login, Register, MyCave.
- Full TypeScript strict migration (utils → services → context →
  components → screens → navigation → App). Zero `any` in backbone.
- Jest + jest-expo + RNTL with Firebase mocked in `jest.setup.ts`.
  6 test surfaces, 26 passing assertions + 1 Sprint 5 skip.
- GitHub Actions CI: typecheck + lint + prettier-check + test on every
  push + PR. Workflow file at `.github/workflows/ci.yml`.
- Icons are phosphor-react-native (Sprint 2 swap). Navigation fully
  typed via `navigation/types.ts` (RootStackParamList, AuthStackParamList,
  HomeStackParamList, MyCaveStackParamList, ProfileSetupStackParamList,
  MainTabsParamList, plus `SharedProfileParams` for the two routes that
  render ProfileSetupScreen).

Your job THIS sprint is 5 tightly coupled things:

1. **Theme everywhere + 6 visual fixes** — migrate the last 5 screens to
   tokens and resolve the 6 Sprint-2-deferred visual nits. Zero hardcoded
   `#FFFFFF`, `#00ff00`, `#f0f0f0`, `#006600`, `#ff6666` in screens/components.

2. **Motion & haptics primitives** — `theme/motion.ts` with exactly two
   springs (snappy + gentle); `components/DotLoader.tsx` replacing every
   `ActivityIndicator`; Moti skeletons; Sonner-style toasts. Haptics fire
   on 4 events only: swipe commit, match% reveal placeholder, rec card
   send placeholder, day-complete — per dopamine brief Rule #7.

3. **Onboarding taste quiz** — 7 A/B poster pairs over 8 taste axes, no
   skip until pair 4, progress indicator at pair 4, haptic + animation
   on pick, post-quiz one-sentence read-back using TWO identity labels
   (common + rare). Writes `tasteProfile` to user doc. Route added to
   `ProfileSetupStackParamList`.

4. **Stories-strip + activity-feed scaffolding** — real empty states now,
   hooked up for Sprint 5 data later. Stories-strip is self-referential
   when empty (user's own avatar + labels). Activity feed has
   Phosphor-icon empty state with invite CTA. Pseudo-friend seed for
   solo-session match% preview is in `utils/pseudoFriends.ts`.

5. **DetailScreen YouTube fix + accessibility pass** — replace the
   WebView trailer with `react-native-youtube-iframe`. Every interactive
   element gets accessibility props. Tap targets ≥44pt. Live region on
   loading surfaces.

You are NOT building Sprint 5 (match% logic, friend graph, shared queues,
rec cards, AI surfaces). See `out_of_scope` above — treat it as a hard
fence. The R&D briefs explicitly list the anti-patterns (streaks, badges,
XP, rank-framed match%, variable-ratio push, custom illustrations, modal
error dialogs) — those are forbidden.

## R&D-brief non-negotiable rules (distilled)

From the 3 briefs at `docs/research/sprint-4-*.md`:

1. Variable-ratio reward is category-toxic in 2026 — no slot-machine loops.
   Pattern: predictable cadence, unpredictable payload. This sprint only
   builds the architectural space for it; Sprint 7 wires real push. No
   `Math.random()` in any scheduler module.
2. Haptic-visual delay must be <30ms (fire on visual peak, not input).
3. Match% is framed as a BRIDGE ("you both love quiet sci-fi"), never a
   rank. Copy rule. Enforce in any copy strings generator ships.
4. Solo first-session activation uses a transparent curated pseudo-friend
   seed — never impersonate a real user.
5. Dual identity labels (common + rare) per user from the quiz.
6. Empty states: Phosphor icon on tinted circle + microcopy. No
   hand-illustrations.
7. Left-accent bar (1-2px) on activity rows encodes state without chrome.
8. One motion motif (DotLoader) everywhere.
9. Two-spring theme (snappy d18/s220 + gentle d20/s140) applied app-wide.
10. Accessibility floor: 44pt tap targets, accessibilityLabel/Hint on all
    interactive components, WCAG AA contrast, live regions on loaders.
11. No streaks / badges / XP / levels / points / leaderboards.
12. Stories-strip is persistent friend-activity, not ephemeral 24h decay
    Instagram pattern.

## Generator execution order (recommended)

Land motion + loader primitives FIRST so downstream work imports from
day one:

1. `theme/motion.ts` (snappy + gentle springs, no other exports).
2. `components/DotLoader.tsx` (two-dot magenta+yellow motif).
3. `components/Skeleton/` (Moti skeleton wrapper + index exports).
4. `components/Toast/` (Sonner-style + haptics integration).
5. Theme migration of 5 remaining screens (HomeScreen → DetailScreen →
   MatchesScreen → ProfileSetupScreen → ForgotPasswordScreen). One
   commit per screen. Replace every rogue hex + `ActivityIndicator` +
   modal dialog + hardcoded `#FFFFFF` as you touch each file.
6. 6 Sprint-2-deferred visual fixes (in the screens you're touching anyway).
7. `utils/pseudoFriends.ts` (3 curated personas with baked tasteProfiles).
8. `screens/TasteQuizScreen.tsx` + `writeTasteProfile` / `fetchTasteProfile`
   in firebaseOperations + navigation/types.ts route declaration + wire
   into ProfileSetup stack.
9. `components/StoriesStrip.tsx` + `components/ActivityFeed.tsx`
   (scaffold with empty states, no live data).
10. DetailScreen YouTube trailer fix (react-native-youtube-iframe).
11. Accessibility pass across all screens + components.
12. Auth redesign pass 2 (LoginScreen + RegisterScreen with motion primitives).
13. Jest tests: motion.ts exports, DotLoader renders, Toast fires,
    Skeleton renders, TasteQuiz writes profile, pseudoFriends shape,
    StoriesStrip empty render, ActivityFeed empty render. Keep green.
14. CRLF audit + prettier --write . if needed before the final commit.
15. Typecheck + lint + test before every commit; commit per logical
    chunk (target ≥10 commits).

## Test strategy

New Jest coverage targets:

| Module | File | Minimum assertion |
|---|---|---|
| motion.ts | `__tests__/motion.test.ts` | snappy + gentle export with exact damping/stiffness values |
| DotLoader | `__tests__/DotLoader.test.tsx` | renders without crash |
| Toast | `__tests__/Toast.test.tsx` | fires with success/error variants |
| Skeleton | `__tests__/Skeleton.test.tsx` | renders with specified dimensions |
| TasteQuiz | `__tests__/TasteQuizScreen.test.tsx` | renders pair 1; pressing a poster progresses to pair 2; completion writes tasteProfile with `labels.common` + `labels.rare` fields |
| firebaseOperations taste | `__tests__/firebaseOperations.test.ts` (extend existing) | writeTasteProfile writes to correct path; fetchTasteProfile returns the written shape |
| pseudoFriends | `__tests__/pseudoFriends.test.ts` | exports at least 3 personas, each with a populated tasteProfile and a visible `curated: true` flag |
| StoriesStrip | `__tests__/StoriesStrip.test.tsx` | self-referential empty render when no friends |
| ActivityFeed | `__tests__/ActivityFeed.test.tsx` | empty state renders with invite CTA |

Target: Sprint 3 baseline 26 assertions + ~25 new = ≥50 passing assertions
by Sprint 4 close. The Jest hard-threshold verify_command enforces ≥26
as the minimum floor; aim higher.

## Generator rules

- Commit per logical chunk, conventional-commits prefix (feat|fix|chore|refactor|test|docs).
- `npx tsc --noEmit && npx eslint . && npm test -- --ci` before every commit.
- Zero new `any` in `utils/` or `services/`. Screen-layer escapes require
  `// reason:` comment.
- Zero `// @ts-nocheck` anywhere. `// @ts-expect-error` only with a
  `reason:` comment on the same line.
- Do NOT touch files outside scope — no Sprint 5 work, no accidental
  refactors. If you find a real bug while in a file, fix it and call it
  out in the commit body (cross-reference Sprint 3 handoff's open items).
- If a dependency install triggers peer-dep failures, use `--legacy-peer-deps`
  sparingly and document in the commit.
- Stop at any genuine blocker; append an update to the contract notes
  section via a small commit rather than working around silently.

## Evaluator expectations

The evaluator (`feature-dev:code-reviewer` or `superpowers:code-reviewer`) will:

1. Read this contract + Sprint 3 handoff + the 3 R&D briefs.
2. For each `hard` success_criterion: run the verify_command; report
   pass/fail with stdout evidence.
3. For each `design_criterion`: score 0-10 using the rubric; any score
   below `pass_threshold` = HARD_FAIL for that criterion.
4. Relay the 12-step manual iPhone smoke to the user; record results.
5. Spot-check 3 random migrated screens; verify: (a) no hardcoded
   whites/greens/greys, (b) motion imports from `theme/motion.ts`,
   (c) accessibilityLabel/Hint coverage, (d) DotLoader replaces
   ActivityIndicator everywhere.
6. Spot-check the TasteQuizScreen: 8 axes covered, 7 pairs, progress at
   pair 4, dual identity labels in the output, read-back copy voice
   matches brief (dry, second-person, present tense, no exclamation
   points).
7. Return `PASS` / `SOFT_FAIL` / `HARD_FAIL`.
8. Answer: "Would a staff engineer approve this? Is there a more
   elegant way?" with at least 3 observations pointing at `file:line`.

Two consecutive `HARD_FAIL`s → escalate to planner for replan.
