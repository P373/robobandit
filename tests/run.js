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
  if (process.env.ONLY && !name.toLowerCase().includes(process.env.ONLY.toLowerCase())) return;   // ONLY=witch runs just the matching tests
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
// A pretend Xbox controller: tests press its buttons and move its stick through window.__pad.
const fakePad = () => {
  const gp = { id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
    vibrationActuator: { playEffect: () => { window.__rumbles = (window.__rumbles || 0) + 1; return Promise.resolve('complete'); } } };
  window.__pad = gp;
  navigator.getGamepads = () => [gp, null, null, null];
};
const PAD = { A: 0, B: 1, X: 2, Y: 3, LT: 6, RT: 7, VIEW: 8, MENU: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const padHold = async (p, b, on) => { await p.evaluate(([i, on]) => { __pad.buttons[i] = { pressed: on, value: on ? 1 : 0 }; }, [PAD[b], on]); await p.waitForTimeout(90); };
const padTap = async (p, b) => { await padHold(p, b, true); await padHold(p, b, false); };
const padStick = async (p, x, y) => { await p.evaluate(([x, y]) => { __pad.axes[0] = x; __pad.axes[1] = y; }, [x, y]); await p.waitForTimeout(150); };
const padFocus = p => p.evaluate(() => { const e = document.querySelector('.rb-pad-focus'); return e ? e.id || e.textContent.trim().slice(0, 30) : null; });

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist'] });

  await test("game list shows every game (today's big at the top, the rest as cards)", async () => {
    const p = await open(browser, 'index.html');
    const cards = await p.$$eval('.card', els => els.length);
    const games = await p.evaluate(() => GAMES.length);
    check(cards === games - 1, `${cards} cards for ${games} games (today's game is the big one at the top)`);
    for (const g of await p.evaluate(() => GAMES)) {
      check(fs.existsSync(path.join(ROOT, g.url)), 'missing page ' + g.url);
      check(fs.existsSync(path.join(ROOT, g.thumb)), 'missing thumbnail ' + g.thumb);
    }
    // a saved best score shows up on its card
    await p.evaluate(() => { localStorage.setItem('fb_best', '42'); render(); });
    check((await p.textContent('#games')).includes('Best 42'), 'best score not shown');
    await done(p, 'index.png');
  });

  await test("home page: today's game up top (and not again below), Keep playing, three filters, a quiet line on each card, the pitch on hover, and the cards are in the HTML itself", async () => {
    // the cards and the JSON-LD game list are written into index.html (search engines see them without the script)
    check(require('child_process').spawnSync('node', [path.join(ROOT, 'tools/build-index.js'), '--check']).status === 0, 'index.html is out of date: run node tools/build-index.js');
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
    const staticCards = (html.match(/<!-- games:start -->[\s\S]*?<!-- games:end -->/)[0].match(/class="card[ "]/g) || []).length;
    const p = await open(browser, 'index.html');
    const info = await p.evaluate(() => ({ games: GAMES.length, extras: EXTRAS.length, newest: GAMES[GAMES.length - 1].title }));
    check(ld['@type'] === 'ItemList' && ld.itemListElement.length === info.games + info.extras, 'JSON-LD lists every game: ' + ld.itemListElement.length);
    check(staticCards === info.games, `${staticCards} cards written into the HTML for ${info.games} games`);
    // today's game: the newest, with a big play button, above the game list
    const hero = await p.evaluate(() => { const h = document.getElementById('hero'), g = document.getElementById('games');
      return { text: h.textContent, play: h.querySelector('.play')?.textContent, above: h.getBoundingClientRect().top < g.getBoundingClientRect().top,
        foldersBelow: document.querySelector('.folder').getBoundingClientRect().top > g.getBoundingClientRect().bottom }; });
    check(hero.text.includes(info.newest) && /Today's game/.test(hero.text) && /Play/.test(hero.play) && /Tomorrow/.test(hero.text) && hero.above && hero.foldersBelow, "today's game up top, school folders under the games: " + JSON.stringify(hero));
    // Keep playing: hidden until a game was played, then shows it with its best (times as m:ss)
    check(await p.evaluate(() => document.getElementById('recentWrap').hidden), 'Keep playing starts hidden');
    await p.goto(url('witch-way-out.html')); await p.waitForTimeout(500);
    await p.goto(url('index.html')); await p.waitForTimeout(500);
    await p.evaluate(() => { localStorage.setItem('ww_best', '83.4'); render(); });
    const recent = await p.evaluate(() => ({ hidden: document.getElementById('recentWrap').hidden, text: document.getElementById('recent').textContent }));
    check(!recent.hidden && /Witch Way Out/.test(recent.text) && /1:23/.test(recent.text), 'playing a game puts it in Keep playing with its best time: ' + JSON.stringify(recent));
    // card details: players, age, Moto Rush is the classic, blurbs are short
    const cards = await p.$$eval('#games .card', els => els.map(e => e.textContent));
    check(!cards.some(t => t.includes(info.newest)), "today's game isn't repeated in the list");
    check(cards.some(t => /Moto Rush/.test(t) && /Classic/.test(t)), 'Moto Rush is marked Classic');
    check(cards.filter(t => /\d players?/.test(t) && /Ages \d/.test(t)).length === info.games - 1, 'every card shows players and age');
    // the pitch slides up over the picture on hover
    await p.hover('#games .card:nth-child(2)'); await p.waitForTimeout(300);
    check(await p.evaluate(() => +getComputedStyle(document.querySelector('#games .card:nth-child(2) .more')).opacity > 0.9), 'hovering a card shows its pitch');
    check(await p.evaluate(() => GAMES.every(g => g.blurb.length <= 90)), 'every blurb is 90 letters or fewer');
    // filter chips
    const counts = {};
    check(await p.$$eval('#filters .chip', els => els.length) === 4, 'four filter chips: All and three questions');
    for (const f of ['little', 'multi', 'learning', 'all']) {
      await p.click(`#filters .chip[data-f="${f}"]`);
      counts[f] = await p.evaluate(f => ({ n: document.querySelectorAll('#games .card:not(.soon)').length,
        ok: [...document.querySelectorAll('#games .card:not(.soon)')].every(c => f === 'all' || c.dataset.tags.split(' ').includes(f)),
        pressed: document.querySelector(`#filters .chip[data-f="${f}"]`).getAttribute('aria-pressed') }), f);
    }
    check(Object.values(counts).every(c => c.ok && c.pressed === 'true') && counts.little.n >= 2 && counts.multi.n >= 3 && counts.all.n === info.games - 1, 'filters show only matching games: ' + JSON.stringify(counts));
    check(/ABC Train/.test(await p.evaluate(() => { document.querySelector('#filters .chip[data-f="little"]').click(); return document.getElementById('games').textContent; })), 'Little kids includes ABC Train');
    check(/For grown-ups/.test(await p.textContent('body')), 'the grown-ups line shows');
    await done(p, 'index-filters.png');
    // a phone: the hero and the games come before the folders, nothing scrolls sideways
    const ph = await open(browser, 'index.html', PHONE);
    const phone = await ph.evaluate(() => { const c = [...document.querySelectorAll('#games .card')].slice(0, 2).map(e => e.getBoundingClientRect());
      return { wide: document.documentElement.scrollWidth > innerWidth + 1, play: document.querySelector('#hero .play').getBoundingClientRect().bottom < innerHeight * 1.2,
        twoUp: Math.abs(c[0].top - c[1].top) < 2 && c[1].left > c[0].right, tall: document.documentElement.scrollHeight }; });
    check(!phone.wide && phone.play && phone.twoUp && phone.tall < 3200, 'phone layout (two pictures a row, a short page): ' + JSON.stringify(phone));
    await done(ph, 'index-phone.png');
  });

  await test('share page and link previews', async () => {
    const p = await open(browser, 'share.html');
    for (const f of ['index.html', 'space-wars.html', 'floppy-bird.html', 'surfs-up.html', 'hamglider.html', 'web-hero.html', 'sparkle-meadow.html', 'witch-way-out.html', 'flight-school.html', 'lucky-leo.html', 'lily-pad-lunch.html', 'pumpkin-pals.html', 'moto-rush.html', 'moto-mania.html', 'share.html']) {
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

  await test('Hamglider: autopilot lands on the target in every round of all four worlds (boosting down the Cape Cod Canal)', async () => {
    const p = await open(browser, 'hamglider.html', { viewport: { width: 480, height: 270 } });
    const r = await p.evaluate(() => {
      const out = [];
      for (let w = 0; w < WORLDS.length; w++) {
        startGame(w);
        const landed = [];
        let last = '', boosted = false;
        for (let i = 0; i < 60 * 600 && state !== 'end'; i++) {
          if (state === 'intro') action();
          // the canal is too far to glide: boost while the target is still a long way off
          keys.boost = !!world.boost && (state === 'air' || state === 'ramp') && fuel > 0 && Math.hypot(targetPos.x - pos.x, targetPos.z - pos.z) > 120 + pos.y * 4;
          if (boosting) boosted = true;
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
          if (state !== last && state === 'roll' && surf.target) landed.push(round + 1);
          last = state;
        }
        keys.boost = false;
        out.push({ world: world.id, state, total, landed: landed.length, stars: save.stars[world.id], boosted });
      }
      return out;
    });
    for (const w of r) {
      check(w.state === 'end', w.world + ' did not finish');
      check(w.landed === 3, `${w.world}: landed on the target in ${w.landed} of 3 rounds`);
      check(w.total > 0 && w.stars >= 1, `${w.world}: total ${w.total}, stars ${w.stars}`);
      check(w.world !== 'canal' || w.boosted, 'the canal autopilot should have boosted');
    }
    await done(p, 'hamglider-end.png');
  });

  await test('Hamglider: leaning curves the takeoff, islands are safe, secrets unlock balls, bullseyes replay', async () => {
    const p = await open(browser, 'hamglider.html', { viewport: { width: 480, height: 270 } });
    const r = await p.evaluate(() => {
      const out = {};
      // leaning on the ramp sends you off on a curve, either way
      const run = side => { startGame(0); action(); for (let i = 0; i < 60 * 30 && !(state === 'air' && stateT > 2.5); i++) { keys.left = side < 0 && state === 'ramp'; keys.right = side > 0 && state === 'ramp'; update(1 / 60); } keys.left = keys.right = false; return pos.x; };
      out.curve = [run(-1), run(0), run(1)];
      // dropping onto an island lands safely for island points
      startGame(0); action();
      for (let i = 0; i < 60 * 30 && state !== 'air'; i++) update(1 / 60);
      const isle = isles.find(s => !s.secret);
      pos.set(isle.x, 8, isle.z); vel.set(0, -1, 0); wings = false; curve = 0;
      for (let i = 0; i < 60 * 10 && state !== 'result'; i++) update(1 / 60);
      out.island = roundScores[0];
      // touching the secret treasure unlocks that world's ball
      startGame(1); action();
      for (let i = 0; i < 60 * 30 && state !== 'air'; i++) update(1 / 60);
      pos.copy(treasureAt); update(1 / 60);
      out.secret = { found: secretThisRound, egg: save.eggs.lava, ball: ballOpen(BALLS.find(b => b.id === 'magma')) };
      // a bullseye plays a slow-motion replay, then the next round starts
      startGame(0); action();
      for (let i = 0; i < 60 * 30 && state !== 'air'; i++) update(1 / 60);
      pos.set(targetPos.x, 12, targetPos.z); vel.set(0, -2, 0); wings = false; curve = 0;
      const seen = [];
      for (let i = 0; i < 60 * 40 && round === 0; i++) { update(1 / 60); updateVisuals(1 / 60); if (seen[seen.length - 1] !== state) seen.push(state); }
      out.replay = { seen, pts: roundScores[0].pts, round };
      // falling into lava is a "TOO HOT!" bounce, not a splash
      startGame(1); action();
      for (let i = 0; i < 60 * 30 && state !== 'air'; i++) update(1 / 60);
      pos.set(targetPos.x + 60, 5, targetPos.z); vel.set(0, -5, 0); wings = false;
      const lava = [];
      for (let i = 0; i < 60 * 6 && state !== 'result'; i++) { update(1 / 60); if (lava[lava.length - 1] !== state) lava.push(state); }
      out.lava = { seen: lava, text: roundScores[0].text };
      // Cape Cod Canal: the old small islands are gone; the canal bank is a safe landing; the railroad bridge is solid
      startGame(3); action();
      for (let i = 0; i < 60 * 30 && state !== 'air'; i++) update(1 / 60);
      pos.set(CANAL_HALF + 30, 6, -150); vel.set(0, -2, 0); wings = false; curve = 0;
      for (let i = 0; i < 60 * 10 && state !== 'result'; i++) update(1 / 60);
      const bank = roundScores[0];
      setupRound(1); action();
      for (let i = 0; i < 60 * 30 && state !== 'air'; i++) update(1 / 60);
      pos.set(0, 50, RR_Z + 12); vel.set(0, 0, -30); wings = false; curve = 0;
      for (let i = 0; i < 30; i++) update(1 / 60);
      out.canal = { bank, stoppedBy: pos.z > RR_Z - 6.5, ledge: ledgeLight.parent === isleGroup };
      startGame(0);
      out.oceanIsles = isles.filter(s => !s.secret).map(s => Math.hypot(s.x, s.z) - Math.hypot(targetPos.x, targetPos.z));
      return out;
    });
    check(r.curve[0] < -8 && r.curve[2] > 8 && Math.abs(r.curve[1]) < 1, 'takeoff did not curve: ' + r.curve.map(Math.round));
    check(r.island && r.island.pts === 15, 'island landing scored ' + JSON.stringify(r.island));
    check(r.secret.found && r.secret.egg && r.secret.ball, 'secret: ' + JSON.stringify(r.secret));
    check(r.canal.bank && r.canal.bank.pts === 15 && /canal bank/.test(r.canal.bank.text), 'canal bank landing: ' + JSON.stringify(r.canal));
    check(r.canal.stoppedBy && r.canal.ledge, 'the railroad bridge should be solid, the lighthouse in place: ' + JSON.stringify(r.canal));
    check(r.oceanIsles.length === 2 && r.oceanIsles.every(d => d > 20), 'the landing islands should be out past the target: ' + JSON.stringify(r.oceanIsles));
    check(r.replay.pts === 100 && r.replay.seen.includes('replay') && r.replay.round === 1, 'replay: ' + JSON.stringify(r.replay));
    check(r.lava.seen.includes('burn') && r.lava.text === 'TOO HOT!', 'lava: ' + JSON.stringify(r.lava));
    await done(p, 'hamglider-features.png');
  });

  await test('Hamglider helpers: the camera looks down the ramp (never under it), a shadow under Pip, the target arrow (and the edge arrow off screen), wings that pop open before a splash, a short title', async () => {
    const p = await open(browser, 'hamglider.html', { viewport: { width: 960, height: 600 } });
    check(await p.evaluate(() => { const r = $('btnPlay').getBoundingClientRect(); return r.bottom <= innerHeight; }), "LET'S FLY is on the screen without scrolling");
    const r = await p.evaluate(() => {
      const out = {};
      startGame(0); action();
      // down the steep top (once it has swept in from the round card): the camera stays above the slope behind Pip
      let under = 0;
      for (let i = 0; i < 90; i++) { update(1 / 60); updateVisuals(1 / 60); if (i >= 30 && camPos.z > pos.z && camPos.y < pos.y + (camPos.z - pos.z) * -rampSlope(d)) under++; }
      out.under = under;
      out.arrowOnRamp = targetArrow.visible;
      for (let i = 0; i < 60 * 30 && state !== 'air'; i++) { update(1 / 60); updateVisuals(1 / 60); }
      for (let i = 0; i < 30; i++) { update(1 / 60); updateVisuals(1 / 60); }
      out.blob = { on: blob.visible, below: blob.position.y < pos.y - 5, x: Math.abs(blob.position.x - pos.x) < 0.01 };
      // swing the camera right round: the dartboard is off the screen, so the edge arrow shows
      updateHUD(); out.edgeAhead = !$('tgtEdge').classList.contains('hidden');
      camera.position.set(pos.x, pos.y, pos.z - 10); camera.lookAt(pos.x, pos.y, pos.z + 50); camera.updateMatrixWorld();
      updateHUD(); out.edgeBehind = !$('tgtEdge').classList.contains('hidden');
      // never opened the wings and dropping toward the sea: they pop open by themselves
      pos.set(targetPos.x + 70, 30, targetPos.z); vel.set(0, -12, -5); wings = false; wingsUsed = false; stateT = 2;
      for (let i = 0; i < 60 * 3 && !wings && state === 'air'; i++) update(1 / 60);
      out.auto = { wings, y: +pos.y.toFixed(1), msg: (updateHUD(), $('prompt').textContent) };
      // but a deliberate drop onto the dartboard (wings closed on purpose) is left alone
      startGame(0); action();
      for (let i = 0; i < 60 * 30 && state !== 'air'; i++) update(1 / 60);
      action(); action();   // open, then close
      pos.set(targetPos.x, 12, targetPos.z); vel.set(0, -10, 0); curve = 0; stateT = 3;
      for (let i = 0; i < 60 * 3 && state === 'air'; i++) update(1 / 60);
      out.drop = { state, wings };
      return out;
    });
    check(r.under === 0, `the camera dipped under the slope ${r.under} times on the steep top of the ramp`);
    check(r.arrowOnRamp, 'the arrow over the dartboard shows from the ramp');
    check(r.blob.on && r.blob.below && r.blob.x, "Pip's shadow sits right under the ball: " + JSON.stringify(r.blob));
    check(!r.edgeAhead && r.edgeBehind, `edge arrow: ahead ${r.edgeAhead}, looking back ${r.edgeBehind}`);
    check(r.auto.wings && r.auto.y > 2 && /WINGS OUT/.test(r.auto.msg), 'the wings pop open before a splash: ' + JSON.stringify(r.auto));
    check(r.drop.state !== 'air' && !r.drop.wings, 'a deliberate drop onto the target is not stopped: ' + JSON.stringify(r.drop));
    await done(p, 'hamglider-helpers.png');
  });

  await test('Hamglider: worlds unlock in order, and "Unlock all" opens every world and ball', async () => {
    const p = await open(browser, 'hamglider.html', { viewport: { width: 960, height: 600 } });
    await p.click('#btnPlay');
    check(await p.$$eval('.world.locked', els => els.length) === 3, 'lava, storm and the canal should start locked');
    await p.click('#btnUnlock');
    check(await p.$$eval('.world.locked', els => els.length) === 0, 'worlds still locked');
    await p.click('#btnBalls');
    check(await p.$$eval('.ball.locked', els => els.length) === 0, 'balls still locked');
    await p.click('.ball[data-id="rainbow"]');
    check(await p.evaluate(() => save.ball) === 'rainbow', 'could not pick a ball');
    await p.reload(); await p.waitForTimeout(500);
    check(await p.evaluate(() => save.unlockAll && save.ball === 'rainbow'), 'not saved');
    await done(p, 'hamglider-balls.png');
  });

  await test('Hamglider on a phone: joystick steers and the WINGS button opens the wings', async () => {
    const p = await open(browser, 'hamglider.html', PHONE);
    await p.tap('#btnPlay');
    await p.tap('.world[data-i="0"]');
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

  await test('Web Hero: just holding chains swings, bonks bots and beats the Big Bandit', async () => {
    const p = await open(browser, 'web-hero.html');
    await p.click('#btnPlay');
    const r = await p.evaluate(() => {
      for (let i = 0; i < 60 * 60 && mode !== 'over'; i++) {
        if (mode === 'play' && !held) press();
        update(1 / 60);
      }
      return { mode, x: hero.x, bonked, hearts, score: score(), level };
    });
    check(r.x > 8000, 'only got to x=' + Math.round(r.x));
    check(r.level >= 2, 'never beat the Big Bandit (level ' + r.level + ')');
    check(r.bonked >= 5, 'bonked ' + r.bonked);
    check(r.score > 0, 'no score');
    await done(p, 'web-hero.png');
  });

  await test('Web Hero: falling to the street costs a heart, three falls end the game', async () => {
    const p = await open(browser, 'web-hero.html');
    await p.click('#btnPlay');
    const r = await p.evaluate(() => {
      const seen = [];
      for (let k = 0; k < 3; k++) {
        safeT = 0; hero.state = 'air'; hero.y = STREET + 5; update(1 / 60);
        seen.push(hearts + ':' + mode);
        for (let i = 0; i < 100; i++) update(1 / 60);
      }
      return { seen, mode };
    });
    check(r.seen.join() === '2:fall,1:fall,0:fall', 'hearts went ' + r.seen.join());
    check(r.mode === 'over', 'game did not end');
    check(await p.isVisible('#over'), 'game over screen hidden');
    await done(p);
  });

  await test('Sparkle Meadow: following the pink arrow makes all six animal friends', async () => {
    const p = await open(browser, 'sparkle-meadow.html');
    await p.click('#btnPlay');
    await p.click('#btnStableDone');
    const r = await p.evaluate(() => {
      for (let i = 0; i < 60 * 400 && friendCount() < 6; i++) {
        const q = questTarget();
        keys.l = keys.r = keys.u = keys.d = false;
        if (q) {
          const dx = q.x - pony.x, dy = q.y - pony.y;
          if (Math.abs(dx) > 30) keys[dx > 0 ? 'r' : 'l'] = true;
          if (Math.abs(dy) > 30) keys[dy > 0 ? 'd' : 'u'] = true;
        }
        if (actionHere()[2] !== 'jump' && i % 30 === 0) action();
        update(1 / 60);
      }
      return { friends: friendCount(), saved: JSON.parse(localStorage.getItem('sm_save')).friends };
    });
    check(r.friends === 6, 'made ' + r.friends + ' friends');
    check(Object.keys(r.saved).length === 6, 'friends not saved');
    await done(p, 'sparkle-meadow.png');
  });

  await test('Sparkle Meadow: sparkles unlock the unicorn horn', async () => {
    const p = await open(browser, 'sparkle-meadow.html');
    await p.click('#btnPlay');
    await p.evaluate(() => { save.sparkles = 60; renderStable(); });
    await p.click('[data-acc="horn"]');
    const r = await p.evaluate(() => ({ unlocked: save.unlocked.includes('horn'), wearing: save.look.acc.includes('horn'), left: save.sparkles }));
    check(r.unlocked && r.wearing && r.left === 0, JSON.stringify(r));
    await done(p);
  });

  await test('Witch Way Out: flying the line escapes the pumpkin; ignoring the storm gets you caught', async () => {
    const p = await open(browser, 'witch-way-out.html', { viewport: { width: 480, height: 270 } });
    const fly = strat => p.evaluate(strat => {
      startGame(); introT = 0; countT = 0;
      for (let i = 0; i < 60 * 300 && state === 'fly'; i++) {
        keys.l = keys.r = keys.u = keys.d = false;
        if (strat === 'pilot') {
          const z = pos.z - 35, wantYaw = Math.atan2(-(lineX(z) - pos.x), -(z - pos.z));
          if (wantYaw - yaw < -0.05) keys.r = true; else if (wantYaw - yaw > 0.05) keys.l = true;
          const wp = Math.atan2(lineY(z) - pos.y, 35);
          if (wp - pitch > 0.05) keys.u = true; else if (wp - pitch < -0.05) keys.d = true;
          if (strike && strike.t < 0.6) castShield();
          if (projectiles.some(h => h.kind === 'rival' && h.mesh.position.distanceTo(pos) < 10)) castShield();
        }
        update(1 / 60);
      }
      return { state, caught: caughtCount, rings: ringCount, place };
    }, strat);
    const good = await fly('pilot');
    check(good.state === 'over' && good.caught === 0 && good.place >= 1 && good.place <= 6, 'pilot: ' + JSON.stringify(good));
    const idle = await fly('idle');
    check(idle.caught > 0, 'doing nothing should get caught at least once: ' + JSON.stringify(idle));
    check(idle.state === 'over', 'the pumpkin should ease off so everyone can finish: ' + JSON.stringify(idle));
    await done(p, 'witch-way-out.png');
  });

  await test('Flight School: every lesson draws, and autopilots win all 14 rounds in each mode', async () => {
    const p = await open(browser, 'flight-school.html', { viewport: { width: 960, height: 600 } });
    await p.addScriptTag({ path: path.join(__dirname, 'flight-bots.js') });
    await p.click('#go');
    const slides = await p.evaluate(() => {   // every lesson slide, its diagram, and its slider at both ends
      let n = 0;
      LEVELS.forEach((L, i) => L.slides.forEach((S, s) => { cur = i; slide = s; lessonScreen(); for (const v of [0, 1]) { diaV = v; drawDiagram(1.3); } n++; }));
      return n;
    });
    check(slides >= 56, slides + ' slides');
    for (const m of ['easy', 'toddler']) {
      const runs = await p.evaluate(m => { settings.mode = m; return LEVELS.map((_, i) => runFlight(i)); }, m);
      for (const r of runs) check(r.ended && r.win, `${m}: autopilot didn't win ${r.id}: ${JSON.stringify(r)}`);
    }
    // doing nothing still ends every round (no getting stuck), in every mode
    for (const m of ['easy', 'toddler', 'challenge']) {
      const idle = await p.evaluate(m => {
        settings.mode = m; askSignal = (sig, tod, done) => done(false);
        return LEVELS.map((L, i) => {
          cur = i; startRound(true);
          for (let f = 0; f < 60 * 400 && mode === 'play'; f++) {
            for (const k in keys) keys[k] = false;
            if (L.id === 'aliens') FSBOT.aliens(round);   // the telescope needs moving to find anything
            update(1 / 60);
          }
          return [L.id, mode];
        }).filter(([, md]) => md === 'play').map(([id]) => id);
      }, m);
      check(idle.length === 0, `${m}: these rounds never end without input: ${idle}`);
    }
    await done(p, 'flight-school.png');
  });

  await test('Flight School: lessons use the whole screen (a big diagram, no card), on a wide screen and a phone', async () => {
    const bad = [];
    for (const vp of [{ width: 1400, height: 700 }, { width: 844, height: 390 }, { width: 390, height: 844 }]) {
      const p = await open(browser, 'flight-school.html', { viewport: vp });
      await p.evaluate(() => startLesson(2)); await p.waitForTimeout(300);
      const r = await p.evaluate(() => {
        const d = document.getElementById('dia').getBoundingClientRect(), c = getComputedStyle(document.getElementById('card'));
        const fwd = document.getElementById('fwd').getBoundingClientRect();
        return { w: d.width / innerWidth, h: d.height / innerHeight, border: c.borderTopWidth, sharp: document.getElementById('dia').width >= d.width, fwdOn: fwd.bottom <= innerHeight + 1 || innerHeight > innerWidth };
      });
      if (!(r.w > (vp.width > vp.height ? 0.55 : 0.9)) || r.border !== '0px' || !r.sharp || !r.fwdOn) bad.push(JSON.stringify({ vp, r }));
      await done(p, vp.width === 1400 ? 'flight-lesson-wide.png' : null);
    }
    check(!bad.length, 'lesson layout: ' + bad.join(' | '));
  });

  await test('Flight School: quiz with second chances, stars, cards, final exam and certificate', async () => {
    const p = await open(browser, 'flight-school.html', { viewport: { width: 960, height: 700 } });
    await p.evaluate(() => { settings.mode = 'easy'; cur = 0; startRound(true); round.over = true; round.win = true; round.end = 'test'; round.endT = 2; update(0.01); });
    await p.click('#quiz');
    check(await p.$$eval('.ans', a => a.length) === 4, 'questions should have 4 choices');
    for (let q = 0; q < 4; q++) {   // miss the first one
      const k = await p.evaluate(() => quiz[qi].opts.findIndex(o => o.right));
      await p.click(`.ans[data-k="${q === 0 ? (k + 1) % 4 : k}"]`);
      await p.click('#nextQ');
    }
    check(await p.isVisible('text=Second chance!'), 'missed questions should come back');
    await p.click('#go');
    const k = await p.evaluate(() => quiz[qi].opts.findIndex(o => o.right));
    await p.click(`.ans[data-k="${k}"]`); await p.click('#nextQ');
    const s1 = await p.evaluate(() => JSON.parse(localStorage.getItem('fs_save')));
    check(s1.modes.easy.stars.balloon === 2 && s1.cards.balloon[0] && !s1.cards.balloon[1], 'stars/cards: ' + JSON.stringify(s1));
    check(s1.modes.easy.best.balloon >= 3 * 100 + 50, 'quiz points: ' + s1.modes.easy.best.balloon);
    check(await p.evaluate(() => unlocked(1) && !unlocked(2)), 'level 2 should unlock next');
    // toddler mode: everything open and no quiz after the round
    await p.evaluate(() => { settings.mode = 'toddler'; cur = 5; startRound(true); round.over = true; round.end = 'test'; round.endT = 2; update(0.01); });
    check(await p.evaluate(() => unlocked(13)), 'toddler mode unlocks every level');
    check((await p.textContent('#quiz')).includes('Finish level'), 'toddler mode skips the quiz');
    // finish every level, then the exam and certificate
    await p.evaluate(() => { settings.mode = 'easy'; for (const L of LEVELS) { prog().stars[L.id] = 3; prog().best[L.id] = 500; } persist(); mapScreen(); });
    await p.click('#exam');
    for (let i = 0; i < 6; i++) { const s = await p.evaluate(() => examState.order[examState.placed].s); await p.click(`.ans[data-s="${s.replace(/"/g, '\\"')}"]`); }
    for (let i = 0; i < 8; i++) { const k2 = await p.evaluate(() => examState.qs[examState.qi].opts.findIndex(o => o.right)); await p.click(`.ans[data-k="${k2}"]`); await p.click('#n'); }
    check(await p.evaluate(() => prog().exam === 1100), 'perfect exam should score 1100');
    await p.click('#cert');
    check((await p.textContent('#certBox')).includes('with Honors'), 'honors certificate');
    check(+(await p.evaluate(() => localStorage.getItem('fs_best'))) === 14 * 500 + 1100, 'fs_best total');
    await done(p, 'flight-school-cert.png');
  });

  await test('Flight School on a phone: hold for the burner, STAGE button, joystick helicopter', async () => {
    const p = await open(browser, 'flight-school.html', PHONE);
    await p.evaluate(() => { cur = 0; startRound(true); });
    const up = await touchDrag(p, 200, 400, 200, 400);
    await p.waitForTimeout(600);
    const heat = await p.evaluate(() => round.heat);
    await up();
    check(heat > 0.6, 'holding the screen should heat the balloon: ' + heat);
    await p.evaluate(() => { cur = 7; startRound(true); for (let f = 0; f < 60 * 20 && round.stage === 0; f++) { update(1 / 60); if (round.burn >= 130) break; } });
    check(await p.isVisible('#actBtn'), 'STAGE button should show');
    await p.tap('#actBtn');
    check(await p.evaluate(() => round.stage === 1), 'STAGE button did not stage');
    await p.evaluate(() => { cur = 5; startRound(true); });
    const up2 = await touchDrag(p, 150, 500, 210, 440);
    for (let i = 0; i < 20; i++) await p.evaluate(() => update(1 / 60));
    const h = await p.evaluate(() => [round.landed, round.tilt]);
    await up2();
    check(!h[0] && h[1] > 0.1, 'dragging up-right should lift off and tilt right: ' + h);
    await done(p, 'flight-school-phone.png');
  });

  await test('Flight School: "Unlock all levels" opens every level and the exam, and stays unlocked', async () => {
    const p = await open(browser, 'flight-school.html', { viewport: { width: 960, height: 600 } });
    await p.evaluate(() => mapScreen());
    check(await p.$$eval('.lvl.locked', els => els.length) > 0, 'a fresh game should start with locked levels');
    await p.click('#unlockAll');
    check(await p.$$eval('.lvl.locked', els => els.length) === 0, 'levels still locked after Unlock all');
    check(!(await p.$('#unlockAll')), 'the button should go away once everything is open');
    await p.reload(); await p.waitForTimeout(500);
    await p.evaluate(() => mapScreen());
    check(await p.$$eval('.lvl.locked', els => els.length) === 0, 'Unlock all was not saved');
    await done(p, 'flight-school-unlocked.png');
  });

  await test('school folders: the home page links to each grade, and 5th and 2nd grade list their subjects', async () => {
    const p = await open(browser, 'index.html');
    const links = await p.$$eval('.folder', els => els.map(e => e.getAttribute('href')));
    check(links.length === 3, links.length + ' folders');
    for (const l of links) check(fs.existsSync(path.join(ROOT, l)), 'missing folder page ' + l);
    await p.close();
    const f = await open(browser, '5th-grade/index.html');
    const subjects = await f.evaluate(() => SUBJECTS);
    check(subjects.length === 4, subjects.length + ' subjects');
    for (const s of subjects) check(fs.existsSync(path.join(ROOT, '5th-grade', s.url)), 'missing subject page ' + s.url);
    await f.evaluate(() => { localStorage.setItem('rb_g5_math', JSON.stringify({ stars: { mult: 3, algo: 2 } })); render(); });
    check((await f.textContent('#subjects')).includes('5 of 18 stars'), 'saved stars not shown');
    await done(f, '5th-grade.png');
    const g2 = await open(browser, '2nd-grade/index.html');
    const subjects2 = await g2.evaluate(() => SUBJECTS);
    check(subjects2.length === 4, subjects2.length + ' 2nd grade subjects');
    for (const s of subjects2) check(fs.existsSync(path.join(ROOT, '2nd-grade', s.url)), 'missing subject page ' + s.url);
    await g2.evaluate(() => { localStorage.setItem('rb_g2_math', JSON.stringify({ stars: { place: 3, addsub: 1 } })); render(); });
    check((await g2.textContent('#subjects')).includes('4 of 21 stars'), '2nd grade saved stars not shown');
    await done(g2, '2nd-grade.png');
    const pre = await open(browser, 'preschool/index.html');
    const games = await pre.$$eval('.subject', els => els.map(e => e.getAttribute('href')));
    check(games.length >= 1 && games.every(g => fs.existsSync(path.join(ROOT, 'preschool', g))), 'preschool games: ' + games.join(' '));
    await done(pre, 'preschool.png');
  });

  // Each 5th and 2nd grade subject: every slide's picture draws, every quiz can be aced, and every game can be won.
  for (const [grade, page] of [['5th', 'reading-rights'], ['5th', 'math'], ['5th', 'science'], ['5th', 'social-studies'],
    ['2nd', 'math'], ['2nd', 'reading'], ['2nd', 'science'], ['2nd', 'social-studies']]) {
    await test(`${grade} grade ${page}: every lesson draws, every quiz and game earns 3 stars`, async () => {
      const p = await open(browser, `${grade}-grade/${page}.html`, { viewport: { width: 1280, height: 800 } });
      const r = await p.evaluate(() => {
        const T = School.test, items = T.unit.items, out = { slides: 0, stars: {}, modes: [] };
        items.forEach((it, i) => {
          if (it.kind !== 'lesson') return;
          it.slides.forEach((_, s) => { T.slide(i, s); T.draw(0.5); T.draw(9); out.slides++; });
          T.open(i);
          it.slides.forEach(() => T.fwd());
          for (let q = 0; q < 4; q++) { T.pick(true); T.nextQ(); }
          out.modes.push(T.mode);
        });
        return out;
      });
      check(r.slides >= 15, r.slides + ' slides');
      check(r.modes.every(m => m === 'done'), 'a quiz did not finish: ' + r.modes);
      const games = await p.evaluate(() => School.test.unit.items.map((it, i) => it.kind === 'game' ? i : -1).filter(i => i >= 0));
      for (const g of games) {
        await p.evaluate(i => School.test.open(i), g);
        await p.click('#go');
        await p.waitForTimeout(100);
        await p.screenshot({ path: path.join(OUT, `${grade}-${page}-game${g}.png`) });
        await p.evaluate(() => { for (let n = 0; n < 600 && School.test.mode === 'game'; n++) { School.test.game.bot(); School.test.tick(0.05); } });
        await p.waitForTimeout(1800);   // a game may wait a moment before showing its score
      }
      const save = await p.evaluate(() => ({ stars: School.test.save.stars, items: School.test.unit.items.map(it => it.id) }));
      for (const id of save.items) check(save.stars[id] === 3, `${id}: ${save.stars[id]} stars`);
      await p.evaluate(() => School.test.mapScreen());
      check((await p.textContent('#card')).includes('My certificate'), 'certificate button missing once everything is done');
      await done(p, `${grade}-${page}.png`);
    });
  }

  await test('Xbox controller: menus, buttons, analog stick and pause in every kind of page', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 700 } });
    await ctx.addInitScript(fakePad);
    const p = await ctx.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    // arcade page: the newest game is highlighted, the D-pad moves, Ⓐ opens it
    await p.goto(url('index.html')); await p.waitForTimeout(400);
    const first = await padFocus(p);
    await padTap(p, 'RIGHT');
    check(first && (await padFocus(p)) !== first, 'D-pad should move the highlight on the game list');
    for (let i = 0; i < 8 && !(await p.evaluate(() => !!document.querySelector('#games .card.rb-pad-focus'))); i++) await padTap(p, 'DOWN');
    check(await p.evaluate(() => !!document.querySelector('#games .card.rb-pad-focus')), 'D-pad down reaches the game cards');
    await padTap(p, 'A'); await p.waitForTimeout(500);
    check(/\.html$/.test(p.url()) && !p.url().endsWith('index.html'), 'Ⓐ should open the highlighted game: ' + p.url());
    // Floppy Bird: Ⓐ flaps
    await p.goto(url('floppy-bird.html')); await p.waitForTimeout(400);
    await padTap(p, 'A');
    check(await p.evaluate(() => mode === 'play' && bird.vy < 0), 'Ⓐ should flap');
    // Sparkle Meadow: Ⓐ presses the title button; the stick rides the pony smoothly; ☰ pauses, Ⓐ resumes
    await p.goto(url('sparkle-meadow.html')); await p.waitForTimeout(400);
    check((await padFocus(p)) === 'btnPlay', 'the Play button should be highlighted');
    await padTap(p, 'A'); await p.waitForTimeout(200);
    for (let i = 0; i < 8 && (await p.evaluate(() => mode)) !== 'play'; i++) { await padTap(p, 'DOWN'); await padTap(p, 'DOWN'); await padTap(p, 'DOWN'); await padTap(p, 'A'); await p.waitForTimeout(150); }
    check(await p.evaluate(() => mode === 'play'), 'should reach the meadow with the controller');
    await padStick(p, 0.6, 0);
    const sx = await p.evaluate(() => stick.x);
    check(sx > 0.3 && sx < 0.9, 'the left stick should steer smoothly (analog), got ' + sx);
    await padStick(p, 0, 0);
    await padTap(p, 'MENU');
    check(await p.evaluate(() => paused && !!document.querySelector('.rb-menu')), '☰ should open the menu and pause');
    check((await padFocus(p)) === 'Back to the game' || await p.evaluate(() => document.querySelector('.rb-pad-focus')?.classList.contains('rb-menu-back')), 'Back to the game should be highlighted');
    await padTap(p, 'A');
    check(await p.evaluate(() => !paused && !document.querySelector('.rb-menu')), 'Ⓐ on Back to the game should resume');
    await p.evaluate(() => RB.noise(0.3, 0.5)); await p.waitForTimeout(50);
    check(await p.evaluate(() => window.__rumbles > 0), 'crashes should rumble the controller');
    // Flight School: menus with the D-pad, hold Ⓐ for the burner
    await p.goto(url('flight-school.html')); await p.waitForTimeout(400);
    await padTap(p, 'A'); await p.waitForTimeout(150);
    check(await p.evaluate(() => mode === 'map'), 'Ⓐ should start Flight School');
    await p.evaluate(() => { cur = 0; startRound(true); }); await p.waitForTimeout(150);
    await padHold(p, 'A', true); await p.waitForTimeout(300);
    check(await p.evaluate(() => holding()), 'holding Ⓐ should hold the burner');
    await padHold(p, 'A', false);
    // a 5th grade lesson: the start button is highlighted and Ⓐ presses it
    await p.goto(url('5th-grade/math.html')); await p.waitForTimeout(400);
    const lessonBtn = await padFocus(p);
    await padTap(p, 'A'); await p.waitForTimeout(200);
    check(lessonBtn && (await padFocus(p)) !== lessonBtn, 'Ⓐ should press the lesson button');
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await ctx.close();
  });

  await test('Witch Way Out: the right stick swings the camera all the way around, steering follows the screen', async () => {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
    await ctx.addInitScript(fakePad);
    const p = await ctx.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(url('witch-way-out.html')); await p.waitForTimeout(1200);
    // the right stick reaches the game through common.js
    await p.evaluate(() => { startGame(); introT = 0; countT = 0; });
    await p.evaluate(() => { __pad.axes[2] = 1; }); await p.waitForTimeout(400);
    check(await p.evaluate(() => cam.yaw < -0.05), 'pushing the right stick right should swing the camera');
    await p.evaluate(() => { __pad.axes[2] = 0; });
    await padTap(p, 'RIGHT'); // (any button) let the loop settle
    await p.evaluate(() => { __pad.buttons[11] = { pressed: true, value: 1 }; }); await p.waitForTimeout(120);
    await p.evaluate(() => { __pad.buttons[11] = { pressed: false, value: 0 }; });
    check(await p.evaluate(() => Math.abs(cam.yaw) < 0.01), 'clicking the right stick should snap the camera back');
    const r = await p.evaluate(() => {
      const out = {};
      for (const [name, cy] of [['behind', 0], ['front', Math.PI]]) {   // push right: she moves right on screen
        startGame(); introT = 0; countT = 0;
        for (let i = 0; i < 120; i++) { update(1 / 60); updateVisuals(1 / 60); }
        cam.yaw = cam.yawS = cy;
        for (let i = 0; i < 30; i++) { cam.idle = 0; update(1 / 60); updateVisuals(1 / 60); }
        camera.updateMatrixWorld();
        const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), p0 = pos.clone();
        keys.r = true;
        for (let i = 0; i < 40; i++) { cam.idle = 0; update(1 / 60); updateVisuals(1 / 60); }
        keys.r = false;
        out[name] = pos.clone().sub(p0).dot(right);
      }
      // a full circle keeps the camera on its orbit (same distance) and above the ground
      const d = [];
      for (let k = 0; k < 8; k++) { cam.yaw = cam.yawS = k / 8 * Math.PI * 2; cam.idle = 0; for (let i = 0; i < 40; i++) { update(1 / 60); updateVisuals(1 / 60); } d.push(camera.position.distanceTo(pos)); }
      // let go: it drifts back behind her
      cam.yaw = 2.5; cam.idle = 0;
      for (let i = 0; i < 60 * 6; i++) { update(1 / 60); updateVisuals(1 / 60); }
      return { ...out, minD: Math.min(...d), maxD: Math.max(...d), back: cam.yaw };
    });
    check(r.behind > 2 && r.front > 2, 'pushing right should move her right on screen from behind and in front: ' + JSON.stringify(r));
    check(r.minD > 8 && r.maxD < 16, 'the camera should orbit at a steady distance: ' + JSON.stringify(r));
    check(Math.abs(r.back) < 0.1, 'the camera should drift back behind her: ' + r.back);
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await p.screenshot({ path: path.join(OUT, 'witch-camera.png') });
    await ctx.close();
  });

  await test('Hamglider: the right stick swings the camera all the way round Pip, steering follows the screen', async () => {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
    await ctx.addInitScript(fakePad);
    const p = await ctx.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(url('hamglider.html')); await p.waitForTimeout(800);
    await p.evaluate(() => { startWorld(0); action(); });   // rolling down the ramp
    await p.evaluate(() => { __pad.axes[2] = 1; }); await p.waitForTimeout(400);
    check(await p.evaluate(() => cam.yaw < -0.05), 'pushing the right stick right should swing the camera');
    await p.evaluate(() => { __pad.axes[2] = 0; __pad.buttons[4] = { pressed: true, value: 1 }; }); await p.waitForTimeout(150);
    await p.evaluate(() => { __pad.buttons[4] = { pressed: false, value: 0 }; });
    check(await p.evaluate(() => Math.abs(cam.yaw) < 0.01), 'LB should swing the camera back behind');
    const r = await p.evaluate(() => {
      const out = {};
      for (const [name, cy] of [['behind', 0], ['front', Math.PI]]) {   // push right: Pip moves right on screen
        paused = true;   // (the page's own loop sits still while we step)
        setupRound(0); action();
        for (let i = 0; i < 60 * 20 && state !== 'air'; i++) { update(1 / 60); updateVisuals(1 / 60); }
        action();   // wings open
        cam.yaw = cam.yawS = cy;
        for (let i = 0; i < 20; i++) { cam.idle = 0; update(1 / 60); updateVisuals(1 / 60); }
        camera.updateMatrixWorld();
        const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), p0 = pos.clone();
        keys.right = true;
        for (let i = 0; i < 50; i++) { cam.idle = 0; update(1 / 60); updateVisuals(1 / 60); }
        keys.right = false;
        out[name] = pos.clone().sub(p0).dot(right);
      }
      const d = [];
      for (let k = 0; k < 8; k++) { cam.yaw = cam.yawS = k / 8 * Math.PI * 2; cam.idle = 0; for (let i = 0; i < 30; i++) { update(1 / 60); updateVisuals(1 / 60); } d.push(camera.position.distanceTo(pip.position)); }
      cam.yaw = 2.5; cam.idle = 0;
      for (let i = 0; i < 60 * 5 && state === 'air'; i++) { update(1 / 60); updateVisuals(1 / 60); }
      paused = false;
      return { ...out, minD: Math.min(...d), maxD: Math.max(...d), back: cam.yaw, state };
    });
    check(r.behind > 1 && r.front > 1, 'pushing right should move Pip right on screen from behind and in front: ' + JSON.stringify(r));
    check(r.minD > 8 && r.maxD < 16, 'the camera should orbit at a steady distance: ' + JSON.stringify(r));
    check(r.state !== 'air' || Math.abs(r.back) < 0.15, 'the camera should drift back behind: ' + JSON.stringify(r));
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await p.screenshot({ path: path.join(OUT, 'hamglider-camera.png') });
    await ctx.close();
  });

  await test('🕹️ the shared controls: F1 / ? guide, controller button names (Xbox, PlayStation, Nintendo), N sound, M map, no P pause, no keys while typing, stick → W A S D', async () => {
    const mkCtx = async id => {
      const ctx = await browser.newContext({ viewport: { width: 1000, height: 640 } });
      await ctx.addInitScript(id => {
        const gp = { id, index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), vibrationActuator: { playEffect: () => Promise.resolve() } };
        window.__pad = gp; navigator.getGamepads = () => (window.__noPad ? [] : [gp]);
      }, id);
      return ctx;
    };
    const ctx = await mkCtx('Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)');
    const p = await ctx.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(url('floppy-bird.html')); await p.waitForTimeout(500);
    // F1, then ?: the guide lists this game's controls and the shared ones, with the controller's names
    await p.keyboard.press('F1'); await p.waitForTimeout(150);
    const g1 = await p.evaluate(() => ({ open: !!document.querySelector('.rb-guide'), text: document.querySelector('.rb-guide')?.textContent || '' }));
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    const closed = await p.evaluate(() => !document.querySelector('.rb-guide'));
    await p.keyboard.press('Shift+Slash'); await p.waitForTimeout(150);
    const g2 = await p.evaluate(() => !!document.querySelector('.rb-guide'));
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    // N toggles the sound, P does nothing, M opens the menu (the map) and closes it again
    const m0 = await p.evaluate(() => RB.muted);
    await p.keyboard.press('KeyN'); const m1 = await p.evaluate(() => RB.muted);
    await p.keyboard.press('KeyN'); const m2 = await p.evaluate(() => RB.muted);
    await p.evaluate(() => { mode = 'play'; }); await p.keyboard.press('KeyP'); await p.waitForTimeout(100);
    const pNoPause = await p.evaluate(() => !paused && !document.querySelector('.rb-pause'));
    await p.keyboard.press('KeyM'); await p.waitForTimeout(150);
    const mMenu = await p.evaluate(() => !!document.querySelector('.rb-menu'));
    await p.keyboard.press('KeyM'); await p.waitForTimeout(150);
    const mClosed = await p.evaluate(() => !document.querySelector('.rb-menu'));
    // typing in a box: no game keys
    await p.evaluate(() => { const i = document.createElement('input'); i.id = 'typeHere'; document.body.appendChild(i); i.focus(); });
    const t0 = await p.evaluate(() => RB.muted); await p.keyboard.type('nmp'); const t1 = await p.evaluate(() => ({ muted: RB.muted, menu: !!document.querySelector('.rb-menu'), val: document.getElementById('typeHere').value }));
    await p.evaluate(() => document.getElementById('typeHere').remove());
    // the pause screen has a controls button, and its hint names Esc / the controller
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    const pz = await p.evaluate(() => ({ paused, btn: !!document.querySelector('.rb-pause .rb-guide-btn'), focused: document.activeElement && document.activeElement.textContent.includes('KEEP PLAYING'), hint: document.querySelector('.rb-pause .rb-hint')?.textContent || '' }));
    // ☰ on the controller carries on from the pause screen
    await padTap(p, 'MENU'); await p.waitForTimeout(150);
    const menuResumes = await p.evaluate(() => !paused && !document.querySelector('.rb-pause'));
    // the left stick presses W A S D (not the arrows) in a game without a touch joystick
    const codes = await p.evaluate(async () => { const seen = []; addEventListener('keydown', e => seen.push(e.code), true); mode = 'play'; __pad.axes[1] = -0.9; await new Promise(r => setTimeout(r, 200)); __pad.axes[1] = 0; __pad.axes[0] = 0.9; await new Promise(r => setTimeout(r, 200)); __pad.axes[0] = 0; await new Promise(r => setTimeout(r, 100)); return seen; });
    const xbox = await p.evaluate(() => [RB.padText('{A} {RT} {LT} {MENU}'), RB.padStyle()]);
    await ctx.close();
    // PlayStation and Nintendo controllers get their own names, in text and in the guide
    const names = {};
    for (const [k, id] of [['ps', 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)'], ['nin', 'Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)']]) {
      const c = await mkCtx(id), q = await c.newPage();
      await q.goto(url('lucky-leo.html')); await q.waitForTimeout(500);
      names[k] = await q.evaluate(() => { const s = document.createElement('b'); s.dataset.pad = 'A'; document.body.appendChild(s); RB.applyPadLabels(); return { text: RB.padText('{A} {X} {LT} {RT} {MENU}'), el: s.textContent, style: RB.padStyle() }; });
      await q.keyboard.press('F1'); await q.waitForTimeout(150);
      names[k].guide = await q.evaluate(() => document.querySelector('.rb-guide')?.textContent || '');
      await c.close();
    }
    check(g1.open && /Flap/i.test(g1.text) && /Esc/.test(g1.text) && /F1/.test(g1.text) && g1.text.includes('Ⓐ'), 'F1 opens the controls guide with this game, the shared keys and Xbox names: ' + g1.text.slice(0, 200));
    check(closed && g2, 'Esc closes the guide and ? opens it');
    check(m1 === !m0 && m2 === m0, 'N toggles the sound');
    check(pNoPause, 'P no longer pauses');
    check(mMenu && mClosed, 'M opens the map / menu and closes it again');
    check(t1.muted === t0 && !t1.menu && t1.val === 'nmp', 'typing in a box fires no game keys: ' + JSON.stringify(t1));
    check(pz.paused && pz.btn && pz.focused && /Ⓐ|Esc/.test(pz.hint), 'the pause screen has a controls button and focuses Keep Playing: ' + JSON.stringify(pz));
    check(menuResumes, '☰ on the controller carries on from the pause screen');
    check(codes.includes('KeyW') && codes.includes('KeyD') && !codes.some(c => c.startsWith('Arrow')), 'the left stick presses W A S D, not arrows: ' + codes.join(','));
    check(xbox[0] === 'Ⓐ RT LT ☰ Menu' && xbox[1] === 'xbox', 'Xbox names: ' + xbox);
    check(names.ps.style === 'ps' && names.ps.text === '✕ ▢ L2 R2 Options' && names.ps.el === '✕' && names.ps.guide.includes('R2'), 'PlayStation names: ' + JSON.stringify(names.ps).slice(0, 200));
    check(names.nin.style === 'nin' && names.nin.text === 'B Y ZL ZR +' && names.nin.el === 'B' && names.nin.guide.includes('ZR'), 'Nintendo names: ' + JSON.stringify(names.nin).slice(0, 200));
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
  });

  await test('pausing silences all sound; the controller View button (twice) goes home; pages load matching shared files', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 600 } });
    await ctx.addInitScript(fakePad);
    const p = await ctx.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    const view = async () => { try { await padTap(p, 'VIEW'); } catch (e) { /* the page went away: that's the point */ } };
    await p.goto(url('flight-school.html')); await p.waitForTimeout(400);
    await p.evaluate(() => { cur = 0; startRound(true); });   // a balloon waiting on the ground: the round can't end by itself
    await padTap(p, 'A');
    check(await p.evaluate(() => RB.audio().state) === 'running', 'sound should be on while playing');
    await padTap(p, 'MENU');
    check(await p.evaluate(() => paused && RB.audio().state === 'suspended'), 'pausing should silence the music and sounds');
    await padTap(p, 'MENU');
    check(await p.evaluate(() => !paused && RB.audio().state === 'running'), 'carrying on should bring the sound back');
    await view();
    check(await p.evaluate(() => paused && !!document.querySelector('.rb-menu') && document.querySelector('.rb-pad-focus')?.classList.contains('rb-home-all')), 'View once should open the menu (paused) with "All games" highlighted');
    await view(); await p.waitForTimeout(500);
    check(p.url().endsWith('/index.html'), 'View twice should go back to all the games: ' + p.url());
    await p.goto(url('5th-grade/math.html')); await p.waitForTimeout(400);
    await view(); await view(); await p.waitForTimeout(500);
    check(p.url().endsWith('5th-grade/index.html'), 'from a lesson, View twice goes back to its folder: ' + p.url());
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await ctx.close();
    // every page links our shared files with the same ?v= stamp, so a browser never mixes old and new copies
    const stamps = new Set(), missing = [];
    const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
      if (e.name.startsWith('.') || ['node_modules', 'tests', 'tools', 'vendor'].includes(e.name)) return;
      const f = path.join(d, e.name);
      if (e.isDirectory()) return walk(f);
      if (!e.name.endsWith('.html')) return;
      for (const m of fs.readFileSync(f, 'utf8').matchAll(/(?:src|href)="((?!https?:|data:)[^"]+\.(?:js|css))(\?v=[^"]*)?"/g)) {
        if (m[1].includes('vendor/')) continue;
        if (!m[2]) missing.push(path.relative(ROOT, f) + ': ' + m[1]); else stamps.add(m[2]);
      }
    });
    walk(ROOT);
    check(!missing.length, 'shared files without a ?v= stamp (run node tools/bump-version.js): ' + missing.join(', '));
    check(stamps.size === 1, 'pages disagree on the shared-file version (run node tools/bump-version.js): ' + [...stamps].join(' '));
  });

  await test('Witch Way Out: controller tester and settings (invert each stick, vibration) from the title and pause menu', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 760 } });
    await ctx.addInitScript(fakePad);
    const p = await ctx.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(url('witch-way-out.html')); await p.waitForTimeout(1000);
    await p.click('#btnPad'); await p.waitForTimeout(200);
    check(await p.evaluate(() => !!document.querySelector('.rb-padscreen.testing')), 'the controller screen should open in testing mode');
    // testing: buttons light up the picture and don't press anything
    await padHold(p, 'A', true); await p.waitForTimeout(100);
    check(await p.evaluate(() => document.querySelector('.b[data-b="0"]').classList.contains('on') && state === 'title'), 'Ⓐ should light up, not start the game');
    await padHold(p, 'A', false);
    await padHold(p, 'B', true); await p.waitForTimeout(2600); await padHold(p, 'B', false);
    check(await p.evaluate(() => !document.querySelector('.rb-padscreen.testing')), 'holding Ⓑ should finish testing');
    // settings: invert flying up/down and the camera's up/down (in this game only), switch vibration off
    await p.click('[data-inv="LY"]'); await p.click('[data-inv="RY"]'); await p.click('[data-k="rumble"]');
    const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('rb_pad')));
    const mine = (saved.inverts || {})['witch-way-out.html'] || {};
    check(mine.LY && mine.RY && !mine.RX && !saved.rumble, 'settings should save, for this game: ' + JSON.stringify(saved));
    await padTap(p, 'B'); await p.waitForTimeout(100);
    check(await p.evaluate(() => !document.querySelector('.rb-padscreen') && state === 'title'), 'Ⓑ should close the screen');
    await p.evaluate(() => startGame()); await p.waitForTimeout(200);
    await p.evaluate(() => { __pad.axes[1] = -0.9; __pad.axes[3] = -0.9; }); await p.waitForTimeout(200);
    const r = await p.evaluate(() => ({ stickY: stick.y, lookY: RB.pad.look.y }));
    check(r.stickY > 0.3 && r.lookY > 0.3, 'pushing both sticks up should now count as down (inverted): ' + JSON.stringify(r));
    await p.evaluate(() => { __pad.axes[1] = 0; __pad.axes[3] = 0; window.__rumbles = 0; RB.noise(0.3, 0.5); });
    check(await p.evaluate(() => !window.__rumbles), 'vibration off should stop the rumble');
    // the pause screen has the controller screen too, and closing it returns to the pause screen
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    await p.click('.rb-pause .rb-extra'); await p.waitForTimeout(150);
    check(await p.evaluate(() => !!document.querySelector('.rb-padscreen')), 'the pause screen should open the controller screen');
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    check(await p.evaluate(() => paused && document.querySelector('.rb-pause') && document.querySelector('.rb-pause').style.display === ''), 'closing it should go back to the pause screen, still paused');
    // and from the ☰ menu: closing the controller screen goes back to the menu, ☰ again carries on
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    await padTap(p, 'MENU'); await p.click('.rb-menu [data-m="pad"]'); await p.waitForTimeout(150);
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    check(await p.evaluate(() => !!document.querySelector('.rb-menu') && paused), 'closing the controller screen goes back to the menu');
    await padTap(p, 'MENU'); await p.waitForTimeout(100);
    check(await p.evaluate(() => !document.querySelector('.rb-menu') && !paused), '☰ again closes the menu and carries on');
    await p.evaluate(() => { localStorage.removeItem('rb_pad'); });
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await p.screenshot({ path: path.join(OUT, 'witch-controller.png') });
    await ctx.close();
  });

  await test('Lily Pad Lunch: the tongue snaps bugs into the jar, bees sting, hops, growing up, beetles fall in, the heron and diving, winning and losing a level', async () => {
    const p = await open(browser, 'lily-pad-lunch.html', { viewport: { width: 1000, height: 600 } });
    const r = await p.evaluate(() => {
      const out = {}, run = (n, f) => { for (let i = 0; i < n; i++) { if (f) f(i); update(1 / 60); } };
      localStorage.removeItem('lp_save'); for (const k in save.cards) delete save.cards[k]; save.stars = {}; save.best = {};
      easy = false; twoP = false; startLevel(1);
      bugs = []; spawnT = 99; heronT = 99;
      const f = frogs[0];
      // a fly just above: snap it, it rides the tongue back and goes in the jar (and you get its Bug Card)
      const fly = newBug('fly', f.x + 60, f.y - 120, 1); fly.vx = fly.vy = 0; fly.t = 0; bugs.push(fly);
      const move = moveBug; moveBug = () => {};   // (hold the bugs still while we aim)
      f.aim = aimAt(f, fly.x, fly.y); snap(f); run(40);
      out.fly = { jar, gone: !bugs.includes(fly), card: !!save.cards.fly, tongue: !!f.tongue };
      // a bee: ouch, and no snapping for a moment
      const bee = newBug('bee', f.x - 50, f.y - 110, 1); bugs.push(bee);
      f.aim = aimAt(f, bee.x, bee.y); snap(f); run(20);
      out.sting = f.sting > 0; snap(f); out.blocked = !f.tongue; run(60 * 3);
      // hop to the next pad
      const from = f.pad; hop(f, from + 1); run(45); out.hop = f.pad === from + 1 && !f.hop;
      // growing up: the 12th bug makes a bigger frog with a longer tongue
      const reach0 = reach(f); f.eaten = 11;
      const fly2 = newBug('fly', f.x, f.y - 100, 1); bugs.push(fly2); f.aim = aimAt(f, fly2.x, fly2.y); snap(f); run(40);
      out.grow = { size: f.size, longer: reach(f) > reach0 };
      // the golden frog's tongue grabs every bug on its way
      f.size = 3; f.eaten = 80;
      const line = [70, 130, 190].map(d => { const b = newBug('fly', f.x, f.y - 16 - d, 1); bugs.push(b); return b; });
      const j0 = jar; f.aim = -Math.PI / 2; snap(f); run(40);
      out.golden = jar - j0;
      moveBug = move;
      // a beetle on a pad falls in the water when a frog lands there
      startLevel(3); bugs = bugs.filter(b => b.kind === 'beetle'); spawnT = 99; heronT = 99;
      const bt = bugs[0], g = frogs[0];
      if (bt.pad === g.pad) { hop(g, g.pad === 0 ? 1 : g.pad - 1); run(45); }
      hop(g, bt.pad); run(50);
      out.beetle = bt.swim === true;
      // the heron: it aims at your pad, and its jab spills bugs out of the jar unless you dive
      startLevel(2); bugs = []; spawnT = 99; jar = 6;
      heronT = 0; run(5); for (let i = 0; i < 600 && (!heron || heron.st !== 'aim'); i++) update(1 / 60);
      run(60 * 2.2);
      out.heron = { jar, stun: frogs[0].stun > 0 || jar < 6 };
      heron = null; heronT = 0; jar = 6; run(5); for (let i = 0; i < 600 && (!heron || heron.st !== 'aim'); i++) update(1 / 60);
      run(40); dive(frogs[0]); run(60 * 1.2);
      out.dive = { jar, safe: jar === 6 };
      // fill the jar: the level is won and the next one opens; run out of time: try again
      startLevel(0); jar = LEVELS[0].goal; run(2);
      out.win = { state, stars: save.stars.morning, next: unlocked(1), best: +localStorage.getItem('lp_best') };
      startLevel(1); timeLeft = 0.01; run(3);
      out.lose = { state, title: document.getElementById('endTitle').textContent };
      // little kids mode: the tongue slips past the bees
      easy = true; startLevel(1); bugs = []; spawnT = 99;
      const b2 = newBug('bee', frogs[0].x, frogs[0].y - 100, 1); b2.vx = b2.vy = 0; bugs.push(b2); moveBug = () => {};
      frogs[0].aim = -Math.PI / 2; snap(frogs[0]); run(40);
      out.easyBee = { sting: frogs[0].sting, beeThere: bugs.includes(b2) };
      moveBug = move; easy = false;
      return out;
    });
    check(r.fly.jar === 1 && r.fly.gone && r.fly.card && !r.fly.tongue, 'the tongue snaps a fly into the jar: ' + JSON.stringify(r.fly));
    check(r.sting && r.blocked, 'a bee stings and the tongue is too puffy to snap: ' + JSON.stringify(r));
    check(r.hop, 'the frog hops to the next pad');
    check(r.grow.size === 1 && r.grow.longer, 'eating 12 bugs grows a bigger frog with a longer tongue: ' + JSON.stringify(r.grow));
    check(r.golden === 3, "the golden frog's tongue grabs all three bugs in a line: " + r.golden);
    check(r.beetle, 'landing on a pad knocks its beetle into the water');
    check(r.heron.stun && r.heron.jar < 6, "the heron's jab spills bugs from the jar: " + JSON.stringify(r.heron));
    check(r.dive.safe, 'diving under the water keeps you safe from the heron: ' + JSON.stringify(r.dive));
    check(r.win.state === 'end' && r.win.stars === 3 && r.win.next && r.win.best >= 10, 'a full jar wins the level and opens the next: ' + JSON.stringify(r.win));
    check(r.lose.state === 'end' && /sun went down/.test(r.lose.title), 'running out of time ends the level: ' + JSON.stringify(r.lose));
    check(!r.easyBee.sting && r.easyBee.beeThere, 'in little kids mode the tongue slips past bees: ' + JSON.stringify(r.easyBee));
    await done(p, 'lily-pad-lunch.png');
  });

  await test('Lily Pad Lunch: a robot frog (aim at the nearest bug, dodge bees, dive from the heron) fills the jar on all 5 levels', async () => {
    const p = await open(browser, 'lily-pad-lunch.html', { viewport: { width: 900, height: 560 } });
    const r = await p.evaluate(() => {
      const out = {};
      easy = false; twoP = false; frogs = [];
      LEVELS.forEach((L, i) => {
        startLevel.carry = i > 0; startLevel(i);
        const f = frogs[0];
        for (let n = 0; n < 60 * 120 && state === 'play'; n++) {
          if (heron && heron.st === 'aim' && heron.pad === f.pad && heron.t > 1.2) dive(f);
          if (!f.tongue && !f.hop && f.dive <= 0) {
            let best = null, bd = Infinity;
            for (const b of bugs) {
              if (b.stuck || b.kind === 'bee') continue;
              const d = Math.hypot(b.x - f.x, b.y - f.y);
              if (d < reach(f) - 10 && d < bd) { bd = d; best = b; }
            }
            // a bee in the way? wait for it to move
            if (best) {
              const a = aimAt(f, best.x, best.y, best);
              const beeInWay = bugs.some(b => b.kind === 'bee' && Math.abs(Math.atan2(b.y - f.y + 14, b.x - f.x) - a) < 0.25 && Math.hypot(b.x - f.x, b.y - f.y) < bd + 20);
              if (!beeInWay) { f.aim = a; snap(f); }
            } else if (n % 90 === 0) {   // nothing in reach: hop toward the busiest side
              const left = bugs.filter(b => b.x < f.x && b.kind !== 'bee').length, right = bugs.filter(b => b.x > f.x && b.kind !== 'bee').length;
              hop(f, f.pad + (right >= left ? 1 : -1));
            }
          }
          update(1 / 60);
        }
        out[L.id] = { won: (save.stars[L.id] || 0) > 0 && document.getElementById('endTitle').textContent !== 'The sun went down!', jar, goal: L.goal, left: Math.round(timeLeft), size: f.size };
      });
      return out;
    });
    for (const [id, v] of Object.entries(r)) check(v.won, `${id}: the robot should fill the jar in time: ` + JSON.stringify(v));
    await done(p);
  });

  await test('Lily Pad Lunch 🎮 two controllers and 📱 touch: each controller aims and snaps (RT) its own frog, race mode, tap to snap and hop', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 600 } });
    await ctx.addInitScript(() => {
      const mk = i => ({ id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', index: i, connected: true, mapping: 'standard', axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), vibrationActuator: { playEffect: () => Promise.resolve() } });
      window.__pads = [mk(0), mk(1)]; window.__pad = window.__pads[0];
      navigator.getGamepads = () => window.__pads;
    });
    const p = await ctx.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(url('lily-pad-lunch.html')); await p.waitForTimeout(800);
    const btn = (i, b, on) => p.evaluate(([i, b, on]) => { __pads[i].buttons[b] = { pressed: on, value: on ? 1 : 0 }; }, [i, b, on]);
    const tap = async (i, b) => { await btn(i, b, true); await p.waitForTimeout(150); await btn(i, b, false); await p.waitForTimeout(150); };
    // the title is a menu the controller can drive: Ⓐ plays the highlighted level
    await p.evaluate(() => { localStorage.removeItem('lp_save'); twoP = true; team = false; renderTitle(); });
    await tap(0, 0); await p.waitForTimeout(300);
    const started = await p.evaluate(() => ({ state, frogs: frogs.length, direct: RB.pad.direct }));
    await p.evaluate(() => { spawnT = 99; bugs = []; heronT = 99; });
    // controller 2's stick points Player 2's tongue up and left; its Ⓐ snaps Player 2's tongue only
    const a0 = await p.evaluate(() => [frogs[0].aim, frogs[1].aim]);
    await p.evaluate(() => { __pads[1].axes[0] = -0.7; __pads[1].axes[1] = -0.7; }); await p.waitForTimeout(400);
    await p.evaluate(() => { __pads[1].axes[0] = 0; __pads[1].axes[1] = 0; });
    const a1 = await p.evaluate(() => [frogs[0].aim, frogs[1].aim]);
    await btn(1, 7, true); await p.waitForTimeout(150);   // RT snaps (A hops)
    const tongues = await p.evaluate(() => frogs.map(f => !!f.tongue));
    await btn(1, 7, false); await p.waitForTimeout(400);
    // controller 1's LB hops Player 1 a pad to the left
    const pad0 = await p.evaluate(() => frogs[0].pad);
    await tap(0, 4); await p.waitForTimeout(700);
    const pad1 = await p.evaluate(() => frogs[0].pad);
    // race: each frog fills its own jar
    const race = await p.evaluate(() => { frogs[1].jar = LEVELS[0].goal; update(1 / 60); return { state, text: document.getElementById('endText').textContent }; });
    // ☰ on the second controller opens the menu
    await p.evaluate(() => startLevel(0)); await p.waitForTimeout(200);
    await tap(1, 9);
    const menu = await p.evaluate(() => ({ menu: !!document.querySelector('.rb-menu'), paused }));
    check(started.state === 'play' && started.frogs === 2 && started.direct, 'Ⓐ on the title starts a two-player game: ' + JSON.stringify(started));
    check(Math.abs(a1[0] - a0[0]) < 0.01 && a1[1] < -2.0, "controller 2's stick aims only Player 2: " + JSON.stringify({ a0, a1 }));
    check(!tongues[0] && tongues[1], "controller 2's RT snaps only Player 2's tongue: " + JSON.stringify(tongues));
    check(pad1 === pad0 - 1, 'LB hops Player 1 to the pad on the left: ' + JSON.stringify({ pad0, pad1 }));
    check(race.state === 'end' && /Player 2.*wins/.test(race.text), 'race mode: a full jar wins for that player: ' + JSON.stringify(race));
    check(menu.menu && menu.paused, "the second controller's ☰ opens the menu: " + JSON.stringify(menu));
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await ctx.close();
    // 📱 on a phone: tap near a bug to snap at it, tap a lily pad to hop there
    const ph = await open(browser, 'lily-pad-lunch.html', PHONE);
    await ph.evaluate(() => { twoP = false; startLevel(0); bugs = []; spawnT = 99; moveBug = () => {}; });
    const t = await ph.evaluate(() => {
      const f = frogs[0], b = newBug('fly', f.x + 40, f.y - 110, 1); bugs.push(b);
      const sx = innerWidth / (canvas.width / scale), sy = innerHeight / (canvas.height / scale), off = (VH - H) / 2;
      return { bug: [(b.x + 10) * sx, (b.y + off - 8) * sy], pad: [pads[(f.pad + 1) % pads.length].x * sx, (WATER_Y + off) * sy], next: (f.pad + 1) % pads.length };
    });
    await ph.touchscreen.tap(t.bug[0], t.bug[1]); await ph.waitForTimeout(600);
    const snapped = await ph.evaluate(() => jar);
    await ph.touchscreen.tap(t.pad[0], t.pad[1]); await ph.waitForTimeout(900);
    const hopped = await ph.evaluate(() => frogs[0].pad);
    check(snapped === 1, 'tapping next to a bug snaps it: jar ' + snapped);
    check(hopped === t.next, 'tapping a lily pad hops there: ' + JSON.stringify({ hopped, want: t.next }));
    await done(ph, 'lily-pad-lunch-phone.png');
  });

  await test('Witch Way Out 👥 two players: split screen, each controller flies its own witch, hats bonk each other, both finish', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 640 } });
    await ctx.addInitScript(() => {   // two pretend Xbox controllers
      const mk = i => ({ id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', index: i, connected: true, mapping: 'standard', axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), vibrationActuator: { playEffect: () => { window.__rumbles = (window.__rumbles || 0) + 1; return Promise.resolve(); } } });
      window.__pads = [mk(0), mk(1)]; window.__pad = window.__pads[0];
      navigator.getGamepads = () => window.__pads;
    });
    const p = await ctx.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(url('witch-way-out.html')); await p.waitForTimeout(1000);
    const btn = (i, b, on) => p.evaluate(([i, b, on]) => { __pads[i].buttons[b] = { pressed: on, value: on ? 1 : 0 }; }, [i, b, on]);
    const tap = async (i, b) => { await btn(i, b, true); await p.waitForTimeout(300); await btn(i, b, false); await p.waitForTimeout(300); };   // (two 3D views are slow to draw in a test browser)
    const title = await p.evaluate(() => ({ two: !!document.getElementById('btnPlay2'), pads: document.getElementById('padCount').textContent }));
    await p.click('#btnPlay2'); await p.waitForTimeout(300);
    await p.evaluate(() => { countT = 0; introT = 0; }); await p.waitForTimeout(300);
    const split = await p.evaluate(() => ({ split: document.body.classList.contains('split'), huds: [...document.querySelectorAll('.hud')].filter(h => !h.classList.contains('hidden')).length,
      divider: !document.getElementById('divider').classList.contains('hidden'), direct: RB.pad.direct, p2: P2.mesh.visible, racers: players.length }));
    // controller 2 steers and boosts Player 2 only
    const y1 = await p.evaluate(() => [P1.yaw, P2.yaw]);
    await p.evaluate(() => { __pads[1].axes[0] = 1; }); await btn(1, 7, true); await p.waitForTimeout(500);
    const steer = await p.evaluate(() => ({ p1: P1.yaw, p2: P2.yaw, b1: P1.boosting, b2: P2.boosting, keys: Object.values(P1.keys).some(Boolean) }));
    await p.evaluate(() => { __pads[1].axes[0] = 0; }); await btn(1, 7, false);
    // Ⓑ on controller 1 throws Player 1's hat, not Player 2's
    await p.evaluate(() => { window.__hats = []; const t0 = performance.now(); (function watch() { for (const h of projectiles) if (h.kind === 'hat' && !__hats.includes(h.by.idx)) __hats.push(h.by.idx); if (performance.now() - t0 < 2000) requestAnimationFrame(watch); })(); });
    await tap(0, 1);
    const hats = await p.evaluate(() => __hats);   // (every hat thrown while the button was tapped)
    // the keyboard is shared: W A S D for Player 1, the arrows for Player 2
    await p.keyboard.down('KeyJ'); await p.keyboard.down('KeyD'); await p.waitForTimeout(100);
    const kb = await p.evaluate(() => ({ p1: { ...P1.keys }, p2: { ...P2.keys } }));
    await p.keyboard.up('KeyJ'); await p.keyboard.up('KeyD');
    // Player 2's hat can bonk Player 1
    const bonk = await p.evaluate(() => {
      clearProjectiles();   // (one evaluate runs start to end: the page's own loop waits)
      friends.forEach(f => { f.z = P1.pos.z + 400; f.nextThrow = 99; });
      P2.pos.copy(P1.pos).add(new THREE.Vector3(0, 0, 20)); P2.yaw = P1.yaw; P2.pitch = P1.pitch; P1.shieldT = 0; P1.cloakT = 0; P1.bonkT = 0;
      for (let i = 0; i < 3; i++) update(1 / 60);
      const locked = P2.lockMesh.visible;
      throwHat(P2);
      let hit = false;
      for (let i = 0; i < 60 * 3 && !hit; i++) { update(1 / 60); updateVisuals(1 / 60); if (P1.bonkT > 0) hit = true; }
      return { locked, hit, hits: P2.hatsHit, layers: P2.lockMesh.layers.mask !== P1.lockMesh.layers.mask };
    });
    // both fly the line to the moon (the pumpkin chases whoever is behind); the race ends when both are there
    const race = await p.evaluate(() => {
      for (let i = 0; i < 60 * 320 && state === 'fly'; i++) {
        for (const q of players) {
          const k = q.keys; k.l = k.r = k.u = k.d = false;
          const z = q.pos.z - 35, wantYaw = Math.atan2(-(lineX(z) - q.pos.x), -(z - q.pos.z));
          if (wantYaw - q.yaw < -0.05) k.r = true; else if (wantYaw - q.yaw > 0.05) k.l = true;
          const wp = Math.atan2(lineY(z) - q.pos.y, 35);
          if (wp - q.pitch > 0.05) k.u = true; else if (wp - q.pitch < -0.05) k.d = true;
          if (q.strike && q.strike.t < 0.6) castShield(q);
        }
        update(1 / 60); if (i % 4 === 0) updateVisuals(1 / 60);
      }
      return { state, places: players.map(q => q.finishPlace), podium: document.querySelectorAll('.podium li.you').length, all: document.querySelectorAll('.podium li').length,
        stats: document.getElementById('overStats').textContent, swap: document.getElementById('btnSwap').textContent };
    });
    await p.screenshot({ path: path.join(OUT, 'witch-2p-over.png') });
    // race again: the split screen with both witches, then a screenshot of it
    await p.evaluate(() => { startGame(); countT = 0; introT = 0; }); await p.waitForTimeout(900);
    await p.screenshot({ path: path.join(OUT, 'witch-2p.png') });
    // ☰ on the second controller opens the menu
    await tap(1, 9);
    const menu = await p.evaluate(() => ({ menu: !!document.querySelector('.rb-menu'), paused }));
    await tap(1, 9);
    // back to one player: no split, the controller presses keys again
    await p.evaluate(() => startGame(false)); await p.waitForTimeout(200);
    const one = await p.evaluate(() => ({ split: document.body.classList.contains('split'), direct: RB.pad.direct, p2: P2.mesh.visible, racers: players.length }));
    check(title.two && /Two controllers/.test(title.pads), 'the title offers 2 players and sees both controllers: ' + JSON.stringify(title));
    check(split.split && split.huds === 2 && split.divider && split.direct && split.p2 && split.racers === 2, 'two players split the screen: ' + JSON.stringify(split));
    check(steer.p2 < y1[1] - 0.05 && Math.abs(steer.p1 - y1[0]) < 0.02 && steer.b2 && !steer.b1 && !steer.keys, 'controller 2 flies only Player 2: ' + JSON.stringify({ y1, steer }));
    check(hats.length === 1 && hats[0] === 0, "controller 1's Ⓑ throws Player 1's hat: " + JSON.stringify(hats));
    check(kb.p1.r && !kb.p1.l && kb.p2.l && !kb.p2.r, 'W A S D fly Player 1 and I J K L Player 2: ' + JSON.stringify(kb));
    check(bonk.locked && bonk.hit && bonk.hits === 1 && bonk.layers, "Player 2's hat locks on and bonks Player 1: " + JSON.stringify(bonk));
    check(race.state === 'over' && race.places.every(x => x >= 1 && x <= 7) && race.places[0] !== race.places[1] && race.podium === 2 && race.all === 7 && /P1/.test(race.stats) && /P2/.test(race.stats) && /1 Player/.test(race.swap),
      'both reach the moon and the results list both: ' + JSON.stringify(race));
    check(menu.menu && menu.paused, "the second controller's ☰ opens the menu: " + JSON.stringify(menu));
    check(!one.split && !one.direct && !one.p2 && one.racers === 1, 'one player again: ' + JSON.stringify(one));
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await ctx.close();
  });

  await test('Witch Way Out race: hat bonks a witch and comes back, RT boosts with dust, boxes give power-ups, a racer using them wins', async () => {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
    await ctx.addInitScript(fakePad);
    const p = await ctx.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(url('witch-way-out.html')); await p.waitForTimeout(1000);
    // the countdown holds everyone on the line
    const c = await p.evaluate(() => { startGame(); const z = pos.z, fz = friends[0].z; for (let i = 0; i < 60; i++) update(1 / 60); return { moved: pos.z !== z || friends[0].z !== fz, countT }; });
    check(!c.moved && c.countT > 1, 'nobody should move before GO: ' + JSON.stringify(c));
    // Ⓑ throws the hat at a witch in range: she falls off, and the hat comes back
    await p.evaluate(() => { countT = 0; introT = 0; for (let i = 0; i < 10; i++) { update(1 / 60); updateVisuals(1 / 60); }
      const f = friends[0]; f.z = pos.z - 18; f.off = pos.x - lineX(f.z); f.offY = pos.y - lineY(f.z); f.ph = -clock * 0.35; f.knockT = 0; f.nextThrow = 99;
      friends.slice(1).forEach(o => { o.z = pos.z - 300; }); update(1 / 60); updateVisuals(1 / 60); });
    check(await p.evaluate(() => lockMesh.visible), 'a witch just ahead should be marked as in range');
    await padTap(p, 'B');
    const h = await p.evaluate(() => {
      const out = { thrown: projectiles.some(x => x.kind === 'hat') && !me.userData.hat.visible };
      for (let i = 0; i < 60 * 4 && !(out.hit && me.userData.hat.visible); i++) { update(1 / 60); updateVisuals(1 / 60); if (friends[0].knockT > 0) out.hit = true; }
      out.back = me.userData.hat.visible && !projectiles.some(x => x.kind === 'hat');
      return out;
    });
    check(h.thrown && h.hit && h.back, 'the hat should fly, bonk the witch and come back: ' + JSON.stringify(h));
    // RT boosts: faster, the meter drains, magic dust behind
    await p.evaluate(() => { magic = 1; });
    await padHold(p, 'RT', true); await p.waitForTimeout(500);
    const b = await p.evaluate(() => { for (let i = 0; i < 40; i++) { update(1 / 60); updateVisuals(1 / 60); } let lit = 0; for (let i = 0; i < DUST_N; i++) if (dustAge[i] < DUST_LIFE) lit++; return { boosting, magic, speed, lit }; });
    await padHold(p, 'RT', false);
    check(b.boosting && b.magic < 0.95 && b.speed > 36 && b.lit > 20, 'LT should boost with a dust trail: ' + JSON.stringify(b));
    // a magic box rolls a power-up; Ⓨ uses it (the bats chase the leader)
    const it = await p.evaluate(() => {
      const box = boxes.find(x => x.z < pos.z - 30); pos.set(box.x, box.mesh.position.y, box.z + 0.5); friends.forEach(f => { f.knockT = 0; });
      update(1 / 60);
      for (let i = 0; i < 80; i++) update(1 / 60);
      const got = item;
      item = 'bats'; const lead = friends[2]; friends.forEach(f => { f.z = pos.z + 20; f.nextThrow = 99; }); lead.z = pos.z - 60;
      return { got, lead: lead.name };
    });
    check(it.got && ['rocket', 'bats', 'potion', 'cloak', 'triple', 'web'].includes(it.got), 'a box should give a power-up: ' + JSON.stringify(it));
    await padTap(p, 'Y');
    const bats = await p.evaluate(lead => { const f = friends.find(x => x.name === lead); let hit = false;
      for (let i = 0; i < 60 * 6 && !hit; i++) { update(1 / 60); if (f.knockT > 0) hit = true; } return { used: item === null, hit }; }, it.lead);
    check(bats.used && bats.hit, 'Ⓨ should send the bats after the leader: ' + JSON.stringify(bats));
    await p.screenshot({ path: path.join(OUT, 'witch-race.png') });
    // a racer who boosts, throws hats and uses power-ups beats everyone
    const race = await p.evaluate(() => {
      startGame(); countT = 0; introT = 0;
      for (let i = 0; i < 60 * 300 && state === 'fly'; i++) {
        keys.l = keys.r = keys.u = keys.d = false;
        const z = pos.z - 35, wantYaw = Math.atan2(-(lineX(z) - pos.x), -(z - pos.z));
        if (wantYaw - yaw < -0.05) keys.r = true; else if (wantYaw - yaw > 0.05) keys.l = true;
        const wp = Math.atan2(lineY(z) - pos.y, 35);
        if (wp - pitch > 0.05) keys.u = true; else if (wp - pitch < -0.05) keys.d = true;
        if ((strike && strike.t < 0.6) || projectiles.some(x => x.kind === 'rival' && x.mesh.position.distanceTo(pos) < 10)) castShield();
        keys.boost = magic > 0.5 || (boosting && magic > 0.05);
        if (lockMesh.visible) throwHat();
        if (item) useItem();
        update(1 / 60); if (i % 3 === 0) updateVisuals(1 / 60);
      }
      return { state, place, hits: hatsHit, podium: document.querySelectorAll('.podium li').length };
    });
    check(race.state === 'over' && race.place <= 2 && race.hits > 0 && race.podium === 6, 'a racer using everything should finish 1st or 2nd: ' + JSON.stringify(race));
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await ctx.close();
  });

  await test('Witch Way Out Grand Prix: seven areas, four shortcuts that are really faster, dash panels, the updraft, solid walls, the moving dangers, a rocket start and slipstreams', async () => {
    const p = await open(browser, 'witch-way-out.html', { viewport: { width: 960, height: 540 } });
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    const r = await p.evaluate(() => {
      const out = {};
      // fly from z0 to z1 along a path (the racing line, or a shortcut's), steering like a player would
      const flyPath = (z0, z1, path, opts = {}) => {
        startGame(false); countT = 0; introT = 0; friends.forEach(f => { f.z = 300; f.nextThrow = 99; }); pumpkinZ = 9999;
        pos.set(path(z0).x, path(z0).y, z0); yaw = 0; pitch = 0; speed = SPEED;
        let t = 0, bumps = 0, was = false, maxY = 0;
        while (pos.z > z1 && t < 60) {
          keys.l = keys.r = keys.u = keys.d = false;
          const w = path(pos.z - 22), wantYaw = Math.atan2(-(w.x - pos.x), 22), wp = Math.atan2(w.y - pos.y, 22);
          if (wantYaw - yaw < -0.04) keys.r = true; else if (wantYaw - yaw > 0.04) keys.l = true;
          if (wp - pitch > 0.04) keys.u = true; else if (wp - pitch < -0.04) keys.d = true;
          if (strike && strike.t < 0.6) castShield();
          if (opts.noHaz) P1.slowT = 0;
          update(1 / 60); t += 1 / 60; maxY = Math.max(maxY, pos.y);
          if (slowT > 0 && !was) bumps++; was = slowT > 0;
        }
        return { t, bumps, maxY, cuts: P1.cuts };
      };
      const line = z => ({ x: lineX(z), y: lineY(z) });
      out.sections = SECTIONS.map(s => s.id);
      out.cuts = CUTS.map((c, i) => {
        const cp = {}, via = z => (z <= c.z0 + 30 ? cutPos(c, z, cp) : line(z)) && { x: cp.x !== undefined && z <= c.z0 + 30 ? cp.x : lineX(z), y: cp.y !== undefined && z <= c.z0 + 30 ? cp.y : lineY(z) };
        const a = flyPath(c.z0 + 30, c.z1 - 10, line), b = flyPath(c.z0 + 30, c.z1 - 10, z => { if (z > c.z0) return line(z); cutPos(c, z, cp); return { x: cp.x, y: cp.y }; });
        return { id: c.id, line: +a.t.toFixed(2), cut: +b.t.toFixed(2), counted: b.cuts === 1, bumps: b.bumps, high: Math.round(b.maxY) };
      });
      // a dash panel: a burst of speed
      startGame(false); countT = 0; introT = 0; friends.forEach(f => { f.z = 300; });
      const d = dashes[0]; pos.set(d.x, d.y, d.z + 3); yaw = 0; pitch = 0; for (let i = 0; i < 20; i++) update(1 / 60);
      out.dash = { dashT: +P1.dashT.toFixed(2), speed: Math.round(speed) };
      // solid walls: even with the candy rocket, flying straight at the mansion's wall never gets you inside it
      startGame(false); countT = 0; introT = 0; pumpkinZ = 9999;
      const mx = CUT_MID[3].x - 18; pos.set(mx, 14, -2870); yaw = 0; pitch = 0; P1.rocketT = 3; let inside = 0;
      for (let i = 0; i < 60 * 3; i++) { keys.l = keys.r = keys.u = keys.d = false; update(1 / 60); if (pos.z < -2908 && pos.z > -2992 && Math.abs(pos.x - CUT_MID[3].x) < 23 && pos.y < 30 && Math.abs(pos.x - CUT_MID[3].x) > 9) inside++; }
      out.wall = { inside, z: Math.round(pos.z) };
      // the edges of the track turn you back in
      startGame(false); countT = 0; introT = 0; pumpkinZ = 9999; pos.set(lineX(-700) + 30, 20, -700); yaw = -0.9;
      let maxOff = 0; for (let i = 0; i < 120; i++) { update(1 / 60); maxOff = Math.max(maxOff, Math.abs(pos.x - lineX(pos.z)) - halfW(pos.z)); }
      out.edge = +maxOff.toFixed(2);
      // the moving dangers each get you (a windmill sail, a stomping tombstone, a twister, a chandelier, a shut pumpkin gate), and an open gate is a boost
      out.haz = {};
      for (const h of hazards) {
        if (out.haz[h.kind]) continue;
        startGame(false); countT = 0; introT = 0; pumpkinZ = 9999; friends.forEach(f => { f.z = 300; f.nextThrow = 99; });
        let got = false, boost = false;
        for (let k = 0; k < 400 && !(got && (boost || !h.through)); k++) {   // (a gate: until it's both bitten and been open)
          const t = k * 0.05; h.update(t);
          const q = h.kind === 'windmill' ? { x: h.x + Math.cos(h.ang + Math.PI / 2) * 12, y: h.y + Math.sin(h.ang + Math.PI / 2) * 12, z: h.z }
            : h.kind === 'stomper' ? { x: h.x, y: Math.max(1.5, h.y + 4), z: h.z } : h.kind === 'twister' ? { x: h.x, y: 30, z: h.z }
            : h.kind === 'chandelier' ? { x: h.cx, y: h.cy, z: h.z } : { x: h.x, y: h.y + 9, z: h.z };   // (a gate: on its rim)
          if (h.hit(q)) got = true;
          if (h.through && h.through({ x: h.x, y: h.y, z: h.z })) boost = true;
        }
        out.haz[h.kind] = { got, boost: h.through ? boost : null };
      }
      startGame(false); countT = 0; introT = 0; const st = hazards.find(h => h.kind === 'stomper'); st.update(1.3 - ((0) % 3.4)); pumpkinZ = 9999;
      const ch = hazards.find(h => h.kind === 'chomper');
      for (let i = 0; i < 600; i++) { pos.set(ch.x + 40, ch.y, ch.z + 40); slowT = 0; update(1 / 60); if (ch.open > 0.99) break; }   // wait for the gate to open
      pos.set(ch.x, ch.y, ch.z + 1); slowT = 0; update(1 / 60);
      out.chompBoost = P1.dashT > 1;
      // a rocket start: hold boost as the 2 shows
      startGame(false); for (let i = 0; i < 70; i++) update(1 / 60); keys.boost = true; while (countT > 0) update(1 / 60); keys.boost = false;
      out.rocketStart = +P1.dashT.toFixed(2);
      startGame(false); keys.boost = true; while (countT > 0) update(1 / 60); keys.boost = false;   // held from the 3: too early
      out.tooEarly = { dash: P1.dashT, slow: slowT > 0 };
      // a slipstream: tuck in right behind a witch
      startGame(false); countT = 0; introT = 0; runT = 10; pumpkinZ = 9999;
      const f = friends[0]; friends.slice(1).forEach(o => { o.z = 400; });
      let slip = false;
      for (let i = 0; i < 120 && !slip; i++) { f.knockT = 0; f.z = pos.z - 8; f.off = pos.x - lineX(f.z); f.offY = pos.y - lineY(f.z) - 0.3; f.ph = -clock * 0.35; f.base = 31; update(1 / 60); if (P1.dashT > 0) slip = true; }
      out.slip = slip;
      // the other witches take the shortcuts now and then
      startGame(false); countT = 0; introT = 0; pumpkinZ = 9999; pos.z = -50; let rivalCut = 0;
      for (let i = 0; i < 60 * 150 && rivalCut < 1; i++) { pos.z = Math.min(...friends.map(q => q.z)) + 30; update(1 / 60); if (friends.some(q => q.cut && q.cutK > 0.9)) rivalCut++; }
      out.rivalCut = rivalCut;
      return out;
    });
    check(r.sections.length === 7 && r.sections[0] === 'castle' && r.sections[6] === 'lake', 'seven areas, from the castle to the lake: ' + JSON.stringify(r.sections));
    for (const c of r.cuts) check(c.cut < c.line - 0.3 && c.counted && c.bumps <= 1, `the ${c.id} shortcut should be open (nothing in the way but its own swinging chandeliers) and faster than the racing line: ` + JSON.stringify(c));
    check(r.cuts.find(c => c.id === 'highway').high > 75, 'the updraft lifts you up to the ring highway: ' + JSON.stringify(r.cuts));
    check(r.dash.dashT > 0.8 && r.dash.speed > 40, 'a dash panel gives a burst of speed: ' + JSON.stringify(r.dash));
    check(r.wall.inside === 0, 'walls are solid, even with the rocket: ' + JSON.stringify(r.wall));
    check(r.edge < 0.5, 'the edges of the track keep you in: ' + r.edge);
    for (const k of ['windmill', 'stomper', 'twister', 'chandelier', 'chomper']) check(r.haz[k] && r.haz[k].got, `the ${k} should be able to get you: ` + JSON.stringify(r.haz));
    check(r.haz.chomper.boost && r.chompBoost, 'flying through an open pumpkin gate is a boost: ' + JSON.stringify(r));
    check(r.rocketStart > 1 && !r.tooEarly.dash && r.tooEarly.slow, 'holding boost at the 2 gives a rocket start, too early a wobble: ' + JSON.stringify(r));
    check(r.slip, 'tucking in behind a witch gives a slipstream boost');
    check(r.rivalCut > 0, 'the other witches take shortcuts too');
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await done(p);
  });

  await test('Witch Way Out 👥 three and four players: a corner each (three: the fourth is the pumpkin cam), each controller flies its own witch, everyone finishes', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 640 } });
    await ctx.addInitScript(() => {   // four pretend controllers
      const mk = i => ({ id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', index: i, connected: true, mapping: 'standard', axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), vibrationActuator: { playEffect: () => Promise.resolve() } });
      window.__pads = [mk(0), mk(1), mk(2), mk(3)]; window.__pad = window.__pads[0];
      navigator.getGamepads = () => window.__pads;
    });
    const p = await ctx.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(url('witch-way-out.html')); await p.waitForTimeout(1000);
    const title = await p.evaluate(() => ({ b3: !!document.getElementById('btnPlay3'), b4: !!document.getElementById('btnPlay4'), pads: document.getElementById('padCount').textContent }));
    await p.click('#btnPlay3'); await p.waitForTimeout(300);
    await p.evaluate(() => { countT = 0; introT = 0; }); await p.waitForTimeout(400);
    const three = await p.evaluate(() => ({ quad: document.body.classList.contains('quad'), huds: [...document.querySelectorAll('.hud')].filter(h => !h.classList.contains('hidden')).length,
      spec: !document.getElementById('specTag').classList.contains('hidden'), racers: players.length, p4: P4.mesh.visible }));
    await p.screenshot({ path: path.join(OUT, 'witch-3p.png') });
    await p.evaluate(() => startGame(4)); await p.waitForTimeout(200);
    await p.evaluate(() => { countT = 0; introT = 0; }); await p.waitForTimeout(300);
    // controller 4 steers Player 4 only; controller 3's Ⓑ throws Player 3's hat
    const y0 = await p.evaluate(() => players.map(q => q.yaw));
    await p.evaluate(() => { __pads[3].axes[0] = 1; }); await p.waitForTimeout(500);
    const steer = await p.evaluate(() => players.map(q => q.yaw));
    await p.evaluate(() => { __pads[3].axes[0] = 0; __pads[2].buttons[1] = { pressed: true, value: 1 }; window.__hats = []; const t0 = performance.now(); (function watch() { for (const h of projectiles) if (h.kind === 'hat' && !__hats.includes(h.by.idx)) __hats.push(h.by.idx); if (performance.now() - t0 < 2000) requestAnimationFrame(watch); })(); }); await p.waitForTimeout(300);
    await p.evaluate(() => { __pads[2].buttons[1] = { pressed: false, value: 0 }; }); await p.waitForTimeout(200);
    const hats = await p.evaluate(() => __hats);
    const four = await p.evaluate(() => ({ quad: document.body.classList.contains('quad'), huds: [...document.querySelectorAll('.hud')].filter(h => !h.classList.contains('hidden')).length,
      spec: !document.getElementById('specTag').classList.contains('hidden'), racers: players.length, corners: [...document.querySelectorAll('.hud')].filter(h => !h.classList.contains('hidden')).map(h => { const b = h.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top)]; }) }));
    await p.screenshot({ path: path.join(OUT, 'witch-4p.png') });
    // all four fly the line to the moon
    const race = await p.evaluate(() => {
      for (let i = 0; i < 60 * 320 && state === 'fly'; i++) {
        for (const q of players) {
          const k = q.keys; k.l = k.r = k.u = k.d = false;
          const z = q.pos.z - 35, wantYaw = Math.atan2(-(lineX(z) + (q.idx - 1.5) * 3 - q.pos.x), -(z - q.pos.z));
          if (wantYaw - q.yaw < -0.05) k.r = true; else if (wantYaw - q.yaw > 0.05) k.l = true;
          const wp = Math.atan2(lineY(z) - q.pos.y, 35);
          if (wp - q.pitch > 0.05) k.u = true; else if (wp - q.pitch < -0.05) k.d = true;
          if (q.strike && q.strike.t < 0.6) castShield(q);
        }
        update(1 / 60); if (i % 6 === 0) updateVisuals(1 / 60);
      }
      return { state, places: players.map(q => q.finishPlace), podium: document.querySelectorAll('.podium li').length, mine: document.querySelectorAll('.podium li.you').length, stats: document.getElementById('overStats').textContent };
    });
    check(title.b3 && title.b4 && /Four controllers/.test(title.pads), 'the title offers 3 and 4 players and sees four controllers: ' + JSON.stringify(title));
    check(three.quad && three.huds === 3 && three.spec && three.racers === 3 && !three.p4, 'three players: three corners and the pumpkin cam: ' + JSON.stringify(three));
    check(four.quad && four.huds === 4 && !four.spec && four.racers === 4 && new Set(four.corners.map(String)).size === 4, 'four players: a corner each: ' + JSON.stringify(four));
    check(steer[3] < y0[3] - 0.05 && [0, 1, 2].every(i => Math.abs(steer[i] - y0[i]) < 0.03), 'controller 4 flies only Player 4: ' + JSON.stringify({ y0, steer }));
    check(hats.length === 1 && hats[0] === 2, "controller 3's Ⓑ throws Player 3's hat: " + JSON.stringify(hats));
    check(race.state === 'over' && race.places.every(x => x >= 1 && x <= 9) && new Set(race.places).size === 4 && race.podium === 9 && race.mine === 4 && /P4/.test(race.stats), 'all four reach the moon and the results list them: ' + JSON.stringify(race));
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await ctx.close();
  });

  const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));
  const until = async (p, fn, ms = 5000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(fn)) return true; await p.waitForTimeout(80); } return false; };
  // Moto Rush: an autopilot that rides like a player (keys toward a point up the road), for the tests below
  const MOTO_PILOT = `window.pilot = (r, opt = {}) => {
    let lane = opt.lane || 0;
    if (opt.pads) for (const pd of PADS) { const a = dS(pd.s - r.s); if (a > 0 && a < 60) { lane = pd.d; break; } }
    for (const cw of COWS) { const a = dS(cw.s - r.s); if (a > -2 && a < 45 && Math.abs(cw.d) < HW + 1.5 && Math.abs(cw.d - lane) < 3.4) lane = cw.d > 0 ? cw.d - 4.5 : cw.d + 4.5; }
    { const a = dS(TRACTOR_S - r.s); if (a > 0 && a < 40 && Math.abs(TRACTOR.u) < HW + 3) lane = TRACTOR.u > 0 ? TRACTOR.u - 5 : TRACTOR.u + 5; }
    const q = trackPoint(r.s + 10 + Math.max(0, r.speed) * 0.3, lane), df = wrapA(Math.atan2(-(q.x - r.x), -(q.z - r.z)) - r.h);
    r.keys = { u: opt.gas !== false, l: df > 0.03, r: df < -0.03, boost: !!opt.boost && r.nitro > 0.3 && bendAt(r.s + 30) === 0 };
  };
  window.follow = r => { const q = trackPoint(r.s + 14, 0), df = wrapA(Math.atan2(-(q.x - r.x), -(q.z - r.z)) - r.h); r.keys = { u: true, l: df > 0.03, r: df < -0.03 }; };`;   // (straight down the middle, whatever's there)

  await test('Moto Rush riding (after EBITDA Hero\'s motorcycle): RT and LT are smooth gas and brake, the stick pulled back is a wheelie that fills the nitro, Ⓐ hops, Ⓧ is nitro, Ⓑ drifts and lets go with a mini-turbo, the right stick swings the camera all the way round and LB brings it back behind', async () => {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
    await ctx.addInitScript(fakePad);
    const p = await ctx.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(url('moto-rush.html')); await p.waitForTimeout(1000);
    const setBtn = (b, v) => p.evaluate(([b, v]) => { __pad.buttons[b] = { pressed: v > 0.5, value: v }; }, [b, v]);
    const at = (s, v) => p.evaluate(([s, v]) => { startGame(1); countT = 0; cpus.forEach((c, i) => resetRider(c, 900 + i * 30, 0)); resetRider(P1, s, 0); P1.dist = s; P1.speed = v; }, [s, v]);
    // how fast the speed climbs (per second of race time) with the trigger part way, then all the way
    const climb = async v => {
      await at(380, 5); await setBtn(PAD.RT, v);
      const a = await p.evaluate(() => ({ v: P1.speed, t: runT })); await p.waitForTimeout(700);
      const b = await p.evaluate(() => ({ v: P1.speed, t: runT })); await setBtn(PAD.RT, 0);
      return (b.v - a.v) / Math.max(0.01, b.t - a.t);
    };
    const half = await climb(0.5), full = await climb(1);
    await at(380, 30); await setBtn(PAD.LT, 1); await until(p, () => P1.speed < 20, 4000);
    const braked = await p.evaluate(() => P1.speed); await setBtn(PAD.LT, 0);
    // a wheelie: gas with the stick pulled back
    await at(380, 25); await p.evaluate(() => { P1.nitro = 0; }); await setBtn(PAD.RT, 1); await p.evaluate(() => { __pad.axes[1] = 0.9; }); await until(p, () => P1.wheelie > 0.35 && P1.nitro > 0.03, 5000);
    const wheelie = await p.evaluate(() => ({ w: P1.wheelie, nitro: P1.nitro })); await p.evaluate(() => { __pad.axes[1] = 0; });
    // Ⓐ: a bunny hop
    await padHold(p, 'A', true);
    const hop = await p.evaluate(() => ({ air: P1.air, up: P1.y - groundY(P1.s, P1.d) })); await padHold(p, 'A', false);
    // Ⓧ: nitro
    await at(380, 30); await p.evaluate(() => { P1.nitro = 1; }); await setBtn(PAD.RT, 1); await padHold(p, 'X', true); await until(p, () => P1.boosting && P1.nitro < 0.97, 4000);
    const nitro = await p.evaluate(() => ({ on: P1.boosting, meter: P1.nitro, flame: P1.bike.flame.visible })); await padHold(p, 'X', false);
    // Ⓑ with the stick over: a drift that charges up, and letting go fires the mini-turbo
    await at(380, 30); await p.evaluate(() => { __pad.axes[0] = 0.6; }); await padHold(p, 'B', true);
    await until(p, () => P1.drifting, 2000);
    const drifting = await p.evaluate(() => P1.drifting);
    await until(p, () => !(P1.driftCharge < 1.0 && P1.drifting), 8000);
    const charge = await p.evaluate(() => P1.driftCharge);
    await padHold(p, 'B', false); await p.evaluate(() => { __pad.axes[0] = 0; });
    const turbo = await p.evaluate(() => ({ dash: P1.dash, drifting: P1.drifting }));
    await setBtn(PAD.RT, 0);
    // the camera: the right stick swings it round the bike, LB brings it straight back behind
    await at(380, 0);
    await p.evaluate(() => { __pad.axes[2] = 1; }); await until(p, () => Math.abs(P1.cam.yaw) > 1.2, 5000);
    const swung = await p.evaluate(() => { const c = P1.camera.position; return { yaw: P1.cam.yaw, dist: Math.hypot(c.x - P1.x, c.z - P1.z) }; });
    await p.evaluate(() => { __pad.axes[2] = 0; __pad.buttons[4] = { pressed: true, value: 1 }; }); await until(p, () => Math.abs(P1.cam.yaw) < 0.05, 3000);
    const behind = await p.evaluate(() => P1.cam.yaw);
    await p.evaluate(() => { __pad.buttons[4] = { pressed: false, value: 0 }; });
    check(half > 2 && full > half * 1.5, 'the trigger is smooth: more gas, quicker: ' + JSON.stringify({ half, full }));
    check(braked < 25, 'LT brakes: ' + braked);
    check(wheelie.w > 0.3 && wheelie.nitro > 0.02, 'the stick pulled back pulls a wheelie that fills the nitro: ' + JSON.stringify(wheelie));
    check(hop.air > 0 || hop.up > 0.05, 'Ⓐ hops: ' + JSON.stringify(hop));
    check(nitro.on && nitro.meter < 0.97 && nitro.flame, 'Ⓧ fires the nitro (a flame, the meter drains): ' + JSON.stringify(nitro));
    check(drifting && charge >= 0.9 && turbo.dash > 5 && !turbo.drifting, 'Ⓑ drifts, and letting go fires a mini-turbo: ' + JSON.stringify({ drifting, charge, turbo }));
    check(Math.abs(swung.yaw) > 1 && swung.dist > 3, 'the right stick swings the camera round the bike: ' + JSON.stringify(swung));
    check(Math.abs(behind) < 0.05, 'LB brings the camera back behind: ' + behind);
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await ctx.close();
  });

  await test('Moto Rush track: the figure 8 goes over the bridge (with a jump off the crest and a trick for a boost) and then under it, never mixing the two roads up; dash pads; the barn shortcut is quicker and counted; the cows and the tractor knock you down (hop the cows!); kicks; the fences and the bridge walls keep you in; wrong way', async () => {
    const p = await open(browser, 'moto-rush.html', { viewport: { width: 960, height: 540 } });
    await p.addScriptTag({ content: MOTO_PILOT });
    const r = await p.evaluate(() => {
      const out = {}, dt = 1 / 60;
      const fresh = (s, d = 0, v = 36) => { startGame(1); countT = 0; cpus.forEach((c, i) => resetRider(c, modS(s + 300 + i * 30), 0)); resetRider(P1, s, d); P1.dist = s; P1.speed = v; COWS.forEach(c => { c.wait = 99; c.d = 30; }); TRACTOR.u = 60; TRACTOR.wait = 99; };
      const run = (n, f) => { for (let i = 0; i < n; i++) { if (f) f(i); else pilot(P1); update(dt); } };
      // over the bridge: up on the deck where the roads cross, with a jump off the crest and a trick in the air
      fresh(SA - 120); let yA = 0, air = 0, tricked = false, dash = 0, wallOut = 0;
      run(330, () => { pilot(P1); if (Math.abs(dS(P1.s - SA)) < 2) yA = Math.max(yA, P1.y); air = Math.max(air, P1.air);
        if (!tricked && P1.air > 0.12 && P1.y - groundY(P1.s, P1.d) > 0.55) { hop(P1); tricked = true; } dash = Math.max(dash, P1.dash); if (onBridge(P1.s)) wallOut = Math.max(wallOut, Math.abs(P1.d)); });
      out.over = { yA: +yA.toFixed(1), air: +air.toFixed(2), tricked, tricks: P1.tricks, dash: +dash.toFixed(1), wallOut: +wallOut.toFixed(1), wipes: P1.wipes };
      // the bridge walls: steering hard at them up on the deck
      fresh(SA - 10, 0, 30); let maxD = 0; run(90, () => { P1.keys = { u: true, r: true }; if (onBridge(P1.s)) maxD = Math.max(maxD, Math.abs(P1.d)); });
      out.walls = +maxD.toFixed(2);
      // under it: down on the ground where the roads cross, and still on the lower road afterwards
      fresh(SB - 60); let yB = 99; run(200, () => { pilot(P1); if (Math.abs(dS(P1.s - SB)) < 2) yB = Math.min(yB, P1.y); });
      out.under = { yB: +yB.toFixed(2), after: Math.round(dS(P1.s - SB)) };
      // a dash pad
      const pd = PADS[0]; fresh(pd.s - 8, pd.d, 25); run(30, () => { P1.keys = { u: true }; }); out.pad = +P1.dash.toFixed(1);
      // the barn shortcut against the road
      const ride = (target, done) => { let t = 0; while (t < 30 && !done()) { const q = target(); const df = wrapA(Math.atan2(-(q.x - P1.x), -(q.z - P1.z)) - P1.h); P1.keys = { u: true, l: df > 0.04, r: df < -0.04 }; update(dt); t += dt; } return t; };
      fresh(CUT.s0 - 40, 0, 30); P1.nitro = 0;
      const tRoad = ride(() => trackPoint(P1.s + 14, 0), () => dS(P1.s - (CUT.s1 + 20)) > 0);
      fresh(CUT.s0 - 40, 0, 30); P1.nitro = 0;
      const tCut = ride(() => { const c = cutUV(P1.x, P1.z); if (dS(CUT.s0 - P1.s) > 25 && c.u < 0) return trackPoint(P1.s + 14, 0); if (c.u < CUT.len - 4) { const u = Math.max(0, c.u) + 14; return { x: CUT.ax + CUT.ux * u, z: CUT.az + CUT.uz * u }; } return trackPoint(CUT.s1 + 20, 0); },
        () => dS(P1.s - (CUT.s1 + 20)) > 0 && !P1.onCut);
      out.cut = { tRoad: +tRoad.toFixed(2), tCut: +tCut.toFixed(2), cuts: P1.cuts, wipes: P1.wipes };
      // straight into a cow: down you go; hop just before it and you sail over
      const cow = COWS[0];
      fresh(cow.s - 30); cow.d = 0; updateFarm(0); run(80, () => follow(P1)); out.cowHit = { wipes: P1.wipes, banner: P1.ui.banner.textContent };
      run(100, () => follow(P1)); out.back = { wipeT: +P1.wipeT.toFixed(2), onRoad: Math.abs(P1.d) < HW };
      fresh(cow.s - 30); cow.d = 0; updateFarm(0); let hopped = false; run(80, () => { follow(P1); if (!hopped && dS(cow.s - P1.s) < 8.5) { hop(P1); hopped = true; } }); out.cowHop = P1.wipes;
      // the tractor in the road
      fresh(TRACTOR_S - 30); TRACTOR.u = 0; updateFarm(0); run(80, () => follow(P1)); out.tractor = P1.wipes;
      // Ⓨ: a kick at the rider alongside
      fresh(400, -1.2, 30); resetRider(cpus[0], 400, 1.4); cpus[0].speed = 30; kick(P1);
      out.kick = { v: +cpus[0].speed.toFixed(1), wobble: cpus[0].wobbleT > 0, kicks: P1.kicks };
      // off the road: the fence turns you back, the grass slows you
      fresh(400, 0, 36); P1.h += 1.2; run(150, () => { P1.keys = { u: true }; }); out.fence = { d: +Math.abs(P1.d).toFixed(1), v: +P1.speed.toFixed(1) };
      // the wrong way round
      fresh(400, 0, 10); P1.h += Math.PI; run(120, () => { P1.keys = { u: true }; }); updateHUD(dt);
      out.wrong = !P1.ui.warn.classList.contains('hidden');
      return out;
    });
    check(r.over.yA >= 7.4 && r.over.air > 0.4 && r.over.wipes === 0, 'over the bridge: up on the deck, with air off the crest: ' + JSON.stringify(r.over));
    check(r.over.tricked && r.over.tricks === 1 && r.over.dash > 8, 'a trick in the air lands with a boost: ' + JSON.stringify(r.over));
    check(r.walls < 8, 'the bridge walls keep you on the deck: ' + r.walls);
    check(r.under.yB < 0.2 && r.under.after > 20, 'under the bridge: on the ground where the roads cross, and on along the lower road: ' + JSON.stringify(r.under));
    check(r.pad > 8, 'a dash pad: ' + r.pad);
    check(r.cut.cuts === 1 && r.cut.tCut < r.cut.tRoad - 0.3 && r.cut.wipes === 0, 'the barn shortcut is counted and quicker than the road: ' + JSON.stringify(r.cut));
    check(r.cowHit.wipes === 1 && /WIPED OUT/.test(r.cowHit.banner) && r.cowHop === 0 && r.back.wipeT <= 0 && r.back.onRoad, 'a cow knocks you down (and you are back on the road after), a hop clears it: ' + JSON.stringify({ hit: r.cowHit, hop: r.cowHop, back: r.back }));
    check(r.tractor === 1, 'the tractor knocks you down: ' + r.tractor);
    check(r.kick.v < 25 && r.kick.wobble && r.kick.kicks === 1, 'Ⓨ kicks the rider alongside: ' + JSON.stringify(r.kick));
    check(r.fence.d < 21 && r.fence.v < 30, 'the fence keeps you in and the grass slows you: ' + JSON.stringify(r.fence));
    check(r.wrong, 'riding the wrong way shows WRONG WAY');
    await done(p);
  });

  await test('Moto Rush race: nobody moves in the countdown, a rocket start at the 2 (too early: wheelspin), three laps against five rivals who take the shortcut too, results and a saved best', async () => {
    const p = await open(browser, 'moto-rush.html', { viewport: { width: 960, height: 540 } });
    await p.addScriptTag({ content: MOTO_PILOT });
    const r = await p.evaluate(() => {
      const dt = 1 / 60, out = {};
      // the countdown, with the gas going down as the 2 shows: a rocket start
      startGame(1); const z0 = P1.z, lights = [];
      while (countT > 0) { P1.keys = { u: countT <= 2 }; update(dt); if (countT > 0 && Math.abs(P1.z - z0) > 0.01) out.moved = true; }
      lights.push(...window.eval('lights').map(l => l.material.color.getHexString()));
      out.rocket = { dash: P1.dash, feed: P1.ui.feed.textContent, green: lights.every(c => c === '3ddc84') };
      // too early: wheelspin
      startGame(1); while (countT > 0) { P1.keys = { u: true }; update(dt); }
      out.early = { stall: P1.stallT > 0, feed: P1.ui.feed.textContent };
      for (let i = 0; i < 30; i++) { P1.keys = { u: true }; update(dt); } out.early.v = P1.speed;
      // a whole race on autopilot (dash pads and nitro, like a good rider)
      startGame(1); const banners = new Set();
      for (let i = 0; i < 60 * 240 && state === 'race'; i++) { pilot(P1, { pads: true, boost: true }); update(dt); if (P1.bannerT > 0) banners.add(P1.ui.banner.firstChild.textContent); }
      const first = Math.min(...racers.filter(x => x.finishT > 0).map(x => x.finishT));
      out.race = { state, place: P1.place, behind: +(P1.finishT - first).toFixed(1), laps: P1.lapTimes.length, fin: P1.finishT, banners: [...banners], cuts: cpus.reduce((a, c) => a + c.cuts, 0),
        rivals: cpus.filter(c => c.finishT > 0 || c.dist > LAPS * N_T - 250).length, podium: document.querySelectorAll('.podium li').length, you: document.querySelectorAll('.podium li.you').length,
        title: document.getElementById('overTitle').textContent, best: +RB.store.get('mr_best'), lap: +RB.store.get('mr_lap') };
      showBestOnTitle(); out.titleBest = document.getElementById('titleBest').textContent;
      return out;
    });
    check(!r.moved, 'nobody moves in the countdown');
    check(r.rocket.dash > 10 && /ROCKET/.test(r.rocket.feed) && r.rocket.green, 'gas as the 2 shows: a rocket start (and the start lights go green): ' + JSON.stringify(r.rocket));
    check(r.early.stall && /early/i.test(r.early.feed), 'gas held from the start: wheelspin: ' + JSON.stringify(r.early));
    check(r.race.state === 'over' && r.race.laps === 3 && r.race.fin > 90 && r.race.fin < 160, 'three laps to the finish: ' + JSON.stringify(r.race));
    check(r.race.banners.includes('LAP 2/3') && r.race.banners.includes('FINAL LAP!'), 'lap banners: ' + JSON.stringify(r.race.banners));
    check(r.race.behind < 6 && r.race.rivals >= 3 && r.race.cuts > 0, 'a good rider is right there at the finish, the rivals race (and use the barn shortcut): ' + JSON.stringify(r.race));
    check(r.race.podium === 6 && r.race.you === 1 && /Won|Place/.test(r.race.title), 'the results list all six: ' + JSON.stringify(r.race));
    check(Math.abs(r.race.best - r.race.fin) < 0.05 && r.race.lap > 20 && /Best race/.test(r.titleBest), 'the best race and lap are saved and shown: ' + JSON.stringify({ best: r.race.best, lap: r.race.lap, title: r.titleBest }));
    await done(p, 'moto-rush.png');
  });

  await test('Moto Rush 👥 two to four players: the screen splits (three: the blimp cam in the fourth corner), each controller rides its own bike, the keyboard is shared by Players 1 and 2 (W A S D and I J K L), the second controller\'s ☰ opens the menu, and everyone finishes', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 640 } });
    await ctx.addInitScript(() => {   // four pretend controllers
      const mk = i => ({ id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', index: i, connected: true, mapping: 'standard', axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), vibrationActuator: { playEffect: () => Promise.resolve() } });
      window.__pads = [mk(0), mk(1), mk(2), mk(3)]; window.__pad = window.__pads[0];
      navigator.getGamepads = () => window.__pads;
    });
    const p = await ctx.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(url('moto-rush.html')); await p.waitForTimeout(1000);
    await p.addScriptTag({ content: MOTO_PILOT });
    const title = await p.evaluate(() => document.getElementById('padCount').textContent);
    await p.click('#btnPlay2'); await p.waitForTimeout(300);
    await p.evaluate(() => { countT = 0; for (const q of players) { resetRider(q, 400 + q.idx * 6, q.idx ? 3 : -3); q.dist = 400; } }); await p.waitForTimeout(300);
    const two = await p.evaluate(() => ({ split: document.body.classList.contains('split'), huds: [...document.querySelectorAll('.hud')].filter(h => !h.classList.contains('hidden')).length,
      divider: !document.getElementById('divider').classList.contains('hidden'), racers: racers.length, marker: players.every(q => q.marker.visible || q.markerHid) }));
    // controller 2's RT rides Player 2 only
    const before = await p.evaluate(() => players.map(q => q.speed));
    await p.evaluate(() => { __pads[1].buttons[7] = { pressed: true, value: 1 }; }); await until(p, () => P2.speed > 4, 6000);
    const after = await p.evaluate(() => players.map(q => q.speed));
    await p.evaluate(() => { __pads[1].buttons[7] = { pressed: false, value: 0 }; });
    // the keyboard: W A S D for Player 1, the arrows for Player 2
    await p.evaluate(() => { for (const q of players) { resetRider(q, 400 + q.idx * 6, q.idx ? 3 : -3); q.dist = 400; } });
    await p.keyboard.down('KeyW'); await until(p, () => P1.speed > 4, 6000);
    const kw = await p.evaluate(() => players.map(q => q.speed)); await p.keyboard.up('KeyW');
    await p.evaluate(() => { for (const q of players) { resetRider(q, 400 + q.idx * 6, q.idx ? 3 : -3); q.dist = 400; } });
    await p.keyboard.down('KeyI'); await until(p, () => P2.speed > 4, 6000);
    const ku = await p.evaluate(() => players.map(q => q.speed)); await p.keyboard.up('KeyI');
    // the second controller's ☰ opens the menu
    await p.evaluate(() => { __pads[1].buttons[9] = { pressed: true, value: 1 }; }); await p.waitForTimeout(200);
    await p.evaluate(() => { __pads[1].buttons[9] = { pressed: false, value: 0 }; }); await p.waitForTimeout(100);
    const menu = await p.evaluate(() => !!document.querySelector('.rb-menu') && paused);
    await p.evaluate(() => RB.closeMenu()); await p.waitForTimeout(100);
    if (await p.evaluate(() => paused)) await p.evaluate(() => resume());
    await p.screenshot({ path: path.join(OUT, 'moto-rush-2p.png') });
    // three: the blimp cam takes the fourth corner; four: a corner each
    await p.evaluate(() => startGame(3)); await p.waitForTimeout(400);
    const three = await p.evaluate(() => ({ quad: document.body.classList.contains('quad'), huds: [...document.querySelectorAll('.hud')].filter(h => !h.classList.contains('hidden')).length, spec: !document.getElementById('specTag').classList.contains('hidden') }));
    await p.evaluate(() => startGame(4)); await p.waitForTimeout(300);
    await p.evaluate(() => { countT = 0; for (const q of players) { resetRider(q, 400 + q.idx * 8, 0); q.dist = 400; } });
    const h0 = await p.evaluate(() => players.map(q => (q.h0 = q.h)));
    await p.evaluate(() => { __pads[3].axes[0] = 1; __pads[3].buttons[7] = { pressed: true, value: 1 }; }); await until(p, () => Math.abs(wrapA(P4.h - P4.h0)) > 0.15, 8000);
    const h1 = await p.evaluate(() => players.map(q => q.h));
    await p.evaluate(() => { __pads[3].axes[0] = 0; __pads[3].buttons[7] = { pressed: false, value: 0 }; });
    const four = await p.evaluate(() => ({ quad: document.body.classList.contains('quad'), huds: [...document.querySelectorAll('.hud')].filter(h => !h.classList.contains('hidden')).length, spec: !document.getElementById('specTag').classList.contains('hidden'),
      corners: [...document.querySelectorAll('.hud')].filter(h => !h.classList.contains('hidden')).map(h => { const b = h.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top)]; }) }));
    await p.screenshot({ path: path.join(OUT, 'moto-rush-4p.png') });
    // all four ride to the finish
    const race = await p.evaluate(() => {
      startGame(4);
      for (let i = 0; i < 60 * 260 && state === 'race'; i++) { for (const q of players) pilot(q, { lane: (q.idx - 1.5) * 3 }); update(1 / 60); if (i % 6 === 0) updateVisuals(1 / 60); }
      return { state, fin: players.map(q => q.finishT > 0), podium: document.querySelectorAll('.podium li').length, you: document.querySelectorAll('.podium li.you').length, stats: document.getElementById('overStats').textContent };
    });
    check(/Four controllers/.test(title), 'the title sees four controllers: ' + title);
    check(two.split && two.huds === 2 && two.divider && two.racers === 7 && two.marker, 'two players: the screen splits, a HUD each, seven riders, a marker over each player: ' + JSON.stringify(two));
    check(after[1] > before[1] + 3 && Math.abs(after[0] - before[0]) < 0.5, "controller 2's RT rides only Player 2: " + JSON.stringify({ before, after }));
    check(kw[0] > 3 && kw[1] < 0.5 && ku[1] > 3 && ku[0] < 0.5, 'W rides Player 1 and I Player 2: ' + JSON.stringify({ kw, ku }));
    check(menu, "the second controller's ☰ opens the menu (and pauses)");
    check(three.quad && three.huds === 3 && three.spec, 'three players: three corners and the blimp cam: ' + JSON.stringify(three));
    check(four.quad && four.huds === 4 && !four.spec && new Set(four.corners.map(String)).size === 4, 'four players: a corner each: ' + JSON.stringify(four));
    check(wrapAngle(h1[3] - h0[3]) < -0.1 && [0, 1, 2].every(i => Math.abs(h1[i] - h0[i]) < 0.02), 'controller 4 steers only Player 4: ' + JSON.stringify({ h0, h1 }));
    check(race.state === 'over' && race.fin.every(Boolean) && race.podium === 9 && race.you === 4 && /Player 4/.test(race.stats), 'all four finish and the results list them: ' + JSON.stringify(race));
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await ctx.close();
  });

  await test('Moto Rush on a phone: the touch buttons show, the bike goes by itself, a drag steers and HOP hops', async () => {
    const p = await open(browser, 'moto-rush.html', PHONE);
    await p.evaluate(() => { startGame(1); countT = 0; cpus.forEach((c, i) => resetRider(c, 900 + i * 30, 0)); resetRider(P1, 380, 0); P1.dist = 380; });
    await until(p, () => P1.speed > 4, 8000);
    const go = await p.evaluate(() => ({ v: P1.speed, btns: !document.getElementById('tbtns').classList.contains('hidden') }));
    const h0 = await p.evaluate(() => (P1.h0 = P1.h));
    const vp = p.viewportSize();
    const end = await touchDrag(p, vp.width * 0.3, vp.height * 0.6, vp.width * 0.3 + 60, vp.height * 0.6);
    await until(p, () => Math.abs(wrapA(P1.h - P1.h0)) > 0.08, 8000);
    const h1 = await p.evaluate(() => P1.h); await end();
    await p.tap('#hopBtn');
    const hop = await p.evaluate(() => P1.air > 0 || P1.vy > 0);
    check(go.btns && go.v > 3, 'the touch buttons show and the bike rides by itself: ' + JSON.stringify(go));
    check(wrapAngle(h1 - h0) < -0.05, 'dragging right steers right: ' + JSON.stringify({ h0, h1 }));
    check(hop, 'HOP hops');
    await done(p, 'moto-rush-phone.png');
  });

  // Moto Mania: the same autopilot works on any course (in the arena it heads for the first rival still flying)
  const MANIA_PILOT = MOTO_PILOT + `
  window.arenaPilot = r => { const t = racers.filter(o => o !== r && !o.out)[0] || { x: 0, z: 0 }; const df = wrapA(Math.atan2(-(t.x - r.x), -(t.z - r.z)) - r.h); r.keys = { u: true, l: df > 0.05, r: df < -0.05 }; };
  window.go = (n = 1, sel) => { if (sel) garage.sel = sel; openGarage(n); for (let i = 0; i < n; i++) garageReady(i, true); for (let i = 0; i < 30 && state !== 'race'; i++) updateGarage(1 / 30); countT = 0; };`;

  await test('Moto Mania courses and bikes: six courses (each its own page), the garage picks one of four bikes for each player, the bikes really differ, the docks canal is cleared at speed and is a splash when slow, the warehouse shortcut counts', async () => {
    const p = await open(browser, 'moto-mania.html?course=fields', { viewport: { width: 960, height: 540 } });
    await p.addScriptTag({ content: MANIA_PILOT });
    const title = await p.evaluate(() => ({ cards: [...document.querySelectorAll('#courses button')].map(b => b.dataset.c + (b.classList.contains('on') ? '*' : '')).join(','), course: COURSE }));
    // the garage: A / D pick the bike, Space is ready, and the race starts on that bike
    await p.click('#btnPlay'); await p.waitForTimeout(200);
    const g0 = await p.evaluate(() => ({ state, cols: document.querySelectorAll('.gcol').length, buttons: document.querySelectorAll('#garage button').length, bike: garage.sel[0] }));
    await p.keyboard.press('KeyD'); await p.keyboard.press('KeyD');
    const picked = await p.evaluate(() => garage.sel[0]);
    await p.keyboard.press('Space');
    for (let i = 0; i < 40 && await p.evaluate(() => state !== 'race'); i++) await p.waitForTimeout(100);
    const raced = await p.evaluate(() => ({ state, bike: P1.bike.type, bk: P1.bk.name, saved: RB.store.get('mm_bike0') }));
    // the four bikes: the scooter pulls away first, the chopper is quickest flat out, the dirt bike keeps its speed on grass
    const bikes = await p.evaluate(() => {
      const out = {};
      for (const k of BIKE_KEYS) {
        go(1, [k]); cpus.forEach((c, i) => resetRider(c, 900 + i * 30, 0)); resetRider(P1, 380, 0); P1.dist = 380;
        let t1 = 0; for (let i = 0; i < 60 * 8; i++) { follow(P1); update(1 / 60); if (!t1 && P1.speed > 25) t1 = i / 60; }
        out[k] = { to25: +t1.toFixed(2), top: +P1.speed.toFixed(1) };
        resetRider(P1, 400, 0); P1.dist = 400; P1.speed = 30; P1.h += 1.2; for (let i = 0; i < 100; i++) { P1.keys = { u: true }; update(1 / 60); }
        out[k].grass = +P1.speed.toFixed(1);
      }
      return out;
    });
    await done(p);
    // the docks: the canal and the warehouse
    const d = await open(browser, 'moto-mania.html?course=docks', { viewport: { width: 960, height: 540 } });
    await d.addScriptTag({ content: MANIA_PILOT });
    const docks = await d.evaluate(() => {
      const out = { course: COURSE, night: NIGHT };
      const jump = (v, gas) => { go(1, ['sport']); cpus.forEach((c, i) => resetRider(c, 900 + i * 30, 0)); resetRider(P1, CANAL.s - 50, 0); P1.dist = CANAL.s - 50; P1.speed = v;
        let splashed = false; for (let i = 0; i < 360; i++) { follow(P1); if (!gas) P1.keys.u = P1.speed < v; update(1 / 60); if (P1.sinking) splashed = true; }
        return { splashed, past: dS(P1.s - CANAL.s) > CANAL.gap + 5, banner: P1.ui.banner.textContent };
      };
      out.fast = jump(40, true); out.slow = jump(16, false);
      go(1, ['sport']); cpus.forEach((c, i) => resetRider(c, 900 + i * 30, 0)); resetRider(P1, CUT.s0 - 40, 0); P1.dist = CUT.s0 - 40; P1.speed = 30;
      let t = 0;
      while (t < 25 && !(dS(P1.s - (CUT.s1 + 20)) > 0 && !P1.onCut)) {
        const c = cutUV(P1.x, P1.z), q = dS(CUT.s0 - P1.s) > 25 && c.u < 0 ? trackPoint(P1.s + 14, 0) : c.u < CUT.len - 4 ? { x: CUT.ax + CUT.ux * (Math.max(0, c.u) + 14), z: CUT.az + CUT.uz * (Math.max(0, c.u) + 14) } : trackPoint(CUT.s1 + 20, 0);
        const df = wrapA(Math.atan2(-(q.x - P1.x), -(q.z - P1.z)) - P1.h); P1.keys = { u: true, l: df > 0.04, r: df < -0.04 }; update(1 / 60); t += 1 / 60;
      }
      out.cut = { cuts: P1.cuts, wipes: P1.wipes, t: +t.toFixed(1) };
      return out;
    });
    await done(d, 'moto-mania-docks.png');
    check(title.cards === 'fields*,docks,city,beach,quarry,arena' && title.course === 'fields', 'the title offers the six courses: ' + JSON.stringify(title));
    check(g0.state === 'garage' && g0.cols === 1 && g0.buttons === 0, 'Race! opens the garage (no menu buttons in it, so each controller picks for itself): ' + JSON.stringify(g0));
    check(picked !== g0.bike && raced.state === 'race' && raced.bike === picked && raced.saved === picked, 'D picks another bike, Space is ready, the race starts on it: ' + JSON.stringify({ g0, picked, raced }));
    check(bikes.scooter.to25 < bikes.sport.to25 && bikes.sport.to25 < bikes.chopper.to25, 'the scooter pulls away first, the chopper last: ' + JSON.stringify(bikes));
    check(bikes.chopper.top > bikes.sport.top && bikes.sport.top > bikes.scooter.top, 'the chopper is quickest flat out: ' + JSON.stringify(bikes));
    check(bikes.dirt.grass > bikes.sport.grass + 3, 'the dirt bike keeps its speed on the grass: ' + JSON.stringify(bikes));
    check(docks.night && !docks.fast.splashed && docks.fast.past, 'at the docks, flat out clears the canal: ' + JSON.stringify(docks.fast));
    check(docks.slow.splashed && /SPLASH/.test(docks.slow.banner), 'too slow: a splash: ' + JSON.stringify(docks.slow));
    check(docks.cut.cuts === 1 && docks.cut.wipes === 0, 'the warehouse shortcut is counted: ' + JSON.stringify(docks.cut));
  });

  await test('Moto Mania new courses: Downtown (the subway\'s walls, taxis and buses across the junctions under a traffic light), the Cape Cod Boardwalk (the pier jump, sand that slows the road bikes, the tide that floods the shortcut), Quarry Pass (quicker downhill, the tunnel\'s walls, the cliff with no fence); the CPUs get round each', async () => {
    const VP = { viewport: { width: 960, height: 540 } };
    const HW_ = 8;   // (the road's half width)
    // a lap's worth of racing for the CPUs: how far each gets in 75 s
    const lap = () => {
      go(1, ['sport']); resetRider(P1, -30, 0); P1.dist = -30;
      const t0 = cpus.map(c => c.dist);
      for (let i = 0; i < 60 * 75; i++) { P1.keys = {}; update(1 / 60); }
      return cpus.map((c, i) => Math.round(c.dist - t0[i]));
    };
    // Downtown
    const c = await open(browser, 'moto-mania.html?course=city', VP);
    await c.addScriptTag({ content: MANIA_PILOT });
    const city = await c.evaluate(() => {
      const out = { junctions: JUNCTIONS.length, crossings: CROSSINGS.length, depth: profile(TRENCH.s) };
      go(1, ['sport']); cpus.forEach((q, i) => resetRider(q, TRENCH.s + 300 + i * 30, 0));
      // down in the subway, steering hard for the wall: it keeps you in
      resetRider(P1, TRENCH.s - 45, 0); P1.dist = TRENCH.s - 45; P1.speed = 25;
      let maxD = 0; for (let i = 0; i < 150; i++) { P1.keys = { u: true, r: true }; update(1 / 60); if (P1.y < -1) maxD = Math.max(maxD, Math.abs(P1.d)); }
      out.sub = { y: +P1.y.toFixed(1), maxD: +maxD.toFixed(2) };
      // a taxi stopped across the road: ride into it and you're down
      const cr = CROSSINGS.find(x => !x.deck), v = cr.cars[0];
      cr.t = 6; for (const q of cr.cars) { q.active = false; q.mesh.visible = false; }
      Object.assign(v, { active: true, u: 0, dir: 1, lane: 0, speed: 0 }); v.mesh.visible = true;
      resetRider(P1, cr.s - 40, 0); P1.dist = cr.s - 40; P1.speed = 30;
      for (let i = 0; i < 120 && !P1.wipeT; i++) { follow(P1); update(1 / 60); }
      out.taxi = { wipe: P1.wipeT > 0, banner: P1.ui.banner.textContent, red: cr.light.red.material === SIGNAL_RED };
      v.speed = 14; cr.t = 6; for (let i = 0; i < 60 * 8; i++) update(1 / 60);
      out.clear = { red: cr.light.red.material === SIGNAL_RED, green: cr.light.green.material === SIGNAL_GREEN };
      return out;
    }).catch(e => ({ error: e.message }));
    const cityLap = await c.evaluate(lap);
    await done(c, 'moto-mania-city.png');
    // the Cape Cod Boardwalk
    const b = await open(browser, 'moto-mania.html?course=beach', VP);
    await b.addScriptTag({ content: MANIA_PILOT });
    const beach = await b.evaluate(() => {
      const out = {};
      const jump = (v, gas) => { go(1, ['sport']); cpus.forEach((q, i) => resetRider(q, CANAL.s + 300 + i * 30, 0)); resetRider(P1, CANAL.s - 50, 0); P1.dist = CANAL.s - 50; P1.speed = v;
        let splashed = false; for (let i = 0; i < 360; i++) { follow(P1); if (!gas) P1.keys.u = P1.speed < v; update(1 / 60); if (P1.sinking) splashed = true; }
        return { splashed, past: dS(P1.s - CANAL.s) > CANAL.gap + 5, banner: P1.ui.banner.textContent };
      };
      out.fast = jump(40, true); out.slow = jump(16, false);
      // the sand: flat out along the beach, the sport bike against the dirt bike
      const sand = k => { go(1, [k]); cpus.forEach((q, i) => resetRider(q, SAND.s0 - 400 + i * 30, 0)); resetRider(P1, SAND.s0 + 20, 0); P1.dist = SAND.s0 + 20; P1.speed = 20;
        for (let i = 0; i < 60 * 5; i++) { follow(P1); update(1 / 60); } return +P1.speed.toFixed(1); };
      out.sand = { sport: sand('sport'), dirt: sand('dirt') };
      // the tide: out at the start, in for the last lap; the CPUs keep off the flat once it's coming in
      go(1, ['sport']); out.tide0 = +tide.toFixed(2);
      for (const q of racers) q.dist = 2.3 * N_T;
      for (let i = 0; i < 60 * 12; i++) { P1.keys = {}; update(1 / 60); }
      out.tide = +tide.toFixed(2); out.water = tidePlane.visible && tidePlane.position.y > 0;
      const q = cpus[0]; resetRider(q, CUT.s0 - 160 - 20, 0); let planned = 0;
      for (let i = 0; i < 30; i++) { aiInput(q, 1 / 60); q.s += 1; if (q.cutPlan) planned++; }
      out.cpuCut = planned;
      // on the flat with the tide in: slow going
      resetRider(P1, CUT.s0, 0); P1.dist = CUT.s0;
      P1.x = CUT.ax + CUT.ux * 20; P1.z = CUT.az + CUT.uz * 20; P1.h = Math.atan2(-CUT.ux, -CUT.uz); P1.speed = 30;
      for (let i = 0; i < 60; i++) { P1.keys = { u: true }; update(1 / 60); }
      out.flat = { onCut: P1.onCut, speed: +P1.speed.toFixed(1) };
      return out;
    });
    const beachLap = await b.evaluate(lap);
    await done(b, 'moto-mania-beach.png');
    // Quarry Pass
    const q = await open(browser, 'moto-mania.html?course=quarry', VP);
    await q.addScriptTag({ content: MANIA_PILOT });
    const quarry = await q.evaluate(() => {
      const out = { summit: +profile((TUNNEL.s0 + TUNNEL.s1) / 2).toFixed(1) };
      const ride = (s, k = 'chopper') => { go(1, [k]); cpus.forEach((c, i) => resetRider(c, s + 400 + i * 30, 0)); resetRider(P1, s, 0); P1.dist = s; P1.speed = 30;
        for (let i = 0; i < 60 * 5; i++) { follow(P1); update(1 / 60); } return +P1.speed.toFixed(1); };
      out.down = ride(modS(TUNNEL.s1 + 30)); out.up = ride(sNear(40, 4)); out.flat = BIKES.chopper.max;
      out.grades = [+gradeAt(modS(TUNNEL.s1 + 80)).toFixed(3), +gradeAt(sNear(110, 0)).toFixed(3)];
      // the tunnel's walls
      go(1, ['sport']); resetRider(P1, TUNNEL.s0 + 10, 0); P1.dist = TUNNEL.s0 + 10; P1.speed = 25;
      let maxD = 0; for (let i = 0; i < 120; i++) { P1.keys = { u: true, l: true }; update(1 / 60); if (inTunnel(P1.s)) maxD = Math.max(maxD, Math.abs(P1.d)); }
      out.tunnel = +maxD.toFixed(2);
      // the cliff: steer off the edge and down you go, then back on the road
      resetRider(P1, modS(CLIFF.s0 + 60), CLIFF.side * 4); P1.dist = CLIFF.s0 + 60; P1.speed = 20; P1.h -= CLIFF.side * 0.7;
      let fell = false, minY = 99, banner = '';
      for (let i = 0; i < 60 * 4; i++) { P1.keys = { u: true }; update(1 / 60); if (P1.sinking) { fell = true; banner = banner || P1.ui.banner.textContent; } minY = Math.min(minY, P1.y - profile(P1.s)); }
      out.cliff = { fell, banner, minY: +minY.toFixed(1), back: !P1.sinking && Math.abs(P1.d) < HW && Math.abs(P1.y - profile(P1.s)) < 1 };
      // the other side has its barrier
      resetRider(P1, modS(CLIFF.s0 + 60), -CLIFF.side * 4); P1.dist = CLIFF.s0 + 60; P1.speed = 20; P1.h += CLIFF.side * 0.7;
      let fell2 = false; for (let i = 0; i < 60 * 3; i++) { P1.keys = { u: true }; update(1 / 60); if (P1.sinking) fell2 = true; }
      out.wall = { fell: fell2, d: +Math.abs(P1.d).toFixed(1) };
      return out;
    });
    const quarryLap = await q.evaluate(lap);
    const N = await q.evaluate(() => N_T);
    await done(q, 'moto-mania-quarry.png');
    check(!city.error && city.junctions >= 8 && city.crossings === 4 && city.depth < -6, 'downtown: a street grid of junctions, three with traffic (and more over the subway), the subway sunk under the road: ' + JSON.stringify(city));
    check(city.sub.y < -5 && city.sub.maxD < HW_ + 0.5, "the subway's walls keep you in: " + JSON.stringify(city.sub));
    check(city.taxi.wipe && /TAXI/.test(city.taxi.banner) && city.taxi.red, 'a taxi across the road: ride into it and you\'re down, and the light\'s red: ' + JSON.stringify(city.taxi));
    check(city.clear.green && !city.clear.red, 'the traffic gone, the light goes green: ' + JSON.stringify(city.clear));
    check(cityLap.every(d => d > 1200), 'downtown: every CPU gets most of the way round in 75 s: ' + JSON.stringify(cityLap));
    check(!beach.fast.splashed && beach.fast.past, 'flat out clears the gap off the end of the pier: ' + JSON.stringify(beach.fast));
    check(beach.slow.splashed && /SPLASH/.test(beach.slow.banner), 'too slow: a splash: ' + JSON.stringify(beach.slow));
    check(beach.sand.dirt > beach.sand.sport + 3, 'on the sand the dirt bike is quicker than the sport bike: ' + JSON.stringify(beach.sand));
    check(beach.tide0 === 0 && beach.tide > 0.9 && beach.water && beach.cpuCut === 0, 'the tide is out at the start and in for the last lap, and the CPUs keep off the flat: ' + JSON.stringify(beach));
    check(beach.flat.speed < 20, 'with the tide in, the flat is slow going: ' + JSON.stringify(beach.flat));
    check(beachLap.every(d => d > 1200), 'the boardwalk: every CPU gets most of the way round in 75 s: ' + JSON.stringify(beachLap));
    check(quarry.summit > 40 && quarry.grades[0] < -0.05 && quarry.grades[1] > 0.04, 'Quarry Pass climbs to the tunnel and drops away after it: ' + JSON.stringify(quarry));
    check(quarry.down > quarry.flat + 3 && quarry.up < quarry.flat - 2, 'quicker than flat out downhill, slower up: ' + JSON.stringify(quarry));
    check(quarry.tunnel < HW_ + 0.5, "the tunnel's walls keep you in: " + JSON.stringify(quarry));
    check(quarry.cliff.fell && /EDGE/.test(quarry.cliff.banner) && quarry.cliff.minY < -4 && quarry.cliff.back, 'off the cliff edge (no fence): down you go, then back on the road: ' + JSON.stringify(quarry.cliff));
    check(!quarry.wall.fell && quarry.wall.d < HW_ + 4, 'the other side has a barrier: ' + JSON.stringify(quarry.wall));
    check(quarryLap.every(d => d > 0.6 * N), 'the quarry: every CPU gets well round in 75 s: ' + JSON.stringify({ quarryLap, N }));
  });

  await test('Moto Mania items: a box rolls an item (the roulette, then the HUD shows it), the back of the pack gets the good stuff, and oil, hay bales, cows, rockets, shields, magnets and mega nitro all work; Ⓨ uses an item and LB kicks', async () => {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
    await ctx.addInitScript(fakePad);
    const p = await ctx.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(url('moto-mania.html?course=fields')); await p.waitForTimeout(1000);
    await p.addScriptTag({ content: MANIA_PILOT });
    const r = await p.evaluate(() => {
      const out = {}, dt = 1 / 60;
      const fresh = (s = 400) => { go(1, ['sport']); cpus.forEach((c, i) => resetRider(c, modS(s + 300 + i * 30), 0)); resetRider(P1, s, 0); P1.dist = s; P1.speed = 30; COWS.forEach(c => { c.wait = 99; c.d = 30; }); TRACTOR.u = 60; TRACTOR.wait = 99; };
      // a box: the roulette, then the item
      fresh(BOX_ROWS[0] - 20); P1.d = -1.8; setFromTrack(P1);
      let rolled = false; for (let i = 0; i < 40; i++) { follow(P1); P1.keys.l = P1.keys.r = false; update(dt); if (P1.rolled) rolled = true; }
      for (let i = 0; i < 70; i++) { follow(P1); update(dt); }
      updateHUD(dt);
      out.box = { rolled, item: P1.item, slot: P1.ui.slot.textContent, gone: boxes.filter(b => b.gone > 0).length };
      // the back of the pack gets rockets, magnets and nitro; the front doesn't get rockets
      const count = (place, k) => { let n = 0; P1.place = place; for (let i = 0; i < 3000; i++) if (rollItem(P1) === k) n++; return n; };
      out.odds = { rocket1: count(1, 'rocket'), rocket6: count(6, 'rocket'), nitro1: count(1, 'nitro'), nitro6: count(6, 'nitro'), oil1: count(1, 'oil'), oil6: count(6, 'oil') };
      // oil dropped behind spins out the rider coming through
      fresh(); const a = cpus[0]; resetRider(a, 380, 0); a.dist = 380; a.speed = 30;
      P1.item = 'oil'; useItem(P1); for (let i = 0; i < 90; i++) { follow(P1); a.keys = {}; update(dt); }
      out.oil = { spun: a.spinT > 0 || a.speed < 20, left: drops.length };
      // a hay bale rolled ahead knocks over the rider in front
      fresh(); const b = cpus[1]; resetRider(b, 430, 0); b.dist = 430; b.speed = 20;
      P1.item = 'bale'; useItem(P1); let baleHit = 0; for (let i = 0; i < 120; i++) { follow(P1); update(dt); if (b.wipeT > 0) baleHit = 1; }
      out.bale = { hit: baleHit, hits: P1.hits };
      // a cow dropped behind; a rocket from the back finds the leader; a shield stops it
      fresh(); const c = cpus[2]; resetRider(c, 384, 0); c.dist = 384; c.speed = 30;
      P1.item = 'cow'; useItem(P1); let cowHit = 0; for (let i = 0; i < 90; i++) { follow(P1); update(dt); if (c.wipeT > 0) cowHit = 1; }
      out.cow = cowHit;
      const behind = () => cpus.forEach((q, i) => { if (q !== lead) { resetRider(q, 150 + i * 12, 0); q.dist = 150 + i * 12; } });
      fresh(); const lead = cpus[3]; resetRider(lead, 600, 0); lead.dist = 600; lead.speed = 30; behind(); update(dt);
      P1.item = 'rocket'; useItem(P1); const target = shots[0] && shots[0].target; let rocketHit = 0; for (let i = 0; i < 400 && shots.length; i++) { follow(P1); update(dt); if (lead.wipeT > 0) rocketHit = 1; }
      out.rocket = { target: target && target.name, lead: lead.name, hit: rocketHit };
      fresh(); resetRider(lead, 600, 0); lead.dist = 600; lead.speed = 30; behind(); lead.item = 'shield'; useItem(lead); update(dt);
      P1.item = 'rocket'; useItem(P1); for (let i = 0; i < 400 && shots.length; i++) { follow(P1); update(dt); }
      out.shield = { wiped: lead.wipes, shieldLeft: lead.shieldT };
      // a magnet pulls you up to the rider ahead; mega nitro fills the tank
      fresh(); const m = cpus[4]; resetRider(m, 440, 3); m.dist = 440; m.speed = 25; P1.speed = 25;
      const gap0 = m.dist - P1.dist; P1.item = 'magnet'; useItem(P1); for (let i = 0; i < 150; i++) { follow(P1); update(dt); } out.magnet = { gap0, gap1: +(m.dist - P1.dist).toFixed(1) };
      fresh(); P1.nitro = 0; P1.item = 'nitro'; useItem(P1); out.nitro = { tank: P1.nitro, dash: P1.dash };
      return out;
    });
    // the controller: Ⓨ uses the item, LB kicks the rider alongside
    await p.evaluate(() => { go(1, ['sport']); cpus.forEach((c, i) => resetRider(c, 900 + i * 30, 0)); resetRider(P1, 400, -1.2); resetRider(cpus[0], 400, 1.4); P1.item = 'shield'; });
    await padTap(p, 'Y');
    const yUsed = await p.evaluate(() => ({ item: P1.item, shield: P1.shieldT > 0 }));
    await p.evaluate(() => { __pad.buttons[4] = { pressed: true, value: 1 }; }); await p.waitForTimeout(150); await p.evaluate(() => { __pad.buttons[4] = { pressed: false, value: 0 }; });
    const lbKick = await p.evaluate(() => ({ kicks: P1.kicks, wobble: cpus[0].wobbleT > 0 }));
    check(r.box.rolled && r.box.item && r.box.slot === { oil: '🛢️', bale: '🌾', cow: '🐄', magnet: '🧲', shield: '🛡️', rocket: '🚀', nitro: '⚡' }[r.box.item] && r.box.gone >= 1, 'a box rolls the roulette, then the item shows in the HUD: ' + JSON.stringify(r.box));
    check(r.odds.rocket1 === 0 && r.odds.rocket6 > 300 && r.odds.nitro6 > r.odds.nitro1 * 2 && r.odds.oil1 > r.odds.oil6, 'the back of the pack gets rockets and nitro, the front gets oil: ' + JSON.stringify(r.odds));
    check(r.oil.spun, 'oil spins out the rider behind: ' + JSON.stringify(r.oil));
    check(r.bale.hit && r.bale.hits >= 1, 'a hay bale knocks over the rider ahead: ' + JSON.stringify(r.bale));
    check(r.cow === 1, 'a dropped cow knocks over the rider behind');
    check(r.rocket.target === r.rocket.lead && r.rocket.hit, 'a rocket flies to the leader and gets them: ' + JSON.stringify(r.rocket));
    check(r.shield.wiped === 0 && r.shield.shieldLeft === 0, 'a shield takes the rocket (and is used up): ' + JSON.stringify(r.shield));
    check(r.magnet.gap1 < r.magnet.gap0 - 10, 'a magnet pulls you up to the rider ahead: ' + JSON.stringify(r.magnet));
    check(r.nitro.tank === 1 && r.nitro.dash > 10, 'mega nitro fills the tank: ' + JSON.stringify(r.nitro));
    check(!yUsed.item && yUsed.shield, 'Ⓨ uses the item: ' + JSON.stringify(yUsed));
    check(lbKick.kicks === 1 && lbKick.wobble, 'LB kicks the rider alongside: ' + JSON.stringify(lbKick));
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await ctx.close();
  });

  await test('Moto Mania balloon battle: everyone starts with three balloons in a ring round the mound; item hits and kicks pop them; with none left you are out (a ghost); the last rider flying wins; two players split the screen', async () => {
    const p = await open(browser, 'moto-mania.html?course=arena', { viewport: { width: 960, height: 540 } });
    await p.addScriptTag({ content: MANIA_PILOT });
    const r = await p.evaluate(() => {
      const out = {}, dt = 1 / 60;
      go(1, ['dirt']);
      out.start = { racers: racers.length, balloons: racers.map(q => q.balloons).join(''), ring: racers.every(q => Math.abs(Math.hypot(q.x, q.z) - 44) < 1), shown: P1.bike.balloons.every(b => b.visible), btn: document.getElementById('btnPlay').textContent };
      // a bale pops a balloon; a kick pops one; the last one and you're out
      const v = cpus[0]; v.x = P1.x; v.z = P1.z; hitBy(v, 'bale', P1); out.bale = { balloons: v.balloons, hits: P1.hits };
      v.ghostT = 0; v.wipeT = 0; resetRider(P1, 0, 0); P1.x = 0; P1.z = 30; P1.h = Math.PI / 2; P1.y = 0; v.x = 0; v.z = 31.6; v.y = 0; v.h = Math.PI / 2; P1.kickCool = 0; kick(P1);
      out.kick = v.balloons;
      v.ghostT = 0; v.wipeT = 0; hitBy(v, 'rocket', P1);
      out.out = { out: v.out, ghost: v.ghostT > 1000, canBeHit: hitBy(v, 'bale', P1) };
      // the battle plays out to the end
      for (let i = 0; i < 60 * 160 && state === 'race'; i++) { arenaPilot(P1); update(dt); }
      for (let i = 0; i < 300 && state === 'race'; i++) update(dt);
      out.end = { state, alive: racers.filter(q => !q.out).length, time: +runT.toFixed(0), meOut: P1.out, podium: document.querySelectorAll('.podium li').length, title: document.getElementById('overTitle').textContent, again: document.getElementById('btnAgain').textContent };
      return out;
    });
    await p.screenshot({ path: path.join(OUT, 'moto-mania-battle.png') });
    // two players: the screen splits, balloons in each HUD
    await p.evaluate(() => go(2, ['sport', 'chopper'])); await p.waitForTimeout(400);
    const two = await p.evaluate(() => { updateHUD(1 / 60);
      return { split: document.body.classList.contains('split'), racers: racers.length, huds: [...document.querySelectorAll('.hud')].filter(h => !h.classList.contains('hidden')).length, b: P2.ui.place.textContent, p2bike: P2.bike.type }; });
    check(r.start.racers === 6 && r.start.balloons === '333333' && r.start.ring && r.start.shown && /Battle/.test(r.start.btn), 'six riders, three balloons each, in a ring: ' + JSON.stringify(r.start));
    check(r.bale.balloons === 2 && r.bale.hits === 1, 'a hay bale pops a balloon: ' + JSON.stringify(r.bale));
    check(r.kick === 1, 'a kick pops a balloon: ' + r.kick);
    check(r.out.out && r.out.ghost && !r.out.canBeHit, 'the last balloon: out, a ghost who can\'t be hit: ' + JSON.stringify(r.out));
    check(r.end.state === 'over' && r.end.podium === 6 && (r.end.alive <= 1 || r.end.time >= 150 || r.end.meOut) && /Win|Place/.test(r.end.title) && /Battle Again/.test(r.end.again), 'the battle ends (one rider left, the time up, or every player out) with the results: ' + JSON.stringify(r.end));
    check(two.split && two.racers === 6 && two.huds === 2 && two.b === '🎈🎈🎈' && two.p2bike === 'chopper', 'two players: the screen splits, balloons in each HUD: ' + JSON.stringify(two));
    await done(p);
  });

  await test('Pumpkin Pals: every level can be finished (a search over every place Patch can stand), and every lost pumpling and golden candy can be reached', async () => {
    const p = await open(browser, 'pumpkin-pals.html', { viewport: { width: 960, height: 540 } });
    const r = await p.evaluate(() => {
      const out = {};
      for (const id of ORDER) {
        const L = LEVELS[id], W = L.w, H = L.h;
        // crates can be smashed (throw a pumpling, or ground pound), so for getting about they're open
        const raw = (x, y) => (x < 0 || x >= W ? T.STONE : y < 0 || y >= H ? 0 : L.t[y * W + x]);
        const solid = (x, y) => SOLID.has(raw(x, y)) && raw(x, y) !== T.CRATE;
        const stand = new Set(), springs = new Set(), k = (x, y) => x + ',' + y;
        for (let x = 0; x < W; x++) for (let y = 1; y < H - 1; y++) {
          const below = raw(x, y + 1);
          if (!solid(x, y) && raw(x, y) !== T.THORNS && (SOLID.has(below) || below === T.ONEWAY)) stand.add(k(x, y));
        }
        for (const e of L.ents) {
          if (e.k === 'plat') for (let ox = -(e.dx || 0); ox <= (e.dx || 0) + (e.w || 3) - 1; ox++) for (let oy = -(e.dy || 0); oy <= (e.dy || 0); oy++) stand.add(k(e.x + ox, e.y - 1 + oy));
          if (e.k === 'spring') springs.add(k(e.x, e.y));
        }
        const pts = [...stand].map(q => q.split(',').map(Number));
        const start = pts.filter(([x]) => x <= 4).sort((a, b) => b[1] - a[1])[0];
        const seen = new Set([k(...start)]), q = [start];
        const clearUp = (x, y, up) => { for (let i = 1; i <= up; i++) if (solid(x, y - i)) return false; return true; };
        let far = 0;
        while (q.length) {
          const [x, y] = q.shift();
          far = Math.max(far, x);
          const spring = [-1, 0, 1].some(d => springs.has(k(x + d, y)));
          for (const [x2, y2] of pts) {
            if (seen.has(k(x2, y2))) continue;
            const dx = Math.abs(x2 - x), up = y - y2;
            // a walking jump covers about 4 tiles up or 5 across; a running one 7 across; a spring 9 up
            const ok = up < 0 ? dx <= 7 + Math.min(4, -up) : spring && up <= 9 ? dx <= 5 : up <= 1 ? dx <= 7 : up <= 4 ? dx <= 5 : false;
            if (ok && (up <= 0 || clearUp(x, y, Math.min(up, 3)) || clearUp(x2, y2 + up, up))) { seen.add(k(x2, y2)); q.push([x2, y2]); }
          }
        }
        const reach = (ex, ey, upTo) => [...seen].some(s => { const [a, b] = s.split(',').map(Number); return Math.abs(a - ex) <= 2 && ey <= b && b - ey <= upTo; });
        const lost = L.ents.filter(e => e.k === 'lost'), golds = L.ents.filter(e => e.k === 'gold');
        out[id] = { far, goal: L.goal || L.arena + 36, lost: lost.length, lostMissing: lost.filter(e => !reach(e.x, e.y, 0)).map(e => e.x + ',' + e.y),
          golds: golds.length, goldMissing: golds.filter(e => !reach(e.x, e.y, 4)).map(e => e.x + ',' + e.y) };
      }
      return out;
    });
    for (const [id, v] of Object.entries(r)) {
      check(v.far >= v.goal, `${id}: Patch can only get as far as tile ${v.far}, the goal is at ${v.goal}`);
      check(v.golds === 3 && !v.goldMissing.length, `${id}: 3 golden candies, all reachable: ` + JSON.stringify(v));
      check(v.lost >= 2 && !v.lostMissing.length, `${id}: every lost pumpling should be reachable: ` + JSON.stringify(v));
    }
    await done(p);
  });

  await test('Pumpkin Pals: a robot that only runs and jumps gets through all five levels to the wagon', async () => {
    const p = await open(browser, 'pumpkin-pals.html', { viewport: { width: 960, height: 540 } });
    const r = await p.evaluate(() => {
      const out = {};
      paused = true;
      for (const id of ORDER.filter(id => !LEVELS[id].boss)) {
        lives = 99; startLevel(id);
        let falls = 0, t = 0;
        for (t = 0; t < 60 * 90 && state === 'level'; t++) {
          if (phase === 'dying') { falls++; while (phase === 'dying' && state === 'level') step(1 / 60); continue; }
          if (phase !== 'play') { step(1 / 60); continue; }
          player.inv = 9;   // this is about the jumps, so the robot ignores enemies
          const pl = player, fy = Math.floor((pl.y + pl.h - 1) / TS);
          const tx = Math.floor((pl.x + pl.w + 4) / TS), wall = SOLID.has(tileAt(tx, fy)) || SOLID.has(tileAt(tx, fy - 1));
          const floor = cx => { for (let y = fy + 1; y < 14; y++) { const t2 = tileAt(cx, y); if (SOLID.has(t2) || t2 === T.ONEWAY) return true; } return ents.some(e => e.k === 'plat' && Math.abs(e.x + e.w / 2 - cx * TS) < 40); };
          const gap = pl.ground && ![1, 2].some(d => { const t2 = tileAt(Math.floor((pl.x + pl.w + d * 8) / TS), fy + 1); return SOLID.has(t2) || t2 === T.ONEWAY; })
            && !ents.some(e => e.k === 'plat' && Math.abs(e.y - (pl.y + pl.h)) < 4 && e.x < pl.x + pl.w + 20 && e.x + e.w > pl.x);
          keys.right = true; keys.run = true;
          if ((wall || gap) && pl.ground && !keys.jump) { keys.jump = true; pressed.jump = true; } else if (keys.jump && pl.vy > 0) keys.jump = false;
          if (!pl.ground && pl.vy > 40 && !pl.spun && !floor(Math.floor((pl.x + 6) / TS)) && !floor(Math.floor((pl.x + 22) / TS))) pressed.jump = true;   // spin over a pit
          step(1 / 60);
        }
        keys.right = keys.run = keys.jump = false;
        out[id] = { state, falls, cleared: !!save.cleared[id], secs: Math.round(t / 60) };
      }
      paused = false;
      return out;
    });
    for (const [id, v] of Object.entries(r)) check(v.cleared && v.state === 'map' && v.falls <= 1, `${id}: the robot should reach the wagon: ` + JSON.stringify(v));
    await done(p);
  });

  await test('Pumpkin Pals: rescuing, throwing (enemies, crates, blocks above), scattering and grabbing back, ghosts, skeletons, springs, the wagon and the scarecrow', async () => {
    const p = await open(browser, 'pumpkin-pals.html', { viewport: { width: 960, height: 540 } });
    const r = await p.evaluate(() => {
      const out = {}, run = (n, f) => { for (let i = 0; i < n; i++) { if (f) f(i); step(1 / 60); } };
      const put = (tx, row) => { player.x = tx * 16 + 2; player.y = (row + 1) * 16 - player.h; player.vx = 0; player.vy = 0; };
      localStorage.removeItem('pp_save'); for (const k in save.cleared) delete save.cleared[k]; save.beaten = false;
      paused = true; startGame();
      startLevel('patch'); run(5);
      const lost = ents.find(e => e.k === 'lost'), n0 = pals.length;
      player.x = lost.x; player.y = lost.y - 4; run(3);
      out.rescue = { found: found.size, joined: pals.length - n0 };
      const cat = ents.find(e => e.k === 'cat'); put(Math.floor(cat.x / 16) - 4, 11); player.face = 1; run(30);
      cat.x = player.x + 40; cat.dir = -1; player.inv = 9; pressed.throw = true; run(40);
      out.throwCat = { gone: cat.dead || !ents.includes(cat), back: pals.every(q => q.st === 'follow') };
      put(9, 11); player.face = 1; run(30); keys.up = true; pressed.throw = true; run(30); keys.up = false;
      out.throwUp = tileAt(9, 8) === T.USED;
      startLevel('patch'); run(60);
      const before = pals.length; player.inv = 0; hurtPlayer();
      const sc = pals.filter(q => q.st === 'scatter');
      out.hurt = { before, scattered: sc.length, lives };
      run(50); for (const q of sc) { player.x = q.x; player.y = q.y; run(2); }
      out.regrab = pals.filter(q => q.st === 'follow').length;
      pals = []; player.inv = 0; const lv = lives; hurtPlayer(); run(60 * 3);
      out.die = { lost: lv - lives, state, pals: pals.length };
      startLevel('manor'); run(5);
      const gh = ents.find(e => e.k === 'ghost'); put(Math.floor(gh.x / 16) - 6, 11); player.face = 1; run(10);
      const gx = gh.x; run(30); out.ghostLook = { hide: gh.hide, moved: Math.abs(gh.x - gx) };
      player.face = -1; const gx2 = gh.x; run(30); out.ghostAway = { hide: gh.hide, closer: gh.x < gx2 };
      player.face = 1; gh.x = player.x + 40; gh.y = player.y - 2; player.inv = 9; pressed.throw = true; run(40);
      out.ghostBoo = gh.dead || !ents.includes(gh);
      put(35, 11); player.face = 1; player.inv = 9; run(20); pressed.throw = true; run(40);
      out.crates = [8, 9, 10, 11].filter(y => tileAt(38, y) === T.CRATE).length;
      const sk = ents.find(e => e.k === 'skel'); player.x = sk.x; player.y = sk.y - 40; player.vy = 100; player.inv = 0; run(20);
      out.bones = sk.st; player.x = sk.x - 120; player.vy = 0; run(60 * 4.5); out.rattledBack = sk.st;
      player.x = sk.x - 2; player.y = sk.y - 50; player.vy = 0; player.ground = false; pressed.down = true; run(60);
      out.pound = sk.dead || !ents.includes(sk);
      startLevel('patch'); const sp = ents.find(e => e.k === 'spring'); player.x = sp.x + 2; player.y = sp.y - 40; player.vy = 150; run(18);
      out.spring = player.vy < -300 || player.y < sp.y - 60;
      startLevel('patch'); put(162, 11); keys.right = true; run(40); keys.right = false; run(60 * 5);
      out.goal = { state, cleared: !!save.cleared.patch, woodsOpen: nodeOpen(1), manorOpen: nodeOpen(2), score };
      startLevel('barn'); put(70, 11); run(60);
      const bo = ents.find(e => e.k === 'boss'); out.arena = arenaLock;
      for (let h = 0; h < 3; h++) {
        bo.st = 'dizzy'; bo.stT = 0; bo.inv = 0; bo.x = 80 * 16; bo.y = 12 * 16 - bo.h; player.inv = 9;
        player.x = bo.x + 8; player.y = bo.y - 30; player.vy = 150; run(10);
      }
      out.bossHp = bo.hp; run(60 * 8);
      out.ending = { state, beaten: save.beaten, best: +localStorage.getItem('pp_best'), shown: !document.getElementById('ending').classList.contains('hidden') };
      paused = false;
      return out;
    });
    check(r.rescue.found === 1 && r.rescue.joined === 1, 'touching a lost pumpling rescues it: ' + JSON.stringify(r.rescue));
    check(r.throwCat.gone && r.throwCat.back, 'a thrown pumpling knocks out a cat and comes back: ' + JSON.stringify(r.throwCat));
    check(r.throwUp, 'throwing straight up bumps the block above');
    check(r.hurt.scattered === 3 && r.hurt.lives === 5 && r.regrab === r.hurt.before, 'a hit scatters 3 pumplings (no life lost) and they can be grabbed back: ' + JSON.stringify(r));
    check(r.die.lost === 1 && r.die.state === 'level' && r.die.pals === 3, 'a hit with nobody left costs a life and restarts with the crew: ' + JSON.stringify(r.die));
    check(r.ghostLook.hide && r.ghostLook.moved === 0 && !r.ghostAway.hide && r.ghostAway.closer && r.ghostBoo, 'ghosts hide when looked at, creep up otherwise, and a thrown pumpling scares them off: ' + JSON.stringify(r));
    check(r.crates === 3, 'a thrown pumpling smashes a crate: ' + r.crates);
    check(r.bones === 'bones' && r.rattledBack === 'walk' && r.pound, 'skeletons fall to bones, rattle back, and a ground pound finishes them: ' + JSON.stringify(r));
    check(r.spring, 'the pumpkin spring bounces Patch up');
    check(r.goal.state === 'map' && r.goal.cleared && r.goal.woodsOpen && !r.goal.manorOpen && r.goal.score > 0, 'the wagon clears the level and opens the next: ' + JSON.stringify(r.goal));
    check(r.arena && r.bossHp === 0 && r.ending.state === 'ending' && r.ending.beaten && r.ending.shown && r.ending.best > 0, 'three hits beat the scarecrow, then the ending: ' + JSON.stringify(r));
    await done(p, 'pumpkin-pals.png');
  });

  await test('Pumpkin Pals 🎮 controller and 📱 phone: Ⓐ starts and jumps, the stick walks, RT throws a pumpling; touch buttons do the same', async () => {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
    await ctx.addInitScript(fakePad);
    const p = await ctx.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(url('pumpkin-pals.html')); await p.waitForTimeout(600);
    await padTap(p, 'A'); await p.waitForTimeout(300);
    const s1 = await p.evaluate(() => state);
    await padTap(p, 'A'); await p.waitForTimeout(400);
    const s2 = await p.evaluate(() => ({ state, id: lvl && lvl.id, x: player && player.x }));
    await padStick(p, 0.9, 0); await p.waitForTimeout(700); await padStick(p, 0, 0);
    const x2 = await p.evaluate(() => player.x);
    await padTap(p, 'RT'); await p.waitForTimeout(60);
    const thrown = await p.evaluate(() => pals.some(q => q.st === 'thrown' || q.st === 'back'));
    await padTap(p, 'A'); await p.waitForTimeout(100);
    const jumped = await p.evaluate(() => !player.ground || player.vy < 0);
    check(s1 === 'map' && s2.state === 'level' && s2.id === 'patch', 'Ⓐ starts the game, then the first level: ' + JSON.stringify({ s1, s2 }));
    check(x2 > s2.x + 30 && thrown && jumped, 'the stick walks, RT throws, Ⓐ jumps: ' + JSON.stringify({ x0: s2.x, x2, thrown, jumped }));
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await ctx.close();
    const ph = await open(browser, 'pumpkin-pals.html', PHONE);
    await ph.tap('#btnPlay'); await ph.waitForTimeout(300);
    await ph.evaluate(() => enterLevel(0)); await ph.waitForTimeout(300);
    const vis = await ph.evaluate(() => !document.getElementById('touch').classList.contains('hidden'));
    const x0 = await ph.evaluate(() => player.x);
    const box = await (await ph.$('#tRight')).boundingBox();
    await ph.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await ph.dispatchEvent('#tRight', 'pointerdown', { pointerId: 7 }); await ph.waitForTimeout(600); await ph.dispatchEvent('#tRight', 'pointerup', { pointerId: 7 });
    await ph.dispatchEvent('#tThrow', 'pointerdown', { pointerId: 8 }); await ph.waitForTimeout(50); await ph.dispatchEvent('#tThrow', 'pointerup', { pointerId: 8 });
    const t = await ph.evaluate(() => ({ x: player.x, thrown: pals.some(q => q.st === 'thrown' || q.st === 'back') }));
    check(vis && t.x > x0 + 20 && t.thrown, 'on a phone the touch buttons show, ▶ walks and 🎃 throws: ' + JSON.stringify({ vis, x0, ...t }));
    await done(ph, 'pumpkin-pals-phone.png');
  });

  await test('🎮 every game: the controller ☰ opens the same menu (this game, then the arcade) and the stick reaches 🏠 All games', async () => {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 600 } });
    await ctx.addInitScript(fakePad);
    const p = await ctx.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    const bad = [];
    for (const f of ['space-wars.html', 'floppy-bird.html', 'surfs-up.html', 'hamglider.html', 'web-hero.html', 'sparkle-meadow.html', 'witch-way-out.html', 'flight-school.html', 'lucky-leo.html', 'lily-pad-lunch.html', 'pumpkin-pals.html', 'moto-rush.html', 'moto-mania.html', 'preschool/abc-train.html', 'preschool/index.html', '5th-grade/math.html', '2nd-grade/math.html']) {
      await p.goto(url(f)); await p.waitForTimeout(500);
      await padTap(p, 'A'); await p.waitForTimeout(300);   // start playing (or press whatever the title screen highlights)
      if (!p.url().includes(f.split('/').pop())) { await p.goto(url(f)); await p.waitForTimeout(500); }
      if (await p.evaluate(() => !!document.querySelector('.rb-menu'))) await padTap(p, 'B');
      await padTap(p, 'MENU'); await p.waitForTimeout(150);
      const m = await p.evaluate(() => {
        const el = document.querySelector('.rb-menu'), h = el ? [...el.querySelectorAll('h3')].map(x => x.textContent) : [];
        return { open: !!el, heads: h, back: !!(el && el.querySelector('.rb-menu-this .rb-menu-back')), home: !!(el && el.querySelector('.rb-home-all')),
          focus: document.querySelector('.rb-pad-focus')?.className || '' };
      });
      if (!m.open || !/This game/.test(m.heads[0] || '') || !m.heads.some(x => /Games/.test(x)) || !m.back || !m.home || !/rb-menu-back/.test(m.focus)) { bad.push(f + ' menu ' + JSON.stringify(m)); continue; }
      // the stick (pushed down) walks the highlight to 🏠 All games, and Ⓐ goes there
      for (let i = 0; i < 40 && !(await p.evaluate(() => document.querySelector('.rb-pad-focus')?.classList.contains('rb-home-all'))); i++) {
        await padStick(p, 0, 0.9); await padStick(p, 0, 0);
      }
      if (!(await p.evaluate(() => document.querySelector('.rb-pad-focus')?.classList.contains('rb-home-all')))) { bad.push(f + ' could not reach All games: ' + await padFocus(p)); continue; }
      try { await padTap(p, 'A'); } catch (e) { /* the page went away */ }
      await p.waitForTimeout(400);
      if (!/robobandit\/index\.html$|\/index\.html$/.test(p.url()) || p.url().includes('preschool/') || p.url().includes('grade/')) bad.push(f + ' went to ' + p.url());
    }
    check(!bad.length, 'menu problems: ' + bad.join(' || '));
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await ctx.close();
  });

  await test('🎮 inverted sticks are per game and only for flying / the camera: menus, Lucky Leo and the train throttle stay normal', async () => {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 600 } });
    await ctx.addInitScript(fakePad);
    const p = await ctx.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(url('hamglider.html')); await p.waitForTimeout(600);
    await p.evaluate(() => { localStorage.removeItem('rb_pad'); RB.controllerScreen(); });
    const rows = await p.$$eval('[data-inv]', bs => bs.map(b => b.dataset.inv).sort().join(','));
    await p.click('[data-inv="LY"]', { force: true });
    await p.evaluate(() => document.querySelector('.rb-padscreen').close());
    const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('rb_pad')).inverts);
    // the menu still moves the normal way with the flying stick inverted
    await padTap(p, 'MENU'); await p.waitForTimeout(150);
    const f0 = await padFocus(p); await padStick(p, 0, 0.9); await padStick(p, 0, 0); const f1 = await padFocus(p);
    const down = await p.evaluate(() => { const a = [...document.querySelectorAll('.rb-menu button, .rb-menu a')]; const f = document.querySelector('.rb-pad-focus'); return f && f.getBoundingClientRect().top > document.querySelector('.rb-menu-back').getBoundingClientRect().top; });
    await padTap(p, 'B');
    // flying: stick up now dives (pull back to climb)
    await p.evaluate(() => { __pad.axes[1] = -0.9; }); await p.waitForTimeout(200);
    const fly = await p.evaluate(() => ({ y: stick.y, game: RB.pad.game.ly }));
    await p.evaluate(() => { __pad.axes[1] = 0; });
    // another game doesn't get it: the train's throttle goes forward when the stick is pushed up
    await p.goto(url('preschool/abc-train.html')); await p.waitForTimeout(800);
    await p.evaluate(() => { const c = JSON.parse(localStorage.getItem('rb_pad')); c.inverts['preschool/abc-train.html'] = { LY: true, LX: true, RX: false, RY: false }; localStorage.setItem('rb_pad', JSON.stringify(c)); });
    await p.reload(); await p.waitForTimeout(800);
    const train = await p.evaluate(() => ({ ly: RB.pad.inv('LY'), rows: (RB.controllerScreen(), [...document.querySelectorAll('[data-inv]')].map(b => b.dataset.inv).sort().join(',')) }));
    await p.evaluate(() => document.querySelector('.rb-padscreen').close());
    await p.evaluate(() => { RB.speak = () => {}; }); await p.click('#btnAbc'); await p.waitForTimeout(300);
    await p.evaluate(() => { hold = 0; for (const st of stations) st.letter = null; next = 99; });
    const th0 = await p.evaluate(() => train.th);
    await p.evaluate(() => { __pad.axes[1] = -0.9; }); await p.waitForTimeout(700); await p.evaluate(() => { __pad.axes[1] = 0; }); await p.waitForTimeout(100);
    const th1 = await p.evaluate(() => train.th);
    check(rows === 'LY,RX,RY', 'Hamglider offers flying up/down and the camera: ' + rows);
    check(saved['hamglider.html'] && saved['hamglider.html'].LY && Object.keys(saved).length === 1, 'the setting is saved for Hamglider only: ' + JSON.stringify(saved));
    check(down && f1 !== f0, 'menus move the normal way even with an inverted stick: ' + JSON.stringify({ f0, f1, down }));
    check(fly.game > 0.3, 'inverted flying: stick up pulls down in Hamglider: ' + JSON.stringify(fly));
    check(!train.ly && train.rows === 'RX,RY', 'the train only offers its camera, never the left stick: ' + JSON.stringify(train));
    check(th1 > th0 + 0.1, 'stick up pushes the train throttle forward: ' + JSON.stringify({ th0, th1 }));
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await ctx.close();
  });

  await test('every game has the ☰ menu: it pauses, lists every game and folder, and closes with Esc or Ⓑ', async () => {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 600 } });
    await ctx.addInitScript(fakePad);
    const p = await ctx.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    for (const f of ['space-wars.html', 'floppy-bird.html', 'surfs-up.html', 'hamglider.html', 'web-hero.html', 'sparkle-meadow.html', 'witch-way-out.html', 'flight-school.html', 'lucky-leo.html', 'lily-pad-lunch.html', 'pumpkin-pals.html', 'moto-rush.html', 'moto-mania.html', 'preschool/abc-train.html', '5th-grade/math.html', '2nd-grade/math.html']) {
      await p.goto(url(f)); await p.waitForTimeout(300);
      check(await p.evaluate(() => document.querySelectorAll('.rb-topbar #btnMenu').length === 1), f + ' should have one menu button');
    }
    await p.goto(url('witch-way-out.html')); await p.waitForTimeout(500);
    await p.evaluate(() => { startGame(); countT = 0; introT = 0; });
    await p.click('#btnMenu'); await p.waitForTimeout(150);
    const m = await p.evaluate(() => ({ paused, games: document.querySelectorAll('.rb-menu-game').length, cur: document.querySelector('.rb-menu .cur').textContent,
      pauseHidden: document.querySelector('.rb-pause').style.display === 'none', hrefs: [...document.querySelectorAll('.rb-menu a')].map(a => a.href) }));
    check(m.paused && m.pauseHidden, 'opening the menu should pause the game: ' + JSON.stringify(m));
    check(m.games === 17 && m.cur.includes('Witch Way Out'), 'the menu should list 14 games and 3 folders, marking this one: ' + JSON.stringify(m));
    check(m.hrefs.every(h => fs.existsSync(h.replace('file://', '').split('#')[0])), 'every menu link should go to a real page: ' + m.hrefs.join(' '));
    await p.keyboard.press('KeyJ'); await p.waitForTimeout(100);
    check(await p.evaluate(() => paused && !!document.querySelector('.rb-menu')), 'keys should not reach the game while the menu is open');
    await padTap(p, 'B'); await p.waitForTimeout(100);
    check(await p.evaluate(() => !document.querySelector('.rb-menu') && !paused && !document.querySelector('.rb-pause')), 'Ⓑ should close the menu and carry on (the menu paused it)');
    // over the game's own pause screen the menu goes back to it, and "Back to the game" carries on
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    await p.click('#btnMenu'); await p.waitForTimeout(100);
    await padTap(p, 'B'); await p.waitForTimeout(100);
    check(await p.evaluate(() => paused && document.querySelector('.rb-pause').style.display === ''), 'Ⓑ over the pause screen goes back to it');
    await p.click('#btnMenu'); await p.waitForTimeout(100); await p.click('.rb-menu-back'); await p.waitForTimeout(100);
    check(await p.evaluate(() => !paused && !document.querySelector('.rb-pause')), 'Back to the game carries on');
    // from a lesson in a folder, the links still point at the arcade's pages
    await p.goto(url('5th-grade/math.html')); await p.waitForTimeout(300);
    await p.click('#btnMenu'); await p.waitForTimeout(100);
    const lesson = await p.evaluate(() => [...document.querySelectorAll('.rb-menu a')].map(a => a.href));
    check(lesson.every(h => fs.existsSync(h.replace('file://', ''))) && lesson.some(h => h.endsWith('/hamglider.html')), 'lesson menu links: ' + lesson.join(' '));
    await p.keyboard.press('Escape');
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await ctx.close();
  });

  await test('Lucky Leo: every level can be finished (a search over every place Leo can stand), and the golden key can be reached', async () => {
    const p = await open(browser, 'lucky-leo.html', { viewport: { width: 960, height: 540 } });
    const r = await p.evaluate(() => {
      const out = {};
      for (const id of ORDER) {
        const L = LEVELS[id], W = L.w, H = L.h;
        const tile = (x, y) => (x < 0 || x >= W ? T.STONE : y < 0 || y >= H ? 0 : L.t[y * W + x]);
        const deadly = (x, y) => [T.LAVA, T.WATER, T.SPIKES].includes(tile(x, y));
        const stand = new Set(), springs = new Set(), k = (x, y) => x + ',' + y;
        for (let x = 0; x < W; x++) for (let y = 1; y < H - 1; y++) {
          const below = tile(x, y + 1);
          if (!SOLID.has(tile(x, y)) && !deadly(x, y) && (SOLID.has(below) || below === T.ONEWAY)) stand.add(k(x, y));
          if (L.swim && tile(x, y) === T.WATER) stand.add(k(x, y));   // an underwater level: Leo can swim anywhere in it
        }
        for (const e of L.ents) {
          if (e.k === 'plat' || e.k === 'fall') for (let ox = -(e.dx || 0); ox <= (e.dx || 0) + (e.w || 3) - 1; ox++) for (let oy = -(e.dy || 0); oy <= (e.dy || 0); oy++) stand.add(k(e.x + ox, e.y - 1 + oy));
          if (e.k === 'spring') springs.add(k(e.x, e.y));
          if (e.k === 'whale') springs.add(k(e.x, 11));
          if (e.k === 'sponge') for (let ox = 0; ox < (e.w || 3); ox++) stand.add(k(e.x + ox, 11));   // a bog mat   // a whale's spout shoots Leo up like a spring
          if (e.k === 'boat') for (let ox = e.x; ox <= e.to + e.w - 1; ox++) stand.add(k(ox, e.y - 1));   // the boat carries Leo along
        }
        const pts = [...stand].map(q => q.split(',').map(Number));
        const start = pts.filter(([x]) => x <= 4).sort((a, b) => b[1] - a[1])[0];
        const seen = new Set([k(...start)]), q = [start];
        let far = 0;
        while (q.length) {
          const [x, y] = q.shift();
          far = Math.max(far, x);
          const spring = [-1, 0, 1].some(d => springs.has(k(x + d, y)));
          for (const [x2, y2] of pts) {
            if (seen.has(k(x2, y2))) continue;
            const dx = Math.abs(x2 - x), up = y - y2;
            // a running jump covers about 7 tiles across or 4 up; a spring about 9 up
            const ok = up < 0 ? dx <= 8 + Math.min(4, -up) : spring && up <= 9 ? dx <= 5 : up <= 1 ? dx <= 7 : up <= 4 ? dx <= 5 : false;
            if (ok) { seen.add(k(x2, y2)); q.push([x2, y2]); }
          }
        }
        const keyE = L.ents.find(e => e.k === 'key'), flagE = L.ents.find(e => e.k === 'sflag');
        const near = (q, o) => { const [a, b] = q.split(',').map(Number); return Math.abs(a - o.x) <= 1 && Math.abs(b - o.y) <= 1; };
        out[id] = { far, goal: L.goal || 178, gems: L.ents.filter(e => e.k === 'gem').length, key: keyE ? [...seen].some(q => near(q, keyE)) : null, flag: flagE ? [...seen].some(q => near(q, flagE)) : null };
      }
      return out;
    });
    for (const [id, v] of Object.entries(r)) {
      check(v.far >= v.goal, `${id}: Leo can only get as far as tile ${v.far}, the goal is at ${v.goal}`);
      check(v.gems === 5, `${id} should have 5 rainbow gems, has ${v.gems}`);
    }
    check(r.caves.key === true, 'the golden key in Glimmer Caves should be reachable');
    for (const id of ['canal', 'whale']) check(r[id].flag === true, `the secret exit flag in ${id} should be reachable`);
    await done(p);
  });

  await test('Lucky Leo: walk, stomp, blocks, growing, shells, pits, the goal, the golden key and King Grumbles', async () => {
    const p = await open(browser, 'lucky-leo.html', { viewport: { width: 960, height: 540 } });
    const r = await p.evaluate(() => {
      localStorage.removeItem('ll_save');
      for (const k in save.cleared) delete save.cleared[k]; save.key = false; save.beaten = false;
      const out = {}, run = (n, f) => { for (let i = 0; i < n; i++) { if (f) f(i); step(1 / 60); } };
      paused = true;   // the page's own loop sits still while we step by hand
      startGame(); startLevel('hills');
      const x0 = player.x; keys.right = true; run(60); keys.right = false; out.walk = player.x - x0;
      const gob = ents.find(e => e.k === 'grumblin');
      player.x = gob.x; player.y = gob.y - 30; player.vy = 100; run(30);
      out.stomp = { squished: !!gob.flat || !!gob.gone, score };
      startLevel('hills'); player.x = 14 * 16 + 2; player.y = 12 * 16 - 14; run(5);
      keys.jump = true; pressed.jump = true; run(30); keys.jump = false; run(40);
      out.block = { used: tileAt(14, 8) === T.USED, clover: ents.some(e => e.k === 'clover') };
      const cl = ents.find(e => e.k === 'clover');
      if (cl) { run(60); player.x = cl.x; player.y = cl.y - 2; run(2); }
      out.big = player.form;
      const sn = ents.find(e => e.k === 'snaily');
      player.x = sn.x; player.y = sn.y - 40; player.vy = 100; run(40);
      const sh = ents.find(e => e.k === 'shell');
      out.shell = !!sh;
      if (sh) { player.x = sh.x - 14; player.y = sh.y + sh.h - player.h; player.vy = 0; keys.right = true; run(10); keys.right = false; out.kicked = Math.abs(sh.vx) > 100; }
      startLevel('hills'); const lv = lives; player.x = 43 * 16; player.y = 150; run(60 * 4);
      out.pit = { lost: lv - lives, state };
      startLevel('hills'); player.x = 199 * 16; player.y = 11 * 16 - 14; keys.right = true; run(30); keys.right = false; run(60 * 5);
      out.goal = { state, cleared: !!save.cleared.hills, woodsOpen: nodeOpen(node('woods')), cavesOpen: nodeOpen(node('caves')) };
      startLevel('caves'); const k = ents.find(e => e.k === 'key'); player.x = k.x; player.y = k.y; run(2);
      out.key = gotKey; player.x = 192 * 16 + 8; player.y = 11 * 16 - 14; keys.right = true; run(30); keys.right = false; run(60 * 5);
      out.bonusOpen = nodeOpen(node('bonus'));
      startLevel('castle'); const b = ents.find(e => e.k === 'boss'); player.x = 170 * 16; player.y = 11 * 16 - 14; run(30);
      for (let h = 0, n = b.hp; h < n; h++) { player.inv = 9; run(100); player.x = b.x + 8; player.y = b.y - 30; player.vy = 150; run(8); }
      out.boss = b.hp;
      run(60 * 3);
      const pot = ents.find(e => e.k === 'pot'); out.pot = !!pot;
      if (pot) { player.x = pot.x; player.y = pot.y; run(5); }
      out.ending = { state, beaten: save.beaten3, best: +localStorage.getItem('ll_best') };
      paused = false;
      return out;
    });
    check(r.walk > 50, 'Leo should walk: ' + JSON.stringify(r));
    check(r.stomp.squished && r.stomp.score >= 100, 'stomping a goblin: ' + JSON.stringify(r.stomp));
    check(r.block.used && r.block.clover && r.big === 1, 'bumping the clover block and growing: ' + JSON.stringify(r));
    check(r.shell && r.kicked, 'stomp a snail, kick its shell: ' + JSON.stringify(r));
    check(r.pit.lost === 1 && r.pit.state === 'level', 'a pit costs a life and restarts: ' + JSON.stringify(r.pit));
    check(r.goal.state === 'map' && r.goal.cleared && r.goal.woodsOpen && !r.goal.cavesOpen, 'the goal clears the level and opens the next: ' + JSON.stringify(r.goal));
    check(r.key && r.bonusOpen, 'the golden key opens Rainbow Road: ' + JSON.stringify(r));
    check(r.boss === 0 && r.pot && r.ending.state === 'ending' && r.ending.beaten && r.ending.best > 0, 'five stomps beat King Grumbles at Gillette Castle, then the pot of gold: ' + JSON.stringify(r));
    await done(p, 'lucky-leo.png');
  });

  await test('Lucky Leo moves: high jump (crouch + jump), spin jump, corner and ledge help, ground pound, and the boomerang hat (knocks out enemies, comes back, bounce on it)', async () => {
    const p = await open(browser, 'lucky-leo.html', { viewport: { width: 960, height: 540 } });
    const r = await p.evaluate(() => {
      const out = {}, run = (n, f) => { for (let i = 0; i < n; i++) { if (f) f(i); step(1 / 60); } };
      paused = true; startGame(); lives = 9;
      const jumpH = hi => { startLevel('hills'); player.x = 6 * 16; run(10); ents = ents.filter(e => !isEnemy(e)); const y0 = player.y; let top = y0; keys.down = hi; run(5); pressed.jump = true; keys.jump = true; run(70, () => { top = Math.min(top, player.y); }); keys.jump = false; keys.down = false; run(60); return y0 - top; };
      out.jump = jumpH(false); out.high = jumpH(true);
      // the spin: jump, then press jump again near the top: a little higher, and only once a jump
      const spinH = twice => { startLevel('hills'); player.x = 6 * 16; run(10); ents = ents.filter(e => !isEnemy(e)); const y0 = player.y; let top = y0, spins = 0, tw = false;
        pressed.jump = true; keys.jump = true; run(90, i => { top = Math.min(top, player.y); if ((i === 22 || (twice && i === 40)) ) { pressed.jump = true; } if (player.twirl > 0 && !tw) spins++; tw = player.twirl > 0; }); keys.jump = false; run(60); return { h: y0 - top, spins, landed: player.ground && !player.spun }; };
      out.spin = spinH(false); out.spin2 = spinH(true);
      // holding run, a running jump, then jump again right away: still a spin
      startLevel('hills'); ents = ents.filter(e => !isEnemy(e)); player.x = 4 * 16; run(10); keys.run = true; keys.right = true; run(40);
      keys.jump = true; pressed.jump = true; run(1); keys.jump = false; run(4); keys.jump = true; pressed.jump = true; run(1); out.runSpin = player.spun && player.twirl > 0; keys.jump = false; keys.run = false; keys.right = false; run(60);
      // corner forgiveness: a jump that only clips the edge of a block slides round it
      startLevel('hills'); ents = ents.filter(e => !isEnemy(e)); player.x = 12 * 16 - player.w + 3; run(10);
      let top = player.y; pressed.jump = true; keys.jump = true; run(50, () => { top = Math.min(top, player.y); }); keys.jump = false; run(40);
      out.corner = top < 8 * 16 - 4;
      // ledge help: falling just short of the top of a step, walking into it steps up
      startLevel('hills'); ents = ents.filter(e => !isEnemy(e)); player.x = 60 * 16 - player.w - 1; player.y = 11 * 16 - player.h + 3; player.vy = 20; player.vx = 90; player.ground = false;
      keys.right = true; run(3); keys.right = false; out.ledge = player.y + player.h <= 11 * 16 + 0.5;
      startLevel('hills'); const gob = ents.find(e => e.k === 'grumblin'); player.x = gob.x; player.y = gob.y - 50; player.vy = 0; run(2); pressed.down = true; run(40);
      out.poundGob = !!gob.flip;
      // a spring: a normal bounce, then a ground pound onto it for a super bounce
      const springTop = how => { startLevel('hills'); ents = ents.filter(e => !isEnemy(e)); const sp = mk('spring', 20 * 16, 11 * 16, { w: 16, h: 16, squash: 0 }); ents.push(sp);
        player.x = 20 * 16 + 2; player.y = 8 * 16; player.vy = 0; player.ground = false; run(2); if (how === 'pound') { pressed.down = true; downFrom = 'KeyS'; } let top = 999;
        run(150, () => { top = Math.min(top, player.y); }); return top; };
      out.springNormal = springTop('drop'); out.springPound = springTop('pound');
      startLevel('hills'); player.x = 12 * 16 + 2; player.y = 5 * 16; player.vy = 0; run(2); pressed.down = true; run(50);
      out.poundBlock = tileAt(12, 8) === T.USED;
      startLevel('hills'); setForm(3); const g2 = ents.find(e => e.k === 'grumblin'); player.x = g2.x - 60; player.face = 1; run(2); pressed.hat = true; run(1);
      out.thrown = player.hatless && ents.some(e => e.k === 'cap');
      run(30); out.hatHit = !!g2.flip;
      run(120); out.hatBack = !player.hatless && !ents.some(e => e.k === 'cap');
      startLevel('hills'); setForm(3); player.x = 8 * 16; run(10); pressed.hat = true; run(1); keys.jump = true; pressed.jump = true; run(18); keys.jump = false;
      const cap = ents.find(e => e.k === 'cap');
      if (cap) { cap.st = 'hover'; cap.hoverT = 0; player.x = cap.x; player.y = cap.y - player.h - 2; player.vy = 80; run(3); out.capBounce = !!cap.bounced && player.vy < -200; }
      paused = false; return out;
    });
    check(r.high > r.jump * 1.6, 'the high jump should go much higher: ' + JSON.stringify(r));
    check(r.spin.h > r.jump + 10 && r.spin.h < r.high && r.spin.spins === 1 && r.spin.landed, 'a spin at the top should go a little higher: ' + JSON.stringify(r));
    check(r.corner && r.ledge, 'corner and ledge forgiveness (like Mario): ' + JSON.stringify(r));
    check(r.runSpin, 'holding run, jump then jump again spins: ' + JSON.stringify(r));
    check(r.spin2.spins === 1 && Math.abs(r.spin2.h - r.spin.h) < 3, 'only one spin a jump: ' + JSON.stringify(r));
    check(r.springPound < r.springNormal - 150, 'a ground pound onto a spring should launch Leo super high: ' + JSON.stringify({ normal: r.springNormal, pound: r.springPound }));
    check(r.poundGob && r.poundBlock, 'a ground pound should flatten a goblin and bump the clover block below: ' + JSON.stringify(r));
    check(r.thrown && r.hatHit && r.hatBack && r.capBounce, 'the hat should fly, knock out a goblin, come back, and be bounced on: ' + JSON.stringify(r));
    await done(p);
  });

  await test('Lucky Leo: carry a shell, moves above the screen, recall the saved power-up, hollow-tree rooms, hat up and low, no surprise ground pound', async () => {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
    await ctx.addInitScript(fakePad);
    const p = await ctx.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(url('lucky-leo.html')); await p.waitForTimeout(600);
    const r = await p.evaluate(() => {
      const out = {}, run = (n, f) => { for (let i = 0; i < n; i++) { if (f) f(i); step(1 / 60); } };
      paused = true; startGame(); lives = 9;
      // hold run and walk into a still shell: Leo picks it up; let go and it flies
      startLevel('hills'); const sn = ents.find(e => e.k === 'snaily'); ents = ents.filter(e => e === sn || !isEnemy(e));
      sn.k = 'shell'; sn.vx = 0; sn.h = 14; player.x = sn.x - 40; player.y = sn.y; run(5);
      keys.run = true; keys.right = true; run(40); keys.right = false; out.carried = player.carry === sn; run(5);
      keys.run = false; run(2); out.thrown = !player.carry && Math.abs(sn.vx) > 100;
      // up above the top of the screen: the ground pound still works
      player.y = -60; player.vy = 0; player.ground = false; run(1); pressed.down = true; run(2); out.highPound = player.pound === 'spin'; run(120);
      // with the lucky horseshoe's power, a crush-stone breaks to rubble when it hits Leo
      startLevel('caves'); ents = ents.filter(e => !isEnemy(e)); const cr = ents.find(e => e.k === 'crusher'); player.star = 5; player.x = cr.x + 4; player.y = 11 * 16 + 16 - player.h; run(90);
      out.smashed = !ents.includes(cr) && phase === 'play'; player.star = 0;
      // Glimmer Caves: from the ledge under the last hole in the ceiling, a high jump up onto the roof, then along it past the gate
      // to the secret exit, which opens a golden path to Gillette Castle
      delete save.secrets.caves; delete save.cleared.castle; delete save.cleared.bog;
      startLevel('caves'); ents = ents.filter(e => !isEnemy(e) && e.k !== 'crusher'); player.x = 153 * 16; player.y = 5 * 16 - player.h; player.vy = 0; run(10);
      keys.down = true; run(2); pressed.jump = true; keys.jump = true; run(1); keys.down = false; run(4); keys.right = true; run(60); keys.jump = false;
      out.upTop = player.y + player.h < 4 && player.ground;
      keys.run = true; let gateClear = false; run(700, () => { if (phase === 'clear' && !lvl.secretExit) gateClear = true; }); keys.right = false; keys.run = false;
      out.secret = !gateClear && lvl.secretExit === true; run(300);
      out.secretPath = !!save.secrets.caves && state === 'map' && nodeOpen(node('castle'));
      // the box at the top: a saved clover drops when asked for
      startLevel('hills'); run(5);
      reserve = 'clover'; pressed.item = true; run(1); out.recalled = reserve === null && ents.some(e => e.k === 'clover' && e.drop);
      // down a hollow tree into its bonus room, and back out of a log further on
      startLevel('hills'); ents = ents.filter(e => !isEnemy(e)); const w = ents.find(e => e.k === 'warp');
      player.x = w.x + 10; player.y = w.y - 30; run(40); keys.down = true; downFrom = 'KeyS'; run(60); keys.down = false; run(30);
      out.room = lvl.id;
      const ex = ents.find(e => e.k === 'exit'); player.x = ex.x + 10; player.y = ex.y - 30; run(40); keys.down = true; run(60); keys.down = false; run(60);
      out.back = lvl.id === 'hills' && Math.abs(player.x / 16 - w.out[0]) < 2 && player.ground && phase === 'play';
      // the hat: thrown up while looking up, and low along the ground while crouching
      startLevel('hills'); setForm(3); ents = ents.filter(e => !isEnemy(e)); player.x = 6 * 16; run(20);
      keys.up = true; pressed.hat = true; run(1); const capU = ents.find(e => e.k === 'cap'); out.capUp = !!capU && capU.vy < -200; keys.up = false; run(120);
      setForm(3); run(5); keys.down = true; downFrom = 'KeyS'; run(3); pressed.hat = true; run(1); const capL = ents.find(e => e.k === 'cap');
      out.capLow = !!capL && capL.low && capL.y > player.y + player.h - 12; keys.down = false; run(120);
      // aiming: the arrows held together throw it on a slant, and the stick throws it at its own angle (down too, from the air)
      const throwCap = (setup, undo) => { ents = ents.filter(e => e.k !== 'cap'); player.hatless = false; setForm(3); setup(); pressed.hat = true; run(1); const c = ents.find(e => e.k === 'cap'); undo(); const v = c ? { vx: Math.round(c.vx), vy: Math.round(c.vy || 0) } : null; run(150); return v; };
      out.slantKeys = throwCap(() => { keys.up = true; keys.left = true; }, () => { keys.up = false; keys.left = false; });
      const realPads = navigator.getGamepads, pad = (x, y) => () => { navigator.getGamepads = () => [{ connected: true, axes: [x, y, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }]; };
      out.stickUp = throwCap(pad(0.5, -0.87), () => { navigator.getGamepads = realPads; });   // up and to the right, steeply
      player.y -= 60; player.vy = -200; player.ground = false;
      out.stickDown = throwCap(pad(-0.7, 0.7), () => { navigator.getGamepads = realPads; });   // down and to the left, from the air
      paused = false; return out;
    });
    check(r.carried && r.thrown, 'pick up a shell by holding run, throw it by letting go: ' + JSON.stringify(r));
    check(r.highPound, 'the ground pound should work above the top of the screen: ' + JSON.stringify(r));
    check(r.recalled, 'the saved power-up should drop from the box: ' + JSON.stringify(r));
    check(r.upTop && r.secret && r.secretPath, 'Glimmer Caves: a high jump through the hole in the ceiling should reach the roof, and the secret exit past the gate should open the path to Gillette Castle: ' + JSON.stringify(r));
    check(r.smashed, 'with the lucky horseshoe Leo should smash the crush-stone: ' + JSON.stringify(r));
    check(r.room === 'hillsTree' && r.back, 'down the hollow tree into the room and back out further on: ' + JSON.stringify(r));
    check(r.capUp && r.capLow, 'the hat should go up when looking up and low when crouching: ' + JSON.stringify(r));
    check(r.slantKeys && r.slantKeys.vx < -150 && r.slantKeys.vy < -150 && r.stickUp && r.stickUp.vx > 80 && r.stickUp.vy < -200 && r.stickDown && r.stickDown.vx < -100 && r.stickDown.vy > 100, 'the hat can be aimed: on a slant with the arrows, and at the stick\'s own angle, down too from the air: ' + JSON.stringify({ slantKeys: r.slantKeys, stickUp: r.stickUp, stickDown: r.stickDown }));
    // running right with the stick a little down, holding Ⓧ and pressing Ⓐ: a jump, never a ground pound (or a crouch)
    await p.evaluate(() => { startLevel('hills'); ents = ents.filter(e => !isEnemy(e)); player.x = 6 * 16; });
    await p.waitForTimeout(200);
    await padStick(p, 0.85, 0.6); await padHold(p, 'X', true); await p.waitForTimeout(300);
    await padHold(p, 'A', true); await p.waitForTimeout(400);
    const g = await p.evaluate(() => ({ pound: player.pound, crouch: player.crouch, air: !player.ground || player.vy < 0, x: player.x }));
    await padHold(p, 'A', false); await padHold(p, 'X', false); await padStick(p, 0, 0);
    check(!g.pound && !g.crouch, 'running down-right with the stick should not ground pound or crouch: ' + JSON.stringify(g));
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await ctx.close();
  });

  await test('Lucky Leo: the ☰ menu and pause screen go back to the map, start the level again, and back to the title', async () => {
    const p = await open(browser, 'lucky-leo.html', { viewport: { width: 960, height: 540 } });
    await p.evaluate(() => { startGame(); startLevel('woods'); });
    await p.click('#btnMenu'); await p.waitForTimeout(150);
    const labels = await p.$$eval('.rb-menu-this button', bs => bs.map(b => b.textContent));
    await p.click('.rb-menu-this [data-g="1"]'); await p.waitForTimeout(150);
    const again = await p.evaluate(() => ({ state, id: lvl.id, menu: !!document.querySelector('.rb-menu') }));
    await p.evaluate(() => pause()); await p.waitForTimeout(100);
    await p.click('.rb-pause .rb-extra'); await p.waitForTimeout(150);
    const map = await p.evaluate(() => ({ state, paused, pause: !!document.querySelector('.rb-pause') }));
    await p.click('#btnMenu'); await p.waitForTimeout(150); await p.click('.rb-menu-this [data-g="0"]'); await p.waitForTimeout(150);
    const title = await p.evaluate(() => ({ state, shown: !document.getElementById('title').classList.contains('hidden') }));
    check(labels.some(l => /map/.test(l)) && again.state === 'level' && again.id === 'woods' && !again.menu, 'menu: start the level again: ' + JSON.stringify({ labels, again }));
    check(map.state === 'map' && !map.paused && !map.pause, 'pause screen: back to the map: ' + JSON.stringify(map));
    check(title.state === 'title' && title.shown, 'menu on the map: back to the title: ' + JSON.stringify(title));
    await done(p);
  });

  await test('Lucky Leo World 6 (the Gulf Coast): crawfish, dragonflies and gator backs in the swamp, the pirogue and the steamboat set off with Leo aboard, streetcars and Mardi Gras floats carry him, and every level draws', async () => {
    const p = await open(browser, 'lucky-leo.html', { viewport: { width: 960, height: 540 } });
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    const r = await p.evaluate(() => {
      const out = {}, run = (n, f) => { for (let i = 0; i < n; i++) { if (f) f(i); step(1 / 60); } };
      paused = true; startGame(); lives = 9;
      out.drawn = WORLDS[5].map(id => { startLevel(id); run(20); return lvl.id === id && phase === 'play' && !!SCENERY[lvl.theme] && !!SKIES[lvl.theme] && !!THEMES[lvl.theme] && !!SONGS[lvl.music]; });
      // the pirogue in Honey Island Swamp and the steamboat on the Mississippi only set off once Leo steps aboard
      const ride = id => { startLevel(id); ents = ents.filter(e => !isEnemy(e)); const b = ents.find(e => e.k === 'boat'); run(30); const before = b.x;
        player.x = b.x + 10; player.y = b.y - player.h - 2; player.vy = 0; run(120); return { still: before === b.x0, moved: b.x > b.x0 + 40, aboard: player.ride === b }; };
      out.pirogue = ride('bayou'); out.steamboat = ride('river');
      // a streetcar carries Leo along in the French Quarter
      startLevel('quarter'); ents = ents.filter(e => !isEnemy(e)); const car = ents.find(e => e.k === 'plat' && e.look === 'streetcar');
      player.x = car.x + 8; player.y = car.y - player.h - 1; player.vy = 0; const x0 = player.x; run(90); out.streetcar = player.ride === car && Math.abs(player.x - x0) > 4;
      out.looks = ['streetcar', 'float'].every(k => LEVELS.quarter.ents.some(e => e.look === k));
      // crawfish and dragonflies are the Gulf's own critters; a stomp still squashes a crawfish
      startLevel('mobile'); ents = ents.filter(e => !isEnemy(e) || e.k === 'crab'); const cf = ents.find(e => e.k === 'crab');
      player.x = cf.x; player.y = cf.y - 30; player.vy = 150; run(10); out.crawfish = { gulf: GULF.has(lvl.theme), stomped: !ents.includes(cf) || cf.dead || cf.squish > 0 };
      out.swamp = SWAMP.has('bayou') && SWAMP.has('basin') && LEVELS.bayou.ents.some(e => e.k === 'sponge') && LEVELS.basin.dark;
      out.map = WORLDS[5].every(id => node(id).map === 'fl' && node(id).y > 40);
      paused = false; return out;
    });
    check(r.drawn.every(Boolean), 'every Gulf Coast level starts and has its own scenery, sky, ground and music: ' + JSON.stringify(r.drawn));
    check(r.pirogue.still && r.pirogue.moved && r.steamboat.still && r.steamboat.moved, 'the pirogue and the steamboat wait for Leo, then carry him off: ' + JSON.stringify(r));
    check(r.streetcar && r.looks, 'the streetcar carries Leo, and the Quarter has streetcars and Mardi Gras floats: ' + JSON.stringify(r));
    check(r.crawfish.gulf && r.crawfish.stomped, 'a crawfish can be stomped: ' + JSON.stringify(r.crawfish));
    check(r.swamp, 'the swamps have dragonflies and gator backs, and the Atchafalaya is dark: ' + JSON.stringify(r));
    check(r.map, 'the Gulf Coast levels are on the map of Florida, clear of the names at the top: ' + JSON.stringify(r));
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await done(p, 'lucky-leo-gulf.png');
  });

  await test('Lucky Leo music: every level has a tune, and the orchestra (whimsical, epic, tender and swing) plays out loud and clear without clipping', async () => {
    const p = await open(browser, 'lucky-leo.html', { viewport: { width: 960, height: 540 } });
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    const r = await p.evaluate(async () => {
      const missing = Object.values(LEVELS).filter(L => L.music && !SONGS[L.music]).map(L => L.id);
      const realAudio = RB.audio, out = { missing, songs: {} };
      for (const id of ['map', 'boss', 'caves', 'jazz']) {
        const off = new OfflineAudioContext(2, 44100 * 6, 44100); RB.audio = () => off;
        music.stop(); music.play(id); music.schedule(5.5); music.stop();
        const buf = await off.startRendering(), d = buf.getChannelData(0);
        let peak = 0, sum = 0; for (let i = 0; i < d.length; i++) { peak = Math.max(peak, Math.abs(d[i])); sum += d[i] * d[i]; }
        out.songs[id] = { style: music.style(id), peak: +peak.toFixed(3), rms: +Math.sqrt(sum / d.length).toFixed(4) };
      }
      RB.audio = realAudio; return out;
    });
    check(r.missing.length === 0, 'levels with no tune: ' + r.missing.join(', '));
    const styles = Object.values(r.songs).map(x => x.style);
    check(['whimsy', 'epic', 'tender', 'swing'].every(st => styles.includes(st)), 'all four styles of score should be used: ' + JSON.stringify(r.songs));
    check(Object.values(r.songs).every(x => x.rms > 0.004 && x.peak < 0.9), 'each style should be audible and never clip: ' + JSON.stringify(r.songs));
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await done(p);
  });

  await test('Lucky Leo starts where you left off: the same spot on the map, with the same power-up, after the page is closed and opened again', async () => {
    const p = await open(browser, 'lucky-leo.html', { viewport: { width: 960, height: 540 } });
    const fresh = await p.evaluate(() => { localStorage.removeItem('ll_save'); for (const k in save.cleared) delete save.cleared[k]; save.at = null; save.keep = null; startGame(); return mapLeo.at; });
    await p.evaluate(() => { for (const id of ['canal', 'cranberry', 'whale', 'dunes', 'ptown', 'shore']) save.cleared[id] = true; keep = { form: 2, mount: false, laser: false }; goMap('night'); });
    await p.reload(); await p.waitForTimeout(500);
    const back = await p.evaluate(() => { startGame(); return { at: mapLeo.at, form: keep.form, state }; });
    // a spot that isn't open (an old save, say) falls back to the start
    await p.evaluate(() => { save.at = 'sabine'; persist(); });
    await p.reload(); await p.waitForTimeout(500);
    const locked = await p.evaluate(() => { startGame(); return mapLeo.at; });
    check(fresh === 'canal', 'a brand-new game starts at the Bourne Bridge: ' + fresh);
    check(back.at === 'night' && back.form === 2 && back.state === 'map', 'after closing and opening the page, Leo is back at Moonlit Meadow with his rainbow flower: ' + JSON.stringify(back));
    check(locked === 'canal', 'a saved spot that is not open falls back to the start: ' + locked);
    await done(p);
  });

  await test('Lucky Leo worlds in order: Cape Cod, then by boat up to Maine, over the White and Green Mountains to Connecticut, along Long Island Sound to New York, a flight to Florida, on along the Gulf Coast, and the Sabine River at the Texas line is the real ending', async () => {
    const p = await open(browser, 'lucky-leo.html', { viewport: { width: 960, height: 540 } });
    const r = await p.evaluate(() => {
      localStorage.removeItem('ll_save'); for (const k in save.cleared) delete save.cleared[k];
      startGame(); const start = { at: mapLeo.at, canal: nodeOpen(node('canal')), shore: nodeOpen(node('shore')), hills: nodeOpen(node('hills')), tag: levelTag('canal') };
      const end = id => { const prev = WORLDS[worldOf(id)].slice(0, -1); prev.forEach(x => { save.cleared[x] = true; }); startLevel(id); const b = ents.find(e => e.k === 'boss');
        const hp = b.hp, kind = b.kind; winGame();
        const out = { hp, kind, title: document.querySelector('#ending h1').textContent, btn: document.getElementById('btnMapAgain').textContent };
        document.getElementById('btnMapAgain').click(); out.state = state; out.at = mapLeo.at; return out; };
      const w1 = end('ptown'); w1.shore = nodeOpen(node('shore')); w1.night = nodeOpen(node('night')); w1.boat = SEA_PATHS.has('ptown|shore'); w1.beaten = save.beaten;
      const w2 = end('fort'); w2.snow = nodeOpen(node('snow')); w2.sky = nodeOpen(node('sky')); w2.beaten2 = save.beaten2;
      const w3 = end('castle'); w3.orchard = nodeOpen(node('orchard')); w3.niagara = nodeOpen(node('niagara')); w3.beaten3 = save.beaten3; w3.walk = !FLIGHT_PATHS.has('castle|orchard');
      const w4 = end('liberty'); w4.miami = nodeOpen(node('miami')); w4.reef = nodeOpen(node('reef')); w4.flight = FLIGHT_PATHS.has('liberty|miami'); w4.map = node('miami').map; w4.beaten4 = save.beaten4;
      const w5 = end('canaveral'); w5.beaten5 = save.beaten5; w5.space = nodeOpen(node('space')); w5.levels = WORLDS[4].length; w5.mobile = nodeOpen(node('mobile')); w5.bayou = nodeOpen(node('bayou')); w5.flight = FLIGHT_PATHS.has('canaveral|mobile');
      const w6 = end('sabine'); w6.beaten6 = save.beaten6; w6.levels = WORLDS[5].length; w6.names = WORLDS[5].map(id => node(id).region); w6.texas = /Texas/.test(document.querySelector('#ending .sub').textContent);
      const regions = Object.fromEntries(['shore', 'night', 'fort', 'snow', 'sky', 'bog', 'caves', 'woods', 'hills', 'castle', 'orchard'].map(id => [id, node(id).region]));
      return { start, w1, w2, w3, w4, w5, w6, regions, castillo: LEVELS.castillo.ents.find(e => e.k === 'boss').kind, slippery: !!LEVELS.snow.slippery,
        allListed: WORLDS.flat().every(id => ORDER.includes(id) && node(id)), names: WORLD_NAMES.slice(0, 3) };
    });
    check(r.start.at === 'canal' && r.start.canal && !r.start.shore && !r.start.hills && r.start.tag === '1-1', 'Leo starts on Cape Cod at the Bourne Bridge (1-1): ' + JSON.stringify(r.start));
    check(r.w1.hp === 3 && r.w1.kind === 'crab' && /WORLD 1/.test(r.w1.title) && /World 2/.test(r.w1.btn) && r.w1.shore && !r.w1.night && r.w1.boat && r.w1.beaten, 'Provincetown Pier (Captain Pinch, 3 hits) ends World 1 and a boat goes up to Maine: ' + JSON.stringify(r.w1));
    check(r.w2.hp === 4 && r.w2.kind === 'yeti' && /WORLD 2/.test(r.w2.title) && /World 3/.test(r.w2.btn) && r.w2.snow && !r.w2.sky && r.w2.beaten2 && r.slippery, 'the Frost Fortress in Maine (the Frost Yeti, 4 hits) ends World 2 and opens the White Mountains: ' + JSON.stringify(r.w2));
    check(r.w3.hp === 5 && r.w3.kind === 'grumbles' && /WORLD 3/.test(r.w3.title) && /World 4/.test(r.w3.btn) && r.w3.orchard && !r.w3.niagara && r.w3.walk && r.w3.beaten3, 'Gillette Castle in Connecticut (King Grumbles, 5 hits) ends World 3 and the path runs on into New York: ' + JSON.stringify(r.w3));
    check(r.w4.hp === 6 && /WORLD 4/.test(r.w4.title) && /World 5/.test(r.w4.btn) && r.w4.miami && !r.w4.reef && r.w4.flight && r.w4.map === 'fl' && r.w4.beaten4, 'the Statue of Liberty (6 hits) ends World 4, and a flight opens Miami Beach on the map of Florida: ' + JSON.stringify(r.w4));
    check(r.w5.hp === 7 && /WORLD 5/.test(r.w5.title) && /World 6/.test(r.w5.btn) && r.w5.beaten5 && r.w5.space && r.w5.levels === 10 && r.castillo === 'gator' && r.w5.mobile && !r.w5.bayou && r.w5.flight, 'Cape Canaveral ends World 5, opens the bonus trip to space, and a flight west opens Mobile Bay: ' + JSON.stringify(r.w5));
    check(r.w6.hp === 8 && /GOLD/.test(r.w6.title) && r.w6.beaten6 && r.w6.levels === 6 && r.w6.texas && r.w6.names[0] === 'Alabama' && r.w6.names.includes('New Orleans'), 'the Sabine River Bridge (King Grumbles, 8 hits) is the real ending, with Texas coming soon: ' + JSON.stringify(r.w6));
    check(r.regions.shore === 'Maine' && r.regions.night === 'Maine' && r.regions.fort === 'Maine' && r.regions.snow === 'New Hampshire' && r.regions.sky === 'Vermont' && r.regions.caves === 'Vermont' && r.regions.hills === 'Connecticut' && r.regions.castle === 'Connecticut', 'the levels sit in Maine, New Hampshire, Vermont and Connecticut: ' + JSON.stringify(r.regions));
    check(r.allListed && /Cape Cod/.test(r.names[0]) && /Maine/.test(r.names[1]), 'every level is on the map and in the list: ' + JSON.stringify(r.names));
    await done(p, 'lucky-leo-world2.png');
  });

  await test('Lucky Leo: carry a spring to a new spot; Shamrock the unicorn comes down a rainbow, can be ridden (higher jump, float, stomp spiky, open-mouth gulp, eye laser with the prism), comes along to the next level, and a hit only knocks Leo off', async () => {
    const p = await open(browser, 'lucky-leo.html', { viewport: { width: 960, height: 540 } });
    const r = await p.evaluate(() => {
      const out = {}, run = (n, f) => { for (let i = 0; i < n; i++) { if (f) f(i); step(1 / 60); } };
      paused = true; startGame(); lives = 9;
      // a spring: hold run and walk into it, carry it 3 tiles, put it down, and it still bounces
      startLevel('hills'); const sp = ents.find(e => e.k === 'spring'); ents = ents.filter(e => !isEnemy(e));
      player.x = sp.x - 30; player.y = sp.y + sp.h - player.h; run(5);
      const x0 = sp.x; keys.run = true; keys.right = true; run(28); keys.right = false; out.carried = player.carry === sp; keys.run = false; run(30);
      out.moved = sp.x - x0; out.onGround = Math.abs(sp.y + sp.h - 12 * 16) < 1;
      player.x = sp.x; player.y = sp.y - 40; player.vy = 100; player.ground = false; run(10); out.bounce = player.vy < -200;
      // the special block calls a cloud that shines a rainbow down, and Shamrock appears; walk into him to ride
      startLevel('hills'); ents = ents.filter(e => !isEnemy(e)); player.x = 149 * 16 + 2; run(10); keys.jump = true; pressed.jump = true; run(25); keys.jump = false;
      out.cloud = ents.some(e => e.k === 'summon'); run(100);
      const u = ents.find(e => e.k === 'unicorn'); out.hatched = !!u && out.cloud;
      player.x = u.x - 20; player.y = u.y + u.h - player.h; keys.right = true; run(30); keys.right = false; run(20);
      out.riding = !!player.mount;
      player.x = 154 * 16; run(20);   // out from under the blocks
      // a higher jump than on foot
      const jumpH = () => { const y0 = player.y; let top = y0; pressed.jump = true; keys.jump = true; run(16, () => { top = Math.min(top, player.y); }); keys.jump = false; run(90, () => { top = Math.min(top, player.y); }); return y0 - top; };
      out.rideJump = jumpH();
      // floating: holding jump keeps Shamrock in the air longer
      const airTime = hold => { pressed.jump = true; keys.jump = true; let n = 0; run(200, i => { if (!hold && i > 16) keys.jump = false; if (!player.ground) n++; }); keys.jump = false; run(20); return n; };
      out.floatAir = airTime(true); out.plainAir = airTime(false);
      // stomp a spiky hedgehog safely
      const th = mk('thorny', player.x, player.y - 60 + player.h, { dir: -1, w: 14, h: 13 }); th.y = player.y + player.h - 13; ents.push(th);
      player.y -= 50; player.vy = 150; player.ground = false; run(20); out.spiky = !!th.flip && !!player.mount;
      // no prism: run makes Shamrock open wide and gulp the goblin in front of him; three gulps, then a poop
      run(30); let eaten = 0;
      for (let i = 0; i < 3; i++) { const g2 = mk('grumblin', player.x + player.w / 2 + player.face * 24 - 7, player.y + player.h - 14, { dir: 0, w: 14, h: 14 }); ents.push(g2); pressed.run = true; run(1); out.mouth = out.mouth || player.mount.mouth > 0; run(30); if (g2.gone && player.mount) eaten++; }
      out.noLaserYet = !player.mount.beam;
      run(100); const poo = ents.find(e => e.k === 'poop'); out.ate = eaten === 3 && !!poo && !!player.mount;
      if (poo) { player.x = poo.x - 30; player.face = 1; keys.right = true; run(40); keys.right = false; out.smoosh = poo.smooshed === true && ents.some(e => e.k === 'smudge'); }
      // the rainbow prism (from a power block while riding) gives the eye laser: it reaches a goblin well ahead and turns it into a coin
      run(30); const prism = mk('prism', player.x, player.y, { w: 14, h: 14, rise: 0 }); ents.push(prism); touchPlayerAs(prism); out.prism = player.laser === true;
      const gob = mk('grumblin', player.x + player.face * 60, player.y + player.h - 14, { dir: -1, w: 14, h: 14 }); ents.push(gob);
      const c0 = coins; pressed.run = true; run(1); out.zap = gob.gone && coins > c0 && !!player.mount.beam;
      // the laser doesn't reach right across the screen
      const farGob = mk('grumblin', player.x + player.face * 120, player.y + player.h - 14, { dir: 0, w: 14, h: 14 }); ents.push(farGob); run(30); pressed.run = true; run(1); out.shortLaser = !farGob.gone; farGob.gone = true;
      // finishing the level: Shamrock and the power come along to the next one
      setForm(1); reachGoal(); startLevel('woods'); out.kept = !!player.mount && player.form === 1 && player.h === RIDE_H;
      // a hit: Leo falls off unhurt, Shamrock runs off; ↓ + jump hops off on purpose
      const form = player.form; hurtPlayer(); out.fell = !player.mount && player.form === form && phase === 'play' && ents.some(e => e.k === 'unicorn' && e.st === 'flee');
      paused = false; return out;
    });
    check(r.carried && r.moved > 25 && r.onGround && r.bounce, 'carry a spring and it still works where you put it: ' + JSON.stringify(r));
    check(r.hatched && r.riding, 'the egg should hatch Shamrock and Leo should ride him: ' + JSON.stringify(r));
    check(r.rideJump > 66 && r.floatAir > r.plainAir + 15, 'riding: a higher jump and a float: ' + JSON.stringify(r));
    check(r.spiky && r.mouth && r.noLaserYet && r.prism && r.zap, 'riding: stomp spiky hedgehogs, chomp with no prism, and the prism gives the eye laser: ' + JSON.stringify(r));
    check(r.kept, 'Shamrock and power-ups should come along to the next level: ' + JSON.stringify(r));
    check(r.ate && r.smoosh && r.shortLaser, 'Shamrock eats three enemies and poops, the poop smooshes, and the laser is short: ' + JSON.stringify(r));
    check(r.fell, 'a hit should only knock Leo off: ' + JSON.stringify(r));
    await done(p);
  });

  await test('Lucky Leo: the hat throw is the magic hat power-up, wall kicks, and King Grumbles is hurt by thrown shells, sparks, the hat and the laser (not springs)', async () => {
    const p = await open(browser, 'lucky-leo.html', { viewport: { width: 960, height: 540 } });
    const r = await p.evaluate(() => {
      const out = {}, run = (n, f) => { for (let i = 0; i < n; i++) { if (f) f(i); step(1 / 60); } };
      paused = true; startGame(); keep = { form: 0, mount: false }; startLevel('hills'); ents = ents.filter(e => !isEnemy(e)); run(20);
      // no magic hat: no throw
      pressed.hat = true; run(1); out.noThrow = !ents.some(e => e.k === 'cap') && !player.hatless;
      // the magic hat block (C) next to the clover block in Clover Hills
      player.x = 16 * 16 + 2; player.vx = 0; run(10); keys.jump = true; pressed.jump = true; run(20); keys.jump = false; run(90);
      const mh = ents.find(e => e.k === 'magichat'); out.sprouted = !!mh;
      if (mh) touchPlayerAs(mh);
      out.form = player.form;
      pressed.hat = true; run(1); out.throws = ents.some(e => e.k === 'cap'); run(150);
      hurtPlayer(); out.afterHit = player.form; player.inv = 0; run(5); pressed.hat = true; run(1); out.noThrowAfter = !ents.some(e => e.k === 'cap');
      // the wall kick: a tall wall, Leo falling beside it holding towards it slides, then kicks off up and away
      startLevel('hills'); ents = ents.filter(e => !isEnemy(e));
      for (let y = 2; y <= 11; y++) setTile(30, y, T.STONE);
      player.x = 30 * 16 - player.w - 0.5; player.y = 3 * 16; player.vy = 60; player.ground = false; keys.right = true; run(12);
      out.slide = player.slide === 1 && player.vy <= 75;
      keys.right = false; const x0 = player.x; pressed.jump = true; run(1); out.kickV = [Math.round(player.vx), Math.round(player.vy)];
      run(12); out.kick = player.vx < -100 && player.x < x0 - 20 && player.y < 3 * 16;
      // King Grumbles on the Statue of Liberty (six hits)
      startLevel('liberty'); ents = ents.filter(e => !isEnemy(e) || e.k === 'boss');
      const boss = ents.find(e => e.k === 'boss'); player.x = 168 * 16; run(30);
      const hold = () => { boss.hurt = 0; boss.vy = 0; boss.jumpT = 9; boss.throwT = 9; boss.y = 12 * 16 - boss.h; boss.x = 178 * 16; boss.dir = 1; ents = ents.filter(e => e.k !== 'acorn'); };
      const hits = {};
      hold(); let hp = boss.hp; ents.push(mk('spring', boss.x + 4, boss.y + boss.h - 16, { w: 16, h: 16, squash: 0 })); run(2); hits.spring = boss.hp === hp;
      ents = ents.filter(e => e.k !== 'spring');
      hold(); hp = boss.hp; ents.push(mk('spark', boss.x + 8, boss.y + 10, { vx: 230, vy: 0, w: 6, h: 6 })); run(1); hits.spark = boss.hp === hp - 1;
      hold(); hp = boss.hp; ents.push(mk('shell', boss.x - 16, boss.y + boss.h - 14, { vx: 240, w: 14, h: 14 })); run(6); hits.shell = boss.hp === hp - 1;
      hold(); hp = boss.hp; setForm(3); player.hatless = true; ents.push(mk('cap', boss.x + 8, boss.y + 10, { vx: 200, w: 12, h: 9, st: 'out', dir: 1 })); run(1); hits.hat = boss.hp === hp - 1;
      hold(); hp = boss.hp; ents = ents.filter(e => e.k !== 'cap'); player.hatless = false; mount({}); player.laser = true; player.x = boss.x - 60; player.y = 12 * 16 - player.h; player.face = 1; player.vy = 0; run(1); boss.x = player.x + 60; boss.hurt = 0; player.mount.zapCD = 0; pressed.run = true; run(1); hits.laser = boss.hp === hp - 1;
      out.hits = hits; out.hpLeft = boss.hp;
      // stomping King Grumbles again and again, landing back on him even while he still flashes from the last hit: never hurts Leo,
      // and he goes down; walking into his side still does
      const realHurt = hurtPlayer; let hurts = 0; hurtPlayer = () => { hurts++; };
      const stompAll = id => {
        startLevel(id); ents = ents.filter(e => !isEnemy(e) || e.k === 'boss'); setForm(1); const bs = ents.find(e => e.k === 'boss'); run(30);
        player.x = bs.x + bs.w / 2 - player.w / 2; player.y = bs.y - 70; player.vy = 100;
        for (let i = 0; i < 60 * 30 && bs.hp > 0; i++) {
          ents = ents.filter(e => e.k !== 'acorn');
          const cx = player.x + player.w / 2, bx = bs.x + bs.w / 2; keys.left = cx > bx + 2; keys.right = cx < bx - 2; keys.run = true;
          if (player.ground) { player.x = bx - player.w / 2; player.y = bs.y - 70; player.vy = 100; player.ground = false; }
          run(1);
        }
        keys.left = keys.right = keys.run = false; return bs.hp;
      };
      out.stomps = {}; for (const id of ['castle', 'fort', 'ptown', 'liberty', 'castillo', 'canaveral', 'sabine']) out.stomps[id] = stompAll(id); out.stomps.hurts = hurts;
      startLevel('castle'); ents = ents.filter(e => !isEnemy(e) || e.k === 'boss'); const side = ents.find(e => e.k === 'boss'); run(5);
      hurts = 0; side.jumpT = side.throwT = 9; player.inv = 0; player.x = side.x - player.w + 4; player.y = side.y + side.h - player.h; player.vy = 0; run(1); out.sideHurts = hurts > 0;
      hurtPlayer = realHurt;
      paused = false; return out;
    });
    check(r.noThrow, 'without the magic hat, Leo keeps his hat on: ' + JSON.stringify(r));
    check(r.sprouted && r.form === 3 && r.throws, 'the magic hat block gives the hat throw: ' + JSON.stringify(r));
    check(r.afterHit === 1 && r.noThrowAfter, 'a hit takes the magic hat away: ' + JSON.stringify(r));
    check(r.slide && r.kick, 'a wall slide and wall kick: ' + JSON.stringify(r));
    check(r.hits.spring && r.hits.spark && r.hits.shell && r.hits.hat && r.hits.laser && r.hpLeft === 2, 'King Grumbles: hurt by sparks, a shell, the hat and the laser, not a spring: ' + JSON.stringify(r));
    check(Object.entries(r.stomps).every(([k, v]) => v === 0) && r.sideHurts, 'every boss: stomping him again and again (even while he flashes) never hurts Leo and beats him in every world; walking into his side does hurt: ' + JSON.stringify(r));
    await done(p, 'lucky-leo-magic-hat.png');
  });

  await test('Lucky Leo Cape Cod: the whale-watch boat sails with Leo aboard, sharks leap, a whale spout shoots him up, and secret exits open Martha\'s Vineyard and Nantucket', async () => {
    const p = await open(browser, 'lucky-leo.html', { viewport: { width: 960, height: 540 } });
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    const r = await p.evaluate(() => {
      const out = {}, run = (n, f) => { for (let i = 0; i < n; i++) { if (f) f(i); step(1 / 60); } };
      localStorage.removeItem('ll_save'); for (const k in save.cleared) delete save.cleared[k]; for (const k in save.secrets) delete save.secrets[k];
      paused = true; startGame();
      out.islandsHidden = !nodeOpen(node('vineyard')) && !nodeOpen(node('nantucket'));
      startLevel('whale'); ents = ents.filter(e => e.k !== 'shark'); run(20);
      const boat = ents.find(e => e.k === 'boat'), bx0 = boat.x;
      keys.right = true; run(200, () => { if (player.ride === boat && player.x > boat.x + 30) keys.right = false; }); keys.right = false;
      run(120); out.boat = player.ride === boat && boat.x > bx0 + 60 && phase === 'play';
      // a shark ahead leaps out of the sea
      const sh = mk('shark', player.x + 120, LH + 40, { x0: player.x + 120, w: 26, h: 12, st: 'swim', cool: 0 }); ents.push(sh);
      run(10); out.leap = sh.st === 'leap' && isEnemy(sh);
      sh.gone = true;
      // into a whale's spout: up he goes
      const wh = ents.find(e => e.k === 'whale'); wh.cyc = 1.4; run(1); player.x = wh.bx - 6; player.y = 11 * 16 - player.h; player.vy = 0; run(2);
      out.spout = player.vy < -380;
      // the secret flag on the cloud: a secret exit that opens Nantucket
      startLevel('whale'); const fl = ents.find(e => e.k === 'sflag'); touchPlayerAs(fl); out.secretPhase = phase === 'clear' && lvl.secretExit;
      run(300); out.nantucket = state === 'map' && !!save.secrets.whale && nodeOpen(node('nantucket'));
      startLevel('canal'); touchPlayerAs(ents.find(e => e.k === 'sflag')); run(300); out.vineyard = state === 'map' && nodeOpen(node('vineyard'));
      // the island levels and the boat level all start
      out.starts = ['vineyard', 'nantucket', 'whale'].map(id => { startLevel(id); run(30); return state === 'level' && player.y > 0 && phase === 'play'; });
      out.path = PATHS.some(([a, b, s2]) => a === 'cranberry' && b === 'whale' && !s2) && PATHS.some(([a, b, s2]) => a === 'whale' && b === 'dunes' && !s2);
      paused = false; return out;
    });
    check(r.islandsHidden, 'the secret islands should start hidden: ' + JSON.stringify(r));
    check(r.boat, 'the boat should sail off with Leo aboard: ' + JSON.stringify(r));
    check(r.leap, 'a great white should leap out ahead of Leo: ' + JSON.stringify(r));
    check(r.spout, "a whale's spout should shoot Leo up: " + JSON.stringify(r));
    check(r.secretPhase && r.nantucket, 'the golden flag on Whale Watch should be a secret exit to Nantucket: ' + JSON.stringify(r));
    check(r.vineyard, "the golden flag on Bourne Bridge should open Martha's Vineyard: " + JSON.stringify(r));
    check(r.starts.every(Boolean) && r.path, 'the new levels start, and Whale Watch sits between Cranberry Bog and Nauset Dunes: ' + JSON.stringify(r));
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await done(p, 'lucky-leo-cape.png');
  });

  await test('Lucky Leo: a rainbow block grows a long curved rainbow into the sky; Leo rides it up to a secret cloud area with power-ups and a rainbow gem, and slides back down further along', async () => {
    const p = await open(browser, 'lucky-leo.html', { viewport: { width: 960, height: 540 } });
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    const r = await p.evaluate(() => {
      const out = {}, run = (n, f) => { for (let i = 0; i < n; i++) { if (f) f(i); step(1 / 60); } };
      paused = true; startGame(); startLevel('hills'); ents = ents.filter(e => !isEnemy(e)); run(10);
      out.gemUpThere = !ents.some(e => e.k === 'gem' && e.idx === 3);
      out.block = tileAt(23, 8) === T.QBOW;
      player.x = 23 * 16 + 2; player.vx = 0; run(10); keys.jump = true; pressed.jump = true; run(20); keys.jump = false;
      const bow = ents.find(e => e.k === 'bowup'); out.grows = !!bow;
      run(100); out.grown = bow && bow.grow === 1;
      player.x = 23 * 16 + 2; player.y = 8 * 16 - player.h; player.vy = 0; run(2); out.riding = phase === 'bow';
      let top = 999; run(400, () => { if (lvl.id === 'hills') top = Math.min(top, player.y); }); out.wentUp = top < -100;
      out.room = lvl.id; out.cloudStuff = ents.some(e => e.k === 'skyexit') && QBLOCKS.has(tileAt(9, 8));
      const gem = ents.find(e => e.k === 'gem' && e.idx === 3); out.gemHere = !!gem; if (gem) touchPlayerAs(gem); out.gemGot = levelGems[3];
      const ex = ents.find(e => e.k === 'skyexit'); player.x = ex.x + 10; player.y = ex.y + 8; player.vy = 0; run(1); out.back = lvl.id === 'hills' && Math.abs(player.x / 16 - 115) < 2;
      run(150); out.landed = player.ground && phase === 'play';
      out.used = ents.find(e => e.k === 'bowup').used === true;
      out.levels = ['hills', 'shore', 'night', 'dunes'].every(id => LEVELS[id].skyRoom && LEVELS[LEVELS[id].skyRoom] && LEVELS[id].t.includes(T.QBOW));
      paused = false; return out;
    });
    check(r.block && r.gemUpThere, 'Clover Hills has a rainbow block, and one gem waits up in the clouds: ' + JSON.stringify(r));
    check(r.grows && r.grown, 'bumping it grows the rainbow: ' + JSON.stringify(r));
    check(r.riding && r.wentUp && r.room === 'hillsSky' && r.cloudStuff, 'touching the rainbow rides Leo up into the cloud area: ' + JSON.stringify(r));
    check(r.gemHere && r.gemGot, "the cloud area holds the level's rainbow gem: " + JSON.stringify(r));
    check(r.back && r.landed && r.used, 'the rainbow slide drops Leo back into the level further along: ' + JSON.stringify(r));
    check(r.levels, 'four levels have a rainbow block and a cloud area: ' + JSON.stringify(r));
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await done(p, 'lucky-leo-rainbow.png');
  });

  await test('Lucky Leo: riding Shamrock, spiky things are no trouble: stomp hedgehogs and snapping plants, walk over spikes; map trails curve and Leo follows them', async () => {
    const p = await open(browser, 'lucky-leo.html', { viewport: { width: 960, height: 540 } });
    const r = await p.evaluate(() => {
      const out = {}, run = (n, f) => { for (let i = 0; i < n; i++) { if (f) f(i); step(1 / 60); } };
      paused = true; startGame(); startLevel('hills'); ents = ents.filter(e => !isEnemy(e)); mount({}); run(10);
      const drop = k => { const e = mk(k, player.x + (k === 'snapper' ? 200 : -1), 11 * 16 - 14, k === 'snapper' ? { w: 12, h: 18, up: 22, cyc: 0, pipeY: 12 } : { dir: 0, w: 14, h: 13 }); ents.push(e); if (k === 'snapper') { step(1 / 60); e.x = player.x - 1; }
        player.y = e.y - player.h - 4; player.vy = 120; player.ground = false; run(4); return { gone: !!e.flip || e.dead, safe: !!player.mount && phase === 'play' }; };
      out.thorny = drop('thorny'); run(30); out.snapper = drop('snapper'); run(30);
      setTile(Math.floor((player.x + 6) / 16) + 2, 11, T.SPIKES); keys.right = true; run(40); keys.right = false; out.spikes = !!player.mount && player.inv === 0 && phase === 'play';
      // the map: Leo walks along a curved trail (off the straight line between the two levels)
      goMap('hills'); save.cleared.hills = true; mapLeo.to = 'woods'; mapLeo.at = 'hills'; let off = 0;
      const a = node('hills'), b = node('woods');
      run(20, () => { const ax = b.x - a.x, ay = b.y - a.y, d = Math.hypot(ax, ay); off = Math.max(off, Math.abs((mapLeo.x - a.x) * ay - (mapLeo.y - a.y) * ax) / d); });
      run(120); out.curved = off > 3; out.arrived = mapLeo.at === 'woods' && !mapLeo.to;
      paused = false; return out;
    });
    check(r.thorny.gone && r.thorny.safe && r.snapper.gone && r.snapper.safe, 'Shamrock stomps spiky hedgehogs and snapping plants: ' + JSON.stringify(r));
    check(r.spikes, 'Shamrock walks over spikes unhurt: ' + JSON.stringify(r));
    check(r.curved && r.arrived, 'map trails curve and Leo walks along them: ' + JSON.stringify(r));
    await done(p, 'lucky-leo-ride.png');
  });

  await test('Lucky Leo: controller settings in the pause menu; inverted sticks never apply here (only flying games and 3D cameras offer them)', async () => {
    const p = await open(browser, 'lucky-leo.html', { viewport: { width: 960, height: 540 } });
    await p.evaluate(() => { localStorage.removeItem('rb_pad'); RB.pad.setConfig({ ...RB.pad.DEFAULTS, inverts: { 'lucky-leo.html': { LY: true, LX: true } } }); startGame(); startLevel('hills'); pause(); });
    const r1 = await p.evaluate(() => ({ ly: RB.pad.inv('LY'), lx: RB.pad.inv('invLX'), btn: [...document.querySelectorAll('.rb-pause button')].map(b => b.textContent).find(t => /Controller/.test(t)) || null }));
    await p.evaluate(() => [...document.querySelectorAll('.rb-pause button')].find(b => /Controller/.test(b.textContent)).click());
    const screen = await p.evaluate(() => ({ open: !!document.querySelector('.rb-padscreen'), note: !!document.querySelector('.pad-flat'), rows: document.querySelectorAll('[data-inv]').length, cam: !!document.querySelector('[data-k="camSpeed"]') }));
    await p.evaluate(() => document.querySelector('#padDone').click());
    const back = await p.evaluate(() => ({ pause: !!document.querySelector('.rb-pause') && document.querySelector('.rb-pause').style.display !== 'none', screen: !!document.querySelector('.rb-padscreen') }));
    await p.evaluate(() => RB.pad.setConfig({ ...RB.pad.DEFAULTS }));
    check(!r1.ly && !r1.lx, 'inverted sticks are ignored in Lucky Leo, even if saved: ' + JSON.stringify(r1));
    check(!!r1.btn, 'the pause menu has a controller settings button: ' + JSON.stringify(r1));
    check(screen.open && screen.note && !screen.rows && !screen.cam, 'the controller screen explains there is nothing to invert here: ' + JSON.stringify(screen));
    check(back.pause && !back.screen, 'Done goes back to the pause menu: ' + JSON.stringify(back));
    await done(p);
  });

  await test('Lucky Leo on the map shows his power-up and Shamrock when he has them; S + jump (or F) hops off Shamrock', async () => {
    const p = await open(browser, 'lucky-leo.html', { viewport: { width: 960, height: 540 } });
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    const r = await p.evaluate(() => {
      const run = n => { for (let i = 0; i < n; i++) step(1 / 60); };
      paused = true; startGame(); save.cleared.hills = true; startLevel('hills'); ents = ents.filter(e => !isEnemy(e)); setForm(3);
      const u = mk('unicorn', player.x, player.y, { w: 16, h: 22, st: 'wait', t: 1 }); mount(u); run(5);
      const told = /hop off/.test(bannerText[1]);
      reachGoal(); run(300);
      const onMap = state === 'map' && keep.mount && keep.form === 3;
      // what gets drawn on the map: Leo riding Shamrock, with the magic hat
      const calls = []; const dU = drawUnicorn, dL = drawLeo;
      drawUnicorn = (...a) => { calls.push('unicorn'); return dU(...a); }; drawLeo = (...a) => { calls.push('leo:' + a[2] + ':' + a[3]); return dL(...a); };
      try { drawMap(); } finally { drawUnicorn = dU; drawLeo = dL; }
      // ↓ + jump hops off
      startLevel('woods'); run(10); const rode = !!player.mount; keys.down = true; downFrom = 'KeyS'; pressed.jump = true; run(2); keys.down = false; run(60);
      const off = !player.mount;
      // walk away and come back: on again
      keys.right = true; run(30); keys.right = false; keys.left = true; run(60); keys.left = false; const back = !!player.mount;
      paused = false; return { told, onMap, calls, rode, off, back };
    });
    check(r.told, 'climbing on Shamrock the first time says how to hop off: ' + JSON.stringify(r));
    check(r.onMap && r.calls.includes('unicorn') && r.calls.includes('leo:3:ride'), 'on the map Leo rides Shamrock with his magic hat: ' + JSON.stringify(r));
    check(r.rode && r.off && r.back, '↓ + jump hops off Shamrock (and he stays off until Leo walks back to him): ' + JSON.stringify(r));
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await done(p);
  });

  await test('Lucky Leo: water never hurts (Leo swims); Cranberry Bog mats sink when stood on; the dark mat dives under the bog to a world of frogs and tadpoles with a secret exit', async () => {
    const p = await open(browser, 'lucky-leo.html', { viewport: { width: 960, height: 540 } });
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    const r = await p.evaluate(() => {
      const out = {}, run = (n, f) => { for (let i = 0; i < n; i++) { if (f) f(i); step(1 / 60); } };
      localStorage.removeItem('ll_save'); for (const k in save.cleared) delete save.cleared[k]; for (const k in save.secrets) delete save.secrets[k];
      paused = true; startGame(); save.cleared.cranberry = false;
      // water: drop Leo into the canal; he swims, a stroke takes him up, and at the surface a jump leaps him out
      startLevel('cranberry'); ents = ents.filter(e => !isEnemy(e)); player.x = 60 * 16 + 2; player.y = 150; player.vy = 0; run(80);
      out.swims = player.swim === true && phase === 'play'; const y0 = player.y; pressed.jump = true; run(1); out.stroke = player.vy < -150;
      run(90); out.alive = phase === 'play' && lives === 5;
      // a bog mat sinks while Leo stands on it, and bobs back up when he leaves
      startLevel('cranberry'); ents = ents.filter(e => !isEnemy(e)); const mat = ents.find(e => e.k === 'sponge' && !e.deep);
      player.x = mat.x + 16; player.y = mat.y - player.h - 2; player.vy = 0; run(60); out.sank = mat.y > mat.y0 + 6 && player.ride === mat;
      player.x = 2 * 16; player.y = 100; run(200); out.rose = mat.y < mat.y0 + 1;
      // the dark mat: it keeps sinking, the camera pans down, and Leo arrives under the bog
      const deep = ents.find(e => e.k === 'sponge' && e.deep); player.x = deep.x + 16; player.y = deep.y - player.h - 2; player.vy = 0;
      let panned = 0; run(500, () => { panned = Math.max(panned, camY); });
      out.panned = panned > 100; out.room = lvl.id; out.critters = ['frog', 'tadpoles', 'turtle', 'minnows'].every(k => ents.some(e => e.k === k));
      run(120); out.camBack = Math.abs(camY) < 5; out.swimDeep = player.swim && phase === 'play';
      const gem = ents.find(e => e.k === 'gem'); out.gem = !!gem && gem.idx === 4;
      // the secret exit at the far end
      touchPlayerAs(ents.find(e => e.k === 'sflag')); run(300);
      out.secret = state === 'map' && !!save.secrets.cranberry && !!save.cleared.cranberry && pathOpen(PATHS.find(([a, b, s2]) => a === 'cranberry' && b === 'dunes' && s2));
      paused = false; return out;
    });
    check(r.swims && r.stroke && r.alive, 'water: Leo swims instead of dying: ' + JSON.stringify(r));
    check(r.sank && r.rose, 'bog mats sink when stood on and bob back up: ' + JSON.stringify(r));
    check(r.panned && r.room === 'cranberryDeep' && r.critters && r.camBack && r.swimDeep, 'the dark mat dives under the bog, the camera pans down, frogs and tadpoles live there: ' + JSON.stringify(r));
    check(r.gem, 'one of the bog gems is down there: ' + JSON.stringify(r));
    check(r.secret, 'the secret exit under the bog opens a golden road along the Cape to Nauset Dunes: ' + JSON.stringify(r));
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await done(p, 'lucky-leo-bog.png');
  });

  await test('Lucky Leo World 4 extras: taxis, falling apples and crabs; a wall-jump tower up to a gem; and a more forgiving Shamrock gulp', async () => {
    const p = await open(browser, 'lucky-leo.html', { viewport: { width: 960, height: 540 } });
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    const r = await p.evaluate(() => {
      const out = {}, run = (n, f) => { for (let i = 0; i < n; i++) { if (f) f(i); step(1 / 60); } };
      paused = true; startGame();
      // a taxi drives along the bridge; stomping it knocks it out
      startLevel('bridge'); const taxi = ents.find(e => e.k === 'taxi'); player.x = taxi.x - 120; run(30); const tx0 = taxi.x; run(20); out.taxiDrives = Math.abs(taxi.x - tx0) > 10;
      player.x = taxi.x + 6; player.y = taxi.y - player.h - 4; player.vy = 100; player.ground = false; run(4); out.taxiStomp = !!taxi.flip && phase === 'play';
      // apples drop from the orchard branches when Leo walks underneath
      startLevel('orchard'); const tree = ents.find(e => e.k === 'appletree'); player.x = tree.x - 10; tree.cool = 0; run(3); out.apple = ents.some(e => e.k === 'applefall');
      // crabs scuttle at Niagara
      startLevel('niagara'); const crab = ents.find(e => e.k === 'crab'); player.x = crab.x - 150; run(20); const cx0 = crab.x; run(30); out.crab = Math.abs(crab.x - cx0) > 8;
      // the wall-jump tower on the rooftops: jump into the gap and kick back and forth to reach the gem at the top
      startLevel('city'); ents = ents.filter(e => !isEnemy(e)); player.x = 188 * 16 + 4; player.y = 12 * 16 - player.h; player.vy = 0; run(5);
      keys.jump = true; pressed.jump = true; let dir = 1, top = 999, kicks = 0;
      run(240, () => { keys.right = dir > 0; keys.left = dir < 0; top = Math.min(top, player.y); if (player.slide && player.vy >= 0) { pressed.jump = true; dir = -dir; kicks++; } });
      keys.jump = keys.right = keys.left = false;
      out.tower = { top: Math.round(top), kicks, gem: levelGems[4] };
      // like Mario, between two walls: after the first kick, just keep tapping jump (no turning the stick round each time)
      startLevel('city'); ents = ents.filter(e => !isEnemy(e)); player.x = 188 * 16 + 4; player.y = 12 * 16 - player.h; player.vy = 0; player.vx = 0; run(5);
      let top2 = 999, kicks2 = 0, k0 = 0;
      run(300, i => { keys.right = i < 40; keys.jump = i % 8 < 3; pressed.jump = i % 8 === 0; top2 = Math.min(top2, player.y); if (player.chainT > 0.58 && !k0) { kicks2++; k0 = 1; } if (player.chainT < 0.5) k0 = 0; });
      keys.jump = keys.right = keys.left = false;
      out.mash = { top: Math.round(top2), kicks: kicks2 };
      // Shamrock's gulp reaches a goblin a little ahead and a little above
      startLevel('hills'); ents = ents.filter(e => !isEnemy(e)); mount({}); run(10);
      const gob = mk('grumblin', player.x + player.w / 2 + 34, player.y + player.h - 30, { dir: 0, w: 14, h: 14 }); ents.push(gob); gob.vy = 0;
      pressed.run = true; run(1); out.gulp = gob.gone === true;
      // gulps 2, 3 (a poop) and 4: the fourth powers Shamrock up with the rainbow eye laser
      out.eyes = [];
      for (let n = 2; n <= 4; n++) {
        run(30); const g = mk('grumblin', player.x + player.w / 2 + player.face * 30, player.y + player.h - 20, { dir: 0, w: 14, h: 14 }); ents.push(g); g.vy = 0;
        pressed.run = true; run(1); out.eyes.push({ n, ate: g.gone === true, laser: !!player.laser });
      }
      run(100); out.poop = ents.filter(e => e.k === 'poop').length;
      paused = false; return out;
    });
    check(r.taxiDrives && r.taxiStomp, 'taxis drive along and can be stomped: ' + JSON.stringify(r));
    check(r.apple && r.crab, 'apples drop in the orchard and crabs scuttle: ' + JSON.stringify(r));
    check(r.tower.top < 40 && r.tower.kicks >= 2 && r.tower.gem, 'wall-kicking back and forth up the rooftop gap reaches the gem: ' + JSON.stringify(r));
    check(r.mash.top < 40 && r.mash.kicks >= 3, 'tapping jump between two walls kicks back and forth to the top, like Mario: ' + JSON.stringify(r.mash));
    check(r.gulp, "Shamrock's gulp is forgiving: " + JSON.stringify(r));
    check(r.eyes.every(x => x.ate) && !r.eyes[1].laser && r.eyes[2].laser && r.poop === 1, 'poop after 3 gulps, laser eyes after the 4th: ' + JSON.stringify({ eyes: r.eyes, poop: r.poop }));
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await done(p);
  });

  await test('Lucky Leo World 5 (Florida): herons (walk under their legs, mind the beak), gators and gator backs, snakes, roosters, race cars, jellyfish, puffer fish, tarpon, mermaids, manatees, cannons, coconuts, the airboat, low gravity in space, and the flight between the maps', async () => {
    const p = await open(browser, 'lucky-leo.html', { viewport: { width: 960, height: 540 } });
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    const r = await p.evaluate(() => {
      const out = {}, run = (n, f) => { for (let i = 0; i < n; i++) { if (f) f(i); step(1 / 60); } };
      const only = (...ks) => { ents = ents.filter(e => !isEnemy(e) || ks.includes(e)); };
      paused = true; startGame();
      // a heron: small Leo walks right under its long legs; its beak jabs when he's in front; stomping its back knocks it out
      startLevel('glades'); let h = ents.find(e => e.k === 'heron'); only(h); h.jabCD = 99; h.pause = 99;
      player.x = h.x + 1; player.y = h.y + h.h - player.h; player.vy = 0; player.inv = 0; run(2); out.underLegs = { lives, form: player.form, phase };
      startLevel('glades'); h = ents.find(e => e.k === 'heron'); only(h); h.pause = 99; h.dir = 1; h.face = 1; h.jabCD = 0; setForm(1); player.inv = 0;
      player.x = h.x + h.w + 8; player.y = h.y + h.h - player.h; player.vy = 0; run(20); out.jab = { form: player.form, jabbed: h.jabCD > 0 };
      startLevel('glades'); h = ents.find(e => e.k === 'heron'); only(h); h.pause = 99; h.jabCD = 99; player.x = h.x + 1; player.y = h.y - player.h - 6; player.vy = 120; player.ground = false; run(4); out.heronStomp = !!h.flip;
      // the snake, the gator and (in Key West) a rooster can all be stomped
      for (const [lv, k] of [['glades', 'snake'], ['glades', 'gator'], ['keywest', 'rooster'], ['daytona', 'racer']]) {
        startLevel(lv); const e = ents.find(q => q.k === k); only(e); run(10); player.x = e.x + e.w / 2 - 6; player.y = e.y - player.h - 4; player.vy = 120; player.ground = false; player.inv = 0; run(4); out[k] = !!e.flip;
      }
      // race cars are fast
      startLevel('daytona'); const car = ents.find(e => e.k === 'racer'); player.x = car.x - 200; run(10); const c0 = car.x; run(30); out.raceSpeed = Math.round(Math.abs(car.x - c0) * 2);
      // gator backs in the Everglades sink under Leo's feet; the airboat sails once he's aboard
      startLevel('glades'); ents = ents.filter(e => !isEnemy(e)); const gb = ents.find(e => e.k === 'sponge'); player.x = gb.x + 8; player.y = gb.y - player.h - 2; player.vy = 0; run(40); out.gatorBackSinks = gb.y > gb.y0 + 3;
      startLevel('glades'); ents = ents.filter(e => !isEnemy(e)); const boat = ents.find(e => e.k === 'boat'); player.x = boat.x + 30; player.y = boat.y - player.h - 2; player.vy = 0; run(120); out.airboat = { go: boat.go, moved: Math.round(boat.x - boat.x0), riding: player.ride === boat };
      // a puffer fish: stomp it while it's flat and it's knocked out; puffed up, it's spiky
      startLevel('reef'); let pf = ents.find(e => e.k === 'puffer'); only(pf); pf.puff = 0; pf.kick = 9; player.x = pf.x + 1; player.y = pf.y - player.h - 30; player.vy = 0; run(1); pf.puff = 0;
      player.y = pf.y - player.h - 2; player.vy = 70; player.inv = 0; player.form = 0; run(3); out.pufferFlat = !!pf.flip;
      startLevel('reef'); pf = ents.find(e => e.k === 'puffer'); only(pf); pf.kick = 9; player.x = pf.x - 30; player.y = pf.y; run(30); out.puffs = pf.puff > 0.5;
      setForm(1); player.inv = 0; player.x = pf.x + 1; player.y = pf.y - player.h - 2; player.vy = 70; run(3); out.pufferSpiky = { flipped: !!pf.flip, form: player.form };
      // jellyfish drift, and can be stomped
      startLevel('reef'); const jl = ents.find(e => e.k === 'jelly'); only(jl); run(30); const j0 = { x: jl.x, y: jl.y }; run(30); out.jellyDrifts = Math.hypot(jl.x - j0.x, jl.y - j0.y) > 2;
      // a manatee carries Leo along
      startLevel('reef'); ents = ents.filter(e => !isEnemy(e)); const man = ents.find(e => e.look === 'manatee'); run(5); player.x = man.x + 16; player.y = man.y - player.h - 1; player.vy = 30; run(3); const m0 = player.x; run(40); out.manatee = { riding: player.ride === man, moved: Math.round(Math.abs(player.x - m0)) };
      // a mermaid gives Leo five coins
      startLevel('springs'); const mm = ents.find(e => e.k === 'mermaid'); const coins0 = coins; player.x = mm.x + 2; player.y = mm.y + 4; run(2); out.mermaid = { gave: !!mm.gave, coins: coins - coins0 };
      // the tarpon leap out of the water across the gaps in Key West
      startLevel('keywest'); const tp = ents.find(e => e.k === 'shark' && e.look === 'tarpon'); player.x = tp.x0 - 100; tp.cool = 0; run(20); out.tarpon = tp.st === 'leap';
      // palm trees drop coconuts
      startLevel('keywest'); const palm = ents.find(e => e.k === 'appletree' && e.palm); player.x = palm.x - 10; palm.cool = 0; run(3); out.coconut = ents.some(e => e.k === 'applefall' && e.coconut);
      // the fort's cannons fire along the ground (a cannonball can be stomped)
      startLevel('castillo'); const cn = ents.find(e => e.k === 'cannon'); player.x = cn.x + 120; cn.cool = 0; run(3); const ball = ents.find(e => e.k === 'acorn' && e.kind === 'cannonball'); out.cannon = !!ball && ball.vx > 0;
      // Captain Chomps guards a treasure chest: grabbing it clears the level and opens Daytona Beach (no ending screen)
      startLevel('castillo'); const cb = ents.find(e => e.k === 'boss'); player.x = 170 * 16; player.y = 11 * 16 - 14; run(30);
      for (let k = 0; k < 5; k++) { player.inv = 9; run(100); player.x = cb.x + 8; player.y = cb.y - 30; player.vy = 150; run(8); }
      run(60 * 3); const chest = ents.find(e => e.k === 'pot'); if (chest) { player.x = chest.x; player.y = chest.y; run(3); } run(60 * 5);
      out.chomps = { hp: cb.hp, state, daytona: nodeOpen(node('daytona')), cleared: !!save.cleared.castillo };
      // out in space Leo jumps much higher
      const jumpHeight = id => { startLevel(id); ents = ents.filter(e => !isEnemy(e)); run(20); const y0 = player.y; let top = y0; keys.jump = true; pressed.jump = true; run(90, () => { top = Math.min(top, player.y); }); keys.jump = false; return y0 - top; };
      out.jump = { hills: Math.round(jumpHeight('hills')), space: Math.round(jumpHeight('space')) };
      // the map: from the Statue of Liberty, Leo flies off the bottom of New England and lands in Miami, on the map of Florida
      save.cleared.liberty = true; goMap('liberty'); const v0 = mapView(); mapMove([0, 1]); const flyTo = mapLeo.to; run(60); const vMid = mapView(), flying = !!mapLeo.flying; run(150);
      out.flight = { v0, flyTo, vMid, flying, at: mapLeo.at, v1: mapView() };
      paused = false; return out;
    });
    check(r.underLegs.lives === 5 && r.underLegs.form === 0 && r.underLegs.phase === 'play', 'small Leo walks right under a heron\'s legs: ' + JSON.stringify(r.underLegs));
    check(r.jab.jabbed && r.jab.form === 0, 'a heron jabs Leo when he stands in front of it: ' + JSON.stringify(r.jab));
    check(r.heronStomp && r.snake && r.gator && r.rooster && r.racer, 'herons, snakes, gators, roosters and race cars can be stomped: ' + JSON.stringify(r));
    check(r.raceSpeed > 90, 'race cars are fast: ' + r.raceSpeed);
    check(r.gatorBackSinks && r.airboat.go && r.airboat.moved > 60 && r.airboat.riding, 'gator backs sink and the airboat sails with Leo aboard: ' + JSON.stringify(r));
    check(r.pufferFlat && r.puffs && !r.pufferSpiky.flipped && r.pufferSpiky.form === 0, 'a puffer fish can be stomped when flat but is spiky when puffed up: ' + JSON.stringify(r));
    check(r.jellyDrifts && r.manatee.riding && r.manatee.moved > 4, 'jellyfish drift and a manatee gives Leo a ride: ' + JSON.stringify(r));
    check(r.mermaid.gave && r.mermaid.coins === 5, 'a mermaid gives Leo five coins: ' + JSON.stringify(r.mermaid));
    check(r.tarpon && r.coconut && r.cannon, 'tarpon leap, coconuts drop and cannons fire: ' + JSON.stringify(r));
    check(r.chomps.hp === 0 && r.chomps.state === 'map' && r.chomps.daytona && r.chomps.cleared, 'beating Captain Chomps and grabbing the treasure opens Daytona Beach: ' + JSON.stringify(r.chomps));
    check(r.jump.space > r.jump.hills * 1.5, 'low gravity in space: much higher jumps: ' + JSON.stringify(r.jump));
    check(r.flight.v0 === 'ne' && r.flight.flyTo === 'miami' && r.flight.flying && r.flight.at === 'miami' && r.flight.v1 === 'fl', 'Leo flies from New York to the map of Florida: ' + JSON.stringify(r.flight));
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await done(p, 'lucky-leo-florida.png');
  });

  await test('Lucky Leo with a controller (Ⓐ jumps, Ⓧ runs) and on a phone (◀ ▶ A B buttons, tap a level on the map)', async () => {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
    await ctx.addInitScript(fakePad);
    const p = await ctx.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(url('lucky-leo.html')); await p.waitForTimeout(600);
    await padTap(p, 'A'); await p.waitForTimeout(300);
    check(await p.evaluate(() => state === 'map'), 'Ⓐ on the title should open the map');
    await padTap(p, 'A'); await p.waitForTimeout(400);
    check(await p.evaluate(() => state === 'level' && lvl.id === 'canal'), 'Ⓐ on the map should start Bourne Bridge, the first level');
    await p.waitForTimeout(300);
    await padHold(p, 'A', true); await p.waitForTimeout(120);
    const air = await p.evaluate(() => !player.ground && player.vy < 0);
    await padHold(p, 'A', false); await p.waitForTimeout(800);
    await p.evaluate(() => { ents = ents.filter(e => !isEnemy(e)); __pad.axes[0] = 1; }); await padHold(p, 'X', true); await p.waitForTimeout(1200);
    const fast = await p.evaluate(() => player.vx);
    await padHold(p, 'X', false); await p.evaluate(() => { __pad.axes[0] = 0; });
    check(air && fast > 120, 'Ⓐ should jump and Ⓧ + stick should run: ' + JSON.stringify({ air, fast }));
    // Lucky Leo keeps its own Xbox layout: Ⓨ (or RB) throws the magic hat, RT runs too, and LT + Ⓐ hops off Shamrock
    await p.evaluate(() => { setForm(3); player.hatless = false; ents = ents.filter(e => !isEnemy(e) && e.k !== 'cap'); });
    await padTap(p, 'Y'); await p.waitForTimeout(100);
    const yHat = await p.evaluate(() => ents.some(e => e.k === 'cap'));
    await p.waitForTimeout(2500); await p.evaluate(() => { ents = ents.filter(e => e.k !== 'cap'); player.hatless = false; player.vx = 0; __pad.axes[0] = 0.9; });
    await padHold(p, 'RT', true); await p.waitForTimeout(1200); const rtFast = await p.evaluate(() => player.vx); await padHold(p, 'RT', false); await p.evaluate(() => { __pad.axes[0] = 0; });
    await p.evaluate(() => { mount(mk('unicorn', player.x, player.y, { w: 16, h: 22, st: 'wait', t: 1 })); });
    await p.waitForTimeout(200); await padHold(p, 'LT', true); await padTap(p, 'A'); await padHold(p, 'LT', false); await p.waitForTimeout(900);   // (time to hop up and land again)
    const ltOff = await p.evaluate(() => !player.mount);
    check(yHat && rtFast > 120 && ltOff, 'Lucky Leo on an Xbox controller: Ⓨ throws the hat, RT runs, LT + Ⓐ hops off Shamrock: ' + JSON.stringify({ yHat, rtFast, ltOff }));
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await ctx.close();
    // on a phone: the game sits at the top like a handheld, with the buttons underneath
    const ph = await browser.newContext({ ...PHONE });
    const q = await ph.newPage();
    await q.goto(url('lucky-leo.html')); await q.waitForTimeout(500);
    await q.tap('#btnPlay'); await q.waitForTimeout(400);
    const pt = await q.evaluate(() => { const n = node(START), dpr = canvas.width / innerWidth; return { x: (n.x - mapCam) * scale / dpr, y: (n.y * scale + offY) / dpr }; });
    await q.touchscreen.tap(pt.x, pt.y); await q.waitForTimeout(200); await q.touchscreen.tap(pt.x, pt.y); await q.waitForTimeout(500);
    check(await q.evaluate(() => state === 'level' && !document.getElementById('touch').classList.contains('hidden')), 'tapping the first level twice should start it, with the touch buttons showing');
    const cdp = await ph.newCDPSession(q), rb = await q.locator('#tRight').boundingBox(), jb = await q.locator('#tJump').boundingBox();
    const x0 = await q.evaluate(() => player.x);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rb.x + 30, y: rb.y + 30, id: 1 }] });
    await q.waitForTimeout(600);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rb.x + 30, y: rb.y + 30, id: 1 }, { x: jb.x + 40, y: jb.y + 40, id: 2 }] });
    await q.waitForTimeout(120);
    const t = await q.evaluate(x0 => ({ moved: player.x - x0, air: !player.ground }), x0);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    check(t.moved > 30 && t.air, '▶ should walk and A should jump: ' + JSON.stringify(t));
    await q.screenshot({ path: path.join(OUT, 'lucky-leo-phone.png') });
    await ph.close();
  });

  await test('ABC Train: drives to A, the animal hops on, 4 animals go to the park, Find the letter, tap an animal, phone buttons', async () => {
    const p = await open(browser, 'preschool/abc-train.html', { viewport: { width: 1000, height: 620 } });
    await p.evaluate(() => { localStorage.removeItem('abc_train'); save.next = 0; RB.speak = s => (window.__said = window.__said || []).push(s); });
    await p.click('#btnAbc');
    check(await p.evaluate(() => state === 'play' && next === 0 && stations.filter(s => s.letter === 0).length === 1), 'A should wait at one station');
    await p.click('#go', { force: true });
    // the train brakes by itself beside the A and the Alligator hops on
    const a = await p.evaluate(() => { const went = train.running; if (!went) toggleGo(); for (let k = 0; k < 4000 && next === 0; k++) update(0.05); for (let k = 0; k < 40; k++) update(0.05);
      return { went, next, seat: train.seats[0] && train.seats[0].userData.name, card: document.getElementById('cardWord').textContent, said: __said.join(' | '), saved: (JSON.parse(localStorage.getItem('abc_train')) || {}).next }; });
    check(a.went && a.next === 1 && a.seat === 'Alligator' && a.card === 'Alligator' && a.saved === 1, 'GO should start the train and A should board: ' + JSON.stringify(a));
    check(/A is for Alligator/.test(a.said), 'the letter should be read out: ' + a.said);
    await p.screenshot({ path: path.join(OUT, 'abc-train.png') });
    // three more letters fill the wagons, then the train heads for the Animal Park and everyone hops off
    for (let i = 0; i < 40; i++) {
      await p.evaluate(() => { if (!train.running && hold <= 0) toggleGo(); for (let k = 0; k < 400; k++) update(0.05); });
      if (await p.evaluate(() => park.animals.length >= 4)) break;
      await p.waitForTimeout(i % 2 ? 3700 : 50);   // the next letter appears a moment after each stop
    }
    const park = await p.evaluate(() => ({ park: park.animals.length, next, seats: train.seats.filter(Boolean).length }));
    check(park.park === 4 && park.next === 4 && park.seats === 0, 'the first four animals should be playing in the park: ' + JSON.stringify(park));
    // tap an animal in the park: it jumps and says its name
    const tapped = await p.evaluate(() => { const an = park.animals[0], v = new THREE.Vector3(); an.getWorldPosition(v); camera.position.copy(v).add(new THREE.Vector3(0, 6, 8)); camera.lookAt(v); camera.updateMatrixWorld();
      v.project(camera); __said = []; update = () => {}; return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, name: an.userData.name }; });
    await p.mouse.click(tapped.x, tapped.y); await p.waitForTimeout(100);
    check(await p.evaluate(n => __said.some(s => s.includes(n)), tapped.name), 'tapping the ' + tapped.name + ' should say its name');
    await done(p);
    // Find the letter on a phone: stopping a little early glides up to the station; only the right letter gets on
    const ph = await open(browser, 'preschool/abc-train.html', PHONE);
    await ph.tap('#btnFind');
    const f = await ph.evaluate(() => {
      const before = st => {   // put the train 30 m before a station, with the switches set to get there
        FORKS.forEach(f => { f.set = st.e === f.id; });
        if (st.e === 0) setTrain(0, st.s - 30); else if (st.s >= 30) setTrain(st.e, st.s - 30); else setTrain(0, FORKS[st.e - 1].a + st.s - 30);
      };
      const out = [];
      for (const st of [stations.find(s => s.letter !== target), stations.find(s => s.letter === target)]) {
        before(st); train.running = true; train.v = CRUISE; updateGo();
        for (let k = 0; k < 400 && distAhead(st) > 12; k++) update(0.02);
        document.getElementById('go').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));   // STOP, a bit early
        for (let k = 0; k < 100; k++) update(0.05);
        out.push({ gap: +st.p.distanceTo(posAt(train.e, train.s)).toFixed(2), riders: train.seats.filter(Boolean).length });
      }
      return { out, found: save.found.length };
    });
    check(f.out[0].riders === 0 && f.out[1].riders === 1 && f.found === 1 && f.out.every(o => o.gap < 0.5), 'find the letter: ' + JSON.stringify(f));
    await done(ph, 'abc-train-phone.png');
  });

  await test('ABC Train: the throttle lever (slide the GO knob: up is faster, the notch is neutral, down backs up, wagons and all)', async () => {
    const p = await open(browser, 'preschool/abc-train.html', { viewport: { width: 1000, height: 620 } });
    await p.evaluate(() => { localStorage.removeItem('abc_train'); RB.speak = () => {}; });
    await p.click('#btnAbc');
    await p.evaluate(() => { hold = 0; for (const st of stations) st.letter = null; next = 99; });   // no stops in the way
    const knob = async () => p.evaluate(() => { const r = document.getElementById('go').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    const slot = await p.evaluate(() => { const r = document.getElementById('throttle').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, x: r.x + r.width / 2, shown: r.height > 50 }; });
    const dragTo = async y => { const k = await knob(); await p.mouse.move(k.x, k.y); await p.mouse.down(); await p.mouse.move(k.x, k.y - 20, { steps: 3 }); await p.mouse.move(k.x, y, { steps: 6 }); await p.mouse.up(); };
    const runFor = n => p.evaluate(n => { for (let i = 0; i < n; i++) update(0.05); return { v: train.v, th: train.th, running: train.running, odo: train.odo }; }, n);
    // half way up: a gentle speed; right to the top: faster
    await dragTo(slot.top + (slot.bottom - slot.top) * 0.45); const half = await runFor(80);
    await dragTo(slot.top + 4); const full = await runFor(80);
    // back to the notch: neutral, the train rolls to a stop
    const notchY = await p.evaluate(() => { const r = document.querySelector('#throttle .notch').getBoundingClientRect(); return r.y + r.height / 2; });
    await dragTo(notchY); const neutral = await runFor(80);
    // pull down into reverse: it backs up along the way it came, the wagons still coupled behind
    const before = await p.evaluate(() => ({ odo: train.odo, e: engine.position.clone(), w: train.wagons.length ? train.wagons[0].position.distanceTo(engine.position) : 0 }));
    await dragTo(slot.bottom - 6); const rev = await runFor(60);
    const after = await p.evaluate(() => ({ odo: train.odo, gap: train.wagons.length ? train.wagons[0].position.distanceTo(engine.position) : 0, label: document.getElementById('go').textContent, rev: document.getElementById('go').classList.contains('rev') }));
    // a tap on the knob is still GO / STOP
    await p.evaluate(() => { train.th = 0; train.running = false; train.v = 0; updateGo(); });
    await p.click('#go', { force: true }); const tapGo = await p.evaluate(() => train.running && train.th > 0.5);
    await p.click('#go', { force: true }); const tapStop = await p.evaluate(() => !train.running && train.th === 0);
    check(slot.shown, 'the throttle slot shows beside the GO knob');
    check(half.running && half.v > 3 && full.v > half.v + 2, 'higher on the lever is faster: ' + JSON.stringify({ half, full }));
    check(!neutral.running && Math.abs(neutral.v) < 0.1 && neutral.th === 0, 'the notch is neutral: ' + JSON.stringify(neutral));
    check(rev.th < 0 && rev.v < -1 && after.odo < before.odo - 5 && after.rev && after.label === 'STOP', 'down is reverse, backing along the track: ' + JSON.stringify({ rev, before: before.odo, after }));
    check(Math.abs(after.gap - before.w) < 1.5, 'the wagons stay coupled while backing up: ' + JSON.stringify({ before: before.w, after: after.gap }));
    check(tapGo && tapStop, 'a tap on the knob is GO and STOP: ' + JSON.stringify({ tapGo, tapStop }));
    await done(p, 'abc-train-throttle.png');
  });

  await test('ABC Train: forks (arrows pick the way, the wagons follow, the letter waits either way), rolling wheels, 360° camera, train horn', async () => {
    const p = await open(browser, 'preschool/abc-train.html', { viewport: { width: 1000, height: 620 } });
    await p.evaluate(() => { localStorage.removeItem('abc_train'); save.next = 2; RB.speak = s => (window.__said = window.__said || []).push(s); });
    await p.click('#btnAbc');
    // just before the farm fork: the letter C waits at the next station both ways
    const c = await p.evaluate(() => { setTrain(0, FORKS[0].a - 20); setupStations(); update(0.02); const f = FORKS[0];
      return { at: stations.filter(s => s.letter === next).map(s => s.e).sort(), arrows: !forkL.classList.contains('hidden') && !forkR.classList.contains('hidden'), side: f.side }; });
    check(c.at.join() === '0,1' && c.arrows, 'C should wait on the loop and on the farm road, and the arrows show: ' + JSON.stringify(c));
    // tap the arrow toward the farm: the switch and the signpost change; GO takes the farm road, the wagons follow, and C hops on
    await p.click(c.side > 0 ? '#forkR' : '#forkL', { force: true });
    const r = await p.evaluate(() => { const f = FORKS[0], on = (f.side > 0 ? forkR : forkL).classList.contains('on'); toggleGo();
      const edges = new Set(); for (let k = 0; k < 3000 && next === 2; k++) { update(0.05); edges.add(train.e + '' + train.cars.map(x => x.e).join('')); }
      return { set: f.set, on, next, e: train.e, edges: [...edges], sign: f.sign.rotation.z, said: __said.join(' | ') }; });
    check(r.set && r.on && r.next === 3 && r.e === 1 && r.edges.includes('11111'), 'the train should take the farm road with its wagons and pick up C: ' + JSON.stringify(r));
    check(/To the farm/.test(r.said) && /C is for Cat/.test(r.said), 'should say where it goes and the letter: ' + r.said);
    await p.waitForTimeout(4500);   // the other C goes home and D appears ahead
    const left = await p.evaluate(() => stations.map(s => s.letter));
    check(!left.includes(2) && left.includes(3), 'the leftover C should go and D appear: ' + left);
    // a whole lap through both branches keeps the wagons coupled behind the engine
    const lap = await p.evaluate(() => { FORKS.forEach(f => { f.set = true; }); setTrain(0, 3); let worst = [99, 0]; const seen = new Set();
      for (let k = 0; k < 2000; k++) { moveTrain(0.5); placeTrain(); seen.add(train.e); const d = engine.position.distanceTo(train.wagons[0].position); worst = [Math.min(worst[0], d), Math.max(worst[1], d)]; }
      return { seen: [...seen].sort(), worst }; });
    check(lap.seen.join() === '0,1,2' && lap.worst[0] > 4.5 && lap.worst[1] < 6.2, 'wagons should stay coupled on every branch: ' + JSON.stringify(lap));
    // wheels roll about their axles (they used to spin flat like plates)
    const w = await p.evaluate(() => { const wh = engine.userData.wheels[0], a = new THREE.Vector3(), b = new THREE.Vector3(); wh.updateMatrixWorld(); a.set(0, 1, 0).transformDirection(wh.matrixWorld);
      const r0 = wh.rotation.x; train.running = true; train.v = CRUISE; update(0.05); wh.updateMatrixWorld(); b.set(0, 1, 0).transformDirection(wh.matrixWorld);
      const side = sideOf(train.e, train.s); return { axleStill: Math.abs(a.dot(side)) > 0.95 && Math.abs(b.dot(side)) > 0.95, turned: wh.rotation.x !== r0 }; });
    check(w.axleStill && w.turned, 'the wheels should roll on an axle across the track: ' + JSON.stringify(w));
    // drag the view all the way round; let go and it glides back behind
    const box = await p.$eval('canvas', el => { const r = el.getBoundingClientRect(); return [r.width / 2, r.height / 2]; });
    await p.mouse.move(box[0], box[1]); await p.mouse.down(); await p.mouse.move(box[0] + 300, box[1], { steps: 6 }); await p.mouse.up();
    const yaw = await p.evaluate(() => ocam.yaw);
    await p.evaluate(() => { train.running = false; for (let k = 0; k < 120; k++) update(0.05); });
    const back = await p.evaluate(() => ocam.yaw);
    check(Math.abs(yaw) > 1.5 && Math.abs(back) < 0.2, 'drag should swing the camera round and it should come back: ' + yaw + ' → ' + back);
    // the horn is a five-note chord (real train horn), not a beep
    const horn = await p.evaluate(() => { let saws = 0; const make = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function () { const o = make.call(this); setTimeout(() => { if (o.type === 'sawtooth') saws++; }); return o; };
      RB.setMuted(false); toot(); return new Promise(res => setTimeout(() => res(saws), 50)); });
    check(horn >= 10, 'two blasts of a five-note horn: ' + horn + ' reeds');
    await done(p, 'abc-train-fork.png');
  });

  await test('ABC Train: zoom (wheel and pinch), the cab view, music, visiting the farm, animals on the track, planes', async () => {
    const p = await open(browser, 'preschool/abc-train.html', { viewport: { width: 1000, height: 620 }, hasTouch: true });
    await p.evaluate(() => { localStorage.removeItem('abc_train'); window.__said = []; RB.speak = s => __said.push(s); start('abc'); setTrain(0, 30); });
    // the mouse wheel and a two-finger pinch zoom the camera
    await p.mouse.move(500, 300); await p.mouse.wheel(0, 400); await p.waitForTimeout(100);
    const zOut = await p.evaluate(() => zoom);
    const cdp = await p.context().newCDPSession(p);
    const two = (type, d) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: 500 - d, y: 300, id: 1 }, { x: 500 + d, y: 300, id: 2 }] });
    await two('touchStart', 40); for (let d = 60; d <= 200; d += 35) await two('touchMove', d); await two('touchEnd');
    const zIn = await p.evaluate(() => zoom);
    check(zOut > 1.3 && zIn < zOut * 0.5, 'wheel out then pinch in: ' + zOut + ' → ' + zIn);
    // the fourth view is from the driver's seat
    const cab = await p.evaluate(() => { setZoom(1); camMode = CAM_VIEWS.length - 1; for (let k = 0; k < 10; k++) update(0.05); return { d: camera.position.distanceTo(engine.position), driver: engine.userData.driver.visible }; });
    check(cab.d < 3.5 && !cab.driver, 'the cab view should be in the cab (and the driver out of the way): ' + JSON.stringify(cab));
    // music plays notes while it's on, and remembers being switched off
    const notes = await p.evaluate(() => new Promise(res => { let n = 0; const make = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function () { n++; return make.call(this); }; RB.setMuted(false); camMode = 0;
      setTimeout(() => { const on = n; music.toggle(); res({ on, saved: localStorage.getItem('abc_music') }); }, 2000); }));
    check(notes.on > 3 && notes.saved === '0', 'music should play and switch off: ' + JSON.stringify(notes));
    // stop at the farm: get off, walk with the bear, say hello to a cow, all aboard
    const f1 = await p.evaluate(() => { FORKS[0].set = true; setTrain(1, farm.station.s); for (let k = 0; k < 5; k++) update(0.05); return !document.getElementById('walk').classList.contains('hidden'); });
    check(f1, 'the Visit the farm button should show at the farm station');
    await p.click('#walk', { force: true });
    const f2 = await p.evaluate(() => { const cow = farm.animals.find(a => a.userData.farm === 'Cow'); const from = walker.position.clone(); farmHello(cow);
      for (let k = 0; k < 200; k++) update(0.05); return { state, moved: walker.position.distanceTo(from), near: walker.position.distanceTo(cow.position) }; });
    const said = await p.evaluate(() => __said.join(' | '));
    check(f2.state === 'farm' && f2.moved > 3 && /visit the farm/.test(said) && /The cow says moo!/.test(said), 'farm visit: ' + JSON.stringify(f2) + ' ' + said);
    await p.click('#board', { force: true });
    check(await p.evaluate(() => state === 'play' && !walker.visible && !document.getElementById('go').classList.contains('hidden')), 'All aboard should go back to the train');
    // an animal on the track: the train waits for it, it poops, and a toot hurries it off
    const c = await p.evaluate(() => { FORKS.forEach(f => { f.set = false; }); __said = []; let ok = false;
      for (let i = 0; i < 30 && !ok; i++) { setTrain(0, 10 + i * 15); ok = spawnCrosser(); }
      const cr = crossers[0]; cr.poop = true; train.running = true; train.v = CRUISE; let minV = 99, gap = 99;
      for (let k = 0; k < 300; k++) { update(0.05); if (cr.onTrack) { minV = Math.min(minV, train.v); gap = Math.min(gap, distAhead(cr.loc)); } }
      return { ok, minV, gap }; });
    await p.waitForTimeout(1200);
    const c2 = await p.evaluate(() => { const cr = crossers[0]; const pooped = poops.length; if (cr) { cr.hurry = false; cr.k = 0.45; cr.onTrack = true; toot(); } return { pooped, hurry: cr && cr.hurry, said: __said.join(' | ') }; });
    check(c.ok && c.minV < 0.5 && c.gap > 5 && c2.pooped === 1 && /on the track/.test(c2.said) && /did a poop/.test(c2.said), 'the train should wait for the animal (and its poop): ' + JSON.stringify(c) + JSON.stringify(c2));
    check(c2.hurry === undefined || c2.hurry, 'tooting should hurry the animal off');
    // a plane flies over now and then, one at a time
    const pl = await p.evaluate(() => { planeT = 0; update(0.05); const n = planes.length; planeT = 0; update(0.05); return [n, planes.length]; });
    check(pl[0] === 1 && pl[1] === 1, 'one plane at a time: ' + pl);
    await done(p, 'abc-train-farm.png');
  });

  // The 🌟 RoboBandit voice plays recorded sentences (needs a real web server: pages opened from files can't fetch).
  await test('recorded voice: a sentence with a clip plays the recording, not the device voice; anything new uses the device voice', async () => {
    const http = require('http');
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
    const server = http.createServer((req, res) => {
      const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
    });
    await new Promise(r => server.listen(0, r));
    try {
      const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'voice', 'index.json'))), lines = JSON.parse(fs.readFileSync(path.join(ROOT, 'voice', 'lines.json')));
      const key = idx.clips.find(k => lines[k]);
      check(key && fs.existsSync(path.join(ROOT, 'voice', key + '.mp3')), 'voice/index.json should list clips that exist');
      const ctx = await browser.newContext();
      await ctx.addInitScript(() => { window.__device = []; window.SpeechSynthesisUtterance = function (t) { this.text = t; };
        Object.defineProperty(window, 'speechSynthesis', { value: { getVoices: () => [], speaking: false, cancel() {}, speak(u) { __device.push(u.text); setTimeout(() => u.onend && u.onend(), 5); }, addEventListener() {} }, configurable: true }); });
      const p = await ctx.newPage();
      const errors = []; p.on('pageerror', e => errors.push(e.message));
      await p.goto(`http://localhost:${server.address().port}/2nd-grade/math.html`);
      await p.waitForFunction(() => RB.voice.hasRecorded(), null, { timeout: 5000 });
      const r = await p.evaluate(async s => {
        let played = 0; const st = AudioBufferSourceNode.prototype.start; AudioBufferSourceNode.prototype.start = function (...a) { played++; return st.apply(this, a); };
        localStorage.removeItem('rb_voice'); RB.speak(s);
        await new Promise(ok => setTimeout(ok, 1500));
        const rec = { played, device: __device.length };
        RB.speak('A brand new sentence nobody recorded yet, about purple zebras.');
        await new Promise(ok => setTimeout(ok, 300));
        return { ...rec, deviceAfter: __device.length };
      }, lines[key]);
      check(r.played >= 1 && r.device === 0, 'the recorded clip should play instead of the device voice: ' + JSON.stringify(r));
      check(r.deviceAfter === 1, 'a sentence with no recording should use the device voice: ' + JSON.stringify(r));
      check(errors.length === 0, 'page errors: ' + errors.join(' | '));
      await ctx.close();
    } finally { server.close(); }
  });

  await test('read-aloud voice: picks a natural voice over robotic ones, splits long text, skips emoji; the ☰ menu can change it', async () => {
    const ctx = await browser.newContext();
    await ctx.addInitScript(() => {
      const v = (name, lang, extra = {}) => ({ name, lang, localService: true, default: false, voiceURI: name, ...extra });
      const voices = [v('Fred', 'en-US', { default: true }), v('Albert', 'en-US'), v('Microsoft David - English (United States)', 'en-US'), v('Samantha (Enhanced)', 'en-US'), v('Google français', 'fr-FR'), v('Microsoft Zira - English (United States)', 'en-US')];
      window.__spoken = [];
      window.SpeechSynthesisUtterance = function (text) { this.text = text; };
      Object.defineProperty(window, 'speechSynthesis', { value: { getVoices: () => voices, speaking: false, pending: false, paused: false, cancel() { this.speaking = false; },
        speak(u) { __spoken.push({ text: u.text, voice: u.voice && u.voice.name, rate: u.rate, pitch: u.pitch }); setTimeout(() => u.onend && u.onend(), 5); }, pause() {}, resume() {}, addEventListener() {} }, configurable: true });
    });
    const p = await ctx.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(url('2nd-grade/math.html')); await p.waitForTimeout(400);
    await p.evaluate(() => { localStorage.removeItem('rb_voice'); RB.speak('🚂 A rocket goes 40,000 km/h — wow! It is very, very fast. Can you believe it?'); });
    await p.waitForTimeout(200);
    const s = await p.evaluate(() => __spoken);
    check(s.length >= 3 && s.every(u => u.voice === 'Samantha (Enhanced)'), 'should use the natural voice, one sentence at a time: ' + JSON.stringify(s));
    check(!/🚂/.test(s[0].text) && /kilometres an hour/.test(s.map(u => u.text).join(' ')), 'emoji skipped and units read out: ' + JSON.stringify(s));
    const plain = s.find(u => /\.$/.test(u.text)), excited = s.find(u => /!$/.test(u.text)), question = s.find(u => /\?$/.test(u.text));
    check(excited.pitch > plain.pitch && question.pitch > plain.pitch && plain.pitch > 1, 'excited sentences and questions should lift: ' + JSON.stringify(s));
    // the ☰ menu lists the good voices (not Fred, not French) and remembers the choice
    await p.click('#btnMenu'); await p.click('[data-m="voice"]'); await p.waitForTimeout(100);
    const names = await p.$$eval('.rb-voicebox button[data-v]', bs => bs.map(b => b.textContent));
    check(names.some(n => n.includes('Samantha')) && names.some(n => n.includes('David')) && !names.some(n => /Fred|Albert|fran/.test(n)), 'voice list: ' + names.join(', '));
    await p.click('.rb-voicebox button[data-v]:has-text("David")'); await p.waitForTimeout(100);
    check(/David/.test(await p.evaluate(() => localStorage.getItem('rb_voice'))), 'the chosen voice should be saved');
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await ctx.close();
  });

  await test('one mute setting for every game', async () => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto(url('floppy-bird.html'));
    await p.evaluate(() => RB.setMuted(true));
    for (const f of ['surfs-up.html', 'hamglider.html', 'space-wars.html', 'web-hero.html', 'sparkle-meadow.html', 'witch-way-out.html', 'flight-school.html', 'lucky-leo.html', 'lily-pad-lunch.html', 'pumpkin-pals.html', 'moto-rush.html', 'moto-mania.html', 'preschool/abc-train.html', '5th-grade/math.html']) {
      await p.goto(url(f));
      await p.waitForTimeout(300);
      check(await p.evaluate(() => RB.muted), f + ' is not muted');
      check((await p.textContent('#btnMute')) === '🔇', f + ' mute button shows sound on');
    }
    await ctx.close();
  });

  await test('/weather works on an old iPad (iOS 10.3): built scripts up to date, unlisted, polyfills stand in for the newer functions, no script errors', async () => {
    // the scripts are built from weather/src for Safari 10.1, and the page stays out of search
    check(require('child_process').spawnSync('node', [path.join(ROOT, 'tools/build-weather.js'), '--check']).status === 0, 'weather scripts are out of date: run node tools/build-weather.js');
    const html = fs.readFileSync(path.join(ROOT, 'weather/index.html'), 'utf8');
    check(/name="robots" content="noindex/.test(html) && html.indexOf('polyfills.js') < html.indexOf('app.js'), 'noindex, and polyfills.js loads before app.js');
    check(!/weather\//.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')), 'the arcade page does not link to /weather');
    // pretend to be old Safari: take away the newer functions (and flexbox gap) so the stand-ins have to do the work
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 } });
    await ctx.route(/^https?:/, r => r.abort());   // no network: NOAA can't be reached from the tests
    await ctx.addInitScript(() => {
      delete Array.prototype.at; delete Object.fromEntries; delete String.prototype.matchAll;
      delete Navigator.prototype.serviceWorker;   // iOS 10 has none (and file:// pages can't register one)
      const real = CSSStyleDeclaration.prototype.setProperty;
      Object.defineProperty(CSSStyleDeclaration.prototype, 'cssText', { set(v) { this.setProperty('display', /display:flex/.test(v) ? 'block' : ''); real.call(this, 'position', 'absolute'); }, configurable: true });
    });
    const p = await ctx.newPage(); const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(url('weather/index.html')); await p.waitForTimeout(2500);
    const r = await p.evaluate(() => ({
      at: [1, 2, 3].at(-1), from: JSON.stringify(Object.fromEntries([['a', 1], ['b', 2]])),
      all: Array.from('w 3 ft at 5 s, N 2 ft at 4 s'.matchAll(/(\d) ft at (\d)/g), m => m[1] + m[2]).join(' '),
      noGap: document.documentElement.classList.contains('no-flexgap'),
      dateKey: dateKey(new Date('2026-10-19T03:59:00Z')) + ' ' + dateKey(new Date('2026-10-19T04:00:00Z')),
      minutes: minutesOfDay(new Date('2026-07-01T18:30:00Z')), text: document.body.innerText.slice(0, 400) }));
    check(errors.length === 0, 'script errors: ' + errors.join(' | '));
    check(r.at === 3 && r.from === '{"a":1,"b":2}' && r.all === '35 24', 'the stand-ins for at / fromEntries / matchAll work: ' + JSON.stringify(r));
    check(r.noGap, 'no flexbox gap is noticed, so the margin fallbacks switch on');
    check(r.dateKey === '2026-10-18 2026-10-19' && r.minutes === 870, 'day keys and minutes come out right in Megansett time: ' + JSON.stringify(r));
    check(/Megansett Harbor/.test(r.text) && !/Loading forecast/.test(r.text), 'the page started and got past "Loading forecast…": ' + r.text.slice(0, 200));
    await p.screenshot({ path: path.join(OUT, 'weather-offline.png') });
    // if something breaks on a device, the page says what (file and line) instead of "Loading forecast…" for ever
    const broken = await ctx.newPage();
    await broken.addInitScript(() => { const Real = Intl.DateTimeFormat; Intl.DateTimeFormat = function (loc, o) { if (o && o.hour12 === false) throw new Error('no 24-hour clock here'); return new Real(loc, o); }; });
    await broken.goto(url('weather/index.html')); await broken.waitForTimeout(1200);
    const errBox = await broken.evaluate(() => (document.querySelector('#acts .plan-error') || {}).textContent || '');
    check(/couldn.t start/.test(errBox) && /no 24-hour clock here/.test(errBox) && /app\.js line \d+/.test(errBox), 'a script failure shows on the page with the file and line: ' + errBox);
    await broken.close();
    // the conditions strip (Air · Water · Wind · Tide) and the red Small Craft Advisory bar, fed made-up readings
    const strip = await p.evaluate(() => {
      const nowAbs = minutesOfDay(new Date()), later = new Date(Date.now() + 6 * 36e5).toISOString();
      const hilo = [{ abs: nowAbs - 200, min: 0, type: 'L', v: 0.2 }, { abs: nowAbs + 180, min: 600, type: 'H', v: 4.1 }];
      renderNow({ weather: { now: { temperature: 70, shortForecast: 'Partly Sunny', isDaytime: true, probabilityOfPrecipitation: { value: 20 } } }, waterTemp: 81.2, buoy: { time: new Date().toISOString(), spd: 12.4, gst: 18, dir: 225 }, tides: { hilo } });
      const cards = [...document.querySelectorAll('#now .cond-card')].map(c => (c.querySelector('b') ? c.querySelector('b').textContent + ' ' : (c.querySelector('svg.wx-icon') ? '☁ ' : '')) + c.querySelector('i').textContent);
      renderAlertBar([{ event: 'Small Craft Advisory', ends: later, description: 'Southwest winds 15 to 20 kt with gusts up to 25 kt.', instruction: 'Inexperienced mariners should avoid navigating.' },
        { event: 'Gale Watch', ends: later, description: 'Gales possible.' }], []);
      const bar = document.getElementById('alert-bar'), tile = document.querySelector('#now .cond');
      const first = tile.firstElementChild;
      const before = { tile: first.classList.contains('cond-alert') ? first.querySelector('b').textContent + ' ' + first.querySelector('i').textContent : '', red: getComputedStyle(first).backgroundColor, barHidden: bar.hidden };
      first.click();
      const opened = { shown: !bar.hidden, title: bar.querySelector('.alert-txt b').textContent, sub: bar.querySelector('.alert-txt span').textContent, detail: getComputedStyle(bar.querySelector('.alert-detail')).display, text: bar.querySelector('.alert-detail').textContent };
      return { cards, before, opened };
    });
    await p.screenshot({ path: path.join(OUT, 'weather-strip-alert.png') });
    const fromForecast = await p.evaluate(() => {
      const bar = document.getElementById('alert-bar');
      bar.querySelector('.alert-head').click();
      const closed = bar.hidden;
      renderNow({ weather: { now: { temperature: 70, shortForecast: 'Sunny', isDaytime: true } } });
      renderAlertBar([], ['SMALL CRAFT ADVISORY IN EFFECT FROM 2 PM EDT THIS AFTERNOON THROUGH SATURDAY EVENING']);
      const t = document.querySelector('#now .cond-alert').textContent.trim();
      renderNow({ weather: { now: { temperature: 70, shortForecast: 'Sunny', isDaytime: true } } });
      renderAlertBar([], []);
      return { closed, tile: t, clear: !document.querySelector('#now .cond-alert') && bar.hidden };
    });
    check(strip.cards.slice(0, 6).join(' | ') === '☁ Partly cloudy | 20% Rain | 70° Air | 81° Water | SW 12kt Wind | 10:00AM Next high', 'the strip reads the sky, chance of rain, Air, Water, Wind and the next tide: ' + strip.cards.join(' | '));
    check(/^\d{1,2}:\d\d(AM|PM) Sun(rise|set)$/.test(strip.cards[6]) && /^\d{1,3}% (Waxing|Waning|Full moon|New moon)$/.test(strip.cards[7]), 'then the next sunrise or sunset, and the moon: ' + strip.cards.slice(6).join(' | '));
    check(strip.before.tile === 'Gale Watch +1' && strip.before.red === 'rgb(217, 72, 15)' && strip.before.barHidden,
      'an alert tile leads the strip with the most serious alert (a gale watch outranks a small craft advisory; watches are orange), the panel waits: ' + JSON.stringify(strip.before));
    check(strip.opened.shown && strip.opened.title === 'Gale Watch' && /\+1 more/.test(strip.opened.sub) && strip.opened.detail === 'block' && /Small Craft Advisory/.test(strip.opened.text) && /Inexperienced mariners/.test(strip.opened.text),
      'tapping the tile opens every alert in the red panel: ' + JSON.stringify(strip.opened).slice(0, 220));
    check(fromForecast.closed && /Small Craft\s*Advisory/.test(fromForecast.tile) && fromForecast.clear, 'Close puts it away; a marine-forecast headline alone makes the tile; no alerts, no tile: ' + JSON.stringify(fromForecast));
    await ctx.close();
  });

  await test('/weather plan: activity verdicts with the best window, one timeline for the day, the week, settings, details, night look, and it all fits an iPad screen', async () => {
    // a made-up July Saturday at 9:30 AM: rain early this morning (only the grid's rain chance remembers it; the hourly forecast
    // starts now), so the roads are wet until late morning; the wind
    // building to 18 kt gusting 24 in the afternoon, 64° water; a stormy Sunday and a thundery Tuesday
    const fakeClock = () => {
      window.__T = Date.parse('2026-07-18T13:30:00Z');
      delete Navigator.prototype.serviceWorker;   // file:// pages can't register one
      const Real = Date;
      class FakeDate extends Real { constructor(...a) { super(...(a.length ? a : [window.__T])); } static now() { return window.__T; } }
      window.Date = FakeDate;
    };
    const feed = () => {
      const todayKey = dateKey(new Date()), H = 36e5, start = localMidnight(todayKey).getTime();
      const hours = [], wind = [], byDay = {};
      for (let t = start; t < start + 8 * 24 * H; t += H) {
        const d = Math.floor((t - start) / (24 * H)), m = minutesOfDay(new Date(t)), hr = m / 60;
        const temp = Math.round(66 + 12 * Math.max(0, Math.sin(Math.PI * (hr - 7) / 14)) + (d === 1 ? -6 : 0));
        let pop = d === 0 && hr >= 5 && hr < 9 ? 70 : d === 1 ? 80 : 5;
        const thunder = d === 3 && hr >= 13 && hr < 19;
        if (thunder) pop = 60;
        const isDay = hr >= 6 && hr < 20;
        const short = thunder ? 'Chance Showers And Thunderstorms' : pop >= 50 ? 'Rain Showers' : isDay ? (hr < 12 ? 'Sunny' : 'Partly Sunny') : 'Mostly Clear';
        hours.push({ t, temp, pop, short, isDay });
        const bump = Math.max(0, Math.sin(Math.PI * (hr - 11) / 9));
        const spd = d === 1 ? 22 : 7 + 11 * bump, gst = d === 1 ? 31 : spd + 2 + 4 * bump;
        wind.push({ t, spd, gst, dir: 225 });
        const key = addDays(todayKey, d);
        byDay[key] = byDay[key] || { day: { name: 'Day', temperature: 0, shortForecast: '', isDaytime: true, windDirection: 'SW', windSpeed: '10 mph', detailedForecast: '' }, night: { name: 'Night', temperature: 99, shortForecast: 'Clear', isDaytime: false, windDirection: 'SW', windSpeed: '5 mph', detailedForecast: '' } };
        if (temp > byDay[key].day.temperature) byDay[key].day.temperature = temp;
        if (temp < byDay[key].night.temperature) byDay[key].night.temperature = temp;
        if (hr === 14) byDay[key].day.shortForecast = short;
      }
      const curve = [], hilo = [];
      for (let a = 0; a < 8 * 1440; a += 30) {
        const v = +(2 + 1.8 * Math.sin(2 * Math.PI * (a - 200) / 745)).toFixed(2);
        curve.push({ key: addDays(todayKey, Math.floor(a / 1440)), min: a % 1440, v, dayIndex: Math.floor(a / 1440), abs: a });
      }
      for (let i = 1; i < curve.length - 1; i++) {
        const [p, c, n] = [curve[i - 1], curve[i], curve[i + 1]];
        if ((c.v >= p.v && c.v > n.v) || (c.v <= p.v && c.v < n.v)) hilo.push(Object.assign({}, c, { type: c.v > 2 ? 'H' : 'L' }));
      }
      const marine = { issueKey: todayKey, issued: '400 AM EDT SAT JUL 18 2026', headlines: [], synopsis: '', periods: [
        { label: 'TODAY', text: 'SW winds 10 to 15 kt. Seas 1 to 2 ft.', slots: [0] },
        { label: 'TONIGHT', text: 'SW winds 10 kt. Seas around 1 ft.', slots: [1] },
        { label: 'SUN', text: 'SW winds 20 to 25 kt. Seas 4 to 6 ft.', slots: [2] },
        { label: 'MON', text: 'W winds 10 kt. Seas 1 to 2 ft.', slots: [4] }] };
      window.__state = { days: Array.from({ length: 7 }, (_, i) => addDays(todayKey, i)), weather: { byDay, now: { temperature: hours[9].temp, shortForecast: hours[9].short, isDaytime: true, probabilityOfPrecipitation: { value: 10 } }, hours: hours.filter((h) => h.t >= Date.now() - H), wind, rainChance: hours.map((h) => ({ t: h.t, pop: h.pop })), cell: null },
        marine, tides: { curve, hilo, stats: null }, currents: null, waterTemp: 64, waterLevel: null, buoy: { time: new Date().toISOString(), spd: 9, gst: 12, dir: 225 }, alerts: [] };
      window.__info = { stale: [], missing: [], todayKey };
      renderNow(window.__state); renderPlan(window.__state, window.__info);
    };
    const read = p => p.evaluate(() => ({
      day: document.getElementById('plan-day').textContent,
      tiles: [...document.querySelectorAll('#acts .act')].map(a => ({ act: a.dataset.act, lv: (a.className.match(/lv-(\d)/) || [])[1], say: a.title, icon: !!a.querySelector('svg.act-ic'), bg: getComputedStyle(a).backgroundColor })),
      detail: (document.querySelector('#acts .act-detail') || {}).textContent || '', cells: document.querySelectorAll('#acts .ad-h').length,
      tl: { rain: document.querySelectorAll('#timeline .tl-rain').length, wind: !!document.querySelector('#timeline .tl-wind'), tide: !!document.querySelector('#timeline .tl-tide'), now: !!document.querySelector('#timeline .tl-now'), win: !!document.querySelector('#timeline .tl-win'), icons: document.querySelectorAll('#timeline svg svg').length, lows: [...document.querySelectorAll('#timeline .tl-val')].map(t => t.textContent).filter(t => /High|Low/.test(t)), hours: [...document.querySelectorAll('#timeline .tl-hour')].map(t => t.textContent), day: (document.querySelector('#timeline .tl-day') || {}).textContent || '' },
      week: [...document.querySelectorAll('#week .wk')].map(w => ({ day: w.querySelector('.wk-day').textContent, v: w.querySelector('.wk-v').textContent, title: w.title })),
      tileH: Math.max(...[...document.querySelectorAll('#acts .act')].map(a => a.getBoundingClientRect().height)),
      fits: { scroll: document.documentElement.scrollHeight, inner: innerHeight, weekBottom: Math.round(document.getElementById('week').getBoundingClientRect().bottom), footBottom: Math.round(document.querySelector('.plan-foot').getBoundingClientRect().bottom) },
      dark: document.documentElement.classList.contains('dark') }));

    for (const [w, h, name] of [[1024, 690, 'landscape'], [768, 946, 'portrait']]) {   // an iPad's Safari window, toolbars taken off
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      await ctx.route(/^https?:/, r => r.abort());
      await ctx.addInitScript(fakeClock);
      const p = await ctx.newPage(); const errors = [];
      p.on('pageerror', e => errors.push(e.message));
      await p.goto(url('weather/index.html')); await p.waitForTimeout(1500);
      await p.evaluate(feed); await p.waitForTimeout(300);
      // with an alert tile too, the conditions strip stays on the same line as "Megansett Harbor"
      const line = await p.evaluate(() => {
        renderAlertBar([{ event: 'Gale Warning', ends: new Date(Date.now() + 6 * 36e5).toISOString(), description: 'Gales.' }], []); fitPlan();
        const h = document.querySelector('.brand h1').getBoundingClientRect(), n = document.getElementById('now').getBoundingClientRect();
        return { sameLine: n.top < h.bottom && n.left > h.right, h1: Math.round(h.right), strip: [Math.round(n.left), Math.round(n.right)], width: innerWidth, red: getComputedStyle(document.querySelector('#now .cond-alert')).backgroundColor };
      });
      check(line.sameLine && line.strip[1] <= line.width && line.red === 'rgb(198, 40, 40)', `${name}: the strip (with a red Gale Warning tile) sits on the same line as the title: ` + JSON.stringify(line));
      const r = await read(p);
      check(errors.length === 0, name + ': script errors: ' + errors.join(' | '));
      check(r.fits.footBottom <= r.fits.inner + 1 && r.fits.scroll <= r.fits.inner + 1, `${name}: everything fits one ${w}×${h} screen: ` + JSON.stringify(r.fits));
      check(r.tileH <= 60, `${name}: activity tiles are small (${Math.round(r.tileH)}px)`);
      if (name === 'portrait') { await p.screenshot({ path: path.join(OUT, 'weather-plan-portrait.png') }); await ctx.close(); continue; }

      await p.screenshot({ path: path.join(OUT, 'weather-plan.png') });
      const t = Object.fromEntries(r.tiles.map(x => [x.act, x]));
      check(r.day === 'Today' && r.tiles.length === 4, 'today, four activities: ' + JSON.stringify(r.tiles.map(x => x.act)));
      check(t.boating.lv === '0' && /best (9|10) AM–(12|1|2) PM/.test(t.boating.say) && /SW .*kt, seas 1–2 ft/.test(t.boating.say), 'boating: go in the morning before the wind builds: ' + JSON.stringify(t.boating));
      check(r.tiles.every(x => x.icon) && t.boating.bg === 'rgb(223, 238, 226)' && t.swimming.bg === 'rgb(245, 237, 207)', 'each tile is its icon in a muted green / yellow / red box: ' + JSON.stringify(r.tiles.map(x => x.act + ' ' + x.bg)));
      check(!r.detail, 'the tiles start closed');
      // tap Boating: it opens under the row with the verdict, the best window, every hour and your limits; still one screen
      await p.click('#acts .act[data-act="boating"]'); await p.waitForTimeout(200);
      const open1 = await read(p);
      check(/Boating: Go/.test(open1.detail) && /best (9|10) AM/.test(open1.detail) && /seas 1–2 ft/.test(open1.detail) && open1.cells >= 6 && /Your limits: wind up to 15 kt/.test(open1.detail), 'tapping Boating opens its detail: ' + open1.detail.replace(/\s+/g, ' ').slice(0, 200) + ' cells ' + open1.cells);
      check(open1.fits.footBottom <= open1.fits.inner + 1, 'opened, it all still fits one screen: ' + JSON.stringify(open1.fits));
      await p.screenshot({ path: path.join(OUT, 'weather-plan-open.png') });
      await p.click('#acts .act[data-act="boating"]'); await p.waitForTimeout(200);
      check(!(await read(p)).detail, 'tapping it again closes it');
      check(t.swimming.lv === '1' && /Water 64°/.test(t.swimming.say), 'swimming: caution, the water is 64°: ' + JSON.stringify(t.swimming));
      check(t.rollerblading.lv === '0' && /best 11 AM/.test(t.rollerblading.say), 'rollerblading: wet roads until the morning rain has had two hours to dry: ' + JSON.stringify(t.rollerblading));
      check(t.running.lv === '0', 'running: a go: ' + JSON.stringify(t.running));
      check(r.tl.rain > 0 && r.tl.wind && r.tl.tide && r.tl.now && r.tl.win && r.tl.icons >= 4 && r.tl.lows.join() === 'Low 12:30p,High 7p', 'the timeline has sky, rain, wind, tide (with highs and lows), now and the best window: ' + JSON.stringify(r.tl));
      check(r.tl.hours[0] === '10a' && r.tl.hours[r.tl.hours.length - 1] === '8p' && !r.tl.day, 'at 9:30 AM the timeline runs from just before now to 12 hours ahead (10a … 8p), no midnight: ' + JSON.stringify(r.tl.hours));
      const sun = r.week[0], tue = r.week[2];
      check(r.week.length === 6 && /Not today/.test(sun.v) && /Boating/.test(sun.title), 'the week: six days, and stormy Sunday is not a boating day: ' + JSON.stringify(r.week.slice(0, 3)));
      // tap Running: the timeline and the week follow it
      await p.click('#acts .act[data-act="running"]'); await p.waitForTimeout(200);
      const r2 = await read(p);
      check(/Running/.test(r2.week[0].title) && /Not today/.test(r2.week[0].v) && /Go/.test(r2.week[2].v) && /best \d+ AM–1 PM/.test(r2.week[2].title), 'tapping Running: the week shows running (rainy Sunday; Tuesday, go in the morning before the 1 PM thunderstorms): ' + JSON.stringify(r2.week.slice(0, 3)));
      void tue;
      // settings: swap rollerblading for kayak & SUP, and swim in colder water
      await p.click('#open-settings'); await p.waitForTimeout(150);
      await p.click('input[data-show="rollerblading"]'); await p.click('input[data-show="paddling"]');
      await p.fill('input[data-act="swimming"][data-limit="water"]', '62'); await p.press('input[data-act="swimming"][data-limit="water"]', 'Tab');
      await p.click('#close-settings'); await p.waitForTimeout(200);
      const r3 = await read(p);
      const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('cv:plan')));
      check(r3.tiles.map(x => x.act).join() === 'boating,swimming,running,paddling' && r3.tiles[1].lv === '0' && saved.limits.swimming.water === 62, 'settings change the activities and limits, and are saved: ' + JSON.stringify({ tiles: r3.tiles.map(x => x.act + x.lv), saved }));
      // a day in the week opens the details at that day; back to today
      await p.click('#week .wk'); await p.waitForTimeout(300);
      const det = await p.evaluate(() => ({ plan: document.getElementById('plan').hidden, details: document.getElementById('details').hidden, map: !!document.querySelector('#source-map .leaflet-container, #source-map.leaflet-container') }));
      await p.click('#close-details'); await p.waitForTimeout(200);
      check(det.plan && !det.details && det.map && !(await p.evaluate(() => document.getElementById('plan').hidden)), 'a week day opens the 7-day details (and the map then); back returns to the plan: ' + JSON.stringify(det));
      // after sunset: the night look, and the plan turns to tomorrow
      await p.evaluate(() => { window.__T = Date.parse('2026-07-19T01:30:00Z'); renderPlan(window.__state, window.__info); });
      const night = await read(p);
      check(night.dark && night.day === 'Tomorrow', 'after sunset: dark, and planning tomorrow: ' + JSON.stringify({ dark: night.dark, day: night.day }));
      check(night.tl.hours[0] === '10p' && night.tl.hours[night.tl.hours.length - 1] === '8a' && night.tl.day === 'Sun' && night.tl.lows.some(t => /High 7:30a/.test(t)), 'at 9:30 PM the timeline shows the night and tomorrow morning (10p … 8a), midnight marked Sun, and the morning high tide: ' + JSON.stringify(night.tl));
      await p.screenshot({ path: path.join(OUT, 'weather-plan-night.png') });
      check(errors.length === 0, 'script errors: ' + errors.join(' | '));
      await ctx.close();
    }
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
