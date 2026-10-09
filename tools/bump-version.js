// Stamps ?v=<version> onto every page's links to our own .js and .css files, e.g. common.js?v=20261009-1530.
// Browsers cache files for a while, so without this a visitor right after an update can get a new page with an
// old common.js (or the other way round), which can break the game. Run after changing any shared file:
//   node tools/bump-version.js
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const d = new Date(), pad = n => String(n).padStart(2, '0');
const VERSION = process.argv[2] || `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;

function pages(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    if (e.name.startsWith('.') || ['node_modules', 'tests', 'tools', 'vendor'].includes(e.name)) return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? pages(p) : e.name.endsWith('.html') ? [p] : [];
  });
}
let changed = 0;
for (const file of pages(ROOT)) {
  const before = fs.readFileSync(file, 'utf8');
  // local files only: not http(s), not data:, not vendor/ (three.js never changes)
  const after = before.replace(/((?:src|href)=")((?!https?:|data:|\/\/)(?![^"]*vendor\/)[^"?#]+\.(?:js|css))(?:\?v=[^"]*)?"/g, `$1$2?v=${VERSION}"`);
  if (after !== before) { fs.writeFileSync(file, after); changed++; }
}
console.log(`version ${VERSION}: updated ${changed} pages`);
