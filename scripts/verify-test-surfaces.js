// Mirrors the contract verify_command for 'test surfaces exist' criterion.
const fs = require('fs');
const path = require('path');

const walk = (d) => {
  let r = [];
  if (!fs.existsSync(d)) return r;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) r = r.concat(walk(p));
    else if (/\.test\.(ts|tsx)$/.test(e.name)) r.push(p);
  }
  return r;
};

const testFiles = walk('.');
const expectHits = (re) =>
  testFiles.some(
    (f) =>
      re.test(f.replace(/\\/g, '/')) || re.test(fs.readFileSync(f, 'utf8')),
  );

const surfaces = [
  ['auth', /LoginScreen|signIn|authenticate/i],
  ['reducer', /MoviesContext|reducer/i],
  [
    'firebaseOps',
    /firebaseOperations|recordTitleInteraction|addToWatchlist|fetchUserWatchlist/i,
  ],
  ['swipeCard', /SwipeableCard/i],
  ['pagination', /HomeScreen|pagination|prefetch/i],
  ['matchPct', /match%|matchPct|matchPercent|matchScore/i],
];

const missing = surfaces.filter(([, re]) => !expectHits(re)).map((s) => s[0]);
if (missing.length) {
  console.error('FAIL: missing test surfaces:', missing);
  process.exit(1);
}
console.log('OK', testFiles.length, 'test files');
