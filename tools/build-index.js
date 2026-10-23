// Writes the arcade page's game cards into index.html itself (between <!-- games:start --> and
// <!-- games:end -->), plus a JSON-LD list of every game for search engines (between <!-- jsonld:start -->
// and <!-- jsonld:end -->). Search engines and link previews then see the games without running the page's
// script; the script still redraws the cards on load (adding today's game, best scores, filters and Keep playing).
// Run after changing the GAMES list in index.html:   node tools/build-index.js
// node tools/build-index.js --check   only reports whether index.html is up to date (the tests use this).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'index.html');
const SITE = 'https://robobandit.com/';

function build(html) {
  // the page's own list and card template, run on their own (no browser needed)
  const script = html.slice(html.indexOf('// GAMES:start'), html.indexOf('let filter = '));
  const sandbox = { localStorage: { getItem: () => null, setItem() {} }, out: null };
  vm.runInNewContext(script + '\nout = { GAMES, EXTRAS, card };', sandbox);
  const { GAMES, EXTRAS, card } = sandbox.out;
  // every game (the page itself then lifts today's game out into the big card at the top)
  const cards = GAMES.slice().reverse().map(g => card(g, { withBest: false })).join('');
  const items = [...GAMES.slice().reverse(), ...EXTRAS].map((g, i) => ({
    '@type': 'ListItem', position: i + 1,
    item: {
      '@type': 'VideoGame', name: g.title, url: SITE + g.url, image: SITE + g.thumb, description: g.about || g.blurb,
      gamePlatform: 'Web browser', applicationCategory: 'Game', isAccessibleForFree: true,
      typicalAgeRange: `${g.age}-`, numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 1, maxValue: +String(g.players).slice(-1) },
    },
  }));
  const ld = { '@context': 'https://schema.org', '@type': 'ItemList', name: 'RoboBandit games', itemListElement: items };
  return html
    .replace(/(<!-- games:start -->\n\s*<div class="grid" id="games">)[\s\S]*?(<\/div>\n\s*<!-- games:end -->)/, (m, a, b) => `${a}${cards}${b}`)
    .replace(/(<!-- jsonld:start -->\n)[\s\S]*?(<!-- jsonld:end -->)/, (m, a, b) => `${a}<script type="application/ld+json">${JSON.stringify(ld)}</script>\n${b}`);
}

const html = fs.readFileSync(FILE, 'utf8'), next = build(html);
if (process.argv.includes('--check')) {
  if (next !== html) { console.log('index.html is out of date: run node tools/build-index.js'); process.exit(1); }
  console.log('index.html is up to date');
} else if (next !== html) {
  fs.writeFileSync(FILE, next);
  console.log('wrote the game cards and the game list into index.html');
} else console.log('index.html was already up to date');
