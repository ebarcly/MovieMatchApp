// Mirrors the contract-level verify_command for the any-budget criterion.
const fs = require('fs');
const path = require('path');

const walk = (d) => {
  let r = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (['node_modules', '.expo', 'docs', '.git', 'coverage'].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) r = r.concat(walk(p));
    else if (/\.(ts|tsx)$/.test(e.name)) r.push(p);
  }
  return r;
};

const files = walk('.');
let backbone = 0;
let total = 0;
const re = /(?<![A-Za-z0-9_])any(?![A-Za-z0-9_])/g;

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const lines = src.split(/\r?\n/);
  lines.forEach((line, i) => {
    const hits = (line.match(re) || []).length;
    if (!hits) return;
    const isAnnot = /:\s*any\b|as\s+any\b|<any>|Array<any>|Record<[^,]+,\s*any>/.test(line);
    if (!isAnnot) return;
    const prev = lines[i - 1] || '';
    const just = /\/\/\s*reason:/i.test(line) || /\/\/\s*reason:/i.test(prev);
    if (just) return;
    total += hits;
    const norm = f.split(path.sep).join('/').replace(/^\.\//, '');
    if (/^(utils|services)\//.test(norm)) backbone += hits;
  });
}

if (backbone > 0) {
  console.error('FAIL: backbone has unjustified any in utils/ or services/:', backbone);
  process.exit(1);
}
if (total > 10) {
  console.error('FAIL: unjustified any count', total, 'exceeds 10');
  process.exit(1);
}
console.log('OK', total);
