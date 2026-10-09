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
    for (const f of ['index.html', 'space-wars.html', 'floppy-bird.html', 'surfs-up.html', 'hamglider.html', 'web-hero.html', 'sparkle-meadow.html', 'witch-way-out.html', 'flight-school.html', 'share.html']) {
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

  await test('Hamglider: autopilot lands on the target in every round of all three worlds', async () => {
    const p = await open(browser, 'hamglider.html', { viewport: { width: 480, height: 270 } });
    const r = await p.evaluate(() => {
      const out = [];
      for (let w = 0; w < 3; w++) {
        startGame(w);
        const landed = [];
        let last = '';
        for (let i = 0; i < 60 * 600 && state !== 'end'; i++) {
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
          if (state !== last && state === 'roll' && surf.target) landed.push(round + 1);
          last = state;
        }
        out.push({ world: world.id, state, total, landed: landed.length, stars: save.stars[world.id] });
      }
      return out;
    });
    for (const w of r) {
      check(w.state === 'end', w.world + ' did not finish');
      check(w.landed === 3, `${w.world}: landed on the target in ${w.landed} of 3 rounds`);
      check(w.total > 0 && w.stars >= 1, `${w.world}: total ${w.total}, stars ${w.stars}`);
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
      return out;
    });
    check(r.curve[0] < -8 && r.curve[2] > 8 && Math.abs(r.curve[1]) < 1, 'takeoff did not curve: ' + r.curve.map(Math.round));
    check(r.island && r.island.pts === 15, 'island landing scored ' + JSON.stringify(r.island));
    check(r.secret.found && r.secret.egg && r.secret.ball, 'secret: ' + JSON.stringify(r.secret));
    check(r.replay.pts === 100 && r.replay.seen.includes('replay') && r.replay.round === 1, 'replay: ' + JSON.stringify(r.replay));
    check(r.lava.seen.includes('burn') && r.lava.text === 'TOO HOT!', 'lava: ' + JSON.stringify(r.lava));
    await done(p, 'hamglider-features.png');
  });

  await test('Hamglider: worlds unlock in order, and "Unlock all" opens every world and ball', async () => {
    const p = await open(browser, 'hamglider.html', { viewport: { width: 960, height: 600 } });
    await p.click('#btnPlay');
    check(await p.$$eval('.world.locked', els => els.length) === 2, 'lava and storm should start locked');
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
    await padHold(p, 'B', true); await p.waitForTimeout(1500); await padHold(p, 'B', false);
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

  await test('one mute setting for every game', async () => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto(url('floppy-bird.html'));
    await p.evaluate(() => RB.setMuted(true));
    for (const f of ['surfs-up.html', 'hamglider.html', 'space-wars.html', 'web-hero.html', 'sparkle-meadow.html', 'witch-way-out.html', 'flight-school.html', '5th-grade/math.html']) {
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
