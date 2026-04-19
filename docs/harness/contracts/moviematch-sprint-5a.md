---
sprint: 5a
feature: "Viral-core serial blockers — friend graph + user-doc split + profile image upload + Firestore rules"
reference_contracts:
  - docs/harness/contracts/moviematch-sprint-1.md
  - docs/harness/contracts/moviematch-sprint-2.md
  - docs/harness/contracts/moviematch-sprint-3.md
  - docs/harness/contracts/moviematch-sprint-4.md
reference_plan: "C:/Users/enrique/.claude/plans/expressive-jumping-reddy.md"
reference_research:
  - docs/research/sprint-4-social-product.md
  - docs/research/sprint-4-dopamine.md
  - docs/research/sprint-4-mobile-ux.md

# Sprint 5 has been split into 5a (this contract — serial blockers) and 5b (feature parallelism).
# 5a MUST land before 5b generators can dispatch — match%/queues/rec-cards/AI all depend on
# friend graph + user-doc split being in place. See 5b contract at docs/harness/contracts/moviematch-sprint-5b.md
# (drafted at Sprint 5a close).

scope:
  # --- Friend graph primitive ---
  - "Add `/friendships/{friendshipId}` Firestore collection. Document shape: `{ participants: [uidA, uidB] (lexicographically sorted), status: 'pending' | 'accepted' | 'blocked', createdAt: serverTimestamp, acceptedAt?: serverTimestamp, initiatedBy: uid }`. `friendshipId` = `${min(uidA,uidB)}_${max(uidA,uidB)}` so lookups are deterministic and uniqueness is enforced by document ID, not query."
  - "Backbone ops in `utils/firebaseOperations.ts`: `sendFriendRequest(toUid)`, `acceptFriendRequest(friendshipId)`, `declineFriendRequest(friendshipId)`, `blockUser(uid)`, `listFriends(uid)`, `listPendingRequests(uid, direction: 'incoming' | 'outgoing')`. All typed, all unit-tested. Zero-any backbone discipline holds."
  - "Friendship acceptance writes optimistic local state first, then Firestore. Failure rolls back with inline error banner (Sprint 4 rule — no modals)."

  # --- Contact-book onboarding (hashed contact-check) ---
  - "Add `screens/ContactOnboardingScreen.tsx` — opt-in contact permission via `expo-contacts`, client-side SHA-256 hash of each phone number (normalized to E.164) + email (lowercased), POST hashes to a Firestore query against `/users/{uid}/public/profile.contactHashes[]` array. Returns list of up-to-N matches (limit 10) with `curated: false` so friend-graph UI distinguishes from pseudo-friends. No raw contact data ever leaves the device."
  - "Contact permission is OPT-IN — denying gracefully falls back to a 'Share your invite link' alternate flow with `Linking.share()` + the user's deep-link-ready profile URL (uses universal link scaffold from 5b; 5a leaves a TODO-commented placeholder URL)."
  - "`utils/contactHashing.ts` — exports `normalizePhone(raw: string, defaultCountry: string): string` and `hashContact(normalized: string): Promise<string>`. SHA-256 via `expo-crypto`. Tests cover: Dominican Republic (+1 809/829/849) + US (+1) + international (+34, +52, +44) normalization."
  - "Users write their own hashed contact identifiers to `/users/{uid}/public/profile.contactHashes` at contact-onboarding time (consented). `contactHashes` is an array of SHA-256 hashes, queried via `array-contains-any` with max 10 per query."

  # --- User-doc split (private/public separation) ---
  - "Migrate: `/users/{uid}` stays the PRIVATE root doc (email, phone, tasteProfile, interactedTitles, genres, streamingServices, settings). Add a subcollection `/users/{uid}/public/profile` with PUBLIC surfaces only: `displayName`, `photoURL`, `tasteLabels` (the two identity labels from Sprint 4), `contactHashes`, `createdAt`, `updatedAt`. Match%/why-you-match computations in Sprint 5b ONLY read from public profile — the private doc is never joined across users."
  - "Write a one-shot migration `utils/migrations/2026-04-userDocSplit.ts` that, on first sign-in after deploy, checks for absence of `/users/{uid}/public/profile`, creates it from the existing user doc's public fields, idempotent. Log a structured event `{event: 'userDocSplit', uid, migratedAt}` to a `/migrations/{uid}` collection (debug-only; 5a doesn't need analytics wiring)."
  - "Migration runs INSIDE the AppNavigator gate (post-auth, pre-tasteProfile-check) so every signed-in user's public doc exists before any friend-graph surface renders. No manual user action required."

  # --- Firebase Storage + profile image upload ---
  - "Add `utils/profileImageUpload.ts` — `uploadProfileImage(uid, localUri): Promise<{url, storagePath}>`. Uses `expo-image-picker` (bundled via Expo SDK 54) for selection, `firebase/storage` for upload. Enforces: ≤2MB file size, JPEG/PNG only, compresses to 800x800 max before upload. On success, writes `photoURL` to `/users/{uid}/public/profile`."
  - "Add `screens/ProfilePhotoScreen.tsx` — accessible from ProfileSetup flow (insertion point: after TasteQuiz, before main if `photoURL` is null) AND as a 'Change photo' entry point from future settings (Sprint 6). DotLoader during upload (≤5s p95); toast on success/error per Sprint 4 rules."
  - "Add `components/Avatar.tsx` — renders a user's `photoURL` with a fallback: initial letter on `colors.accentMuted` tinted circle (matches Sprint 4 empty-state voice). Lazy-load via `expo-image` (bundled). Accepts `size` prop: 'xs' (24), 'sm' (32), 'md' (48), 'lg' (80)."
  - "Photo upload is OPT-IN (skippable). Avatar fallback always works without a photo."

  # --- Firestore security rules (written, not deployed) ---
  - "`firestore.rules` — update with rules for: (a) `/friendships/{id}` — participants only, status transitions enforced, `initiatedBy` immutable, (b) `/users/{uid}` — owner only for reads + writes on PRIVATE root, (c) `/users/{uid}/public/profile` — any authenticated user reads, only owner writes. Deployment remains user task per Sprints 1-4 pattern."
  - "`storage.rules` — NEW file. Rules: `/profileImages/{uid}/{timestamp}.jpg` — owner-only writes with `request.resource.size < 2 * 1024 * 1024` and `request.resource.contentType.matches('image/.*')`. Public read for any authenticated user (avatars are public surfaces)."
  - "Rule-file presence + content is automated-verifiable; actual deployment to live Firebase is user task. Flag in manual smoke."

  # --- Navigation + gate updates ---
  - "`navigation/AppNavigator.tsx` — extend the gate: null `tasteProfile` → TasteQuiz (existing, Sprint 4), null `photoURL` in public profile → ProfilePhotoScreen (SKIPPABLE — user can press 'Skip for now' and still enter Main). ContactOnboarding is NOT a gate; it's reachable via a 'Find friends' entry in the Matches tab empty state."
  - "`navigation/types.ts` — add `ProfilePhotoScreen` to ProfileSetupStackParamList + `ContactOnboarding` to MainTabsParamList or MatchesStackParamList (generator picks — the screen lives where the invite entry point sits)."

  # --- Test coverage ---
  - "Jest: new tests for backbone ops (`sendFriendRequest`, `acceptFriendRequest`, friendship ID derivation), `normalizePhone` (5 locale cases), `hashContact` (deterministic SHA-256), user-doc migration idempotence (call twice → no duplicate writes), `profileImageUpload` (mocked storage, size validation, format validation, compression)."
  - "Target ≥ Sprint 4 baseline of 64 passing assertions + ~30 new = ≥90 passing assertions by Sprint 5a close."

  # --- Commit discipline ---
  - "Commit per logical chunk, conventional-commits prefix. Target ≥8 commits across 5a."

