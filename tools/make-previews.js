// Renders the 1200×630 link-preview pictures in previews/ (what iMessage, WhatsApp, Facebook etc. show
// when someone shares a link). Run after adding a game:  node tools/make-previews.js
// Needs Playwright (see tests/README.md). Each game's picture is built from its thumbs/ screenshot.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const GAMES = [
  { file: 'space-wars', title: 'SPACE WARS', tag: 'Fly six space missions!', color: '#ffd84a' },
  { file: 'floppy-bird', title: 'FLOPPY BIRD', tag: 'Flap through 8 wild worlds!', color: '#ffd84a' },
  { file: 'surfs-up', title: "SURF'S UP", tag: 'Ride the curl, spin for the judges!', color: '#ffe14a' },
  { file: 'hamglider', title: 'HAMGLIDER', tag: 'Glide Pip the hamster onto the bullseye!', color: '#ff9a3c' },
  { file: 'web-hero', title: 'WEB HERO', tag: 'Swing across the city, bonk the Bandit Bots!', color: '#b98cff' },
];

const page = body => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bungee&display=swap" rel="stylesheet">
<style>
  body { margin: 0; width: 1200px; height: 630px; overflow: hidden; font-family: 'Bungee', system-ui, sans-serif; color: #fff;
    background: radial-gradient(ellipse at 30% 0%, #2a4a8a, #0a1430 70%); position: relative; }
  .stars { position: absolute; inset: 0; background-image: radial-gradient(2px 2px at 10% 20%, #fff, transparent),
    radial-gradient(2px 2px at 40% 80%, #cfe3ff, transparent), radial-gradient(2px 2px at 70% 30%, #fff, transparent),
    radial-gradient(1.5px 1.5px at 90% 70%, #fff, transparent), radial-gradient(1.5px 1.5px at 25% 55%, #fff, transparent);
    background-size: 300px 300px; opacity: .7; }
  .logo { width: 96px; height: 96px; }
  h1 { margin: 10px 0 0; line-height: 1; text-shadow: 0 6px 0 #081028; }
  .tag { margin-top: 18px; font: 800 34px system-ui, sans-serif; color: #e6eefc; }
  .site { margin-top: 26px; display: inline-block; padding: 10px 22px; border-radius: 999px; font-size: 26px;
    color: #0a1430; background: #7fd0ff; }
  img.shot { border: 8px solid #fff; border-radius: 22px; box-shadow: 0 18px 40px rgba(0,0,0,.5); display: block; }
</style></head><body><div class="stars"></div>${body}</body></html>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  // pictures are inlined: a page made with setContent can't load local files
  const file = f => {
    const type = f.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg';
    return `data:${type};base64,${fs.readFileSync(path.join(ROOT, f)).toString('base64')}`;
  };
  for (const g of GAMES) {
    await p.setContent(page(`
      <div style="position:absolute;left:60px;top:90px;width:520px">
        <img class="logo" src="${file('favicon.svg')}">
        <h1 style="font-size:${g.title.length > 10 ? 64 : 76}px;color:${g.color}">${g.title}</h1>
        <div class="tag">${g.tag}</div>
        <div class="site">ROBOBANDIT.COM</div>
      </div>
      <img class="shot" src="${file('thumbs/' + g.file + '.jpg')}"
        style="position:absolute;right:50px;top:130px;width:560px;height:315px;object-fit:cover;transform:rotate(3deg)">`));
    await p.waitForTimeout(600);
    await p.screenshot({ path: path.join(ROOT, 'previews', g.file + '.jpg'), type: 'jpeg', quality: 88 });
    console.log('wrote previews/' + g.file + '.jpg');
  }
  // the whole arcade: the latest four games in a grid
  const shots = GAMES.slice(-4).map((g, i) => `<img class="shot" src="${file('thumbs/' + g.file + '.jpg')}"
    style="position:absolute;width:270px;height:152px;object-fit:cover;left:${590 + (i % 2) * 300}px;top:${120 + Math.floor(i / 2) * 200}px;
    transform:rotate(${[-4, 3, 2, -3][i]}deg)">`).join('');
  await p.setContent(page(`
    <div style="position:absolute;left:60px;top:110px;width:520px">
      <img class="logo" src="${file('favicon.svg')}">
      <h1 style="font-size:72px;color:#ffd84a">ROBOBANDIT</h1>
      <div class="tag">A new free game every day!</div>
      <div class="site">ROBOBANDIT.COM</div>
    </div>${shots}`));
  await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(ROOT, 'previews', 'robobandit.jpg'), type: 'jpeg', quality: 88 });
  console.log('wrote previews/robobandit.jpg');
  await b.close();
})();
