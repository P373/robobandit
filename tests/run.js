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
      startGame(); introT = 0;
      for (let i = 0; i < 60 * 300 && state === 'fly'; i++) {
        keys.l = keys.r = keys.u = keys.d = false;
        if (strat === 'pilot') {
          const z = pos.z - 35, wantYaw = Math.atan2(-(lineX(z) - pos.x), -(z - pos.z));
          if (wantYaw - yaw < -0.05) keys.r = true; else if (wantYaw - yaw > 0.05) keys.l = true;
          const wp = Math.atan2(lineY(z) - pos.y, 35);
          if (wp - pitch > 0.05) keys.u = true; else if (wp - pitch < -0.05) keys.d = true;
          if (strike && strike.t < 0.6) castShield();
        }
        update(1 / 60);
      }
      return { state, caught: caughtCount, rings: ringCount };
    }, strat);
    const good = await fly('pilot');
    check(good.state === 'over' && good.caught === 0, 'pilot: ' + JSON.stringify(good));
    const idle = await fly('idle');
    check(idle.caught > 0, 'doing nothing should get caught at least once: ' + JSON.stringify(idle));
    check(idle.state === 'over', 'the pumpkin should ease off so everyone can finish: ' + JSON.stringify(idle));
    await done(p, 'witch-way-out.png');
  });

  await test('Flight School: every lesson draws, autopilots fly each round, the quiz saves progress', async () => {
    const p = await open(browser, 'flight-school.html', { viewport: { width: 960, height: 600 } });
    await p.click('#go');
    // every lesson slide and its animated diagram
    const slides = await p.evaluate(() => {
      let n = 0;
      LEVELS.forEach((L, i) => L.slides.forEach((_, s) => { cur = i; slide = s; lessonScreen(); drawDiagram(1.3); n++; }));
      return n;
    });
    check(slides >= 25, slides + ' slides');
    // autopilots: each round can be won, and every round ends even if you do nothing
    const runs = await p.evaluate(() => {
      const bot = (i, r) => {
        const px = PX();
        if (i === 0 || i === 2 || i === 3) {
          let tgt = [220, 0, 260, 230][i];
          const bad = r.objs.filter(o => ['bird', 'gull', 'storm'].includes(o.k) && o.x - r.dist > px - 40 && o.x - r.dist < px + (i ? 260 : 330)).sort((a, b) => a.x - b.x)[0];
          if (bad && Math.abs(bad.y - tgt) < 90) tgt = bad.y > tgt ? bad.y - 110 : bad.y + 110;
          const fuel = r.objs.find(o => o.k === 'fuel' && o.x - r.dist > px && o.x - r.dist < px + 250);
          if (fuel && !bad) tgt = fuel.y;
          tgt = clamp(tgt, 100, H - 150);
          keys.Space = r.y + r.vy * (i ? 0.15 : 0.8) > tgt;
        }
        if (i === 1) { const th = r.therm.find(t => Math.abs(t.x - (r.dist + px)) < t.w / 2); keys.Space = !r.stall && (th ? r.v > 110 : (r.v > 200 && r.y > 200)); }
        if (i === 4) { const ring = r.objs.find(o => o.k === 'ring' && !o.passed); if (ring) { keys.ArrowUp = ring.y < r.y - 8; keys.ArrowDown = ring.y > r.y + 8; } }
        if (i === 5) {
          if (r.fuel <= 0 && r.launch <= 0 && r.emptyT > 0.3) r.tap();
          const bad = r.objs.filter(o => o.k !== 'star' && o.y + r.scroll < H * 0.68 && o.y + r.scroll > H * 0.68 - 260 && Math.abs(o.x - r.x) < 60)[0];
          if (bad) keys[bad.x > r.x ? 'ArrowLeft' : 'ArrowRight'] = true;
        }
        if (i === 6) {
          const dx = (r.pad.x1 + r.pad.x2) / 2 - r.x, want = clamp(dx * 0.4, -40, 40);
          // until over the pad, stay well above any peak between here and it
          const lo = Math.min(r.x, r.pad.x1) - 40, hi = Math.max(r.x, r.pad.x2) + 40;
          const peak = Math.min(...r.pts.filter(q => q.x > lo && q.x < hi && (q.x < r.pad.x1 || q.x > r.pad.x2)).map(q => q.y), r.pad.y);
          const h = Math.abs(dx) > 30 ? peak - 70 - r.y : r.pad.y - r.y;
          keys.ArrowRight = r.vx < want - 4; keys.ArrowLeft = r.vx > want + 4;
          keys.ArrowUp = r.vy > Math.min(60, 12 + h * 0.12) || (Math.abs(dx) > 40 && h < 120 && r.vy > 0);
        }
      };
      const out = [];
      for (const pilot of [true, false]) for (let i = 0; i < 7; i++) {
        cur = i; startRound(true);
        for (let f = 0; f < 60 * 150 && mode === 'play'; f++) { clearInput(); if (pilot) bot(i, round); update(1 / 60); }
        out.push({ i, pilot, ended: mode === 'roundEnd', win: round.win, score: round.results().reduce((a, r) => a + r[1], 0) });
      }
      return out;
    });
    for (const r of runs) {
      check(r.ended, `level ${r.i + 1} round never ended: ` + JSON.stringify(r));
      if (r.pilot) check(r.win, `autopilot lost level ${r.i + 1}: ` + JSON.stringify(r));
    }
    // quiz: 3 of 4 right gives 2 stars, saves the score and unlocks the next level
    await p.evaluate(() => { localStorage.clear(); save.best = []; save.stars = []; save.unlocked = 1; cur = 0; startRound(true); round.over = true; round.end = 'test'; round.endT = 2; update(0.01); });
    await p.click('#quiz');
    for (let q = 0; q < 4; q++) {
      const k = await p.evaluate(() => quiz[qi].opts.findIndex(o => o.right));
      await p.click(`.ans[data-k="${q === 0 ? (k + 1) % 3 : k}"]`);
      await p.click('#nextQ');
    }
    const saved = await p.evaluate(() => [JSON.parse(localStorage.getItem('fs_save')), +localStorage.getItem('fs_best'), save.best[0]]);
    check(saved[0].stars[0] === 2 && saved[0].unlocked === 2 && saved[1] === saved[2] && saved[2] >= 300, JSON.stringify(saved));
    await done(p, 'flight-school.png');
  });

  await test('Flight School on a phone: hold to fire the burner, STAGE button, joystick lander', async () => {
    const p = await open(browser, 'flight-school.html', PHONE);
    await p.evaluate(() => { cur = 0; startRound(true); });
    const up = await touchDrag(p, 200, 400, 200, 400);
    await p.waitForTimeout(600);
    const heat = await p.evaluate(() => round.heat);
    await up();
    check(heat > 0.7, 'holding the screen should heat the balloon: ' + heat);
    await p.evaluate(() => { cur = 5; startRound(true); for (let f = 0; f < 60 * 9; f++) update(1 / 60); });
    await p.tap('#actBtn');
    check(await p.evaluate(() => round.stage === 1), 'STAGE button did not stage');
    await p.evaluate(() => { cur = 6; startRound(true); });
    const up2 = await touchDrag(p, 150, 500, 190, 440);
    await p.waitForTimeout(200);
    const l = await p.evaluate(() => [round.flame, round.side]);
    await up2();
    check(l[0] === 1 && l[1] === 1, 'dragging up-right should fire the engine and slide right: ' + l);
    await done(p, 'flight-school-phone.png');
  });

  await test('school folders: the home page links to each grade, and 5th grade lists its subjects', async () => {
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
  });

  // Each 5th grade subject: every slide's picture draws, every quiz can be aced, and every game can be won.
  for (const page of ['reading-rights', 'math', 'science', 'social-studies']) {
    await test(`5th grade ${page}: every lesson draws, every quiz and game earns 3 stars`, async () => {
      const p = await open(browser, `5th-grade/${page}.html`, { viewport: { width: 1280, height: 800 } });
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
        await p.screenshot({ path: path.join(OUT, `5th-${page}-game${g}.png`) });
        await p.evaluate(() => { for (let n = 0; n < 600 && School.test.mode === 'game'; n++) { School.test.game.bot(); School.test.tick(0.05); } });
        await p.waitForTimeout(1800);   // a game may wait a moment before showing its score
      }
      const save = await p.evaluate(() => ({ stars: School.test.save.stars, items: School.test.unit.items.map(it => it.id) }));
      for (const id of save.items) check(save.stars[id] === 3, `${id}: ${save.stars[id]} stars`);
      await p.evaluate(() => School.test.mapScreen());
      check((await p.textContent('#card')).includes('My certificate'), 'certificate button missing once everything is done');
      await done(p, `5th-${page}.png`);
    });
  }

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
