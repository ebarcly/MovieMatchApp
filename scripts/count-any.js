const fs = require('fs');
const path = require('path');

const walk = (d) => {
  let r = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (
      ['node_modules', '.expo', 'docs', '.git', 'coverage', 'scripts'].includes(
        e.name,
      )
    )
      continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) r = r.concat(walk(p));
    else if (/\.(ts|tsx)$/.test(e.name)) r.push(p);
  }
  return r;
};

const files = walk('.');
let backbone = 0;
let total = 0;
const locations = [];
const re = /(?<![A-Za-z0-9_])any(?![A-Za-z0-9_])/g;

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const lines = src.split(/\r?\n/);
  lines.forEach((line, i) => {
    const hits = (line.match(re) || []).length;
    if (!hits) return;
    const isAnnot =
      /:\s*any\b|as\s+any\b|<any>|Array<any>|Record<[^,]+,\s*any>/.test(line);
    if (!isAnnot) return;
    const prev = lines[i - 1] || '';
    const just = /\/\/\s*reason:/i.test(line) || /\/\/\s*reason:/i.test(prev);
    if (just) return;
    total += hits;
    locations.push(f + ':' + (i + 1) + ' -> ' + line.trim());
    const norm = f.split(path.sep).join('/').replace(/^\.\//, '');
    if (/^(utils|services)\//.test(norm)) backbone += hits;
  });
}

console.log('backbone unjustified:', backbone);
console.log('total unjustified:', total);
locations.forEach((l) => console.log(l));
