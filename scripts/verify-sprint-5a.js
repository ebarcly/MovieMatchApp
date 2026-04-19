/**
 * Sprint 5a local contract verify — mirrors the YAML verify_commands in
 * docs/harness/contracts/moviematch-sprint-5a.md so the generator can
 * self-check before commit without wrestling with cross-shell quoting.
 *
 * Run with: `node scripts/verify-sprint-5a.js`
 */

const fs = require('fs');
const path = require('path');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'docs', '.expo'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const checks = [
  {
    name: 'friend-graph exports',
    run: () => {
      const src = fs.readFileSync('utils/firebaseOperations.ts', 'utf8');
      const need = [
        'sendFriendRequest',
        'acceptFriendRequest',
        'declineFriendRequest',
        'listFriends',
        'listPendingRequests',
      ];
      const missing = need.filter(
        (n) => !new RegExp('export[\\s\\S]{0,80}?' + n).test(src),
      );
      if (missing.length) throw new Error('missing: ' + missing.join(','));
      const tests = walk('.').filter((f) => /\.test\.tsx?$/.test(f));
      const covered = need.filter((n) =>
        tests.some((t) => fs.readFileSync(t, 'utf8').includes(n)),
      );
      const uncovered = need.filter((n) => !covered.includes(n));
      if (uncovered.length) throw new Error('untested: ' + uncovered.join(','));
    },
  },
  {
    name: 'friendshipId deterministic test',
    run: () => {
      const tests = walk('.').filter((f) => /\.test\.tsx?$/.test(f));
      const hit = tests.some((t) => {
        const s = fs.readFileSync(t, 'utf8');
        return (
          /friendshipId/i.test(s) &&
          /toEqual|toBe/.test(s) &&
          /(uidA|uid1)/.test(s) &&
          /(uidB|uid2)/.test(s)
        );
      });
      if (!hit) throw new Error('no test proving a,b === b,a');
    },
  },
  {
    name: 'contactHashing module',
    run: () => {
      if (!fs.existsSync('utils/contactHashing.ts'))
        throw new Error('utils/contactHashing.ts missing');
      const src = fs.readFileSync('utils/contactHashing.ts', 'utf8');
      const need = ['normalizePhone', 'hashContact'];
      const missing = need.filter(
        (n) => !new RegExp('export[\\s\\S]{0,80}?' + n).test(src),
      );
      if (missing.length) throw new Error('missing: ' + missing.join(','));
      if (!/expo-crypto/.test(src)) throw new Error('must use expo-crypto');
      const tests = walk('.').filter((f) => /\.test\.tsx?$/.test(f));
      const testFile = tests.find((f) => /contactHashing/i.test(f));
      if (!testFile) throw new Error('no contactHashing test');
      const ts = fs.readFileSync(testFile, 'utf8');
      const locales = [/\+1 ?809/, /\+1\s*[0-9]{3}/, /\+34/, /\+52/, /\+44/];
      const covered = locales.filter((re) => re.test(ts));
      if (covered.length < 5)
        throw new Error(`only ${covered.length}/5 locales covered`);
    },
  },
  {
    name: 'no raw contact field written to public profile',
    run: () => {
      const files = walk('.').filter((f) => /\.(ts|tsx)$/.test(f));
      const bad = [];
      for (const f of files) {
        if (f.includes('__tests__')) continue;
        const src = fs.readFileSync(f, 'utf8');
        if (!/public\/profile/.test(src)) continue;
        if (
          /(phone|phoneNumber|email)\s*:/.test(src) &&
          /(setDoc|updateDoc|addDoc)\s*\(/.test(src)
        ) {
          bad.push(f);
        }
      }
      if (bad.length)
        throw new Error('raw contact field leaked:\n' + bad.join('\n'));
    },
  },
  {
    name: 'user-doc split migration present',
    run: () => {
      const p = 'utils/migrations/2026-04-userDocSplit.ts';
      if (!fs.existsSync(p)) throw new Error('missing ' + p);
      const src = fs.readFileSync(p, 'utf8');
      if (!/public\/profile/.test(src))
        throw new Error('missing public/profile reference');
      if (!/idempotent|already|exists/i.test(src))
        throw new Error('missing idempotence guard');
      const tests = walk('.').filter((f) => /\.test\.tsx?$/.test(f));
      const hit = tests.some((t) =>
        /userDocSplit|public\/profile/i.test(fs.readFileSync(t, 'utf8')),
      );
      if (!hit) throw new Error('no test covers migration');
    },
  },
  {
    name: 'profileImageUpload module',
    run: () => {
      const p = 'utils/profileImageUpload.ts';
      if (!fs.existsSync(p)) throw new Error('missing ' + p);
      const src = fs.readFileSync(p, 'utf8');
      if (!/2\s*\*\s*1024\s*\*\s*1024|2097152|MAX_SIZE|MAX_PROFILE/.test(src))
        throw new Error('must enforce 2MB');
      if (!/image\//i.test(src)) throw new Error('must validate image/* mime');
      if (!/public\/profile/.test(src))
        throw new Error('must write to public profile subcollection');
      const tests = walk('.').filter((f) => /\.test\.tsx?$/.test(f));
      const tf = tests.find((f) => /profileImageUpload/i.test(f));
      if (!tf) throw new Error('no test');
      const ts = fs.readFileSync(tf, 'utf8');
      if (!/too.?large|size.?limit|2\s*\*\s*1024\s*\*\s*1024/i.test(ts))
        throw new Error('test must cover size rejection');
      if (!/mime|image\/|format/i.test(ts))
        throw new Error('test must cover mime rejection');
    },
  },
  {
    name: 'firestore.rules + storage.rules content',
    run: () => {
      const fsRules = fs.readFileSync('firestore.rules', 'utf8');
      if (!/friendships/.test(fsRules))
        throw new Error('firestore.rules missing friendships');
      if (!/participants/.test(fsRules))
        throw new Error('friendships must check participants');
      if (!/public\/profile|public\/\{document/.test(fsRules))
        throw new Error('missing public/profile rule');
      if (!fs.existsSync('storage.rules'))
        throw new Error('storage.rules missing');
      const sRules = fs.readFileSync('storage.rules', 'utf8');
      if (!/profileImages/.test(sRules))
        throw new Error('storage.rules missing profileImages');
      if (!/2\s*\*\s*1024\s*\*\s*1024|2097152/.test(sRules))
        throw new Error('storage.rules missing 2MB guard');
      if (!/image\//i.test(sRules))
        throw new Error('storage.rules missing image/* mime guard');
    },
  },
  {
    name: 'AppNavigator gate order',
    run: () => {
      const src = fs.readFileSync('navigation/AppNavigator.tsx', 'utf8');
      if (!/tasteProfile/.test(src))
        throw new Error('missing tasteProfile gate');
      if (!/photoURL|ProfilePhoto/.test(src))
        throw new Error('missing photoURL gate');
      if (!/userDocSplit|migrate|migration/i.test(src))
        throw new Error('missing migration hook');
      const tasteIdx = src.indexOf('tasteProfile');
      const photoIdx = Math.max(
        src.indexOf('photoURL'),
        src.indexOf('ProfilePhoto'),
      );
      if (photoIdx < tasteIdx)
        throw new Error('photo gate must come AFTER tasteProfile');
    },
  },
  {
    name: 'runtime deps',
    run: () => {
      const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const deps = { ...p.dependencies };
      const must = [
        'expo-contacts',
        'expo-crypto',
        'expo-image-picker',
        'expo-image',
        'firebase',
      ];
      const missing = must.filter((k) => !deps[k]);
      if (missing.length) throw new Error('missing deps: ' + missing.join(','));
    },
  },
  {
    name: 'no hardcoded white in screens/components/nav',
    run: () => {
      const dirs = ['screens', 'components', 'navigation'];
      const bad = [];
      for (const d of dirs) {
        for (const f of walk(d)) {
          if (!/\.(ts|tsx)$/.test(f)) continue;
          const src = fs.readFileSync(f, 'utf8');
          const lines = src.split(/\r?\n/);
          lines.forEach((ln, i) => {
            const hit =
              /(['"#])(#[Ff][Ff][Ff][Ff][Ff][Ff]|#[Ff][Ff][Ff])(['"])/.test(
                ln,
              ) || /['"]#[Ff][Ff][Ff][Ff][Ff][Ff]['"]/.test(ln);
            if (hit) bad.push(f + ':' + (i + 1));
          });
        }
      }
      if (bad.length) throw new Error('hardcoded white:\n' + bad.join('\n'));
    },
  },
  {
    name: 'no legacy hex leaks',
    run: () => {
      const dirs = ['screens', 'components', 'navigation'];
      const banned = [
        /['"]#00[Ff][Ff]00['"]/,
        /['"]#006600['"]/,
        /['"]#[Ff][Ff]6666['"]/,
        /['"]#f0f0f0['"]/i,
      ];
      const bad = [];
      for (const d of dirs) {
        for (const f of walk(d)) {
          if (!/\.(ts|tsx)$/.test(f)) continue;
          const src = fs.readFileSync(f, 'utf8');
          banned.forEach((re) => {
            if (re.test(src)) bad.push(f + ' :: ' + re);
          });
        }
      }
      if (bad.length) throw new Error('legacy hex:\n' + bad.join('\n'));
    },
  },
  {
    name: 'no inline spring literals outside theme/',
    run: () => {
      const files = walk('.').filter(
        (f) =>
          /\.(ts|tsx)$/.test(f) &&
          !f.includes('theme') &&
          !f.includes('node_modules'),
      );
      const leaks = files.filter((f) => {
        const s = fs.readFileSync(f, 'utf8');
        return (
          /damping:\s*[0-9]+/.test(s) &&
          !/from ['"].{0,30}theme\/motion['"]/.test(s)
        );
      });
      if (leaks.length)
        throw new Error('inline spring literals:\n' + leaks.join('\n'));
    },
  },
  {
    name: 'no ActivityIndicator in screens/components',
    run: () => {
      const dirs = ['screens', 'components'];
      const bad = [];
      for (const d of dirs) {
        for (const f of walk(d)) {
          if (!/\.(ts|tsx)$/.test(f) || /DotLoader/.test(f)) continue;
          const s = fs.readFileSync(f, 'utf8');
          if (
            /import[\s\S]*?ActivityIndicator[\s\S]*?from ['"]react-native['"]/.test(
              s,
            ) ||
            /<ActivityIndicator\b/.test(s)
          ) {
            bad.push(f);
          }
        }
      }
      if (bad.length)
        throw new Error('ActivityIndicator leaks:\n' + bad.join('\n'));
    },
  },
  {
    name: 'no anti-pattern naming',
    run: () => {
      const files = walk('.').filter((f) => /\.(ts|tsx)$/.test(f));
      const banned = [
        /\b(streak|streaks|badge|badges|leaderboard|xpPoints)\b/i,
        /\b(levelUp|earnXP|awardBadge|updateStreak)\b/,
      ];
      const bad = [];
      for (const f of files) {
        const s = fs.readFileSync(f, 'utf8');
        for (const re of banned) {
          if (re.test(s)) bad.push(f + ' :: ' + re);
        }
      }
      if (bad.length)
        throw new Error('anti-pattern naming:\n' + bad.join('\n'));
      const schedulers = files.filter(
        (f) => /notification|schedule|push/i.test(f) && !/test/i.test(f),
      );
      const randLeaks = schedulers.filter((f) =>
        /Math\.random\(\)/.test(fs.readFileSync(f, 'utf8')),
      );
      if (randLeaks.length)
        throw new Error('Math.random() in scheduler:\n' + randLeaks.join('\n'));
    },
  },
  {
    name: 'accessibility floor (≥90% Pressable/TouchableOpacity labeled)',
    run: () => {
      const dirs = ['screens', 'components'];
      const files = dirs
        .flatMap((d) => walk(d))
        .filter((f) => /\.tsx$/.test(f));
      let total = 0;
      let unlabeled = 0;
      const pattern = /<(Pressable|TouchableOpacity)([^>]*)>/g;
      for (const f of files) {
        const src = fs.readFileSync(f, 'utf8');
        let m;
        while ((m = pattern.exec(src))) {
          total++;
          const attrs = m[2] || '';
          if (
            !/accessibilityLabel|accessibilityHint|accessible\s*=\s*\{false\}/.test(
              attrs,
            )
          )
            unlabeled++;
        }
      }
      if (total === 0) return;
      const pct = unlabeled / total;
      if (pct > 0.1)
        throw new Error(
          `${unlabeled}/${total} unlabeled (${(pct * 100).toFixed(
            0,
          )}%) — must be ≤10%`,
        );
    },
  },
];

let failed = 0;
for (const check of checks) {
  try {
    check.run();
    console.log(`OK  ${check.name}`);
  } catch (err) {
    console.error(`FAIL ${check.name}: ${err.message}`);
    failed++;
  }
}
if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll Sprint 5a automated checks green.');
