// Flight School rounds, part 2: rockets to the edge of the universe.
'use strict';

// ---------- 8. Rocket: gravity turn into orbit ----------
// Real-ish physics in km and km/s, run 12× faster than real time. Pitch is measured from straight up.
ROUNDS.rocket = () => {
  const D = diff(), TS = 12, STAGES = [[130, 16, 34], [160, 11, 28], [240, 9, 22]], MUL = 1 + D.assist * 0.1 + (D.safe ? 0.1 : 0);
  const guide = (h, vv) => {
    if (h < 1.5) return 0;
    const open = Math.min(1.25, Math.sqrt(h / 80) * 1.25);
    if (h < 60) return open;
    return clamp(Math.PI / 2 - (Math.max(0, (120 - h) * 0.012) - vv) * 1.5, 0.3, Math.PI / 2 + 0.15);
  };
  const r = { score: 0, lives: D.lives, inv: 0, t: 0, h: 0, vh: 0, vv: 0, th: 0, stage: 0, burn: 0, empty: 0, launch: 1.5, onPath: 0, perfect: 0, maxH: 0, trail: [], downX: 0, drops: [], over: false, win: false };
  r.k = { guide };
  const fuelLeft = () => r.stage < 3 ? 1 - r.burn / STAGES[r.stage][0] : 0;
  const doStage = auto => {
    if (r.stage >= 2 || fuelLeft() > 0) return;
    r.stage++; r.burn = 0; RB.noise(0.35, 0.4); RB.beep(300, 900, 0.25, 'sawtooth', 0.08);
    r.drops.push({ x: 0, y: 0, vy: 0, vx: rand(-20, 20), rot: 0 });
    if (!auto && r.empty < 1) { r.perfect++; pop(W / 2, H * 0.62 - 100, 'PERFECT STAGING! +150', '#ffd84a', 22); }
    else pop(W / 2, H * 0.62 - 100, auto ? 'Mission Control staged for you!' : `Stage ${r.stage + 1} ignition!`, '#fff', 20);
    if (r.stage === 1) showFact('Stage separation! Today, some first stages fly back to Earth and land themselves.');
    r.empty = 0;
  };
  r.tap = () => { if (r.launch > 0 || r.over) return; if (fuelLeft() > 0) pop(W / 2, H * 0.62 - 100, 'Still has fuel!', '#fff', 18); else doStage(false); };
  r.update = dt => {
    r.t += dt; r.inv -= dt;
    if (r.launch > 0) { r.launch -= dt; if (r.launch <= 0) { showBanner('LIFTOFF!', '', 1.4); showFact('Rockets go straight up first, to get out of the thick air quickly.'); } return; }
    const g0 = guide(r.h, r.vv);
    let turn = axisX();
    if (D.safe) turn = clamp((g0 - r.th) * 3, -1, 1);
    else if (D.assist) turn = clamp(turn + (g0 - r.th) * 2 * D.assist, -1, 1);
    r.th = clamp(r.th + turn * 0.4 * dt, -0.3, 1.9);
    const sdt = dt * TS;
    let a = 0;
    if (r.stage < 3 && fuelLeft() > 0) {
      const [B, a0, a1] = STAGES[r.stage];
      a = (a0 + (a1 - a0) * r.burn / B) / 1000 * MUL;
      r.burn = Math.min(B, r.burn + sdt);
      if (fuelLeft() <= 0) { r.empty = 0; if (r.stage < 2) showBanner('STAGE EMPTY!', RB.touch ? 'Tap STAGE!' : 'Press SPACE to stage!', 1.6, '#ff8a7a'); }
    } else { r.empty += dt; if (r.stage < 2 && r.empty > 3.5) doStage(true); }
    const grav = 0.0098 * Math.max(0, 1 - (r.vh / 7.9) ** 2);
    r.vh += a * Math.sin(r.th) * sdt; r.vv += (a * Math.cos(r.th) - grav) * sdt;
    r.h += r.vv * sdt; r.downX += r.vh * sdt;
    r.maxH = Math.max(r.maxH, r.h);
    if (Math.abs(r.th - g0) < 0.15) r.onPath += dt;
    if (r.h > 2 && r.h < 40) showFact('Now tip over slowly: this is the gravity turn! Follow the green arrow.');
    if (r.h < 25 && r.vh > 1.6) {
      if (hurt(r, W / 2, H * 0.62 - 90, 'Too hot! Climb higher first')) r.vh *= 0.9;
      showFact('Going sideways fast in thick air heats the rocket up. Climb higher before tipping over!');
    }
    if (r.vh > 4) showFact('Halfway to orbital speed! Orbit needs about 7.8 km per second sideways.');
    if (r.trail.length === 0 || r.t - r.trail[r.trail.length - 1][2] > 0.25) r.trail.push([r.downX, r.h, r.t]);
    for (const d of r.drops) { d.vy += 160 * dt; d.y += d.vy * dt; d.x += d.vx * dt; d.rot += dt * 2; }
    if (r.vh >= 7.8 && r.h >= 110) {
      r.over = true; r.win = true; r.end = 'ORBIT! You\'re falling around the Earth at 28,000 km/h!';
      showFact('In orbit you\'re falling all the time, but moving sideways so fast you keep missing the Earth!');
    } else if (r.h < 0 && r.t > 3) { r.h = 0; r.over = true; r.end = 'The rocket came back down. Tip over more gently next time!'; }
    else if (r.stage >= 2 && fuelLeft() <= 0 && r.vv < 0 && r.h < 80) { r.over = true; r.end = r.maxH >= 100 ? 'You reached space, but not orbit: you need more sideways speed!' : 'Not quite to space. Follow the green arrow!'; }
    if (r.lives <= 0) { r.over = true; r.end = 'The rocket overheated!'; }
    setWind(fuelLeft() > 0 ? 0.08 * clamp(1 - r.h / 60, 0.1, 1) : 0.01);
  };
  r.draw = () => {
    const k = clamp(r.h / 70, 0, 1), cx = W / 2, cy = H * 0.62;
    sky(mix('#3d8ff0', '#02030c', k), mix('#bfe3ff', '#0d1a4a', k));
    if (k > 0.3) { ctx.globalAlpha = (k - 0.3) / 0.7; spaceStars(110, 9, W, VH, r.t); ctx.globalAlpha = 1; }
    if (r.h < 3) {   // the launch pad dropping away
      const gy = cy + 40 + r.h * 140;
      ctx.fillStyle = '#5fae4f'; ctx.fillRect(0, gy, W, VH); ctx.fillStyle = '#8a8f9a'; ctx.fillRect(cx - 50, gy - 6, 100, 10);
      ctx.fillStyle = '#c4553a'; ctx.fillRect(cx + 34, gy - 120, 8, 116);
    }
    if (r.h > 25) { ctx.save(); ctx.globalAlpha = clamp((r.h - 25) / 50, 0, 1); drawEarth(cx, H + OFFY + 1100 - clamp((r.h - 25) * 2.5, 0, 160), 1200, r.t * 0.05); ctx.restore(); }
    if (r.h < 14) for (let i = 0; i < 8; i++) { const y = mod(rnd(i, 2) * 900 + r.h * 300, VH + 200) - 100 - OFFY; cloud(mod(rnd(i, 1) * W - r.downX * 20, W + 200) - 100, y, 0.9, `rgba(255,255,255,${0.8 * (1 - r.h / 14)})`); }
    for (const d of r.drops) { ctx.save(); ctx.translate(cx + d.x, cy + 30 + d.y); ctx.rotate(d.rot + r.th); ctx.fillStyle = '#d8dce6'; ctx.fillRect(-10, -12, 20, 24); ctx.restore(); }
    const g0 = guide(r.h, r.vv);
    if (r.launch <= 0 && !r.over) {   // green guide chevron
      ctx.save(); ctx.translate(cx, cy - 20); ctx.rotate(g0);
      ctx.strokeStyle = Math.abs(r.th - g0) < 0.15 ? '#7dff9a' : 'rgba(125,255,154,.7)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-14, -70); ctx.lineTo(0, -86); ctx.lineTo(14, -70); ctx.stroke();
      ctx.restore();
    }
    blink(r);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(r.th);
    drawRocket(0, 30, 1.5, 3 - r.stage, fuelLeft() > 0 && r.launch <= 0.6 ? 1 : 0, r.t);
    ctx.restore(); ctx.globalAlpha = 1;
    if (fuelLeft() <= 0 && r.stage < 2 && Math.sin(r.t * 8) > 0) outlined(RB.touch ? 'TAP STAGE!' : 'PRESS SPACE TO STAGE!', cx, cy + 80, 18, '#ffd84a');
    if (r.launch > 0) outlined(Math.ceil(r.launch / 0.5) + '…', cx, H * 0.3, 56, '#fff', 'center', 'Bungee');
    // inset map: the curved Earth and your path over it
    const mw = 150, mh = 90, mx = 12, my = -OFFY + 128;
    ctx.fillStyle = 'rgba(11,42,92,.7)'; rrect(mx, my, mw, mh, 8); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.rect(mx, my, mw, mh); ctx.clip();
    const E = 640, ex = mx + 20, ey = my + mh - 14 + E, sc = 0.32;
    ctx.fillStyle = '#2f7de0'; ctx.beginPath(); ctx.arc(ex, ey, E, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(ex, ey, E + 120 * sc, -Math.PI / 2 - 0.05, -Math.PI / 2 + 0.25); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 2; ctx.beginPath();
    for (const [dx, h] of [...r.trail, [r.downX, r.h]]) { const a = -Math.PI / 2 + dx / 6371, rr = E + h * sc; ctx.lineTo(ex + Math.cos(a) * rr, ey + Math.sin(a) * rr); }
    ctx.stroke(); ctx.restore();
    drawFx();
    hud(r.score, r.lives, [`📈 ${Math.round(r.h)} km high`, `🔥 Stage ${Math.min(3, r.stage + 1)} of 3`]);
    const w = 200, [x, y] = gaugeAt(w);
    meter(x, y, w, '⛽', fuelLeft(), fuelLeft() > 0.15 ? '#6be06b' : '#ff5a4a');
    ctx.fillStyle = 'rgba(11,42,92,.62)'; rrect(x, y + 34, w, 46, 12); ctx.fill();
    txt(`➡️ ${r.vh.toFixed(1)} of 7.8 km/s`, x + 12, y + 49, 15, r.vh >= 7.8 ? '#7dff9a' : '#fff', 'left');
    ctx.fillStyle = 'rgba(255,255,255,.25)'; rrect(x + 10, y + 62, w - 20, 10, 5); ctx.fill();
    ctx.fillStyle = '#c9a0ff'; rrect(x + 10, y + 62, Math.max(5, (w - 20) * clamp(r.vh / 7.8, 0, 1)), 10, 5); ctx.fill();
    progressBar(r.h / 110, `🚀 ${Math.round(r.h)} km`, '🛰️ Orbit', '#c9a0ff');
  };
  r.results = () => {
    const rows = [[`📈 Highest ${Math.round(r.maxH)} km`, Math.round(Math.min(r.maxH, 150)) * 2], [`🟢 On the guide path ${Math.round(r.onPath)} s`, Math.round(r.onPath) * 8]];
    if (r.perfect) rows.push([`🔥 Perfect staging × ${r.perfect}`, r.perfect * 150]);
    if (r.win) { rows.push(['🛰️ Reached orbit!', 600]); if (!D.safe) rows.push([`❤️ Hearts × ${r.lives}`, r.lives * 50]); }
    return rows;
  };
  return r;
};

// ---------- 9. Moon landing: find a smooth spot, watch the fuel ----------
ROUNDS.space = () => {
  const D = diff(), G = 26, THRUST = 66, SIDE = 34, SAFE_VY = 42, SAFE_VX = 28;
  const r = { score: 0, tries: 3, lives: 3, t: 0, fuel: 100, over: false, win: false, boomT: 0, landedT: 0, calls: {} };
  function terrain() {
    const n = 22, pts = [];
    for (let i = 0; i <= n; i++) pts.push({ x: i / n * W, y: H - 60 - Math.random() * 120 });
    const spots = [];
    const slots = [3, 8, 13, 18].sort(() => Math.random() - 0.5);
    slots.forEach((i, k) => {   // flat spots two segments wide
      pts[i + 1].y = pts[i + 2].y = pts[i].y; spots.push({ x1: pts[i].x, x2: pts[i + 2].x, y: pts[i].y, rocks: k > (D.safe ? 2 : 1) });
    });
    // boulders on the rocky spots, and the computer's (bad) target over one of them
    r.rocks = [];
    for (const s of spots) if (s.rocks) for (let k = 0; k < 4; k++) r.rocks.push({ x: lerp(s.x1 + 6, s.x2 - 6, Math.random()), y: s.y, r: 4 + Math.random() * 5 });
    r.pts = pts; r.spots = spots; r.target = spots.find(s => s.rocks);
  }
  function reset() { r.x = W * 0.15; r.y = 70; r.vx = 40; r.vy = 0; r.fuel = D.safe ? 100 : D.assist ? 100 : 85; r.state = 'fly'; r.flame = 0; r.side = 0; }
  terrain(); reset();
  const gAt = x => { const p = r.pts; for (let i = 0; i < p.length - 1; i++) if (x >= p[i].x && x <= p[i + 1].x) return lerp(p[i].y, p[i + 1].y, (x - p[i].x) / (p[i + 1].x - p[i].x || 1)); return H - 60; };
  r.update = dt => {
    r.t += dt;
    if (r.state === 'boom') { r.boomT -= dt; if (r.boomT <= 0) { if (r.tries > 0) { reset(); showBanner(`TRY ${4 - r.tries} OF 3`, 'Slow and steady!', 1.6); } else { r.over = true; r.end = 'The lander crashed. Landing on the Moon is tricky!'; } } return; }
    if (r.state === 'landed') { r.landedT += dt; if (r.landedT > 2.6) r.over = true; return; }
    if (r.t > 4) showFact('"1202 alarm!" Apollo 11\'s computer got overloaded during landing, but Mission Control said: keep going!');
    if (r.t > 1) showFact('The computer\'s target (the X) is a boulder field, just like on Apollo 11! Find a smooth spot instead.');
    let sx = axisX(), up = holding() || (stick.active && stick.y < -0.35);
    if (mouse) up = true;
    if (D.safe) {   // toddler: the lander steers itself toward a safe spot; you just slow it down
      const s = r.spots.find(q => !q.rocks), want = clamp(((s.x1 + s.x2) / 2 - r.x) * 0.4, -40, 40);
      sx = sx || clamp((want - r.vx) / 10, -1, 1);
      if (r.vy > 30 + (r.spots[0].y - r.y) * 0.1) up = true;
    }
    r.flame = r.fuel > 0 && up ? 1 : 0;
    r.side = r.fuel > 0 && Math.abs(sx) > 0.2 ? Math.sign(sx) : 0;
    r.vy += (G - r.flame * THRUST) * dt; r.vx += r.side * SIDE * dt;
    r.fuel = Math.max(0, r.fuel - (r.flame * 7.5 + Math.abs(r.side) * 2.5) * dt);
    if (r.fuel < 25 && !r.calls[60]) { r.calls[60] = 1; showBanner('"60 SECONDS!"', 'Fuel is getting low!', 1.6, '#ffb84a'); }
    if (r.fuel < 12 && !r.calls[30]) { r.calls[30] = 1; showBanner('"30 SECONDS!"', 'Land now!', 1.6, '#ff8a7a'); showFact('Neil Armstrong landed with less than a minute of fuel left!'); }
    r.x += r.vx * dt; r.y += r.vy * dt;
    if (r.x < 20) { r.x = 20; r.vx = Math.abs(r.vx) * 0.3; }
    if (r.x > W - 20) { r.x = W - 20; r.vx = -Math.abs(r.vx) * 0.3; }
    if (r.y < 30) { r.y = 30; r.vy = Math.max(0, r.vy); }
    const feet = r.y + 23;
    if (feet > Math.min(gAt(r.x - 20), gAt(r.x + 20)) - 12 && !r.contact) { r.contact = true; pop(r.x, r.y - 44, 'Contact light!', '#9fe8ff', 16); }
    if (feet >= Math.min(gAt(r.x - 20), gAt(r.x + 20)) || feet >= gAt(r.x)) {
      const spot = r.spots.find(s => r.x - 16 >= s.x1 && r.x + 16 <= s.x2);
      const rocky = spot && spot.rocks;
      if (spot && !rocky && r.vy < SAFE_VY && Math.abs(r.vx) < SAFE_VX) {
        r.y = spot.y - 23; r.state = 'landed'; r.win = true; r.flame = 0; r.soft = r.vy < SAFE_VY / 2;
        r.end = 'The Eagle has landed! You landed on the Moon!';
        RB.beep(523, 1047, 0.4, 'triangle', 0.12); showBanner('THE EAGLE HAS LANDED!', 'One small step…', 2.4);
        puff(r.x, spot.y, 20, ['#ccc', '#aaa'], 80);
      } else {
        r.tries--; r.state = 'boom'; r.boomT = 1.8; r.contact = false;
        RB.noise(0.9, 0.7); RB.beep(120, 30, 0.8, 'sine', 0.3);
        puff(r.x, r.y, 40, ['#ffb347', '#ff5a4a', '#ddd', '#888'], 220, 60);
        pop(r.x, r.y - 50, rocky ? 'Boulders!' : !spot ? 'Too bumpy here!' : 'Too fast!', '#ff8a7a', 22);
        if (D.safe) r.tries++;
      }
    }
    r.anchor = { x: r.x, y: r.y };
    setWind(0);
  };
  r.draw = () => {
    sky('#02030c', '#0b1030');
    spaceStars(120, 5, W, VH, r.t);
    drawEarth(W * 0.78, (W < 700 ? 200 : 90) - OFFY * 0.7, 34, r.t);
    ctx.fillStyle = '#9a9aa2'; ctx.beginPath(); ctx.moveTo(0, H + OFFY); for (const p of r.pts) ctx.lineTo(p.x, p.y); ctx.lineTo(W, H + OFFY); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < 10; i++) { const cx = rnd(i, 3) * W; ctx.beginPath(); ctx.ellipse(cx, gAt(cx) + 30 + rnd(i, 4) * 60, 18 + rnd(i, 5) * 20, 5, 0, 0, TAU); ctx.fill(); }
    for (const s of r.spots) if (!s.rocks && settings.mode !== 'challenge') { ctx.fillStyle = `rgba(80,255,160,${0.25 + 0.15 * Math.sin(r.t * 3)})`; ctx.fillRect(s.x1, s.y - 2, s.x2 - s.x1, 4); }
    ctx.fillStyle = '#6e6e76'; for (const b of r.rocks) { ctx.beginPath(); ctx.ellipse(b.x, b.y - b.r * 0.6, b.r, b.r * 0.8, 0, 0, TAU); ctx.fill(); }
    if (r.target) { const tx = (r.target.x1 + r.target.x2) / 2; ctx.strokeStyle = 'rgba(255,90,74,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx - 10, r.target.y - 40); ctx.lineTo(tx + 10, r.target.y - 20); ctx.moveTo(tx + 10, r.target.y - 40); ctx.lineTo(tx - 10, r.target.y - 20); ctx.stroke(); txt('computer target', tx, r.target.y - 50, 12, '#ff8a7a'); }
    if (r.state !== 'boom') drawLander(r.x, r.y, 1.3, r.flame, r.side, r.t);
    if (r.state === 'landed') {
      const fy = r.y + 23;
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(r.x + 40, fy); ctx.lineTo(r.x + 40, fy - 40); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(r.x + 40, fy - 40, 22, 14); ctx.fillStyle = '#e8453a'; for (let k = 0; k < 3; k++) ctx.fillRect(r.x + 40, fy - 40 + k * 5, 22, 2);
      ctx.fillStyle = '#3d5ab8'; ctx.fillRect(r.x + 40, fy - 40, 9, 7);
    }
    drawFx();
    const okY = r.vy < SAFE_VY, okX = Math.abs(r.vx) < SAFE_VX;
    hud(r.score, null, [`🚀 Tries left: ${r.tries}`]);
    const [x, y] = gaugeAt(220);
    ctx.fillStyle = 'rgba(11,42,92,.65)'; rrect(x, y, 220, 76, 12); ctx.fill();
    txt(`⬇️ Fall speed ${Math.max(0, Math.round(r.vy))}`, x + 12, y + 16, 16, okY ? '#7dff9a' : '#ff8a7a', 'left');
    txt(`↔️ Side speed ${Math.round(Math.abs(r.vx))}`, x + 12, y + 38, 16, okX ? '#7dff9a' : '#ff8a7a', 'left');
    txt('⛽', x + 18, y + 60, 15, '#fff');
    ctx.fillStyle = 'rgba(255,255,255,.25)'; rrect(x + 34, y + 54, 174, 12, 6); ctx.fill();
    ctx.fillStyle = r.fuel > 25 ? '#6be06b' : '#ff5a4a'; rrect(x + 34, y + 54, Math.max(4, 174 * r.fuel / 100), 12, 6); ctx.fill();
  };
  r.results = () => {
    if (!r.win) return [['🚀 Brave try!', 100]];
    const rows = [['🌙 Landed on the Moon', 600], [`⛽ Fuel left ${Math.round(r.fuel)}%`, Math.round(r.fuel) * 4], [`🚀 Tries left × ${r.tries}`, r.tries * 150]];
    if (r.soft) rows.push(['🪶 Feather-soft landing', 200]);
    return rows;
  };
  return r;
};

// ---------- 10. Delivery drone (top-down) ----------
ROUNDS.drone = () => {
  const D = diff(), WW = 1700, WH = 1200, BASE = { x: 220, y: 640 };
  const AIRPORT = { x: 1250, y: 260, r: 210 };
  const HOUSES = [{ x: 600, y: 300 }, { x: 900, y: 900 }, { x: 1450, y: 760 }, { x: 520, y: 1000 }, { x: 1150, y: 560 }].sort(() => Math.random() - 0.5);
  const N = D.safe ? 3 : 4;
  const TREES = [];
  for (let i = 0; i < 26; i++) {
    const x = 120 + rnd(i, 21) * (WW - 240), y = 120 + rnd(i, 22) * (WH - 240);
    if (Math.hypot(x - BASE.x, y - BASE.y) < 140 || HOUSES.some(h => Math.hypot(x - h.x, y - h.y) < 120) || Math.hypot(x - AIRPORT.x, y - AIRPORT.y) < AIRPORT.r + 40) continue;
    TREES.push({ x, y, r: 26 + rnd(i, 23) * 14 });
  }
  const r = { score: 0, lives: D.lives, inv: 0, t: 0, x: BASE.x, y: BASE.y, vx: 0, vy: 0, battery: 100, carrying: false, hold: 0, done: 0, target: 0, nofly: 0, noflyT: 0, birds: [], over: false, win: false, wind: [0, 0] };
  for (let i = 0; i < Math.round(3 * D.hazard); i++) r.birds.push({ x: rand(0, WW), y: rand(200, WH - 200), vx: (Math.random() < 0.5 ? -1 : 1) * rand(50, 90), ph: rand(0, 6) });
  r.k = { BASE, HOUSES, TREES, AIRPORT, N };
  r.update = dt => {
    r.t += dt; r.inv -= dt;
    let ix = axisX(), iy = axisY();
    if (mouse) { ix = clamp((mouse.x - W / 2) / 80, -1, 1); iy = clamp((mouse.y - H / 2) / 80, -1, 1); }
    r.wind = [Math.sin(r.t * 0.2) * 22 * D.hazard, Math.cos(r.t * 0.15) * 14 * D.hazard];
    r.vx += (ix * 420 - r.vx * 2.3 + r.wind[0] * 2.3) * dt;
    r.vy += (iy * 420 - r.vy * 2.3 + r.wind[1] * 2.3) * dt;
    r.x = clamp(r.x + r.vx * dt, 20, WW - 20); r.y = clamp(r.y + r.vy * dt, 20, WH - 20);
    const sp = Math.hypot(r.vx, r.vy);
    if (!D.safe) r.battery = Math.max(0, r.battery - (0.9 + 0.8 * sp / 180 + (r.carrying ? 0.6 : 0)) * (1 - D.assist * 0.3) * dt);
    const atBase = Math.hypot(r.x - BASE.x, r.y - BASE.y) < 40;
    if (atBase && sp < 70) r.battery = Math.min(100, r.battery + 30 * dt);
    if (r.t > 0.5) showFact('Quadcopters tilt to move. Let go and the drone slows down and hovers.');
    if (r.battery < 30 && r.battery > 0) showFact('Low battery! Fly back to the warehouse to recharge. Heavy packages drain it faster.');
    for (const tr of TREES) if (hit(r.x, r.y, 18, tr.x, tr.y, tr.r)) {
      const a = Math.atan2(r.y - tr.y, r.x - tr.x); r.x = tr.x + Math.cos(a) * (tr.r + 19); r.y = tr.y + Math.sin(a) * (tr.r + 19);
      r.vx = Math.cos(a) * 120; r.vy = Math.sin(a) * 120; hurt(r, W / 2, H / 2 - 40, 'Bonk! A tree!');
    }
    for (const b of r.birds) {
      b.x += b.vx * dt; b.y += Math.sin(r.t * 2 + b.ph) * 30 * dt;
      if (b.x < -50) b.x = WW + 50; if (b.x > WW + 50) b.x = -50;
      if (hit(r.x, r.y, 18, b.x, b.y, 12)) { hurt(r, W / 2, H / 2 - 40, 'A curious bird!'); r.vx = -r.vx; }
    }
    if (Math.hypot(r.x - AIRPORT.x, r.y - AIRPORT.y) < AIRPORT.r) {
      r.noflyT += dt; showFact('Drones must stay far away from airports. That\'s the law, because they could hit a plane!');
      if (r.noflyT > 1 && !D.safe) { r.noflyT = 0; r.nofly++; pop(W / 2, H / 2 - 60, 'No-fly zone! -50', '#ff8a7a', 20); RB.beep(300, 200, 0.2, 'square', 0.08); }
    } else r.noflyT = 0;
    const tgt = r.carrying ? HOUSES[r.target] : BASE;
    const over = Math.hypot(r.x - tgt.x, r.y - tgt.y) < 34 && sp < 70;
    r.hold = over ? r.hold + dt : Math.max(0, r.hold - dt * 2);
    if (r.hold > (r.carrying ? 0.9 : 0.6)) {
      r.hold = 0;
      if (!r.carrying) { r.carrying = true; RB.beep(500, 800, 0.15, 'triangle', 0.1); pop(W / 2, H / 2 - 50, 'Package picked up!', '#fff', 20); showFact('Some delivery drones lower packages on a rope, so the spinning propellers stay away from people.'); }
      else {
        r.carrying = false; r.done++; r.score += 250; r.target++; RB.beep(523, 1047, 0.3, 'triangle', 0.12); pop(W / 2, H / 2 - 50, 'Delivered! +250', '#9fffa8', 22);
        puff(W / 2, H / 2, 16, ['#c99a5a', '#fff']);
        if (r.done >= N) { r.over = true; r.win = true; r.end = 'All packages delivered! Great flying!'; }
        else if (r.done === 1) showFact('Drones help farmers, film movies, find lost hikers and deliver medicine to faraway hospitals.');
      }
    }
    if (!D.safe && r.battery <= 0) {
      hurt(r, W / 2, H / 2 - 40, 'Battery empty!', 0.1); r.inv = 1.5;
      r.x = BASE.x; r.y = BASE.y; r.vx = r.vy = 0; r.battery = 60;
    }
    if (r.lives <= 0) { r.over = true; r.end = 'The drone needs a repair!'; }
    if (r.t > 150) { r.over = true; r.end = 'Time\'s up for today\'s deliveries!'; }
    r.tx = ix; r.ty = iy;
    setWind(0.04 + sp / 3000);
  };
  r.draw = () => {
    const cx = r.x - W / 2, cy = r.y - H / 2;
    ctx.fillStyle = '#86c46a'; ctx.fillRect(0, -OFFY, W, VH);
    ctx.save(); ctx.translate(-cx, -cy);
    ctx.fillStyle = '#9ad47c'; for (let i = 0; i < 30; i++) circle(rnd(i, 31) * WW, rnd(i, 32) * WH, 40 + rnd(i, 33) * 50);
    ctx.strokeStyle = '#c9c4b8'; ctx.lineWidth = 34; ctx.lineCap = 'round';   // roads
    ctx.beginPath(); ctx.moveTo(0, 640); ctx.lineTo(WW, 640); ctx.moveTo(850, 0); ctx.lineTo(850, WH); ctx.moveTo(0, 1050); ctx.lineTo(WW, 1050); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([16, 14]); ctx.beginPath(); ctx.moveTo(0, 640); ctx.lineTo(WW, 640); ctx.moveTo(850, 0); ctx.lineTo(850, WH); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(232,69,58,.18)'; circle(AIRPORT.x, AIRPORT.y, AIRPORT.r);
    ctx.strokeStyle = '#e8453a'; ctx.lineWidth = 4; ctx.setLineDash([14, 10]); ctx.beginPath(); ctx.arc(AIRPORT.x, AIRPORT.y, AIRPORT.r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#666'; ctx.save(); ctx.translate(AIRPORT.x, AIRPORT.y); ctx.rotate(-0.4); ctx.fillRect(-150, -18, 300, 36); ctx.restore();
    txt('✈️ AIRPORT: NO DRONES', AIRPORT.x, AIRPORT.y + 60, 18, '#e8453a');
    ctx.fillStyle = '#7d8aa3'; ctx.fillRect(BASE.x - 70, BASE.y - 120, 140, 70); txt('📦 WAREHOUSE', BASE.x, BASE.y - 85, 15, '#fff');
    ctx.fillStyle = '#ffd84a'; circle(BASE.x, BASE.y, 34); ctx.fillStyle = '#333'; circle(BASE.x, BASE.y, 28); txt('⚡', BASE.x, BASE.y, 22, '#ffd84a');
    HOUSES.forEach((h, i) => {
      ctx.fillStyle = ['#f2d7b0', '#d9e8f5', '#f5d0d0', '#e0f0d0', '#f0e0c0'][i]; ctx.fillRect(h.x - 46, h.y - 90, 92, 56);
      ctx.fillStyle = '#c4553a'; ctx.beginPath(); ctx.moveTo(h.x - 54, h.y - 90); ctx.lineTo(h.x, h.y - 124); ctx.lineTo(h.x + 54, h.y - 90); ctx.fill();
      const active = r.carrying && i === r.target;
      ctx.fillStyle = active ? `rgba(80,255,160,${0.5 + 0.3 * Math.sin(r.t * 5)})` : 'rgba(255,255,255,.5)'; circle(h.x, h.y, 30);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(h.x, h.y, 30, 0, TAU); ctx.stroke();
    });
    for (const tr of TREES) { ctx.fillStyle = 'rgba(0,0,0,.15)'; circle(tr.x + 8, tr.y + 10, tr.r); ctx.fillStyle = '#3f8a3a'; circle(tr.x, tr.y, tr.r); ctx.fillStyle = '#4fa84a'; circle(tr.x - tr.r * 0.3, tr.y - tr.r * 0.3, tr.r * 0.5); }
    for (const b of r.birds) bird(b.x, b.y, 1.4, r.t + b.ph, '#333');
    ctx.restore();
    const tgt = r.carrying ? HOUSES[r.target] : BASE;
    if (r.hold > 0) { ctx.strokeStyle = '#7dff9a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(W / 2, H / 2, 40, -Math.PI / 2, -Math.PI / 2 + TAU * r.hold / (r.carrying ? 0.9 : 0.6)); ctx.stroke(); }
    blink(r); drawDroneTop(W / 2, H / 2, 1.3, r.t, r.tx || 0, r.ty || 0, r.carrying); ctx.globalAlpha = 1;
    offscreenArrow(tgt.x - cx, tgt.y - cy, r.carrying ? '🏠' : '📦');
    drawFx();
    hud(r.score, r.lives, [`📦 Delivered ${r.done} of ${N}`, r.carrying ? '🏠 Fly to the green pad' : '📦 Pick up at the warehouse']);
    const [x, y] = gaugeAt(160);
    if (!D.safe) meter(x, y, 160, '🔋', r.battery / 100, r.battery > 30 ? '#6be06b' : '#ff5a4a');
    const wa = Math.atan2(r.wind[1], r.wind[0]);
    ctx.save(); ctx.translate(x + 140, y + (D.safe ? 15 : 52)); ctx.rotate(wa); arrow(-10, 0, 10, 0, '#fff', 3); ctx.restore();
  };
  r.results = () => {
    const rows = [[`📦 Deliveries × ${r.done}`, r.done * 250]];
    if (r.nofly) rows.push([`✈️ No-fly zone × ${r.nofly}`, -50 * r.nofly]);
    if (r.win) { rows.push(['⏱️ Speedy delivery', Math.max(0, Math.round((120 - r.t) * 3))]); if (!D.safe) rows.push([`🔋 Battery left ${Math.round(r.battery)}%`, Math.round(r.battery) * 2], [`❤️ Hearts × ${r.lives}`, r.lives * 50]); }
    return rows;
  };
  return r;
};

// ---------- 11. Planet travel: launch window, transfer orbit, then the seven minutes of terror ----------
ROUNDS.planet = () => {
  const D = diff(), PE = 12, PM = PE * Math.pow(1.524, 1.5);
  const r = { score: 0, lives: D.lives, inv: 0, t: 0, phase: 'wait', tries: 3, simT: 0, eA: 0, mA: 1.6, fuel: 100, best: 1e9, over: false, win: false, btn: { ico: '🚀', lbl: 'LAUNCH' } };
  const geo = () => { const RE = Math.min(W * 0.27, H * 0.3); return { RE, RM: RE * 1.524, cx: W / 2, cy: H / 2 + 10, GM: (TAU / PE) ** 2 * RE ** 3 }; };
  const marsPos = (a, g) => [g.cx + Math.cos(a) * g.RM, g.cy - Math.sin(a) * g.RM];
  const TT = 0.5 * PE * Math.pow((1 + 1.524) / 2, 1.5);
  // predict the ship path ahead and the closest approach to Mars
  function predict(g, steps = 260) {
    let { x, y, vx, vy } = r.ship, t = r.simT, mA = r.mA, best = 1e9, pts = [], bestP = null;
    const h = 0.04;
    for (let i = 0; i < steps; i++) {
      const dx = x - g.cx, dy = y - g.cy, d3 = Math.pow(dx * dx + dy * dy, 1.5);
      vx -= g.GM * dx / d3 * h; vy -= g.GM * dy / d3 * h; x += vx * h; y += vy * h; t += h; mA += TAU / PM * h;
      const [mx, my] = marsPos(mA, g), d = Math.hypot(x - mx, y - my);
      if (d < best) { best = d; bestP = [x, y, mx, my]; }
      if (i % 3 === 0) pts.push([x, y]);
    }
    return { pts, best, bestP };
  }
  r.k = { geo, predict: g => predict(g) };
  const launch = () => {
    const g = geo(), ex = g.cx + Math.cos(r.eA) * g.RE, ey = g.cy - Math.sin(r.eA) * g.RE;
    const v = Math.sqrt(g.GM * (2 / g.RE - 2 / (g.RE + g.RM)));
    r.ship = { x: ex, y: ey, vx: -Math.sin(r.eA) * v, vy: -Math.cos(r.eA) * v };
    r.phase = 'cruise'; r.cruiseT = 0; r.btn = null;
    RB.noise(0.5, 0.4); RB.beep(200, 800, 0.4, 'sawtooth', 0.08);
    showFact('The real trip takes about 7 months. Here, time is sped up a LOT!');
  };
  const startEDL = () => {
    r.phase = 'edl'; r.btn = { ico: '🪂', lbl: 'PARACHUTE' };
    Object.assign(r, { spd: 20000, alt: 125, chute: false, crane: false, y: 70, vy: 0, cfuel: 100, edlT: 0 });
    showBanner('ARRIVING AT MARS!', '20,000 km/h… here we go!', 2);
    showFact('Seven minutes of terror: the lander must land all by itself, because radio messages take too long.');
  };
  r.tap = () => {
    if (r.phase === 'wait') launch();
    else if (r.phase === 'edl' && !r.chute) {
      if (r.spd > 1800) { hurt(r, W / 2, H * 0.3, 'Too fast! The chute ripped!'); if (diff().safe || diff().assist) { pop(W / 2, H * 0.3 + 30, 'Backup chute ready', '#fff', 18); } else r.noBackup = true; }
      else {
        r.chute = true; r.chuteQ = r.spd > 1200 ? 'perfect' : 'late'; r.btn = { ico: '🔥', lbl: 'THRUST' };
        RB.noise(0.4, 0.3); pop(W / 2, H * 0.3, r.chuteQ === 'perfect' ? 'Perfect timing! +200' : 'Chute open!', '#9fffa8', 22);
        showFact('Perseverance\'s parachute was 21.5 meters wide, as big as a tennis court is long!');
      }
    }
  };
  r.update = dt => {
    r.t += dt; r.inv -= dt;
    const g = geo();
    if (r.phase === 'wait' || r.phase === 'cruise') {
      const warp = r.phase === 'wait' && (axisX() > 0.4 || keys.ArrowRight) ? 4 : 1;
      const sdt = dt * warp;
      r.simT += sdt; r.eA += TAU / PE * sdt; r.mA += TAU / PM * sdt;
      if (r.phase === 'wait') {
        showFact('Launch windows to Mars open only about every 26 months. Wait for the path to meet Mars!');
        const ghost = r.mA + TAU / PM * TT, arrive = r.eA + Math.PI;
        r.align = Math.atan2(Math.sin(ghost - arrive), Math.cos(ghost - arrive));
        if (D.safe && Math.abs(r.align) < 0.06) launch();
        return;
      }
      r.cruiseT += dt;
      const s = r.ship;
      let push = -axisY() || axisX();
      if (D.safe || D.assist) {   // autopilot nudges toward the best path
        const p0 = predict(g, 180);
        if (p0.best > g.RE * 0.08) {
          s.vx *= 1.002; s.vy *= 1.002; const pA = predict(g, 180).best; s.vx /= 1.002; s.vy /= 1.002;
          if (!push && (D.safe || p0.best > g.RE * 0.25)) push = (pA < p0.best ? 1 : -1) * (D.safe ? 0.6 : 0.3);
        }
      }
      if (push && r.fuel > 0) {
        const v = Math.hypot(s.vx, s.vy), k = 1 + push * 0.06 * dt;
        s.vx *= k; s.vy *= k; if (!D.safe) r.fuel = Math.max(0, r.fuel - 22 * Math.abs(push) * dt);
        showFact('Mid-course corrections: tiny engine burns to aim at Mars precisely.'); void v;
      }
      for (let i = 0; i < 4; i++) {
        const h = dt / 4, dx = s.x - g.cx, dy = s.y - g.cy, d3 = Math.pow(dx * dx + dy * dy, 1.5);
        s.vx -= g.GM * dx / d3 * h; s.vy -= g.GM * dy / d3 * h; s.x += s.vx * h; s.y += s.vy * h;
      }
      const [mx, my] = marsPos(r.mA, g), d = Math.hypot(s.x - mx, s.y - my);
      r.best = Math.min(r.best, d / g.RE);
      if (d < g.RE * 0.13) { r.capture = d / g.RE; startEDL(); }
      else if (r.cruiseT > TT * 1.7) {
        r.tries--; hurt(r, W / 2, H / 2 - 60, 'Missed Mars!', 0.1); r.inv = 0;
        if (r.tries <= 0 && !D.safe) { r.over = true; r.end = 'Missed Mars. Space navigation is hard!'; }
        else { r.phase = 'wait'; r.btn = { ico: '🚀', lbl: 'LAUNCH' }; r.fuel = 100; showBanner('MISSED!', 'Wait for the next launch window', 2, '#ff8a7a'); }
      }
      return;
    }
    // ---- entry, descent and landing ----
    r.edlT += dt;
    if (!r.chute) {
      r.spd = Math.max(300, r.spd * Math.pow(0.6, dt) - 40 * dt); r.alt = Math.max(11, r.alt - 18 * dt);
      if (r.spd < 6000) showFact('The heat shield glows hotter than lava as the air slows the capsule down!');
      if (D.safe && r.spd < 1600) r.tap();
      if (r.spd < 1100) { hurt(r, W / 2, H * 0.3, 'Too late! Auto-chute!'); r.chute = true; r.chuteQ = 'auto'; r.btn = { ico: '🔥', lbl: 'THRUST' }; }
      return;
    }
    if (!r.crane) {
      r.spd = Math.max(320, r.spd - 260 * dt); r.alt = Math.max(2, r.alt - 3 * dt);
      if (r.spd <= 330) { r.crane = true; showFact('The sky crane fires its rockets and lowers the rover on long ropes. Hold THRUST to keep it slow!'); }
      return;
    }
    const thrust = (actionHeld() || holding() || (D.safe && r.vy > 30)) && r.cfuel > 0;
    r.vy += (38 - (thrust ? 88 : 0)) * dt;
    if (thrust && !D.safe) r.cfuel = Math.max(0, r.cfuel - 11 * dt);
    r.y += r.vy * dt; r.y = Math.max(40, r.y);
    const G = H - 70;
    if (r.y + 30 >= G) {
      if (r.vy < 45) {
        r.over = true; r.win = true; r.soft = r.vy < 25; r.end = 'Touchdown confirmed! Your rover is on Mars!';
        RB.beep(523, 1047, 0.4, 'triangle', 0.12); showBanner('TOUCHDOWN!', 'Welcome to Mars!', 2.4);
      } else { hurt(r, W / 2, r.y - 60, 'Too fast!'); r.y = 70; r.vy = 0; r.cfuel = Math.max(r.cfuel, 50); if (r.lives <= 0) { r.over = true; r.end = 'The rover landed too hard.'; } }
    }
  };
  r.draw = () => {
    const g = geo();
    if (r.phase !== 'edl') {
      sky('#03040f', '#0a1030'); spaceStars(140, 3, W, VH, r.t);
      ctx.fillStyle = '#ffd84a'; circle(g.cx, g.cy, 18); ctx.fillStyle = 'rgba(255,216,74,.2)'; circle(g.cx, g.cy, 30);
      ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(g.cx, g.cy, g.RE, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(g.cx, g.cy, g.RM, 0, TAU); ctx.stroke();
      const ex = g.cx + Math.cos(r.eA) * g.RE, ey = g.cy - Math.sin(r.eA) * g.RE, [mx, my] = marsPos(r.mA, g);
      if (r.phase === 'wait') {
        const aa = (g.RE + g.RM) / 2, e = (g.RM - g.RE) / (g.RM + g.RE);
        ctx.setLineDash([5, 6]); ctx.strokeStyle = '#9fe8ff'; ctx.lineWidth = 2; ctx.beginPath();
        for (let q = 0; q <= Math.PI + 0.01; q += 0.05) { const rr = aa * (1 - e * e) / (1 + e * Math.cos(q)), a = r.eA + q; ctx.lineTo(g.cx + Math.cos(a) * rr, g.cy - Math.sin(a) * rr); }
        ctx.stroke(); ctx.setLineDash([]);
        const [gx, gy] = marsPos(r.mA + TAU / PM * TT, g);
        ctx.strokeStyle = Math.abs(r.align) < 0.1 ? '#7dff9a' : 'rgba(224,102,58,.7)'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(gx, gy, 9, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        txt('ghost Mars', gx, gy - 18, 12, 'rgba(255,200,180,.9)');
        const ok = Math.abs(r.align) < 0.1;
        outlined(ok ? '✅ LAUNCH NOW!' : r.align > 0 ? '⏳ Wait… (hold → to fast-forward)' : '⏳ Window passed: wait for the next one', W / 2, -OFFY + (W < 700 ? 150 : 80), 20, ok ? '#7dff9a' : '#fff');
      } else {
        const p = predict(g);
        ctx.strokeStyle = 'rgba(159,232,255,.7)'; ctx.setLineDash([4, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(r.ship.x, r.ship.y); for (const [x, y] of p.pts) ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
        if (p.bestP) { ctx.strokeStyle = p.best < g.RE * 0.13 ? '#7dff9a' : '#ffd84a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.bestP[0], p.bestP[1]); ctx.lineTo(p.bestP[2], p.bestP[3]); ctx.stroke(); }
        ctx.fillStyle = '#fff'; circle(r.ship.x, r.ship.y, 3.5);
        outlined(p.best < g.RE * 0.13 ? '🎯 On course for Mars!' : '◀ ▶ nudge your speed to aim', W / 2, -OFFY + (W < 700 ? 150 : 80), 19, p.best < g.RE * 0.13 ? '#7dff9a' : '#ffd84a');
      }
      drawEarth(ex, ey, 9, r.t); txt('Earth', ex, ey + 20, 12, '#9fe8ff');
      ctx.fillStyle = '#e0663a'; circle(mx, my, 7); txt('Mars', mx, my + 18, 12, '#ffb08a');
      if (r.phase === 'wait') { ctx.fillStyle = '#fff'; circle(ex, ey, 3); }
    } else {
      const k = clamp(r.alt / 125, 0, 1);
      sky(mix('#c98a5a', '#1a0d08', k), mix('#f2c79a', '#5a2a18', k));
      const G = H - 70;
      if (r.crane) { ctx.fillStyle = '#b5653a'; ctx.fillRect(0, G, W, H + OFFY - G + 2); for (let i = 0; i < 12; i++) { ctx.fillStyle = '#8a4a2a'; circle(rnd(i, 7) * W, G + 10 + rnd(i, 8) * 40, 3 + rnd(i, 9) * 5); } }
      if (!r.chute) drawCapsule(W / 2, H * 0.45 + Math.sin(r.t * 20) * (reduced() ? 0 : 2), 2.4, clamp(r.spd / 14000, 0, 1), 0.15);
      else if (!r.crane) {
        const y = H * 0.5;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(W / 2 - 14, y - 16); ctx.lineTo(W / 2 - 50, y - 110); ctx.moveTo(W / 2 + 14, y - 16); ctx.lineTo(W / 2 + 50, y - 110); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(W / 2, y - 110, 70, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#e8453a'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(W / 2, y - 110); ctx.arc(W / 2, y - 110, 70, Math.PI + i * 0.8, Math.PI + i * 0.8 + 0.4); ctx.fill(); }
        drawCapsule(W / 2, y, 2, 0, 0);
      } else {
        const fl = (actionHeld() || holding()) && r.cfuel > 0;
        ctx.fillStyle = '#d9d9d9'; ctx.fillRect(W / 2 - 34, r.y - 40, 68, 12);
        for (const sx of [-30, 26]) if (fl) { ctx.fillStyle = 'rgba(255,170,60,.9)'; ctx.beginPath(); ctx.moveTo(W / 2 + sx, r.y - 28); ctx.lineTo(W / 2 + sx + 2, r.y - 10 + Math.sin(r.t * 40) * 4); ctx.lineTo(W / 2 + sx + 4, r.y - 28); ctx.fill(); }
        ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(W / 2 - 16, r.y - 28); ctx.lineTo(W / 2 - 14, r.y + 14); ctx.moveTo(W / 2 + 16, r.y - 28); ctx.lineTo(W / 2 + 14, r.y + 14); ctx.stroke();
        drawRover(W / 2, r.y + 26, 1.4);
      }
    }
    drawFx();
    hud(r.score, r.lives, r.phase === 'edl' ? [!r.chute ? `💨 ${Math.round(r.spd).toLocaleString()} km/h` : r.crane ? `⬇️ ${Math.round(r.vy)} fall speed` : '🪂 Parachute open'] : [`🚀 Tries: ${r.tries}`]);
    const w = 220, [x, y] = gaugeAt(w);
    if (r.phase === 'edl' && !r.chute) {   // the parachute window
      ctx.fillStyle = 'rgba(11,42,92,.65)'; rrect(x, y, w, 46, 12); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.2)'; rrect(x + 10, y + 26, w - 20, 12, 6); ctx.fill();
      const sx = v => x + 10 + (w - 20) * (1 - clamp((v - 1000) / 4000, 0, 1));
      ctx.fillStyle = 'rgba(125,255,154,.6)'; ctx.fillRect(sx(1800), y + 26, sx(1200) - sx(1800), 12);
      ctx.fillStyle = '#ffd84a'; ctx.fillRect(sx(r.spd) - 2, y + 22, 4, 20);
      txt('🪂 Open the chute in the green zone', x + w / 2, y + 12, 13, '#fff');
    } else if (r.phase === 'cruise' && !D.safe) meter(x, y, w, '⛽', r.fuel / 100, '#6be06b');
    else if (r.phase === 'edl' && r.crane && !D.safe) meter(x, y, w, '🔥', r.cfuel / 100, '#ffb84a');
  };
  r.results = () => {
    const rows = [];
    if (r.capture != null) rows.push(['🎯 Reached Mars', 300], ['📍 Aim accuracy', Math.round(200 * clamp(1 - r.capture / 0.13, 0, 1))]);
    else rows.push(['🚀 Brave launch', 100]);
    if (r.chuteQ === 'perfect') rows.push(['🪂 Perfect parachute timing', 200]);
    if (r.win) { rows.push(['🤖 Rover landed!', 400]); if (r.soft) rows.push(['🪶 Gentle touchdown', 150]); if (!D.safe) rows.push([`❤️ Hearts × ${r.lives}`, r.lives * 50]); }
    return rows;
  };
  return r;
};

// ---------- 12. Ingenuity: spin up, fly in thin air, photograph targets, land on smooth ground ----------
ROUNDS.mars = () => {
  const D = diff(), G = H - 60, GM = 55, WORLD = 1900;
  const gAt = x => G - 30 * Math.sin(x * 0.004) - 18 * Math.sin(x * 0.011 + 1) - (x > 1400 ? (x - 1400) * 0.15 : 0);
  const ROCKY = [[500, 700], [1050, 1250]];
  const rocky = x => ROCKY.some(([a, b]) => x > a && x < b);
  const TARGETS = [{ x: 620, h: 110 }, { x: 1150, h: 170 }, { x: 1560, h: 120 }].slice(0, D.safe ? 2 : 3);
  const r = { score: 0, lives: D.lives, inv: 0, t: 0, x: 220, y: 0, vx: 0, vy: 0, tilt: 0, rpm: 0, spinning: false, battery: 100, landed: true, photos: 0, snapT: 0, flash: 0, devil: { x: 900, vx: 25 }, camX: 0, over: false, win: false, btn: { ico: '🌀', lbl: 'SPIN UP' } };
  r.y = gAt(r.x) - 16;
  r.k = { gAt, TARGETS, rocky };
  r.tap = () => { if (!r.spinning) { r.spinning = true; r.btn = null; showFact('Spinning up to 2,400 rpm! The thin air needs super-fast blades.'); RB.beep(200, 900, 2.5, 'sawtooth', 0.04); } };
  r.update = dt => {
    r.t += dt; r.inv -= dt; r.flash -= dt;
    if (D.safe && !r.spinning && r.t > 1.5) r.tap();
    if (r.spinning) r.rpm = Math.min(1, r.rpm + dt / 2.5);
    if (r.spinning && !D.safe) r.battery = Math.max(0, r.battery - 2.1 * (1 - D.assist * 0.3) * dt);
    const ax = axisX(), up = -axisY();
    r.tilt += (ax * 0.4 - r.tilt) * 4 * dt;
    const lift = r.rpm > 0.9 && r.battery > 0 ? 1 : 0;
    const T = lift * (D.safe || D.assist ? GM / Math.cos(r.tilt) * (1 + up * 0.8) : GM * (0.98 + up * 0.8));
    r.devil.x += r.devil.vx * dt; if (r.devil.x > WORLD - 100 || r.devil.x < 300) r.devil.vx *= -1;
    if (r.landed) {
      r.vx = r.vy = 0;
      if (lift && up > 0.25) { r.landed = false; showFact('Liftoff! Ingenuity\'s first hop rose just 3 meters and lasted 39 seconds.'); }
    } else {
      let gx = 0, gy = 0;
      if (Math.abs(r.x - r.devil.x) < 70 && !D.safe) { gx = Math.sign(r.x - r.devil.x) * 70 * D.hazard; gy = -30; showFact('Dust devils are spinning whirlwinds on Mars. Some are taller than skyscrapers!'); }
      r.vx += (T * Math.sin(r.tilt) - 0.35 * r.vx + gx) * dt;   // thin air: very little drag, so it slides
      r.vy += (GM - T * Math.cos(r.tilt) - 0.3 * r.vy + gy) * dt;
      r.x = clamp(r.x + r.vx * dt, 30, WORLD - 30); r.y = Math.max(40, r.y + r.vy * dt);
      if (Math.abs(r.vx) > 40) showFact('Thin air means little drag, so you keep sliding! Tilt back early to stop.');
      const gy0 = gAt(r.x);
      if (r.y + 16 >= gy0) {
        if (Math.abs(r.vy) > 60 || Math.abs(r.vx) > 45 || rocky(r.x)) {
          hurt(r, r.x - r.camX, r.y - 40, rocky(r.x) ? 'Rocks! Tipped over!' : 'Hard landing!');
          r.vy = -60; r.y = gy0 - 20; if (rocky(r.x)) showFact('Ingenuity had to find smooth ground to land on. Rocks could tip it over!');
        } else {
          r.landed = true; r.y = gy0 - 16;
          if (r.photos >= TARGETS.length) { r.over = true; r.win = true; r.end = 'Mission complete! The rover team loves your photos!'; }
        }
      }
    }
    const tg = TARGETS[r.photos];
    if (tg) {
      const ty = gAt(tg.x) - tg.h, inside = Math.hypot(r.x - tg.x, r.y - ty) < 42 && Math.hypot(r.vx, r.vy) < 45;
      r.snapT = inside ? r.snapT + dt : Math.max(0, r.snapT - dt * 2);
      if (r.snapT > 1.2) {
        r.snapT = 0; r.photos++; r.flash = 0.4; RB.beep(1200, 600, 0.12, 'square', 0.08);
        pop(r.x - r.camX, r.y - 40, `📸 Photo ${r.photos}! +200`, '#9fffa8', 20);
        showFact(r.photos === 1 ? 'Ingenuity\'s photos helped the rover team plan safe routes.' : 'Ingenuity carried a tiny piece of the Wright Flyer\'s wing on every flight!');
        if (r.photos >= TARGETS.length) showBanner('ALL PHOTOS TAKEN!', 'Now land on smooth ground', 2);
      }
    }
    if (r.battery < 25 && r.battery > 0) showFact('Low battery! Each flight used lots of power, then the Sun recharged it for a whole day.');
    if (!D.safe && r.battery <= 0 && !r.landed && r.y + 16 >= gAt(r.x) - 2) { r.over = true; r.end = 'The battery ran out!'; }
    if (!D.safe && r.battery <= 0 && r.landed) { r.over = true; r.win = r.photos >= TARGETS.length; r.end = r.win ? 'Mission complete, just in time!' : 'Battery empty! Ingenuity will recharge for tomorrow.'; }
    if (r.lives <= 0) { r.over = true; r.end = 'Ingenuity needs a rest!'; }
    r.camX = clamp(r.x - W / 2, 0, Math.max(0, WORLD - W));
    r.anchor = { x: r.x - r.camX, y: r.y };
    setWind(r.landed ? 0 : 0.02);
  };
  r.draw = () => {
    const cx = r.camX;
    sky('#d99a6a', '#f5d2a8');
    ctx.fillStyle = 'rgba(255,240,220,.7)'; circle(W * 0.2, 70, 14);
    groundFill(x => G - 120 - Math.sin(x * 0.003) * 40, '#c98a5a', 0, W, 20, cx * 0.4);
    groundFill(gAt, '#b5653a', 0, W, 8, cx);
    for (const [a, b] of ROCKY) for (let x = a; x < b; x += 16) { const sx = x - cx; if (sx < -20 || sx > W + 20) continue; ctx.fillStyle = '#6a3a22'; ctx.beginPath(); ctx.ellipse(sx, gAt(x) - 4, 6 + rnd(x, 1) * 5, 5 + rnd(x, 2) * 4, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(170 - cx, gAt(220) - 2, 100, 3); txt('Wright Brothers Field', 220 - cx, gAt(220) + 18, 12, '#fff');
    drawRover(110 - cx, gAt(110) - 6, 1.4);
    const dx = r.devil.x - cx;
    if (!D.safe) for (let i = 0; i < 8; i++) { ctx.fillStyle = `rgba(200,140,90,${0.25 - i * 0.02})`; ctx.beginPath(); ctx.ellipse(dx + Math.sin(r.t * 5 + i) * 6, gAt(r.devil.x) - i * 24, 14 + i * 5, 10, 0, 0, TAU); ctx.fill(); }
    TARGETS.forEach((tg, i) => {
      const sx = tg.x - cx, ty = gAt(tg.x) - tg.h;
      if (i < r.photos) { txt('✅', sx, ty, 20, '#fff'); return; }
      if (i > r.photos) return;
      ctx.strokeStyle = '#7dff9a'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(sx, ty, 42, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      if (r.snapT > 0) { ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(sx, ty, 48, -Math.PI / 2, -Math.PI / 2 + TAU * r.snapT / 1.2); ctx.stroke(); }
      txt('📸', sx, ty, 20, '#fff');
      offscreenArrow(sx, ty, '📸');
    });
    blink(r); drawIngenuity(r.x - cx, r.y, 1.4, r.t, r.rpm); ctx.globalAlpha = 1;
    if (!r.landed) { ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(r.x - cx, gAt(r.x) - 2, 16, 3, 0, 0, TAU); ctx.fill(); }
    if (r.flash > 0 && !reduced()) { ctx.fillStyle = `rgba(255,255,255,${r.flash})`; ctx.fillRect(0, -OFFY, W, VH); }
    if (!r.spinning) outlined(RB.touch ? 'Tap SPIN UP!' : 'Press SPACE to spin up!', r.x - cx, r.y - 60, 18, '#ffd84a');
    drawFx();
    hud(r.score, r.lives, [`📸 Photos ${r.photos} of ${TARGETS.length}`, `🌀 ${Math.round(r.rpm * 2400)} rpm`]);
    if (!D.safe) { const [x, y] = gaugeAt(160); meter(x, y, 160, '🔋', r.battery / 100, r.battery > 25 ? '#6be06b' : '#ff5a4a'); }
  };
  r.results = () => {
    const rows = [[`📸 Photos × ${r.photos}`, r.photos * 200]];
    if (r.win) { rows.push(['🛬 Safe landing', 300]); if (!D.safe) rows.push([`🔋 Battery left ${Math.round(r.battery)}%`, Math.round(r.battery) * 3], [`❤️ Hearts × ${r.lives}`, r.lives * 50]); }
    return rows;
  };
  return r;
};

// ---------- 13. Near light speed: a round trip to Proxima Centauri ----------
function drawStarship(x, y, s, t, glow) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (glow > 0) { ctx.fillStyle = `rgba(120,200,255,${0.4 + glow * 0.5})`; ctx.beginPath(); ctx.moveTo(-30, -6); ctx.lineTo(-30 - 20 - glow * 30 - Math.sin(t * 40) * 4, 0); ctx.lineTo(-30, 6); ctx.fill(); }
  ctx.fillStyle = '#e6ecf5'; ctx.beginPath(); ctx.moveTo(40, 0); ctx.quadraticCurveTo(20, -12, -30, -9); ctx.lineTo(-30, 9); ctx.quadraticCurveTo(20, 12, 40, 0); ctx.fill();
  ctx.fillStyle = '#7a5ad8'; ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(-30, -22); ctx.lineTo(-22, -8); ctx.fill(); ctx.beginPath(); ctx.moveTo(-10, 8); ctx.lineTo(-30, 22); ctx.lineTo(-22, 8); ctx.fill();
  ctx.fillStyle = '#4ae0ff'; ctx.beginPath(); ctx.ellipse(18, -2, 8, 4, 0, 0, TAU); ctx.fill();
  ctx.restore();
}
ROUNDS.light = () => {
  const D = diff(), DIST = 4.2, K = 0.32, DPHI = 0.55;
  const r = { score: 0, lives: D.lives, inv: 0, t: 0, y: H / 2, vy: 0, phi: 0.12, cells: 3, used: 0, got: 0, leg: 0, pos: 0, earthY: 0, shipY: 0, objs: [], scroll: 0, over: false, win: false, maxB: 0, btn: { ico: '⚡', lbl: 'BOOST' } };
  const beta = () => Math.tanh(r.phi);
  r.tap = () => {
    if (r.cells <= 0) { pop(PX(), r.y - 40, 'No energy cells! Grab some ⚡', '#fff', 18); return; }
    r.cells--; r.used++; r.phi += DPHI;
    RB.beep(300, 1200, 0.3, 'sawtooth', 0.07);
    pop(PX(), r.y - 40, `${(beta() * 100).toFixed(beta() > 0.99 ? 2 : 1)}% of light speed!`, '#9fe8ff', 20);
    showFact('Each boost adds less and less speed. You can get closer and closer to light speed, but never reach it!');
  };
  r.update = dt => {
    r.t += dt; r.inv -= dt;
    if (D.safe && r.cells > 0 && beta() < 0.95 && r.t > 1) r.tap();
    r.vy = lerp(r.vy, axisY() * 260, 6 * dt); r.y = clamp(r.y + r.vy * dt, 60, H - 60);
    const b = beta(), g = 1 / Math.sqrt(1 - b * b);
    r.maxB = Math.max(r.maxB, b);
    const dist = b * K * dt;   // light-years covered this frame
    r.pos += dist; r.earthY += dist / b; r.shipY += dist / b / g;
    r.scroll += (80 + b * 700) * dt;
    if (b > 0.9) showFact('At 90% of light speed your clock ticks less than half as fast as Earth\'s clocks!');
    if (r.objs.length < 7 && Math.random() < dt * (1.2 + b)) {
      const cell = Math.random() < 0.45;
      if (!cell && Math.random() > D.hazard) {} else r.objs.push({ k: cell ? 'cell' : 'dust', x: W + 40, y: rand(70, H - 70), r: cell ? 16 : 13 + Math.random() * 8 });
    }
    for (const o of r.objs) {
      o.x -= (180 + b * 500) * dt;
      if (o.dead || Math.abs(o.x - PX()) > 50) continue;
      if (hit(o.x, o.y, o.r, PX(), r.y, 22)) {
        o.dead = true;
        if (o.k === 'cell') { r.cells++; r.got++; r.score += 30; RB.beep(700, 1400, 0.12, 'sine', 0.1); pop(o.x, o.y - 20, '+⚡', '#ffe14a'); }
        else if (hurt(r, PX(), r.y - 40, 'Space dust hit!')) { r.phi = Math.max(0.12, r.phi - 0.3); showFact('Near light speed, even a speck of dust hits super hard! Real starship designers worry about this.'); }
      }
    }
    r.objs = r.objs.filter(o => !o.dead && o.x > -60);
    if (r.pos >= DIST && r.leg === 0) {
      r.leg = 1; r.pos = 0; r.phi = 0.12; r.cells += 1;
      showBanner('PROXIMA CENTAURI!', 'Turning around to go home…', 2.4);
      showFact('Proxima Centauri is the closest star to the Sun. Its light takes 4.2 years to reach us. To turn around you have to slow down, then speed up again!');
    } else if (r.pos >= DIST && r.leg === 1) {
      r.over = true; r.win = true;
      r.end = `Welcome home! You aged ${r.shipY.toFixed(1)} years, but Earth aged ${r.earthY.toFixed(1)}. You traveled into the future!`;
      showFact('That\'s the twin paradox: the twin who zooms near light speed comes home younger!');
    }
    if (r.lives <= 0) { r.over = true; r.end = 'The ship needs repairs from all that space dust!'; }
    r.anchor = { x: PX(), y: r.y };
    setWind(0.02 + beta() * 0.05);
  };
  r.draw = () => {
    const b = beta();
    sky('#02020a', '#0a0a24');
    for (let i = 0; i < 90; i++) {   // stars streak more the faster you go, and bunch up ahead
      const y = rnd(i, 3) * VH - OFFY, x = mod(rnd(i, 4) * W * 2 - r.scroll * (0.3 + rnd(i, 5)), W + 60) - 30;
      ctx.strokeStyle = mix('#ffffff', '#9fd0ff', b); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2 + b * b * 60, y); ctx.stroke();
    }
    const tx = r.leg === 0 ? W - 60 : 60;
    ctx.fillStyle = r.leg === 0 ? '#ff9a6a' : '#2f7de0'; circle(tx, H / 2, 6 + (r.pos / DIST) * 22);
    txt(r.leg === 0 ? 'Proxima' : 'Earth', tx, H / 2 + 40, 14, '#fff');
    for (const o of r.objs) {
      if (o.k === 'cell') { ctx.fillStyle = '#ffe14a'; ctx.beginPath(); ctx.moveTo(o.x + 4, o.y - 16); ctx.lineTo(o.x - 8, o.y + 2); ctx.lineTo(o.x, o.y + 2); ctx.lineTo(o.x - 4, o.y + 16); ctx.lineTo(o.x + 8, o.y - 2); ctx.lineTo(o.x, o.y - 2); ctx.fill(); }
      else { ctx.fillStyle = '#8a7a6a'; circle(o.x, o.y, o.r); ctx.fillStyle = '#6a5c50'; circle(o.x - 3, o.y - 2, o.r * 0.35); }
    }
    blink(r);
    ctx.save(); if (r.leg === 1) { ctx.translate(PX() * 2, 0); ctx.scale(-1, 1); }
    drawStarship(PX(), r.y, 1.3, r.t, b); ctx.restore(); ctx.globalAlpha = 1;
    drawFx();
    hud(r.score, r.lives, [`⚡ Cells: ${r.cells}`, `🚀 ${(b * 100).toFixed(b > 0.99 ? 2 : 1)}% light speed`]);
    const w = 220, [x, y] = gaugeAt(w);
    ctx.fillStyle = 'rgba(11,42,92,.65)'; rrect(x, y, w, 56, 12); ctx.fill();
    txt(`🌍 Earth clock: ${r.earthY.toFixed(1)} yrs`, x + 12, y + 17, 15, '#9fe8ff', 'left');
    txt(`🧑‍🚀 Your clock: ${r.shipY.toFixed(1)} yrs`, x + 12, y + 39, 15, '#ffd84a', 'left');
    progressBar(r.pos / DIST, r.leg === 0 ? '🌍 Earth' : '⭐ Proxima', r.leg === 0 ? '⭐ Proxima (4.2 ly)' : '🌍 Home', '#9fe8ff');
  };
  r.results = () => {
    const rows = [[`⏩ Jumped into the future ${(r.earthY - r.shipY).toFixed(1)} yrs`, Math.round((r.earthY - r.shipY) * 80)], [`⚡ Cells collected × ${r.got}`, r.got * 30]];
    if (r.win) { rows.push(['🏠 Made it home', 300]); if (!D.safe) rows.push([`❤️ Hearts × ${r.lives}`, r.lives * 50]); }
    return rows;
  };
  return r;
};

// ---------- 14. Are we alone? Radio-telescope detective ----------
const SIGNALS = [
  { id: 'pulsar', clue: 'Beeps every 1.337 seconds, exactly, for weeks. It stays in the same spot among the stars.', a: ['A spinning dead star called a pulsar', 'An alien message saying hello', 'A phone call from a nearby town', 'Radar from a passing airplane'], why: 'In 1967 Jocelyn Bell Burnell found a signal just like this. It was nicknamed LGM-1 for "Little Green Men", but it was a pulsar: a tiny, super-dense star spinning like a lighthouse.' },
  { id: 'oven', clue: 'Only appears around lunchtime, and only when the telescope points toward the kitchen building.', a: ['A microwave oven in the kitchen', 'Aliens who like eating lunch', 'A pulsar that spins at noon', 'Sunlight bouncing off the Moon'], why: 'This really happened! Mystery signals at Australia\'s Parkes telescope turned out to be the staff microwave oven being opened before it finished.' },
  { id: 'sat', clue: 'Moves quickly across the sky, then disappears below the horizon. It came back 90 minutes later.', a: ['A satellite orbiting the Earth', 'An alien spaceship sneaking by', 'A comet crashing into the Sun', 'A pulsar wobbling from side to side'], why: 'Satellites zip across the sky and come back each orbit. The Space Station goes around every 90 minutes!' },
  { id: 'wow', clue: 'One strong signal for about a minute, from one spot. It was never seen again, even after looking many times.', a: ['Unknown: we need to see it again to know', 'Definitely an alien message', 'Definitely a microwave oven', 'Definitely a satellite'], why: 'In 1977 the famous "Wow! signal" was like this. Nobody knows what it was, but one signal that never repeats isn\'t enough evidence to say "aliens".' },
  { id: 'plane', clue: 'A crackly signal that gets stronger, then weaker, as a plane flies past the nearby airport.', a: ['Radio from an airplane', 'Aliens copying airplane sounds', 'A star exploding far away', 'Static from Jupiter'], why: 'Planes, phones, cars and TV towers all make radio noise. Telescopes are built far from towns to avoid it.' },
  { id: 'hydrogen', clue: 'A soft, steady hiss from all along the Milky Way, at the radio "color" of hydrogen gas.', a: ['Natural glow from hydrogen gas in space', 'Billions of aliens all talking at once', 'Noise from the telescope\'s own wires', 'A satellite stuck in one place'], why: 'Clouds of hydrogen gas glow in radio waves. Astronomers use it to map the shape of our galaxy!' },
  { id: 'jupiter', clue: 'Bursts of noisy, crackling static that come from the direction of the planet Jupiter.', a: ['Natural radio storms on Jupiter', 'Aliens living on Jupiter', 'A microwave oven on a spaceship', 'An airplane flying near Jupiter'], why: 'Jupiter\'s huge magnetic field makes powerful radio storms. You can even hear them with a homemade radio antenna!' },
];
ROUNDS.aliens = () => {
  const D = diff(), N = 5;
  const picks = shuffle(SIGNALS.filter(s => s.id !== 'wow')).slice(0, N - 1).concat(SIGNALS.find(s => s.id === 'wow'));
  const srcs = shuffle(picks).map((s, i) => ({ s, x: 0.15 + (i % 3) * 0.33 + rnd(i, 41) * 0.12, y: 0.15 + Math.floor(i / 3) * 0.38 + rnd(i, 42) * 0.18, found: false }));
  const r = { score: 0, t: 0, x: 0.5, y: 0.45, vx: 0, vy: 0, lock: 0, found: 0, right: 0, beepT: 0, over: false, win: false, answers: [] };
  const sky0 = () => ({ x0: 20, y0: -OFFY + (W < 700 ? 120 : 70), w: W - 40, h: H + OFFY - 110 - (-OFFY + (W < 700 ? 120 : 70)) });
  r.k = { srcs, sky0 };
  r.update = dt => {
    r.t += dt;
    if (r.asking) return;
    const S = sky0();
    let ix = axisX(), iy = axisY();
    if (mouse) { ix = clamp((mouse.x - (S.x0 + r.x * S.w)) / 60, -1, 1); iy = clamp((mouse.y - (S.y0 + r.y * S.h)) / 60, -1, 1); }
    r.vx = lerp(r.vx, ix * 0.32, 6 * dt); r.vy = lerp(r.vy, iy * 0.32 * S.w / S.h, 6 * dt);
    r.x = clamp(r.x + r.vx * dt, 0.02, 0.98); r.y = clamp(r.y + r.vy * dt, 0.03, 0.97);
    if (r.t > 0.5) showFact('Radio telescopes listen for radio waves from space. Follow the signal meter to find something!');
    let near = null, nd = 1e9;
    for (const s of srcs) if (!s.found) { const d = Math.hypot((s.x - r.x) * S.w, (s.y - r.y) * S.h); if (d < nd) { nd = d; near = s; } }
    r.strength = near ? clamp(1 - nd / Math.max(S.w, S.h) * 1.6, 0, 1) : 0;
    r.beepT -= dt;
    if (r.beepT <= 0 && near) { r.beepT = lerp(1.2, 0.08, r.strength ** 2); RB.beep(600 + r.strength * 900, 600 + r.strength * 900, 0.05, 'sine', 0.05 + r.strength * 0.05); }
    const slow = Math.hypot(r.vx, r.vy) < 0.12;
    if (near && nd < 30 && slow) {
      r.lock += dt;
      if (r.lock > 1) {
        r.lock = 0; near.found = true; r.found++; RB.beep(880, 1760, 0.2, 'triangle', 0.1);
        r.ask(near.s);
      }
    } else r.lock = Math.max(0, r.lock - dt);
  };
  // Opens the detective question (the app shows it as a card and calls back with the answer).
  r.ask = sig => {
    r.asking = sig;
    showFact('Good scientists test the simple explanations first.');
    if (typeof askSignal === 'function') askSignal(sig, D.safe, ok => r.answer(ok));
    else r.answer(true);
  };
  r.answer = ok => {
    r.answers.push(ok); if (ok) { r.right++; r.score += 200; }
    r.asking = null; last = performance.now();
    if (r.found >= N) {
      r.over = true; r.win = true;
      r.end = 'All signals checked! No alien messages confirmed yet, but scientists keep listening. Maybe you\'ll find one someday!';
    }
  };
  r.draw = () => {
    sky('#04050f', '#0c1430');
    spaceStars(160, 13, W, VH, r.t);
    ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#c9d8ff';   // the Milky Way band
    ctx.beginPath(); ctx.moveTo(0, H * 0.8); ctx.quadraticCurveTo(W * 0.5, H * 0.1, W, H * 0.3); ctx.lineTo(W, H * 0.45); ctx.quadraticCurveTo(W * 0.5, H * 0.25, 0, H * 0.95); ctx.fill(); ctx.restore();
    const S = sky0();
    ctx.strokeStyle = 'rgba(159,232,255,.15)'; ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(S.x0 + S.w * i / 6, S.y0); ctx.lineTo(S.x0 + S.w * i / 6, S.y0 + S.h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(S.x0, S.y0 + S.h * i / 6); ctx.lineTo(S.x0 + S.w, S.y0 + S.h * i / 6); ctx.stroke(); }
    // horizon: the observatory, its kitchen and a little airport
    const hy = H + OFFY - 90;
    ctx.fillStyle = '#0a0c14'; ctx.fillRect(0, hy, W, 90);
    ctx.fillStyle = '#d9d9d9'; ctx.beginPath(); ctx.ellipse(W * 0.2, hy - 10, 40, 14, -0.3, Math.PI, 0); ctx.fill(); ctx.fillRect(W * 0.2 - 3, hy - 10, 6, 14);
    ctx.fillStyle = '#2a2e3a'; ctx.fillRect(W * 0.45, hy - 24, 60, 24); txt('🍲 kitchen', W * 0.45 + 30, hy + 12, 12, '#9aa');
    ctx.fillStyle = '#2a2e3a'; ctx.fillRect(W * 0.75, hy - 6, 90, 6); if (Math.sin(r.t * 4) > 0) { ctx.fillStyle = '#ff5a4a'; circle(W * 0.75 + 45, hy - 14, 3); } txt('✈️ airport', W * 0.75 + 45, hy + 12, 12, '#9aa');
    for (const s of srcs) if (s.found) txt('✅', S.x0 + s.x * S.w, S.y0 + s.y * S.h, 18, '#fff');
    const rx = S.x0 + r.x * S.w, ry = S.y0 + r.y * S.h;
    ctx.strokeStyle = r.lock > 0 ? '#7dff9a' : '#9fe8ff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(rx, ry, 30, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx - 42, ry); ctx.lineTo(rx - 22, ry); ctx.moveTo(rx + 22, ry); ctx.lineTo(rx + 42, ry); ctx.moveTo(rx, ry - 42); ctx.lineTo(rx, ry - 22); ctx.moveTo(rx, ry + 22); ctx.lineTo(rx, ry + 42); ctx.stroke();
    if (r.lock > 0) { ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(rx, ry, 36, -Math.PI / 2, -Math.PI / 2 + TAU * r.lock); ctx.stroke(); }
    // the signal meter: a wiggly line that gets louder near a signal
    const w = 220, [x, y] = gaugeAt(w);
    ctx.fillStyle = 'rgba(11,42,92,.7)'; rrect(x, y, w, 50, 12); ctx.fill();
    ctx.strokeStyle = mix('#7fc8ff', '#7dff9a', r.strength || 0); ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 100; i++) { const xx = x + 10 + i * (w - 20) / 100, n = (rnd(i + Math.floor(r.t * 20), 5) - 0.5) * 8, sig = Math.sin(i * 0.6 + r.t * 20) * (r.strength || 0) * 16; ctx.lineTo(xx, y + 28 + n + sig); }
    ctx.stroke();
    txt('📡 Signal', x + 12, y + 10, 12, '#fff', 'left');
    drawFx();
    hud(r.score, null, [`📡 Signals ${r.found} of ${N}`, `🧠 Solved ${r.right}`]);
  };
  r.results = () => {
    const rows = [[`📡 Signals found × ${r.found}`, r.found * 60], [`🧠 Solved correctly × ${r.right}`, r.right * 200]];
    if (r.win) rows.push(['⏱️ Quick detective', Math.max(0, Math.round((120 - r.t) * 2))]);
    return rows;
  };
  return r;
};
