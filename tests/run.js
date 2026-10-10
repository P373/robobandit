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
    for (const f of ['index.html', 'space-wars.html', 'floppy-bird.html', 'surfs-up.html', 'hamglider.html', 'web-hero.html', 'sparkle-meadow.html', 'witch-way-out.html', 'flight-school.html', 'lucky-leo.html', 'share.html']) {
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
    check(await p.evaluate(() => paused), '☰ should pause');
    await padTap(p, 'A');
    check(await p.evaluate(() => !paused), 'Ⓐ on Keep Playing should resume');
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
    check(await p.evaluate(() => paused && document.querySelector('.rb-pad-focus')?.classList.contains('rb-home')), 'View once should pause with "All games" highlighted');
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
    // settings: invert the left stick's up/down and the right stick's up/down, switch vibration off
    await p.click('[data-k="invLY"]'); await p.click('[data-k="invRY"]'); await p.click('[data-k="rumble"]');
    const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('rb_pad')));
    check(saved.invLY && saved.invRY && !saved.rumble, 'settings should save: ' + JSON.stringify(saved));
    await padTap(p, 'B'); await p.waitForTimeout(100);
    check(await p.evaluate(() => !document.querySelector('.rb-padscreen') && state === 'title'), 'Ⓑ should close the screen');
    await p.evaluate(() => startGame()); await p.waitForTimeout(200);
    await p.evaluate(() => { __pad.axes[1] = -0.9; __pad.axes[3] = -0.9; }); await p.waitForTimeout(200);
    const r = await p.evaluate(() => ({ stickY: stick.y, lookY: RB.pad.look.y }));
    check(r.stickY > 0.3 && r.lookY > 0.3, 'pushing both sticks up should now count as down (inverted): ' + JSON.stringify(r));
    await p.evaluate(() => { __pad.axes[1] = 0; __pad.axes[3] = 0; window.__rumbles = 0; RB.noise(0.3, 0.5); });
    check(await p.evaluate(() => !window.__rumbles), 'vibration off should stop the rumble');
    // the pause menu has the controller screen too, and closing it returns to the pause menu
    await padTap(p, 'MENU');
    await p.click('.rb-pause .rb-extra'); await p.waitForTimeout(150);
    check(await p.evaluate(() => !!document.querySelector('.rb-padscreen')), 'the pause menu should open the controller screen');
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    check(await p.evaluate(() => paused && document.querySelector('.rb-pause') && document.querySelector('.rb-pause').style.display === ''), 'closing it should go back to the pause menu, still paused');
    await p.evaluate(() => { localStorage.removeItem('rb_pad'); });
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await p.screenshot({ path: path.join(OUT, 'witch-controller.png') });
    await ctx.close();
  });

  await test('Witch Way Out race: hat bonks a witch and comes back, LT boosts with dust, boxes give power-ups, a racer using them wins', async () => {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
    await ctx.addInitScript(fakePad);
    const p = await ctx.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(url('witch-way-out.html')); await p.waitForTimeout(1000);
    // the countdown holds everyone on the line
    const c = await p.evaluate(() => { startGame(); const z = pos.z, fz = friends[0].z; for (let i = 0; i < 60; i++) update(1 / 60); return { moved: pos.z !== z || friends[0].z !== fz, countT }; });
    check(!c.moved && c.countT > 1, 'nobody should move before GO: ' + JSON.stringify(c));
    // Ⓧ throws the hat at a witch in range: she falls off, and the hat comes back
    await p.evaluate(() => { countT = 0; introT = 0; for (let i = 0; i < 10; i++) { update(1 / 60); updateVisuals(1 / 60); }
      const f = friends[0]; f.z = pos.z - 18; f.off = pos.x - lineX(f.z); f.offY = pos.y - lineY(f.z); f.ph = -clock * 0.35; f.knockT = 0; f.nextThrow = 99;
      friends.slice(1).forEach(o => { o.z = pos.z - 300; }); update(1 / 60); updateVisuals(1 / 60); });
    check(await p.evaluate(() => lockMesh.visible), 'a witch just ahead should be marked as in range');
    await padTap(p, 'X');
    const h = await p.evaluate(() => {
      const out = { thrown: projectiles.some(x => x.kind === 'hat') && !me.userData.hat.visible };
      for (let i = 0; i < 60 * 4 && !(out.hit && me.userData.hat.visible); i++) { update(1 / 60); updateVisuals(1 / 60); if (friends[0].knockT > 0) out.hit = true; }
      out.back = me.userData.hat.visible && !projectiles.some(x => x.kind === 'hat');
      return out;
    });
    check(h.thrown && h.hit && h.back, 'the hat should fly, bonk the witch and come back: ' + JSON.stringify(h));
    // LT boosts: faster, the meter drains, magic dust behind
    await p.evaluate(() => { magic = 1; });
    await padHold(p, 'LT', true); await p.waitForTimeout(500);
    const b = await p.evaluate(() => { for (let i = 0; i < 40; i++) { update(1 / 60); updateVisuals(1 / 60); } let lit = 0; for (let i = 0; i < DUST_N; i++) if (dustAge[i] < DUST_LIFE) lit++; return { boosting, magic, speed, lit }; });
    await padHold(p, 'LT', false);
    check(b.boosting && b.magic < 0.95 && b.speed > 36 && b.lit > 20, 'LT should boost with a dust trail: ' + JSON.stringify(b));
    // a magic box rolls a power-up; Ⓑ uses it (the bats chase the leader)
    const it = await p.evaluate(() => {
      const box = boxes.find(x => x.z < pos.z - 30); pos.set(box.x, box.mesh.position.y, box.z + 0.5); friends.forEach(f => { f.knockT = 0; });
      update(1 / 60);
      for (let i = 0; i < 80; i++) update(1 / 60);
      const got = item;
      item = 'bats'; const lead = friends[2]; friends.forEach(f => { f.z = pos.z + 20; f.nextThrow = 99; }); lead.z = pos.z - 60;
      return { got, lead: lead.name };
    });
    check(it.got && ['rocket', 'bats', 'potion', 'cloak', 'triple', 'web'].includes(it.got), 'a box should give a power-up: ' + JSON.stringify(it));
    await padTap(p, 'B');
    const bats = await p.evaluate(lead => { const f = friends.find(x => x.name === lead); let hit = false;
      for (let i = 0; i < 60 * 6 && !hit; i++) { update(1 / 60); if (f.knockT > 0) hit = true; } return { used: item === null, hit }; }, it.lead);
    check(bats.used && bats.hit, 'Ⓑ should send the bats after the leader: ' + JSON.stringify(bats));
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

  await test('every game has the ☰ menu: it pauses, lists every game and folder, and closes with Esc or Ⓑ', async () => {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 600 } });
    await ctx.addInitScript(fakePad);
    const p = await ctx.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    for (const f of ['space-wars.html', 'floppy-bird.html', 'surfs-up.html', 'hamglider.html', 'web-hero.html', 'sparkle-meadow.html', 'witch-way-out.html', 'flight-school.html', 'lucky-leo.html', 'preschool/abc-train.html', '5th-grade/math.html', '2nd-grade/math.html']) {
      await p.goto(url(f)); await p.waitForTimeout(300);
      check(await p.evaluate(() => document.querySelectorAll('.rb-topbar #btnMenu').length === 1), f + ' should have one menu button');
    }
    await p.goto(url('witch-way-out.html')); await p.waitForTimeout(500);
    await p.evaluate(() => { startGame(); countT = 0; introT = 0; });
    await p.click('#btnMenu'); await p.waitForTimeout(150);
    const m = await p.evaluate(() => ({ paused, games: document.querySelectorAll('.rb-menu-game').length, cur: document.querySelector('.rb-menu .cur').textContent,
      pauseHidden: document.querySelector('.rb-pause').style.display === 'none', hrefs: [...document.querySelectorAll('.rb-menu a')].map(a => a.href) }));
    check(m.paused && m.pauseHidden, 'opening the menu should pause the game: ' + JSON.stringify(m));
    check(m.games === 13 && m.cur.includes('Witch Way Out'), 'the menu should list 10 games and 3 folders, marking this one: ' + JSON.stringify(m));
    check(m.hrefs.every(h => fs.existsSync(h.replace('file://', '').split('#')[0])), 'every menu link should go to a real page: ' + m.hrefs.join(' '));
    await p.keyboard.press('p'); await p.waitForTimeout(100);
    check(await p.evaluate(() => paused && !!document.querySelector('.rb-menu')), 'keys should not reach the game while the menu is open');
    await padTap(p, 'B'); await p.waitForTimeout(100);
    check(await p.evaluate(() => !document.querySelector('.rb-menu') && paused && document.querySelector('.rb-pause').style.display === ''), 'Ⓑ should close the menu, back to the pause screen');
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
        }
        for (const e of L.ents) {
          if (e.k === 'plat' || e.k === 'fall') for (let ox = -(e.dx || 0); ox <= (e.dx || 0) + (e.w || 3) - 1; ox++) for (let oy = -(e.dy || 0); oy <= (e.dy || 0); oy++) stand.add(k(e.x + ox, e.y - 1 + oy));
          if (e.k === 'spring') springs.add(k(e.x, e.y));
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
        const keyE = L.ents.find(e => e.k === 'key');
        out[id] = { far, goal: L.goal || 178, gems: L.ents.filter(e => e.k === 'gem').length, key: keyE ? [...seen].some(q => { const [a, b] = q.split(',').map(Number); return Math.abs(a - keyE.x) <= 1 && Math.abs(b - keyE.y) <= 1; }) : null };
      }
      return out;
    });
    for (const [id, v] of Object.entries(r)) {
      check(v.far >= v.goal, `${id}: Leo can only get as far as tile ${v.far}, the goal is at ${v.goal}`);
      check(v.gems === 5, `${id} should have 5 rainbow gems, has ${v.gems}`);
    }
    check(r.caves.key === true, 'the golden key in Glimmer Caves should be reachable');
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
      for (let h = 0; h < 3; h++) { player.inv = 9; run(100); player.x = b.x + 8; player.y = b.y - 30; player.vy = 150; run(8); }
      out.boss = b.hp;
      run(60 * 3);
      const pot = ents.find(e => e.k === 'pot'); out.pot = !!pot;
      if (pot) { player.x = pot.x; player.y = pot.y; run(5); }
      out.ending = { state, beaten: save.beaten, best: +localStorage.getItem('ll_best') };
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
    check(r.boss === 0 && r.pot && r.ending.state === 'ending' && r.ending.beaten && r.ending.best > 0, 'three stomps beat King Grumbles, then the pot of gold: ' + JSON.stringify(r));
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
      // corner forgiveness: a jump that only clips the edge of a block slides round it
      startLevel('hills'); ents = ents.filter(e => !isEnemy(e)); player.x = 12 * 16 - player.w + 3; run(10);
      let top = player.y; pressed.jump = true; keys.jump = true; run(50, () => { top = Math.min(top, player.y); }); keys.jump = false; run(40);
      out.corner = top < 8 * 16 - 4;
      // ledge help: falling just short of the top of a step, walking into it steps up
      startLevel('hills'); ents = ents.filter(e => !isEnemy(e)); player.x = 60 * 16 - player.w - 1; player.y = 11 * 16 - player.h + 3; player.vy = 20; player.vx = 90; player.ground = false;
      keys.right = true; run(3); keys.right = false; out.ledge = player.y + player.h <= 11 * 16 + 0.5;
      startLevel('hills'); const gob = ents.find(e => e.k === 'grumblin'); player.x = gob.x; player.y = gob.y - 50; player.vy = 0; run(2); pressed.down = true; run(40);
      out.poundGob = !!gob.flip;
      startLevel('hills'); player.x = 12 * 16 + 2; player.y = 5 * 16; player.vy = 0; run(2); pressed.down = true; run(50);
      out.poundBlock = tileAt(12, 8) === T.USED;
      startLevel('hills'); const g2 = ents.find(e => e.k === 'grumblin'); player.x = g2.x - 60; player.face = 1; run(2); pressed.hat = true; run(1);
      out.thrown = player.hatless && ents.some(e => e.k === 'cap');
      run(30); out.hatHit = !!g2.flip;
      run(120); out.hatBack = !player.hatless && !ents.some(e => e.k === 'cap');
      startLevel('hills'); player.x = 8 * 16; run(10); pressed.hat = true; run(1); keys.jump = true; pressed.jump = true; run(18); keys.jump = false;
      const cap = ents.find(e => e.k === 'cap');
      if (cap) { cap.st = 'hover'; cap.hoverT = 0; player.x = cap.x; player.y = cap.y - player.h - 2; player.vy = 80; run(3); out.capBounce = !!cap.bounced && player.vy < -200; }
      paused = false; return out;
    });
    check(r.high > r.jump * 1.6, 'the high jump should go much higher: ' + JSON.stringify(r));
    check(r.spin.h > r.jump + 10 && r.spin.h < r.high && r.spin.spins === 1 && r.spin.landed, 'a spin at the top should go a little higher: ' + JSON.stringify(r));
    check(r.corner && r.ledge, 'corner and ledge forgiveness (like Mario): ' + JSON.stringify(r));
    check(r.spin2.spins === 1 && Math.abs(r.spin2.h - r.spin.h) < 3, 'only one spin a jump: ' + JSON.stringify(r));
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
      // the box at the top: a saved clover drops when asked for
      reserve = 'clover'; pressed.item = true; run(1); out.recalled = reserve === null && ents.some(e => e.k === 'clover' && e.drop);
      // down a hollow tree into its bonus room, and back out of a log further on
      startLevel('hills'); ents = ents.filter(e => !isEnemy(e)); const w = ents.find(e => e.k === 'warp');
      player.x = w.x + 10; player.y = w.y - 30; run(40); keys.down = true; downFrom = 'KeyS'; run(60); keys.down = false; run(30);
      out.room = lvl.id;
      const ex = ents.find(e => e.k === 'exit'); player.x = ex.x + 10; player.y = ex.y - 30; run(40); keys.down = true; run(60); keys.down = false; run(60);
      out.back = lvl.id === 'hills' && Math.abs(player.x / 16 - w.out[0]) < 2 && player.ground && phase === 'play';
      // the hat: thrown up while looking up, and low along the ground while crouching
      startLevel('hills'); ents = ents.filter(e => !isEnemy(e)); player.x = 6 * 16; run(20);
      keys.up = true; pressed.hat = true; run(1); const capU = ents.find(e => e.k === 'cap'); out.capUp = !!capU && capU.vy < -200; keys.up = false; run(120);
      setForm(1); run(5); keys.down = true; downFrom = 'KeyS'; run(3); pressed.hat = true; run(1); const capL = ents.find(e => e.k === 'cap');
      out.capLow = !!capL && capL.low && capL.y > player.y + player.h - 12; keys.down = false; run(120);
      paused = false; return out;
    });
    check(r.carried && r.thrown, 'pick up a shell by holding run, throw it by letting go: ' + JSON.stringify(r));
    check(r.highPound, 'the ground pound should work above the top of the screen: ' + JSON.stringify(r));
    check(r.recalled, 'the saved power-up should drop from the box: ' + JSON.stringify(r));
    check(r.room === 'hillsTree' && r.back, 'down the hollow tree into the room and back out further on: ' + JSON.stringify(r));
    check(r.capUp && r.capLow, 'the hat should go up when looking up and low when crouching: ' + JSON.stringify(r));
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

  await test('Lucky Leo World 2: beating Goblin Castle opens the Frosty Isle across the sea; the Frost Fortress is the real ending', async () => {
    const p = await open(browser, 'lucky-leo.html', { viewport: { width: 960, height: 540 } });
    const r = await p.evaluate(() => {
      localStorage.removeItem('ll_save'); for (const k in save.cleared) delete save.cleared[k];
      startGame(); const before = nodeOpen(node('shore'));
      startLevel('castle'); winGame();
      const end1 = { title: document.querySelector('#ending h1').textContent, btn: document.getElementById('btnMapAgain').textContent };
      document.getElementById('btnMapAgain').click();
      const after = { state, shore: nodeOpen(node('shore')), snow: nodeOpen(node('snow')), at: mapLeo.at };
      startLevel('fort'); const boss = ents.find(e => e.k === 'boss'); const hp = boss.hp;
      ['shore', 'snow', 'night'].forEach(id => { save.cleared[id] = true; }); winGame();
      const end2 = { title: document.querySelector('#ending h1').textContent, beaten2: save.beaten2 };
      return { before, end1, after, hp, end2, slippery: !!LEVELS.snow.slippery, levels: ['shore', 'snow', 'night', 'fort'].every(id => ORDER.includes(id)) };
    });
    check(!r.before && /WORLD 1/.test(r.end1.title) && /World 2/.test(r.end1.btn), 'Goblin Castle should finish World 1 and offer World 2: ' + JSON.stringify(r));
    check(r.after.state === 'map' && r.after.shore && !r.after.snow && r.after.at === 'castle', 'the path to Seashell Shore should open: ' + JSON.stringify(r));
    check(r.hp === 4 && /GOLD/.test(r.end2.title) && r.end2.beaten2 && r.slippery && r.levels, 'the Frost Fortress should be the tougher final ending: ' + JSON.stringify(r));
    await done(p, 'lucky-leo-world2.png');
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
    check(await p.evaluate(() => state === 'level' && lvl.id === 'hills'), 'Ⓐ on the map should start Clover Hills');
    await p.waitForTimeout(300);
    await padHold(p, 'A', true); await p.waitForTimeout(120);
    const air = await p.evaluate(() => !player.ground && player.vy < 0);
    await padHold(p, 'A', false); await p.waitForTimeout(800);
    await p.evaluate(() => { ents = ents.filter(e => !isEnemy(e)); __pad.axes[0] = 1; }); await padHold(p, 'X', true); await p.waitForTimeout(1200);
    const fast = await p.evaluate(() => player.vx);
    await padHold(p, 'X', false); await p.evaluate(() => { __pad.axes[0] = 0; });
    check(air && fast > 120, 'Ⓐ should jump and Ⓧ + stick should run: ' + JSON.stringify({ air, fast }));
    check(errors.length === 0, 'page errors: ' + errors.join(' | '));
    await ctx.close();
    // on a phone: the game sits at the top like a handheld, with the buttons underneath
    const ph = await browser.newContext({ ...PHONE });
    const q = await ph.newPage();
    await q.goto(url('lucky-leo.html')); await q.waitForTimeout(500);
    await q.tap('#btnPlay'); await q.waitForTimeout(400);
    const pt = await q.evaluate(() => { const n = node('hills'), dpr = canvas.width / innerWidth; return { x: (n.x - mapCam) * scale / dpr, y: (n.y * scale + offY) / dpr }; });
    await q.touchscreen.tap(pt.x, pt.y); await q.waitForTimeout(200); await q.touchscreen.tap(pt.x, pt.y); await q.waitForTimeout(500);
    check(await q.evaluate(() => state === 'level' && !document.getElementById('touch').classList.contains('hidden')), 'tapping Clover Hills twice should start it, with the touch buttons showing');
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
    for (const f of ['surfs-up.html', 'hamglider.html', 'space-wars.html', 'web-hero.html', 'sparkle-meadow.html', 'witch-way-out.html', 'flight-school.html', 'lucky-leo.html', 'preschool/abc-train.html', '5th-grade/math.html']) {
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
