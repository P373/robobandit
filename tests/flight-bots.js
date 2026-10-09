// Autopilots for Flight School's rounds, injected into the page by tests/run.js.
// Each bot sets the same inputs a player would (keys, the touch stick, round.tap) once per frame,
// using the round's layout (round.k). runFlight(i) plays level i to the end and reports the result.
'use strict';

const setStick = (x, y) => { stick.active = true; stick.x = clamp(x, -1, 1); stick.y = clamp(y, -1, 1); };
const FSBOT = {
  balloon(r) {
    const { FIELD, GROUND, LAYERS, BOT } = r.k, dx = FIELD - r.bx;
    const mid = l => (l[0] + l[1]) / 2;
    let ty = dx > 900 ? mid(LAYERS[0]) : dx > 120 ? mid(LAYERS[2]) - 20 : dx < -60 ? mid(LAYERS[1]) : null;
    if (LAYERS[1][2] > 0 && dx < -60) ty = mid(LAYERS[3]);   // toddler winds all blow forward
    if (ty == null) { keys.Space = r.vy > 40 || (r.y + BOT > GROUND - 40 && r.vy > 20); return; }
    keys.Space = r.y + r.vy * 0.8 > ty;
  },
  wing(r) {
    const { GOAL, hillY } = r.k, x = r.dist + PX();
    const th = r.therm.find(t => Math.abs(t.x - x) < t.w / 2);
    if (x > GOAL - 1400) {   // glide slope down to the middle of the field
      const h = hillY(x) - r.y, want = Math.max(0, (GOAL + 350 - x) * 0.22);
      keys.Space = !r.stall && (r.v > 230 || (h < want && r.v > 110));
      return;
    }
    keys.Space = !r.stall && (th ? r.v > 110 : (r.v > 200 && r.y > 200));
  },
  zeppelin(r) {
    const { zg, STORMS, MAST, TOP } = r.k;
    let ground = 1e9;
    for (let d = -80; d <= 360; d += 20) ground = Math.min(ground, zg(r.x + d));
    let ty = ground - 80;
    if (STORMS.some(s => Math.abs(r.x - s) < 160)) ty = Math.min(ty, 72);
    if (r.x > MAST - 420) ty = TOP;
    ty = clamp(ty, 60, 1e9);
    const err = (r.y + r.vy * 2) - ty;
    setStick(0, Math.abs(err) < 8 ? 0 : clamp(-err / 40, -1, 1));
  },
  wright(r) {
    if (r.state !== 'fly') { stick.active = false; return; }
    const { G, END } = r.k, low = r.y > G - 50, landing = r.x > END - 120;
    const thT = landing ? -0.02 : low ? 0.09 : 0.03;
    const c = clamp((thT - r.th) * 4 - r.om * 1.2, -1, 1);
    setStick(0, -c);
  },
  prop(r) {
    const { WPS, STORMS, windAt } = r.k, w = WPS[r.wp];
    let want = Math.atan2(w.y - r.y, w.x - r.x);
    const [wx, wy] = windAt(r.x, r.y), cross = -Math.sin(want) * wx + Math.cos(want) * wy;
    want -= Math.asin(clamp(cross / 165, -0.9, 0.9));
    for (const s of STORMS) {   // steer around storms ahead
      const dx = s.x - r.x, dy = s.y - r.y, along = dx * Math.cos(want) + dy * Math.sin(want), side = -dx * Math.sin(want) + dy * Math.cos(want);
      if (along > 0 && along < 420 && Math.abs(side) < s.r + 50) want += side > 0 ? -0.7 : 0.7;
    }
    setStick(clamp(Math.atan2(Math.sin(want - r.hd), Math.cos(want - r.hd)) * 2, -1, 1), 0);
    if (r.drowsy > 62 || r.dozeT) r.tap();
  },
  heli(r) {
    const { gAt, PAD, G } = r.k;
    if (r.over || (!r.carrying && !r.hikers.some(h => !h.done))) return;
    const tgt = r.carrying ? { x: (PAD[0] + PAD[1]) / 2, y: G - 16, land: true } : (h => ({ x: h.x, y: h.y - 75, land: false }))(r.hikers.find(h => !h.done));
    let clear = 1e9;
    const a = Math.min(r.x, tgt.x) - 50, b = Math.max(r.x, tgt.x) + 50;
    for (let x = a; x <= b; x += 20) clear = Math.min(clear, gAt(x));
    const dx = tgt.x - r.x, close = Math.abs(dx) < 30;
    let ty = close ? tgt.y : Math.min(tgt.y, clear - 80);
    const dvx = clamp(dx * 0.9, -150, 150), tilt = clamp((dvx - r.vx) * 0.02, -1, 1);
    let dvy = clamp((ty - r.y) * 1.2, -90, 90);
    if (close && tgt.land) dvy = Math.min(dvy, 35);
    setStick(tilt, clamp((dvy - r.vy) * 0.03, -1, 1));
  },
  jet(r) {
    const { COAST, NY } = r.k, land = r.dist < COAST + 1 || r.dist > NY - 6;
    const th = land ? 9 : 16.5;
    setStick(0, -clamp((th - r.h) * 0.6, -1, 1));
    keys.Space = land ? r.M < 0.9 && r.h > 6 ? false : r.M < 0.85 : r.M < 2.15;
  },
  rocket(r) {
    const g0 = r.k.guide(r.h, r.vv);
    setStick(clamp((g0 - r.th) * 3, -1, 1), 0);
    if (r.stage < 2 && r.launch <= 0 && r.burn > 0 && r.empty > 0.2 && r.stage < 3) r.tap();
  },
  space(r) {
    if (r.state !== 'fly') { keys.ArrowUp = keys.ArrowLeft = keys.ArrowRight = false; return; }
    const s = r.spots.find(q => !q.rocks), pc = (s.x1 + s.x2) / 2, dx = pc - r.x, want = clamp(dx * 0.4, -40, 40);
    keys.ArrowRight = r.vx < want - 4; keys.ArrowLeft = r.vx > want + 4;
    const lo = Math.min(r.x, s.x1) - 40, hi = Math.max(r.x, s.x2) + 40;
    const peak = Math.min(...r.pts.filter(q => q.x > lo && q.x < hi && (q.x < s.x1 || q.x > s.x2)).map(q => q.y), s.y);
    const h = Math.abs(dx) > 25 ? peak - 70 - r.y : s.y - r.y;
    keys.ArrowUp = r.vy > Math.min(60, 12 + h * 0.12) || (Math.abs(dx) > 40 && h < 120 && r.vy > 0);
  },
  drone(r) {
    const { BASE, HOUSES, TREES, AIRPORT } = r.k;
    const low = r.battery < 32 && !r.carrying;
    const t = r.carrying ? HOUSES[r.target] : BASE;
    let fx = t.x - r.x, fy = t.y - r.y;
    const d = Math.hypot(fx, fy) || 1;
    let vx = fx / d * Math.min(170, d * 2), vy = fy / d * Math.min(170, d * 2);
    for (const tr of TREES) { const ex = r.x - tr.x, ey = r.y - tr.y, e = Math.hypot(ex, ey); if (e < tr.r + 70) { vx += ex / e * 160; vy += ey / e * 160; } }
    const ax = r.x - AIRPORT.x, ay = r.y - AIRPORT.y, ad = Math.hypot(ax, ay);
    if (ad < AIRPORT.r + 60) { vx += ax / ad * 200; vy += ay / ad * 200; }
    if (low && Math.hypot(r.x - BASE.x, r.y - BASE.y) < 30) { vx = 0; vy = 0; }
    setStick((vx - r.vx) / 120, (vy - r.vy) / 120);
  },
  planet(r) {
    keys.ArrowRight = false; keys.Space = false;
    if (r.phase === 'wait') { if (Math.abs(r.align) < 0.05) r.tap(); else keys.ArrowRight = r.align > 0.15 || r.align < 0; return; }
    if (r.phase === 'cruise') { stick.active = false; return; }
    if (!r.chute) { if (r.spd < 1700 && r.spd > 1250) r.tap(); return; }
    keys.Space = r.crane && r.vy > 22;
  },
  mars(r) {
    if (!r.spinning) { r.tap(); return; }
    const { gAt, TARGETS, rocky } = r.k, tg = TARGETS[r.photos];
    let tx, ty, land = false;
    if (tg) { tx = tg.x; ty = gAt(tg.x) - tg.h; }
    else { tx = r.x; while (rocky(tx) || rocky(tx + 20) || rocky(tx - 20)) tx += 30; ty = gAt(tx) - 16; land = true; }
    if (r.rpm < 0.95) { setStick(0, 0); return; }
    const dx = tx - r.x, dvx = clamp(dx * 0.7, -70, 70), tilt = clamp((dvx - r.vx) * 0.03, -1, 1);
    let dvy = clamp((ty - r.y) * 1.1, -60, 60);
    if (land && Math.abs(dx) < 20) dvy = Math.min(dvy, 30);
    else if (land) dvy = Math.min(dvy, (gAt(r.x) - 90 - r.y) * 1.1);
    setStick(tilt, clamp((dvy - r.vy) * 0.04, -1, 1));
  },
  light(r) {
    if (r.cells > 0 && Math.tanh(r.phi) < 0.997) r.tap();
    const dust = r.objs.filter(o => o.k === 'dust' && o.x > PX() - 10 && o.x < PX() + 260 && Math.abs(o.y - r.y) < 50)[0];
    const cell = r.objs.filter(o => o.k === 'cell' && o.x > PX() && o.x < PX() + 300)[0];
    let ty = cell ? cell.y : H / 2;
    if (dust) ty = dust.y > r.y ? dust.y - 90 : dust.y + 90;
    setStick(0, clamp((ty - r.y) / 50, -1, 1));
  },
  aliens(r) {
    const { srcs, sky0 } = r.k, S = sky0(), s = srcs.find(q => !q.found);
    if (!s) return;
    const dx = (s.x - r.x) * S.w, dy = (s.y - r.y) * S.h, d = Math.hypot(dx, dy);
    setStick(d < 12 ? 0 : dx / 60, d < 12 ? 0 : dy / 60);
  },
};
function runFlight(i, maxSec = 240) {
  askSignal = (sig, tod, done) => done(true);   // the detective round: answer correctly
  cur = i; startRound(true);
  let f = 0;
  for (; f < 60 * maxSec && mode === 'play'; f++) {
    for (const k in keys) keys[k] = false;
    stick.active = false; stick.x = stick.y = 0;
    FSBOT[LEVELS[i].id](round);
    update(1 / 60);
  }
  const rows = round.results();
  return { id: LEVELS[i].id, ended: mode !== 'play', win: !!round.win, end: round.end, secs: Math.round(f / 60), score: rows.reduce((a, r) => a + r[1], 0), lives: round.lives };
}