out_of_scope:
  # --- Sprint 5b (viral features) — STRICTLY excluded ---
  - "Match % computation (Sprint 5b)"
  - "Match % display on friend cards / stories-strip (Sprint 5b)"
  - "Shared watch queues (Sprint 5b)"
  - "Deep-linked rec cards / universal links / Firebase Hosting route (Sprint 5b)"
  - "AI why-you-match LLM calls (Sprint 5b)"
  - "AI-assisted rec copy suggestions (Sprint 5b)"
  - "Shareable match card image generation via Skia / view-shot (Sprint 5b)"
  - "Tiered match-card label copy (Sprint 5b)"

  # --- Sprint 6+ ---
  - "Server-side AI inference via Cloud Functions (Sprint 6)"
  - "Hybrid recommendation engine (Sprint 6)"
  - "Watch-together scheduling (Sprint 6)"
  - "Push notifications (Sprint 6-7)"
  - "EAS Build / TestFlight / Sentry / Analytics (Sprint 7)"

  # --- Anti-patterns explicitly forbidden (inherited from Sprint 4 — do not regress) ---
  - "Streaks, badges, XP, levels, points, leaderboards"
  - "Follow-celebrities feature, public global feed, 'Popular' tab"
  - "Instagram-style 24h-decay ephemeral stories"
  - "Variable-ratio push scheduling / `Math.random()` in any scheduler module"
  - "Bouncy-overshoot springs (use only theme/motion.ts)"
  - "Custom hand-drawn empty-state illustrations (Phosphor + tinted circle only)"
  - "Rank-framed match% copy — only bridge-framed (applies to future 5b, fenced now)"
  - "Modal error dialogs — inline banners only"
  - "Hardcoded `#FFFFFF` / legacy `#00ff00` / `#f0f0f0` / `#006600` / `#ff6666` in screens/components/nav"
  - "New `any` additions in utils/ or services/ backbone"
  - "`// @ts-nocheck` anywhere; `// @ts-expect-error` without `// reason:` comment"
  - "Raw contact data (phone/email strings) transmitted off-device — hashing is mandatory"
  - "Real phone/email stored on public profile doc (hashes only)"

  # --- Infra — defer unless blocking ---
  - "Live Firestore/Storage rules deployment (user task — same as Sprints 1-4)"
  - "Firebase Web API key tightening in GCP Console (user task)"
  - "Real WorkSans-SemiBold.ttf font file (low priority)"

