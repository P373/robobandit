// Builds the /weather page's scripts so they run on old iPads (iOS 10.3, Safari 10.1, the newest an iPad 4 gets).
// Edit weather/src/*.js, then run:   node tools/build-weather.js
// It rewrites the newer syntax (?. ?? ||= object spread, catch without a variable…) into what Safari 10.1 reads,
// and writes weather/app.js, map.js and icons.js. The few newer built-in functions are added by weather/polyfills.js.
// node tools/build-weather.js --check   only reports whether the built files are up to date (the tests use this).
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const DIR = path.resolve(__dirname, '..', 'weather');
const TARGET = 'safari10.1';
const FILES = ['app.js', 'map.js', 'icons.js'];

let stale = 0;
for (const f of FILES) {
  const src = fs.readFileSync(path.join(DIR, 'src', f), 'utf8');
  // esbuild won't emit const/let or destructuring for Safari 10 (edge cases in its compatibility table); everyday
  // const/let and destructuring work there, and esbuild can't rewrite them anyway, so tell it they're fine
  const { code } = esbuild.transformSync(src, { loader: 'js', target: TARGET, supported: { 'const-and-let': true, destructuring: true }, charset: 'utf8', legalComments: 'inline' });
  const out = `// Built from weather/src/${f} by tools/build-weather.js for old iPads (${TARGET}). Edit the source, not this file.\n${code}`;
  const dest = path.join(DIR, f), now = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : '';
  if (now === out) continue;
  stale++;
  if (!process.argv.includes('--check')) fs.writeFileSync(dest, out);
}
if (process.argv.includes('--check')) {
  if (stale) { console.log(`${stale} weather script(s) out of date: run node tools/build-weather.js`); process.exit(1); }
  console.log('weather scripts are up to date');
} else console.log(stale ? `built ${stale} weather script(s) for ${TARGET}` : 'weather scripts were already up to date');
