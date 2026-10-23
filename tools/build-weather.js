// Builds the /weather page's scripts so they run on old iPads (an iPad 4 stops at iOS 10.3 / Safari 10.1).
// Edit weather/src/*.js, then run:   node tools/build-weather.js
// Babel rewrites them all the way down to plain ES5, the JavaScript every old Safari reads: no newer syntax for
// an old parser to trip on (Safari 10 has bugs even with some code it claims to support), and async/await turned
// into an inline helper. It writes weather/app.js, map.js, icons.js and plan.js. The few newer built-in
// functions are added by weather/polyfills.js, which also puts any script error on the page.
// node tools/build-weather.js --check   only reports whether the built files are up to date (the tests use this).
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const DIR = path.resolve(__dirname, '..', 'weather');
const FILES = ['app.js', 'map.js', 'icons.js', 'plan.js'];

let stale = 0;
for (const f of FILES) {
  const src = fs.readFileSync(path.join(DIR, 'src', f), 'utf8');
  const { code } = babel.transformSync(src, {
    babelrc: false, configFile: false, sourceType: 'script', compact: false,
    presets: [['@babel/preset-env', { forceAllTransforms: true, modules: false }]],
  });
  const out = `// Built from weather/src/${f} by tools/build-weather.js (plain ES5, for old iPads). Edit the source, not this file.\n${code}\n`;
  const dest = path.join(DIR, f), now = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : '';
  if (now === out) continue;
  stale++;
  if (!process.argv.includes('--check')) fs.writeFileSync(dest, out);
}
if (process.argv.includes('--check')) {
  if (stale) { console.log(`${stale} weather script(s) out of date: run node tools/build-weather.js`); process.exit(1); }
  console.log('weather scripts are up to date');
} else console.log(stale ? `built ${stale} weather script(s) as ES5` : 'weather scripts were already up to date');