success_criteria:
  # =====================================================================
  # FUNCTIONAL HARD THRESHOLDS
  # Per Sprint 4 lesson: collapse the build-pipeline greens into a single
  # composite; keep feature-specific thresholds distinct so the evaluator
  # can diagnose which feature failed.
  # =====================================================================

  # --- Composite build-pipeline green ---
  - criterion: "Build pipeline green: tsc --noEmit + eslint (0/0) + prettier --check + expo-doctor (17/17). Single composite green — any component failing fails the threshold."
    threshold: hard
    verify_command: "npx tsc --noEmit && npx eslint . --format compact && npx prettier --check . && npx expo-doctor"

  - criterion: "Jest green in CI mode; at least 90 passing assertions (Sprint 4 baseline 64 + 26 new minimum); every new module in 5a has a smoke test or better."
    threshold: hard
    verify_command: "npm test -- --ci --json --outputFile=/tmp/jest-result.json && node -e \"const r=require('/tmp/jest-result.json'); if(!r.success){console.error('FAIL jest');process.exit(1)} const a=r.testResults.reduce((s,t)=>s+(t.assertionResults||[]).filter(x=>x.status==='passed').length,0); if(a<90){console.error('FAIL: only',a,'passing assertions (5a floor 90)');process.exit(1)} console.log('OK',a)\""

  # --- Inherited Sprint 4 locks (must not regress) ---
  - criterion: "No hardcoded `#FFFFFF` / `#ffffff` in screens/, components/, or navigation/ (theme text routes through `colors.textHigh`)."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); const walk=(d)=>{let r=[]; if(!fs.existsSync(d)) return r; for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name==='node_modules'||e.name==='.git') continue; const p=path.join(d,e.name); if(e.isDirectory()) r=r.concat(walk(p)); else if(/\\.(ts|tsx)$/.test(e.name)) r.push(p)} return r}; const dirs=['screens','components','navigation']; let bad=[]; for(const d of dirs){for(const f of walk(d)){const src=fs.readFileSync(f,'utf8'); const lines=src.split(/\\r?\\n/); lines.forEach((ln,i)=>{const hit=/(['\\\"#])(#[Ff][Ff][Ff][Ff][Ff][Ff]|#[Ff][Ff][Ff])(['\\\"])/.test(ln)||/['\\\"]#[Ff][Ff][Ff][Ff][Ff][Ff]['\\\"]/.test(ln); if(hit){bad.push(f+':'+(i+1)+'  '+ln.trim().slice(0,80))}})}} if(bad.length){console.error('FAIL hardcoded white:\\n'+bad.join('\\n'));process.exit(1)} console.log('OK')\""

  - criterion: "No legacy hex (`#00ff00` / `#006600` / `#ff6666` / `#f0f0f0`) in screens/components/navigation — theme provides semantic tokens."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); const walk=(d)=>{let r=[]; if(!fs.existsSync(d)) return r; for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name==='node_modules'||e.name==='.git') continue; const p=path.join(d,e.name); if(e.isDirectory()) r=r.concat(walk(p)); else if(/\\.(ts|tsx)$/.test(e.name)) r.push(p)} return r}; const dirs=['screens','components','navigation']; const banned=[/['\\\"]#00[Ff][Ff]00['\\\"]/,/['\\\"]#006600['\\\"]/,/['\\\"]#[Ff][Ff]6666['\\\"]/,/['\\\"]#f0f0f0['\\\"]/i]; let bad=[]; for(const d of dirs){for(const f of walk(d)){const src=fs.readFileSync(f,'utf8'); banned.forEach(re=>{if(re.test(src)){bad.push(f+' :: '+re)}})}} if(bad.length){console.error('FAIL legacy hex leaks:\\n'+bad.join('\\n'));process.exit(1)} console.log('OK')\""

  - criterion: "theme/motion.ts remains the single source for spring literals. No new inline `damping:`/`stiffness:` outside theme/motion.ts."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); const walk=(d)=>{let r=[]; if(!fs.existsSync(d)) return r; for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name==='node_modules'||e.name==='.git'||e.name==='theme') continue; const q=path.join(d,e.name); if(e.isDirectory()) r=r.concat(walk(q)); else if(/\\.(ts|tsx)$/.test(e.name)) r.push(q)} return r}; const leaks=walk('.').filter(f=>/damping:\\s*[0-9]+/.test(fs.readFileSync(f,'utf8'))&&!/from ['\\\"]\\.{0,2}[\\/.]*theme[\\/]motion['\\\"]/.test(fs.readFileSync(f,'utf8'))); if(leaks.length){console.error('FAIL inline spring literals:\\n'+leaks.join('\\n'));process.exit(1)} console.log('OK')\""

  - criterion: "No `ActivityIndicator` import/usage in screens/ or components/ (DotLoader remains the one motion motif). NOTE: this verify uses `[\\s\\S]*?` instead of `[^;]*` so multi-line imports are correctly caught without the Sprint 4 newline footgun."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); const walk=(d)=>{let r=[]; if(!fs.existsSync(d)) return r; for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name==='node_modules') continue; const p=path.join(d,e.name); if(e.isDirectory()) r=r.concat(walk(p)); else if(/\\.tsx?$/.test(e.name)&&!/DotLoader/.test(e.name)) r.push(p)} return r}; let bad=[]; for(const d of ['screens','components']){for(const f of walk(d)){const s=fs.readFileSync(f,'utf8'); if(/import[\\s\\S]*?ActivityIndicator[\\s\\S]*?from ['\\\"]react-native['\\\"]/.test(s)||/<ActivityIndicator\\b/.test(s)){bad.push(f)}}} if(bad.length){console.error('FAIL ActivityIndicator leaks:\\n'+bad.join('\\n'));process.exit(1)} console.log('OK')\""

  - criterion: "No anti-patterns: no streak/badge/XP/leaderboard naming in source; no `Math.random()` in any push/notification/scheduler module."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); const walk=(d)=>{let r=[]; if(!fs.existsSync(d)) return r; for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name==='node_modules'||e.name==='.git'||e.name==='docs'||e.name==='.expo') continue; const p=path.join(d,e.name); if(e.isDirectory()) r=r.concat(walk(p)); else if(/\\.(ts|tsx)$/.test(e.name)) r.push(p)} return r}; const files=walk('.'); const banned=[/\\b(streak|streaks|badge|badges|leaderboard|xpPoints)\\b/i,/\\b(levelUp|earnXP|awardBadge|updateStreak)\\b/]; let bad=[]; for(const f of files){const src=fs.readFileSync(f,'utf8'); for(const re of banned){if(re.test(src)){bad.push(f+' :: '+re)}}} if(bad.length){console.error('FAIL anti-pattern naming:\\n'+bad.join('\\n'));process.exit(1)} const schedulers=files.filter(f=>/notification|schedule|push/i.test(f)&&!/test/i.test(f)); const randLeaks=schedulers.filter(f=>/Math\\.random\\(\\)/.test(fs.readFileSync(f,'utf8'))); if(randLeaks.length){console.error('FAIL Math.random() in scheduler:\\n'+randLeaks.join('\\n'));process.exit(1)} console.log('OK')\""

  - criterion: "Accessibility floor: ≥90% of Pressable/TouchableOpacity in screens/components have accessibilityLabel, accessibilityHint, or accessible={false}."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); const walk=(d)=>{let r=[]; if(!fs.existsSync(d)) return r; for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name==='node_modules') continue; const p=path.join(d,e.name); if(e.isDirectory()) r=r.concat(walk(p)); else if(/\\.tsx$/.test(e.name)) r.push(p)} return r}; let total=0,unlabeled=0; const pattern=/<(Pressable|TouchableOpacity)([^>]*)>/g; for(const f of walk('screens').concat(walk('components'))){const src=fs.readFileSync(f,'utf8'); let m; while((m=pattern.exec(src))){total++; const attrs=m[2]||''; if(!/accessibilityLabel|accessibilityHint|accessible\\s*=\\s*\\{false\\}/.test(attrs)){unlabeled++}}} if(total===0){console.log('OK (no interactive components)');process.exit(0)} const pct=unlabeled/total; if(pct>0.1){console.error('FAIL: '+unlabeled+'/'+total+' unlabeled ('+(pct*100).toFixed(0)+'%) — must be ≤10%');process.exit(1)} console.log('OK',unlabeled+'/'+total,'('+(pct*100).toFixed(0)+'%)')\""

  # --- 5a feature-specific hard thresholds ---

  - criterion: "Friend-graph backbone: `utils/firebaseOperations.ts` exports `sendFriendRequest`, `acceptFriendRequest`, `declineFriendRequest`, `listFriends`, `listPendingRequests`. Each is typed (no `any`) and covered by at least one Jest assertion."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); const src=fs.readFileSync('utils/firebaseOperations.ts','utf8'); const need=['sendFriendRequest','acceptFriendRequest','declineFriendRequest','listFriends','listPendingRequests']; const missing=need.filter(n=>!new RegExp('export[\\\\s\\\\S]{0,80}?'+n).test(src)); if(missing.length){console.error('FAIL missing friend-graph exports:',missing.join(','));process.exit(1)} const walk=(d)=>{let r=[]; if(!fs.existsSync(d)) return r; for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.isDirectory()) r=r.concat(walk(path.join(d,e.name))); else if(/\\.test\\.tsx?$/.test(e.name)) r.push(path.join(d,e.name))} return r}; const tests=walk('.').filter(f=>!f.includes('node_modules')); const covered=need.filter(n=>tests.some(t=>fs.readFileSync(t,'utf8').includes(n))); if(covered.length<need.length){console.error('FAIL: untested friend ops:',need.filter(n=>!covered.includes(n)).join(','));process.exit(1)} console.log('OK')\""

  - criterion: "Friendship ID is deterministic: `${min(uidA,uidB)}_${max(uidA,uidB)}`. Test must prove invariance under argument order."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); const walk=(d)=>{let r=[]; if(!fs.existsSync(d)) return r; for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.isDirectory()) r=r.concat(walk(path.join(d,e.name))); else if(/\\.test\\.tsx?$/.test(e.name)) r.push(path.join(d,e.name))} return r}; const tests=walk('.').filter(f=>!f.includes('node_modules')); const hit=tests.some(t=>{const s=fs.readFileSync(t,'utf8'); return /friendshipId/i.test(s)&&/toEqual|toBe/.test(s)&&/(uidA|uid1)/.test(s)&&/(uidB|uid2)/.test(s)}); if(!hit){console.error('FAIL: no deterministic friendshipId test (must assert (a,b)===(b,a))');process.exit(1)} console.log('OK')\""

  - criterion: "Contact hashing: `utils/contactHashing.ts` exports `normalizePhone` + `hashContact`. SHA-256 via expo-crypto. Tests cover DO (+1 809), US (+1), ES (+34), MX (+52), UK (+44)."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'); if(!fs.existsSync('utils/contactHashing.ts')){console.error('FAIL: utils/contactHashing.ts missing');process.exit(1)} const src=fs.readFileSync('utils/contactHashing.ts','utf8'); const need=['normalizePhone','hashContact']; const missing=need.filter(n=>!new RegExp('export[\\\\s\\\\S]{0,80}?'+n).test(src)); if(missing.length){console.error('FAIL missing exports:',missing.join(','));process.exit(1)} if(!/expo-crypto/.test(src)){console.error('FAIL: must use expo-crypto for SHA-256');process.exit(1)} const fs2=require('fs'),path=require('path'); const walk=(d)=>{let r=[]; if(!fs2.existsSync(d)) return r; for(const e of fs2.readdirSync(d,{withFileTypes:true})){if(e.isDirectory()) r=r.concat(walk(path.join(d,e.name))); else if(/\\.test\\.tsx?$/.test(e.name)) r.push(path.join(d,e.name))} return r}; const testFile=walk('.').filter(f=>!f.includes('node_modules')).find(f=>/contactHashing/i.test(f)); if(!testFile){console.error('FAIL: no contactHashing test');process.exit(1)} const ts=fs.readFileSync(testFile,'utf8'); const locales=['+1 ?809','\\\\+1\\\\s*[0-9]{3}','\\\\+34','\\\\+52','\\\\+44']; const covered=locales.filter(l=>new RegExp(l).test(ts)); if(covered.length<5){console.error('FAIL: contactHashing test missing locale cases — found',covered.length,'of 5');process.exit(1)} console.log('OK')\""

  - criterion: "Raw contact data (phone/email strings) is NEVER transmitted to Firestore. Verify: no `addDoc`/`setDoc`/`updateDoc` call writes a field named `phone`, `email`, or `phoneNumber` to `/users/{uid}/public/profile`. `contactHashes` is the ONLY array written (hashed values only)."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'),path=require('path'); const walk=(d)=>{let r=[]; if(!fs.existsSync(d)) return r; for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name==='node_modules'||e.name==='__tests__'||e.name==='.git') continue; const p=path.join(d,e.name); if(e.isDirectory()) r=r.concat(walk(p)); else if(/\\.(ts|tsx)$/.test(e.name)) r.push(p)} return r}; const files=walk('.'); let bad=[]; for(const f of files){const src=fs.readFileSync(f,'utf8'); if(!/public\\/profile/.test(src)) continue; if(/(phone|phoneNumber|email)\\s*:/.test(src)&&/(setDoc|updateDoc|addDoc)\\s*\\(/.test(src)){bad.push(f)}} if(bad.length){console.error('FAIL: raw contact field written to public profile:\\n'+bad.join('\\n'));process.exit(1)} console.log('OK')\""

  - criterion: "User-doc split: `/users/{uid}/public/profile` subcollection exists in code; `utils/migrations/2026-04-userDocSplit.ts` runs on first sign-in, is idempotent (second run writes nothing new), covered by Jest test."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'); const p='utils/migrations/2026-04-userDocSplit.ts'; if(!fs.existsSync(p)){console.error('FAIL: migration file missing at',p);process.exit(1)} const src=fs.readFileSync(p,'utf8'); if(!/public\\/profile/.test(src)){console.error('FAIL: migration does not reference public/profile subcollection');process.exit(1)} if(!/idempotent|already|exists/i.test(src)){console.error('FAIL: migration lacks idempotence guard (comment or runtime check)');process.exit(1)} const fs2=require('fs'),path=require('path'); const walk=(d)=>{let r=[]; if(!fs2.existsSync(d)) return r; for(const e of fs2.readdirSync(d,{withFileTypes:true})){if(e.isDirectory()) r=r.concat(walk(path.join(d,e.name))); else if(/\\.test\\.tsx?$/.test(e.name)) r.push(path.join(d,e.name))} return r}; const hit=walk('.').filter(f=>!f.includes('node_modules')).some(t=>/userDocSplit|public\\/profile/i.test(fs.readFileSync(t,'utf8'))); if(!hit){console.error('FAIL: no test covers the migration');process.exit(1)} console.log('OK')\""

  - criterion: "Profile image upload: `utils/profileImageUpload.ts` exports `uploadProfileImage`; enforces ≤2MB + image/* mime + writes photoURL to public profile. Test covers: too-large file rejected; non-image rejected; success path writes URL."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'); const p='utils/profileImageUpload.ts'; if(!fs.existsSync(p)){console.error('FAIL: profileImageUpload missing');process.exit(1)} const src=fs.readFileSync(p,'utf8'); if(!/2\\s*\\*\\s*1024\\s*\\*\\s*1024|2097152|2\\s*\\*\\s*\\*?\\s*MB|2MB|sizeLimit|MAX_SIZE/i.test(src)){console.error('FAIL: upload must enforce 2MB limit');process.exit(1)} if(!/image\\//i.test(src)){console.error('FAIL: upload must validate mime image/*');process.exit(1)} if(!/public\\/profile/.test(src)){console.error('FAIL: photoURL must be written to public profile subcollection');process.exit(1)} const fs2=require('fs'),path=require('path'); const walk=(d)=>{let r=[]; if(!fs2.existsSync(d)) return r; for(const e of fs2.readdirSync(d,{withFileTypes:true})){if(e.isDirectory()) r=r.concat(walk(path.join(d,e.name))); else if(/\\.test\\.tsx?$/.test(e.name)) r.push(path.join(d,e.name))} return r}; const testFile=walk('.').filter(f=>!f.includes('node_modules')).find(f=>/profileImageUpload/i.test(f)); if(!testFile){console.error('FAIL: no profileImageUpload test');process.exit(1)} const ts=fs.readFileSync(testFile,'utf8'); if(!/too.?large|size.?limit|2\\s*\\*\\s*1024\\s*\\*\\s*1024/i.test(ts)){console.error('FAIL: test must cover size rejection');process.exit(1)} if(!/mime|image\\/|format/i.test(ts)){console.error('FAIL: test must cover mime rejection');process.exit(1)} console.log('OK')\""

  - criterion: "Firestore rules file contains participant-only friendship rule AND public-profile read-all/write-owner rule. Storage rules file exists with size/mime guards on profileImages path."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'); const fsRules=fs.readFileSync('firestore.rules','utf8'); if(!/friendships/.test(fsRules)){console.error('FAIL: firestore.rules missing friendships rule');process.exit(1)} if(!/participants/.test(fsRules)){console.error('FAIL: friendships rule must check participants');process.exit(1)} if(!/public\\/profile|public\\/\\{document/.test(fsRules)){console.error('FAIL: missing public/profile rule');process.exit(1)} if(!fs.existsSync('storage.rules')){console.error('FAIL: storage.rules missing');process.exit(1)} const sRules=fs.readFileSync('storage.rules','utf8'); if(!/profileImages/.test(sRules)){console.error('FAIL: storage.rules missing profileImages path');process.exit(1)} if(!/2\\s*\\*\\s*1024\\s*\\*\\s*1024|2097152/.test(sRules)){console.error('FAIL: storage.rules missing 2MB size guard');process.exit(1)} if(!/image\\//i.test(sRules)){console.error('FAIL: storage.rules missing image/* mime guard');process.exit(1)} console.log('OK')\""

  - criterion: "AppNavigator gate order: auth → user-doc-split migration → tasteProfile → photoURL (skippable) → Main. Verify the gate's order via source inspection."
    threshold: hard
    verify_command: "node -e \"const fs=require('fs'); const src=fs.readFileSync('navigation/AppNavigator.tsx','utf8'); if(!/tasteProfile/.test(src)){console.error('FAIL: AppNavigator missing tasteProfile gate');process.exit(1)} if(!/photoURL|ProfilePhoto/.test(src)){console.error('FAIL: AppNavigator missing photoURL gate');process.exit(1)} if(!/userDocSplit|migrate|migration/i.test(src)){console.error('FAIL: AppNavigator missing migration hook');process.exit(1)} const tasteIdx=src.indexOf('tasteProfile'); const photoIdx=Math.max(src.indexOf('photoURL'),src.indexOf('ProfilePhoto')); if(photoIdx<tasteIdx){console.error('FAIL: photoURL gate must come AFTER tasteProfile in source — ensure dependency order');process.exit(1)} console.log('OK')\""

  - criterion: "Runtime deps present: `expo-contacts`, `expo-crypto`, `expo-image-picker`, `expo-image`, `firebase/storage` (already in firebase package)."
    threshold: hard
    verify_command: "node -e \"const p=require('./package.json'); const deps={...p.dependencies}; const must=['expo-contacts','expo-crypto','expo-image-picker','expo-image']; const missing=must.filter(k=>!deps[k]); if(missing.length){console.error('FAIL missing runtime deps:',missing.join(','));process.exit(1)} if(!deps['firebase']){console.error('FAIL: firebase package must be present');process.exit(1)} console.log('OK')\""

# =====================================================================
# DESIGN CRITERIA (scored 0-10 by evaluator)
# =====================================================================

design_criteria:
  - name: "Design Quality"
    weight: 30
    pass_threshold: 7
    rubric: |
      Score visual quality of 5a's NEW surfaces — ContactOnboardingScreen,
      ProfilePhotoScreen, Avatar component with fallback, any friend-list
      empty state — on 0-10 scale. Evaluator cites at least 3 file:line
      observations for any score <8.
      - 10 = 2026 flagship tier; contact flow feels native; photo upload
        is smooth with inline DotLoader; Avatar fallback letters feel
        intentional on tinted circles.
      - 7 = confidently modern; all Sprint 4 theme + motion rules visibly
        honored on new surfaces.
      - 5 = clean but generic.
      - <5 = visible theme drift or design regression.

  - name: "Craft"
    weight: 30
    pass_threshold: 7
    rubric: |
      Staff-engineer polish on the serial-blocker infrastructure.
      - 10 = migration is idempotent and covered by test proving so;
        contact hashing matches Signal-style normalization; rules files
        are production-grade (no overly permissive wildcards); zero
        theme drift; motion imports from theme/motion.ts only.
      - 7 = very few nits; most Sprint 4 locks preserved.
      - 5 = several inconsistencies; migration lacks safety net.
      - <5 = sloppy.

      Evaluator cites file:line for every craft nit below 8.

  - name: "Functionality"
    weight: 25
    pass_threshold: 8
    rubric: |
      Does 5a's new behavior actually work end-to-end?
      - 10 = friendship round-trips (send → accept → list) work; migration
        runs cleanly on first sign-in; photo upload succeeds and Avatar
        displays the uploaded image; contact hashing produces identical
        hashes on server + client; rules files deploy cleanly (user
        verifies).
      - 8 = one minor gap the user can describe in ≤1 sentence.
      - <8 = a scoped behavior missing or broken → HARD_FAIL.

  - name: "Privacy Discipline"
    weight: 15
    pass_threshold: 8
    rubric: |
      5a introduces the first cross-user data reads. Evaluator verifies:
      - 10 = raw phone/email never leaves device; hashes only on public
        profile; public profile exposes only displayName/photoURL/
        tasteLabels/contactHashes (no email/phone/tasteProfile axes);
        Firestore rules correctly enforce owner-only writes + authenticated
        reads on public; Storage rules correctly enforce size+mime guards.
      - 8 = one minor leak covered by a follow-up commit in sprint.
      - <8 = any raw PII on public surface, or rules permit unauthenticated
        reads → HARD_FAIL.

# =====================================================================
# MANUAL SMOKE — iPhone Expo Go
# =====================================================================

success_criteria_manual:
  - criterion: "Manual iPhone smoke — 10-step regression + 5a feature check."
    threshold: hard
    verify_command: |
      manual: user runs `npx expo start --tunnel`, scans QR on iPhone Expo Go SDK 54,
      completes this 10-step checklist:

      Regression (Sprint 4 guard):
        1. App boots clean; Login succeeds; deck renders on Home.
        2. Swipe right + left work; DetailScreen opens + back is smooth.
        3. Taste quiz still shows for a fresh tasteProfile-less account.
        4. Empty states still use Phosphor + tinted circle + ≤12 word body.
        5. Error paths still render as INLINE banner, not modal.

      Sprint 5a new:
        6. Fresh sign-in on a seeded account: user-doc migration runs, `/users/{uid}/public/profile`
           exists via Firestore console inspection. Second sign-in does NOT write again
           (check migration log doc timestamp).
        7. Profile photo upload: pick an image, see DotLoader, see upload success toast,
           Avatar displays the new photo. Try a 3MB image → inline error banner
           ("Image too large"). Skip flow works — Avatar falls back to initial letter.
        8. Contact onboarding: grant contacts permission, see up-to-10 matches rendered
           as friend-candidate cards with "curated: false" (contrast with pseudo-friend
           "curated: true" chip from Sprint 4). Send a friend request to one match.
        9. On the recipient's device (or another test account signed into the same Expo
           Go): see incoming request in a "Pending" list, accept it, see the bidirectional
           friendship appear in both users' `listFriends` return values.
       10. Deploy firestore.rules + storage.rules to live Firebase (user task via
           `npx firebase deploy --only firestore:rules,firestore:indexes,storage`).
           Verify: friendship rule rejects a third party's read attempt; public profile
           reads work for authenticated users; storage profileImages path rejects a
           >2MB upload.

pivot_after_failures: 2

notes:
  - "Sprint 5 has been SPLIT into 5a (this contract — serial blockers) and 5b (feature parallelism). 5a must land and be evaluator-PASS before 5b dispatches. 5b contract is drafted at 5a close using the landed backbone ops as fixed points."
  - "Per Sprint 4 evaluator lesson: the regex pattern `[^;]*` does not match newlines. All multi-line import/declaration greps in 5a verify_commands use `[\\s\\S]*?` (non-greedy, newline-matching). Tested before committing."
  - "Build-pipeline greens are collapsed into ONE composite verify_command (`tsc && eslint && prettier && expo-doctor`). Jest remains a separate threshold because its output structure differs. This follows the handoff's explicit tightening recommendation."
  - "The migration file's date-prefix naming (`2026-04-userDocSplit.ts`) enables easy Sprint 6+ ordering. If Sprint 6 adds more migrations, use the same convention."
  - "Contact permission is OPT-IN — the app never silently reads contacts. If denied, the share-link fallback works. Generator must NOT surface an interstitial nagging the user to re-grant."
  - "Photo upload uses Firebase Storage. Sprint 5a is the FIRST sprint to write to Storage — rules deployment becomes load-bearing this sprint. Flagging it as user task but putting it in the manual smoke means both parties agree it matters."
  - "The `contactHashes` array on public profile is queryable via Firestore `array-contains-any` which supports max 10 comparisons per query. The client batches contact hashes in groups of 10 and makes parallel queries. Document this in the contact-onboarding implementation."
  - "No match% UI yet — fence all match%-related code behind a `// TODO(5b): match-score display` comment at the call site where it will be added. This lets the evaluator confirm the dependency is explicitly deferred, not accidentally omitted."
  - "User-doc split means Sprint 5b MUST read friend metadata from `/users/{uid}/public/profile`, never joining against the private doc. The verify_commands for 5b enforce this. Set the expectation in 5a so the generator builds the subcollection accessors correctly from the start."
  - "If a dep install triggers peer-dep conflicts, use `--legacy-peer-deps` sparingly + document. Do NOT silently downgrade pinned React 19.1.0 or Reanimated 4."
  - "Stop at any genuine blocker and append a note here via a small commit rather than working around silently."

# =====================================================================
# Evaluator expectations
# =====================================================================
#
# For each hard success_criterion: run verify_command, report pass/fail with evidence.
# For each design_criterion: score 0-10; any score below pass_threshold → HARD_FAIL.
# Run the 10-step manual iPhone smoke as the final hard criterion.
# Final verdict: PASS | SOFT_FAIL | HARD_FAIL.
# Answer: "Would a staff engineer approve this? Is there a more elegant way?" with
# at least 3 file:line observations.
# Two consecutive HARD_FAILs on 5a → escalate to planner per harness-workflow Step 4.
#
---

# Sprint 5a — Viral-core serial blockers

## Context for the generator

You are picking up MovieMatchApp immediately after Sprint 4 closed. Read
`docs/handoffs/sprint-4.md` FIRST — it documents every decision that
persists into Sprint 5+ (theme/motion springs, DotLoader-only motif,
TasteProfile type origin at utils/firebaseOperations.ts, AppNavigator
gate pattern, haptics policy, empty-state voice, error-banner rule,
React 19 / Reanimated 4 / Expo SDK 54 jest-mock setup).

Sprint 5 is the "viral core" — friend graph + match% + shared queues +
rec cards + AI surfaces + shareable match card + profile upload. That
is too much for one sprint. We have split:

- **Sprint 5a (THIS SPRINT)** — the SERIAL BLOCKERS: friend graph
  primitive, contact onboarding with hashed contact-check, user-doc
  split (public/private), profile image upload, Firestore+Storage
  rules. Everything downstream depends on these. Sprint 5b cannot
  start until 5a's evaluator-PASS lands.

- **Sprint 5b (NEXT SPRINT)** — match% compute/display, shared queues,
  rec cards, AI why-you-match, AI rec-copy, shareable match card image,
  tiered match-card labels. Parallel streams A/B/C/D dispatched after
  5a lands.

Your 5a job is:

1. **Friend graph primitive** — Firestore `/friendships/{id}` collection
   with deterministic `${min}_${max}` document IDs, backbone ops in
   firebaseOperations, typed, tested. Optimistic local write with
   rollback on Firestore failure (inline error banner).

2. **Contact-book onboarding** — opt-in `expo-contacts` permission,
   SHA-256 hash of normalized phone + email on-device via `expo-crypto`,
   query `/users/{uid}/public/profile.contactHashes` in batches of 10
   (Firestore `array-contains-any` limit). Raw contact data never
   leaves the device.

3. **User-doc split** — migrate existing user doc to have a `public/profile`
   subcollection. Write a one-shot migration that runs on first post-deploy
   sign-in, idempotent. Log `{event: 'userDocSplit', uid, migratedAt}` to
   `/migrations/{uid}` for debugging.

4. **Profile image upload** — `uploadProfileImage(uid, localUri)` via
   Firebase Storage. Validate size (≤2MB) + mime (image/*), compress
   to 800x800 max before upload. Write URL to public profile.
   `components/Avatar.tsx` with initial-letter fallback on tinted circle.

5. **Firestore + Storage rules** — write the rules files; DO NOT deploy
   (user task, same pattern as Sprints 1-4). Rules files are content-verified
   via verify_commands.

6. **Navigation gate extension** — AppNavigator gates on user-doc-migration
   → tasteProfile → photoURL (skippable) → Main. ContactOnboarding is NOT
   a gate; it's reachable from a Matches-tab empty-state CTA.

## Generator execution order (recommended)

Land primitives FIRST so downstream work imports cleanly:

1. `firestore.rules` + `storage.rules` updates (rules file content).
2. `utils/migrations/2026-04-userDocSplit.ts` + test + wire into AppNavigator.
3. `utils/contactHashing.ts` + tests (5 locale normalization cases).
4. `utils/profileImageUpload.ts` + `components/Avatar.tsx` + tests.
5. Backbone friend-graph ops in `utils/firebaseOperations.ts` + tests
   (deterministic friendshipId test is explicit).
6. `screens/ProfilePhotoScreen.tsx` + route.
7. `screens/ContactOnboardingScreen.tsx` + route + invite-link fallback.
8. Friend list UI surface (even if just a list row + accept/decline)
   in the Matches tab empty state.
9. AppNavigator gate update.
10. Jest green + typecheck + lint + prettier before every commit; target ≥8 commits.

## Test strategy

New Jest coverage:

| Module | Assertions |
|---|---|
| `utils/firebaseOperations.ts` (friend-graph ops) | send/accept/decline/list + deterministic friendshipId + order-invariance |
| `utils/contactHashing.ts` | 5 locale normalizations + SHA-256 determinism + empty input rejection |
| `utils/migrations/2026-04-userDocSplit.ts` | first-run creates subcollection + second-run no-op + missing-field tolerance |
| `utils/profileImageUpload.ts` | size too large rejects + non-image mime rejects + success writes URL |
| `components/Avatar.tsx` | photo URL renders + fallback letter renders + size variants |

Target: Sprint 4 baseline 64 + ≥30 new = ≥90 passing assertions by 5a close.

## Generator rules

- Commit per logical chunk, conventional-commits prefix.
- `npx tsc --noEmit && npx eslint . && npx prettier --check . && npm test -- --ci` before every commit.
- Zero new `any` in `utils/` or `services/`. Screen-layer escapes require `// reason:` comment.
- Zero `// @ts-nocheck`. `// @ts-expect-error` only with a `reason:` comment on the same line.
- Do NOT do Sprint 5b work — no match% compute, no LLM calls, no rec cards, no queues.
- If a dep install triggers peer-dep failures, use `--legacy-peer-deps` + document.
- Stop at any genuine blocker; append a note to this contract via a small commit.

## Evaluator expectations

The evaluator (`feature-dev:code-reviewer` or `superpowers:code-reviewer`) will:

1. Read this contract + Sprint 4 handoff + the 3 Sprint 4 R&D briefs
   (still authoritative for 5a — especially the privacy/contact-hashing
   framing from social-product brief + empty-state voice from dopamine
   brief).
2. For each hard success_criterion: run verify_command; report pass/fail + evidence.
3. For each design_criterion: score 0-10 against the rubric; <pass_threshold = HARD_FAIL.
4. Relay the 10-step manual iPhone smoke to the user; record results.
5. Spot-check: (a) contactHashing normalizes DO +1 809 vs US +1 identically
   when the number is the same 10-digit body, (b) migration is truly
   idempotent by reading the code path, (c) Firestore rules reject a
   non-participant's friendship read (mental test), (d) Storage rules
   reject an unauthenticated upload + a >2MB upload.
6. Return PASS / SOFT_FAIL / HARD_FAIL with at least 3 file:line observations.

Two consecutive HARD_FAILs → escalate to planner for replan.
