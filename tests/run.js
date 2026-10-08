// Smoke tests for every RoboBandit page. Run from the repo root:  npm test
// Each game is opened in a headless browser; autopilots play through the rules at high speed by calling
// the game's own update() directly, so a full game takes seconds. Screenshots land in tests/output/.
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'output');
fs.mkdirSync(OUT, { recursive: true });
const url = f => 'file://' + path.join(ROOT, f);

const results = [];
async function test(name, fn) {
  const t0 = Date.now();
  try { await fn(); results.push([true, name, Date.now() - t0]); }
  catch (e) { results.push([false, name, Date.now() - t0, e.message]); }
}
function check(cond, msg) { if (!cond) throw new Error(msg); }

// Opens a page and fails the test on any JavaScript error.
async function open(browser, file, opts = {}) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  await page.goto(url(file));
  await page.waitForTimeout(800);
  return page;
}
async function done(page, shot) {
  if (shot) await page.screenshot({ path: path.join(OUT, shot) });
  check(page.errors.length === 0, 'page errors: ' + page.errors.join(' | '));
  await page.context().close();
}

// A real finger drag (touch events), for the floating joystick.
async function touchDrag(page, x0, y0, x1, y1) {
  const cdp = await page.context().newCDPSession(page);
  const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  await tp('touchStart', x0, y0);
  for (let i = 1; i <= 5; i++) await tp('touchMove', x0 + (x1 - x0) * i / 5, y0 + (y1 - y0) * i / 5);
  return () => tp('touchEnd');
}
const PHONE = { ...devices['iPhone 13'] };

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist'] });

  await test('game list shows every game and the coming-soon card', async () => {
    const p = await open(browser, 'index.html');
    const cards = await p.$$eval('.card', els => els.length);
    const games = await p.evaluate(() => GAMES.length);
    check(cards === games + 1, `${cards} cards for ${games} games`);
    for (const g of await p.evaluate(() => GAMES)) {
      check(fs.existsSync(path.join(ROOT, g.url)), 'missing page ' + g.url);
      check(fs.existsSync(path.join(ROOT, g.thumb)), 'missing thumbnail ' + g.thumb);
    }
    // a saved best score shows up on its card
    await p.evaluate(() => { localStorage.setItem('fb_best', '42'); render(); });
    check((await p.textContent('#games')).includes('Best 42'), 'best score not shown');
    await done(p, 'index.png');
  });

  await test('share page and link previews', async () => {
    const p = await open(browser, 'share.html');
    for (const f of ['index.html', 'space-wars.html', 'floppy-bird.html', 'surfs-up.html', 'hamglider.html', 'share.html']) {
      const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
      const img = (html.match(/property="og:image" content="https:\/\/robobandit\.com\/([^"]+)"/) || [])[1];
      check(img && fs.existsSync(path.join(ROOT, img)), `${f}: og:image ${img} missing`);
      check(!/Starfighter Run/i.test(html), `${f} still says Starfighter Run`);
    }
    await done(p, 'share.png');
  });

  await test('Floppy Bird: autopilot scores, crashes use up 3 lives, pause stops time', async () => {
    const p = await open(browser, 'floppy-bird.html');
    const r = await p.evaluate(() => {
      flap();
      for (let i = 0; i < 60 * 40 && score < 9; i++) {
        const n = pipes.find(q => q.x + 38 > bird.x - 10);
        if (mode === 'play' && bird.y > (n ? n.cy + 25 : 300) && bird.vy > -50) flap();
        update(1 / 60);
      }
      const scored = score;
      const livesSeen = [];
      for (let k = 0; k < 3; k++) {
        safeT = 0; bird.y = H - GROUND - 5; bird.vy = 600; update(1 / 60);
        livesSeen.push(lives + ':' + mode);
        if (mode === 'hurt') { for (let i = 0; i < 60; i++) update(1 / 60); flap(); }
      }
      return { scored, livesSeen, world };
    });
    check(r.scored >= 9, 'autopilot only scored ' + r.scored);
    check(r.world === 1, 'should have reached world 2 (Rainy Day)');
    check(r.livesSeen.join() === '2:hurt,1:hurt,0:dead', 'lives went ' + r.livesSeen.join());
    await p.evaluate(() => { reset(); mode = 'title'; flap(); });
    await p.click('#btnPause');
    const t0 = await p.evaluate(() => clock);
    await p.waitForTimeout(400);
    check(await p.evaluate(() => paused), 'pause button did not pause');
    check(await p.evaluate(t => clock === t, t0), 'game kept running while paused');
    await p.screenshot({ path: path.join(OUT, 'floppy-paused.png') });
    await p.click('.rb-pause button');
    check(!(await p.evaluate(() => paused)), 'did not resume');
    await done(p);
  });

  await test("Surf's Up: autopilot gets air and the judges score the ride", async () => {
    const p = await open(browser, 'surfs-up.html');
    const r = await p.evaluate(() => {
      localStorage.setItem('su_howto', '1');
      startRide();
      let airs = 0, wasAir = false, ph = 'down';
      for (let i = 0; i < 60 * 70 && mode !== 'results'; i++) {
        if (!s.air) {
          const up = Math.sin(s.a);
          if (ph === 'down') { keys.down = s.a > -0.9; keys.up = false; if (s.f < 0.25) ph = 'turn'; }
          else if (ph === 'turn') { keys.up = true; keys.down = false; if (up > 0.85) ph = 'climb'; }
          else { keys.up = keys.down = false; if (s.f > 0.97 || up < 0.5) ph = 'down'; }
        } else { keys.up = keys.down = false; ph = 'down'; }
        update(1 / 60);
        if (s.air && !wasAir) airs++;
        wasAir = !!s.air;
      }
      return { mode, score, airs, cards: results && results.cards.length };
    });
    check(r.mode === 'results', 'ride never ended');
    check(r.airs > 0 && r.score > 0, `airs ${r.airs}, score ${r.score}`);
    check(r.cards === 5, 'expected five judges');
    await done(p, 'surf-results.png');
  });

  await test("Surf's Up on a phone: joystick drag carves up and down", async () => {
    const p = await open(browser, 'surfs-up.html', PHONE);
    await p.evaluate(() => { localStorage.setItem('su_howto', '1'); startRide(); });
    let end = await touchDrag(p, 200, 400, 200, 330);
    await p.waitForTimeout(250);
    const up = await p.evaluate(() => turnInput());
    await p.screenshot({ path: path.join(OUT, 'surf-stick.png') });
    await end();
    end = await touchDrag(p, 200, 330, 200, 400);
    await p.waitForTimeout(100);
    const down = await p.evaluate(() => turnInput());
    await end();
    check(up > 0.9 && down < -0.9, `turn input up ${up}, down ${down}`);
    await done(p);
  });

  await test('Space Wars: joystick flies the ship, fire buttons show, shares its own page', async () => {
    const p = await open(browser, 'space-wars.html', { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
    await p.evaluate(() => startLevel(1));
    await p.waitForTimeout(500);
    const before = await p.evaluate(() => ({ x: player.x, y: player.y }));
    const end = await touchDrag(p, 200, 250, 260, 200);
    await p.waitForTimeout(700);
    const after = await p.evaluate(() => ({ x: player.x, y: player.y }));
    await p.screenshot({ path: path.join(OUT, 'space-wars-stick.png') });
    await end();
    check(after.x > before.x + 1 && after.y > before.y + 1, `ship went ${JSON.stringify(before)} → ${JSON.stringify(after)}`);
    check(await p.isVisible('#btnLaser'), 'fire buttons hidden');
    const title = await p.evaluate(() => document.title);
    check(title.startsWith('Space Wars'), 'title is ' + title);
    await done(p);
  });

  await test('Hamglider: autopilot lands on the target in all five rounds', async () => {
    const p = await open(browser, 'hamglider.html', { viewport: { width: 480, height: 270 } });
    const r = await p.evaluate(() => {
      startGame();
      const landed = [];
      let last = '';
      for (let i = 0; i < 60 * 400 && state !== 'end'; i++) {
        if (state === 'intro') action();
        if (state === 'air') {
          const dx = targetPos.x - pos.x, dz = targetPos.z - pos.z, dist = Math.hypot(dx, dz);
          if (!wings && vel.y < 0 && dist > 25 && pos.y > 8) action();
          if (wings) {
            const want = Math.atan2(dx, -dz), diff = Math.atan2(Math.sin(want - yaw), Math.cos(want - yaw));
            keys.right = diff > 0.05; keys.left = diff < -0.05;
            const need = (pos.y - 1.2) / Math.max(dist, 1);
            keys.down = need > 0.3; keys.up = need < 0.09;
            if (dist < 7) action();
          }
        } else { keys.left = keys.right = keys.up = keys.down = false; }
        update(1 / 60);
        if (state !== last && state === 'roll') landed.push(round + 1);
        last = state;
      }
      return { state, total, landed };
    });
    check(r.state === 'end', 'game did not finish');
    check(r.landed.length === 5, 'landed in rounds ' + r.landed.join());
    check(r.total > 0, 'scored nothing');
    await done(p, 'hamglider-end.png');
  });

  await test('Hamglider on a phone: joystick steers and the WINGS button opens the wings', async () => {
    const p = await open(browser, 'hamglider.html', PHONE);
    await p.tap('#btnPlay');
    await p.evaluate(() => { action(); for (let i = 0; i < 60 * 8 && state !== 'air'; i++) update(1 / 60); });
    await p.waitForTimeout(300);
    await p.tap('#wingBtn');
    const end = await touchDrag(p, 120, 500, 180, 500);
    await p.waitForTimeout(200);
    const r = await p.evaluate(() => ({ wings, steer: steerInput() }));
    await end();
    check(r.wings, 'wings did not open');
    check(r.steer > 0.9, 'joystick steer ' + r.steer);
    await done(p, 'hamglider-phone.png');
  });

  await test('one mute setting for every game', async () => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto(url('floppy-bird.html'));
    await p.evaluate(() => RB.setMuted(true));
    for (const f of ['surfs-up.html', 'hamglider.html', 'space-wars.html']) {
      await p.goto(url(f));
      await p.waitForTimeout(300);
      check(await p.evaluate(() => RB.muted), f + ' is not muted');
      check((await p.textContent('#btnMute')) === '🔇', f + ' mute button shows sound on');
    }
    await ctx.close();
  });

  await browser.close();
  let failed = 0;
  for (const [ok, name, ms, err] of results) {
    console.log(`${ok ? '✅' : '❌'} ${name} (${(ms / 1000).toFixed(1)}s)${ok ? '' : '\n     ' + err}`);
    if (!ok) failed++;
  }
  console.log(`\n${results.length - failed}/${results.length} passed · screenshots in tests/output/`);
  process.exit(failed ? 1 : 0);
})();
