// Flight School rounds, part 1: balloons through jets.
// Each ROUNDS[id]() returns a round: { update(dt), draw(), results() → [[label, points]], over, win, end, tap?, anchor? }.
// Rounds read diff() for the mode: safe (toddler: nothing is ever lost), hazard (how many dangers) and assist (0-1 help).
'use strict';

const ROUNDS = {};
const groundFill = (fn, color, from = 0, to = W, step = 10, camX = 0) => {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(from, H + OFFY + 2);
  for (let x = from; x <= to + step; x += step) ctx.lineTo(x, fn(x + camX));
  ctx.lineTo(to + step, H + OFFY + 2); ctx.fill();
};
// Points toward something off-screen.
function offscreenArrow(sx, sy, label) {
  if (sx > 30 && sx < W - 30 && sy > -OFFY + 30 && sy < H + OFFY - 30) return;
  const x = clamp(sx, 40, W - 40), y = clamp(sy, -OFFY + (W < 700 ? 160 : 110), H + OFFY - 60), a = Math.atan2(sy - y, sx - x);
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-8, -12); ctx.lineTo(-8, 12); ctx.fill();
  ctx.restore();
  if (label) outlined(label, x - Math.cos(a) * 30, y - Math.sin(a) * 30, 15, '#fff');
}

// ---------- 1. Hot air balloon: pick a height to pick a wind ----------
ROUNDS.balloon = () => {
  const D = diff(), GROUND = H - 56, BOT = 64, FIELD = 3300, FW = D.safe ? 900 : 300, END = FIELD + 1400;
  const LAYERS = D.safe
    ? [[40, 170, 55], [170, 280, 40], [280, GROUND - 80, 30], [GROUND - 80, GROUND, 12]]
    : [[40, 160, 72], [160, 275, -40], [275, GROUND - 80, 42], [GROUND - 80, GROUND, 10]];
  const windAt = y => (LAYERS.find(l => y < l[1]) || LAYERS[3])[2];
  const LINES = D.safe ? [] : [900, 1750, 2500, FIELD + 620].slice(0, D.hazard > 1 ? 4 : 3);
  const wireY = (lx, x) => GROUND - 72 + Math.sin((x - lx) / 160 * Math.PI) * 14;
  const r = { score: 0, lives: D.lives, inv: 0, stars: 0, t: 0, bx: 120, y: GROUND - BOT, vx: 0, vy: 0, heat: 0.4, fuel: 100, landed: true, camX: 0, objs: [], over: false, win: false };
  r.k = { FIELD, GROUND, LAYERS, LINES, BOT };   // layout, for the test autopilots
  for (let x = 380; x < END - 200; x += 230 + rnd(x, 1) * 120) r.objs.push({ k: 'star', x, y: 70 + rnd(x, 2) * (GROUND - 170) });
  for (let x = 700; x < END; x += (420 + rnd(x, 3) * 300) / Math.max(0.3, D.hazard)) {
    const lay = LAYERS[rnd(x, 4) < 0.5 ? 0 : 2];
    r.objs.push({ k: 'bird', x, y: lay[0] + 20 + rnd(x, 5) * (lay[1] - lay[0] - 40), vx: -30 - rnd(x, 6) * 30, ph: rnd(x, 7) * 6 });
  }
  r.update = dt => {
    r.t += dt; r.inv -= dt;
    const burn = holding() && r.fuel > 0;
    r.heat = clamp(r.heat + (burn ? 0.7 : -0.42) * dt, 0, 1);
    if (burn && !D.safe) r.fuel = Math.max(0, r.fuel - 2.1 * dt);
    r.vy = clamp((r.vy - (r.heat - 0.45) * 300 * dt) * (1 - 1.3 * dt), -150, 150);
    if (r.landed) {
      r.vx *= 1 - 4 * dt;
      if (r.vy < 0) { r.landed = false; r.hopMsg = false; } else { r.vy = 0; r.y = GROUND - BOT; }
    } else {
      r.y += r.vy * dt;
      r.vx += (windAt(r.y + 20) - r.vx) * 0.9 * dt;
      if (r.y < 40) { r.y = 40; r.vy = Math.max(0, r.vy); }
      if (r.y + BOT >= GROUND) {
        if (r.vy > 75) { hurt(r, r.bx - r.camX, r.y - 50, 'Bump! Too fast!'); r.vy = -70; r.y = GROUND - BOT - 2; }
        else {
          r.landed = true; r.y = GROUND - BOT; r.vy = 0;
          if (Math.abs(r.bx - FIELD) < FW / 2) {
            r.over = true; r.win = true; r.end = 'Touchdown in the field! A perfect balloon flight.';
            showFact('Balloon pilots land in open fields. A chase crew drives over to help pack the balloon up!');
          } else if (r.fuel <= 0) { r.over = true; r.end = 'Out of fuel, so you landed where you could.'; }
          else if (!r.hopMsg) { r.hopMsg = true; pop(r.bx - r.camX, r.y - 60, 'Not the field! Fire up to hop again', '#fff', 18); }
        }
      }
    }
    r.bx = clamp(r.bx + r.vx * dt, 40, END);
    if (windAt(r.y + 20) < 0 && !r.landed) showFact('This wind blows backward! Balloon pilots choose a height to choose a wind direction.');
    if (r.bx > FIELD + FW / 2 + 150) showFact('Too far! Find the wind that blows back the other way (watch the arrows).');
    if (r.fuel < 25 && r.fuel > 0) showFact('Real balloons burn propane gas. Save some for landing!');
    const basket = r.y + BOT - 10;
    for (const lx of LINES) if (!r.landed && r.bx > lx - 10 && r.bx < lx + 170 && Math.abs(basket - wireY(lx, r.bx)) < 14) {
      if (hurt(r, r.bx - r.camX, r.y - 50, 'Zap! Power lines!')) RB.noise(0.3, 0.3);
      r.vy = -90; r.heat = Math.max(r.heat, 0.8);
      showFact('Power lines are a real danger for balloons. Pilots always watch for them near the ground.');
    }
    for (const o of r.objs) {
      if (o.k === 'bird') { o.x += o.vx * dt; o.y += Math.sin(r.t * 2 + o.ph) * 15 * dt; }
      if (o.dead || Math.abs(o.x - r.bx) > 60) continue;
      if (o.k === 'star' && (hit(o.x, o.y, 14, r.bx, r.y - 4, 34) || hit(o.x, o.y, 14, r.bx, r.y + 50, 12))) {
        o.dead = true; r.stars++; r.score += 50; RB.beep(880, 1320, 0.12, 'triangle', 0.12); pop(o.x - r.camX, o.y - 20, '+50'); puff(o.x - r.camX, o.y, 10, ['#ffd84a', '#fff']);
      } else if (o.k === 'bird' && hit(o.x, o.y, 12, r.bx, r.y - 4, 34)) { o.dead = true; hurt(r, r.bx - r.camX, r.y - 50, 'Ouch! A bird!'); }
    }
    r.objs = r.objs.filter(o => !o.dead);
    if (r.lives <= 0) { r.over = true; r.end = 'Too many bumps! The balloon had to land.'; }
    r.camX = clamp(r.bx - W * 0.4, 0, END + 300 - W);
    setWind(r.landed ? 0 : 0.03 + Math.abs(r.vx) / 2000);
    if (r.t > 1 && r.t < 2) showFact('Each layer of wind blows a different way. The arrows show which way!');
  };
  r.draw = () => {
    const cx = r.camX;
    sky('#69b7ff', '#fff1d6');
    ctx.fillStyle = '#fff6c9'; circle(W * 0.8, 80, 36);
    for (let i = 0; i < 6; i++) cloud(mod(rnd(i, 1) * 1800 - cx * 0.2, 1800) - 150, 50 + rnd(i, 2) * 140, 0.6 + rnd(i, 3) * 0.6);
    groundFill(x => GROUND - 60 - Math.sin(x * 0.006) * 30, '#9fcf94', 0, W, 20, cx * 0.3);
    // wind layers: faint bands and drifting arrows
    LAYERS.forEach(([y1, y2, w], i) => {
      ctx.fillStyle = w < 0 ? 'rgba(61,111,224,.10)' : `rgba(255,255,255,${0.04 + i * 0.02})`; ctx.fillRect(0, y1, W, y2 - y1);
      const n = Math.ceil(W / 170) + 1;
      for (let k = 0; k < n; k++) {
        const wx = mod(k * 170 + r.t * w * 1.4 - cx, n * 170) - 40, wy = (y1 + y2) / 2 + Math.sin(k * 2.3) * (y2 - y1) * 0.25;
        arrow(wx - Math.sign(w) * 16, wy, wx + Math.sign(w) * 16, wy, 'rgba(255,255,255,.75)', 3);
      }
      txt(`${w < 0 ? '←' : '→'} ${Math.abs(w)}`, 14, y1 + 14, 13, 'rgba(11,42,92,.6)', 'left');
    });
    // the landing field with its big X
    const fx = FIELD - cx;
    ctx.fillStyle = '#f2d77a'; ctx.fillRect(fx - FW / 2, GROUND - 2, FW, 14);
    ctx.strokeStyle = '#e8453a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(fx - 26, GROUND - 1); ctx.lineTo(fx + 26, GROUND + 10); ctx.moveTo(fx + 26, GROUND - 1); ctx.lineTo(fx - 26, GROUND + 10); ctx.stroke();
    ctx.fillStyle = '#8a5a2b'; ctx.fillRect(fx + FW / 2 - 10, GROUND - 60, 4, 60); ctx.fillStyle = '#e8453a'; ctx.beginPath(); ctx.moveTo(fx + FW / 2 - 6, GROUND - 60); ctx.lineTo(fx + FW / 2 + 22, GROUND - 52); ctx.lineTo(fx + FW / 2 - 6, GROUND - 44); ctx.fill();
    ctx.fillStyle = '#5fae4f'; ctx.fillRect(0, GROUND, W, H + OFFY - GROUND + 2);
    ctx.fillStyle = '#f2d77a'; ctx.fillRect(fx - FW / 2, GROUND, FW, 10);
    for (let i = 0; i < 14; i++) { const tx = mod(i * 193 - cx, 2702) - 60; if (Math.abs(tx + cx - FIELD) > FW / 2 + 40) { ctx.fillStyle = '#3f8a3a'; circle(tx, GROUND - 14, 14); ctx.fillRect(tx - 2, GROUND - 6, 4, 8); } }
    for (const lx of LINES) {
      const sx = lx - cx; if (sx < -200 || sx > W + 50) continue;
      ctx.fillStyle = '#6a4a2a'; ctx.fillRect(sx - 3, GROUND - 80, 6, 80); ctx.fillRect(sx + 157, GROUND - 80, 6, 80);
      ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = 0; x <= 160; x += 10) ctx.lineTo(sx + x, wireY(lx, lx + x)); ctx.stroke();
    }
    for (const o of r.objs) {
      const sx = o.x - cx; if (sx < -40 || sx > W + 40) continue;
      if (o.k === 'star') star(sx, o.y + Math.sin(r.t * 3 + o.x) * 4, 14, '#ffd84a', r.t); else bird(sx, o.y, 1.2, r.t + o.ph);
    }
    const px = r.bx - cx;
    blink(r); drawBalloon(px, r.y, 34, holding() && r.fuel > 0 ? 1 : 0, '#3d6fe0', '#ffd84a', r.t); ctx.globalAlpha = 1;
    const gx = px + 50, gy = r.y - 30;
    ctx.fillStyle = 'rgba(11,42,92,.5)'; rrect(gx, gy, 12, 60, 6); ctx.fill();
    ctx.fillStyle = mix('#7fc8ff', '#ff5a2a', r.heat); rrect(gx + 2, gy + 58 - 56 * r.heat, 8, 56 * r.heat, 4); ctx.fill();
    offscreenArrow(fx, GROUND - 30, '🎯');
    drawFx();
    const w = windAt(r.y + 20);
    hud(r.score, r.lives, [`💨 Wind ${w < 0 ? '← back' : '→ ahead'}`]);
    if (!D.safe) { const [x, y] = gaugeAt(160); meter(x, y, 160, '⛽', r.fuel / 100, r.fuel > 25 ? '#6be06b' : '#ff5a4a'); }
    progressBar(r.bx / FIELD, '🎈 Start', '🎯 Field');
  };
  r.results = () => {
    const rows = [[`⭐ Stars × ${r.stars}`, r.stars * 50]];
    if (r.win) {
      const acc = Math.round(300 * Math.max(0, 1 - Math.abs(r.bx - FIELD) / (FW / 2)));
      rows.push(['🎯 Landed in the field', 400], ['📍 Close to the X', acc]);
      if (!D.safe) rows.push([`⛽ Fuel left ${Math.round(r.fuel)}%`, Math.round(r.fuel) * 3], [`❤️ Hearts × ${r.lives}`, r.lives * 50]);
    } else rows.push(['📏 Distance', Math.round(Math.min(r.bx, FIELD) / 20)]);
    return rows;
  };
  return r;
};

// ---------- 2. Glider: trade height for speed, ride thermals, land on the field ----------
ROUNDS.wing = () => {
  const D = diff(), GOAL = 5600, FIELD_W = 900, GROUND = H - 40, STALL = 95 - D.assist * 25;
  const hillY = x => {
    if (x > GOAL - 120 && x < GOAL + FIELD_W) return GROUND - 30;
    if (x >= GOAL + FIELD_W) return GROUND - 30 - Math.min(80, (x - GOAL - FIELD_W) * 0.5);
    return GROUND - 30 - Math.max(0, Math.sin(x * 0.0021) * 60 + Math.sin(x * 0.0057 + 2) * 30) * clamp((GOAL - 120 - x) / 400, 0, 1);
  };
  const r = { score: 0, stars: 0, dist: 0, y: 150, v: 175, pitch: 0, stall: false, objs: [], therm: [], t: 0, inv: 0, over: false, win: false, tow: 1.5 };
  r.k = { GOAL, FIELD_W, hillY, GROUND };
  for (let x = 380; x < GOAL - 200; x += 460 + rnd(x, 3) * 180) r.therm.push({ x, w: 150 + rnd(x, 1) * 40, p: (140 + rnd(x, 2) * 30) * (1 + D.assist * 0.3) });
  for (let x = 260; x < GOAL; x += 220 + rnd(x, 5) * 160) r.objs.push({ x, y: 70 + rnd(x, 4) * (H - 240) });
  r.update = dt => {
    r.t += dt;
    const px = PX();
    if (r.tow > 0) {   // a tow plane pulls you up to start
      r.tow -= dt; r.dist += 170 * dt; r.y = Math.max(110, r.y - 20 * dt);
      if (r.tow <= 0) { pop(px, r.y - 40, 'Tow rope released!', '#fff', 18); showFact('Gliders are towed up by a plane, then let go. From then on, no engine at all!'); }
      return;
    }
    r.pitch += (holding() ? 1.5 : -1.15) * dt;
    if (r.v < STALL && !r.stall) { r.stall = true; showFact('STALL! The wing tilted up too much and lost lift. Let go to dive and get speed back.'); }
    if (r.stall) { r.pitch -= 2.6 * dt; if (r.v > STALL + 30) r.stall = false; }
    r.pitch = clamp(r.pitch, -0.6, 0.48);
    r.brakes = r.dist + PX() > GOAL - 1000;   // airbrakes come out for the landing approach
    if (r.brakes) showFact('Airbrakes out! Gliders use them to come down steeply onto the landing field.');
    r.v = clamp(r.v + (-230 * Math.sin(r.pitch) - (r.brakes ? 0.0026 : 0.0008) * r.v * r.v + 18) * dt, 40, 320);
    let lift = 0;
    for (const th of r.therm) if (Math.abs(th.x - (r.dist + px)) < th.w / 2) lift = th.p;
    if (lift) showFact('A thermal! Warm air rising off the ground. Hawks and eagles circle in these to climb for free.');
    const sink = (36 + (r.stall ? 70 : 0) + (r.brakes ? 55 : 0)) * (1 - D.assist * 0.4);
    r.vyDown = -r.v * Math.sin(r.pitch) + sink - lift;
    r.y += r.vyDown * dt;
    if (r.y < 40) { r.y = 40; r.pitch = Math.min(r.pitch, 0); }
    r.dist += r.v * Math.cos(r.pitch) * dt;
    collectStars(r, r.objs, px, r.y, 22, o => [o.x - r.dist, o.y]);
    const gy = hillY(r.dist + px);
    if (r.y + 6 > gy) {
      r.y = gy - 6; r.over = true;
      const x = r.dist + px;
      if (x > GOAL - 120 && x < GOAL + FIELD_W) {
        r.win = true; r.soft = r.vyDown < 60;
        r.end = r.soft ? 'A smooth landing on the field! Lilienthal would be proud.' : 'You made it to the field! (A bit of a bump.)';
      } else r.end = x >= GOAL + FIELD_W ? 'You glided right past the field! Come in lower next time.' : r.dist > 2500 ? 'You touched down before the field. Nice glide!' : 'You touched down. Ride the thermals to stay up longer!';
      RB.beep(300, 120, 0.25, 'triangle', 0.1);
    }
    setWind(0.03 + r.v / 320 * 0.06);
  };
  r.draw = () => {
    sky('#4aa6ff', '#d8f0ff');
    for (let i = 0; i < 7; i++) cloud(mod(rnd(i, 1) * 1800 - r.dist * 0.25, 1800) - 150, 40 + rnd(i, 2) * 150, 0.6 + rnd(i, 3) * 0.6);
    groundFill(x => GROUND - 90 - Math.sin(x * 0.005) * 40, '#9ccf9a', 0, W, 20, r.dist * 0.35);
    for (const th of r.therm) {
      const sx = th.x - r.dist; if (sx < -100 || sx > W + 100) continue;
      const g = ctx.createLinearGradient(sx - th.w / 2, 0, sx + th.w / 2, 0);
      g.addColorStop(0, 'rgba(255,180,90,0)'); g.addColorStop(0.5, 'rgba(255,180,90,.28)'); g.addColorStop(1, 'rgba(255,180,90,0)');
      ctx.fillStyle = g; ctx.fillRect(sx - th.w / 2, -OFFY, th.w, H + OFFY);
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3;
      for (let k = 0; k < 5; k++) { const ay = mod(H - (r.t * 90 + k * 110), H + 40) - 20, ax = sx + Math.sin(k * 2 + r.t * 3) * th.w * 0.25; ctx.beginPath(); ctx.moveTo(ax - 8, ay + 8); ctx.lineTo(ax, ay); ctx.lineTo(ax + 8, ay + 8); ctx.stroke(); }
    }
    groundFill(hillY, '#5fae4f', 0, W, 10, r.dist);
    const fx = GOAL - r.dist + PX();
    ctx.fillStyle = '#e8d27a'; ctx.fillRect(fx - 120, GROUND - 32, FIELD_W + 120, 6);
    if (fx < W + 50) outlined('🏁', fx + FIELD_W - 20, GROUND - 60, 34, '#fff');
    ctx.fillStyle = '#3f8a3a';
    for (let i = 0; i < 14; i++) { const tx = mod(i * 137 - r.dist, 1918) - 60, wx = tx + r.dist; if (wx > GOAL - 160 && wx < GOAL + FIELD_W) continue; const ty = hillY(wx); circle(tx, ty - 10, 12); ctx.fillRect(tx - 2, ty - 6, 4, 8); }
    for (const o of r.objs) if (!o.dead) star(o.x - r.dist, o.y + Math.sin(r.t * 3 + o.x) * 4, 14, '#ffd84a', r.t);
    const px = PX();
    if (r.tow > 0) {
      drawProp(px + 120, r.y - 30, 1.2, 0.05, r.t, '#e8453a');
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px + 30, r.y); ctx.lineTo(px + 84, r.y - 28); ctx.stroke();
    }
    drawGlider(px, r.y, 1.3, r.pitch);
    if (r.brakes && !r.over) { ctx.save(); ctx.translate(px, r.y); ctx.rotate(-r.pitch); ctx.fillStyle = '#e8453a'; ctx.fillRect(-2, -12, 3, 8); ctx.fillRect(6, -12, 3, 8); ctx.restore(); }
    if (r.tow <= 0 && !r.over) {   // live force arrows: lift, weight, drag
      const L = clamp((r.v / 150) ** 2 * 34, 6, 60) * (r.stall ? 0.35 : 1), Dr = clamp(r.v * r.v * 0.0011, 4, 48);
      const la = -r.pitch - Math.PI / 2;
      arrow(px, r.y - 6, px + Math.cos(la) * L, r.y - 6 + Math.sin(la) * L, r.stall ? '#ff8a7a' : '#2fa84f', 4);
      arrow(px, r.y + 6, px, r.y + 40, '#e8453a', 4);
      arrow(px - 26, r.y, px - 26 - Math.cos(r.pitch) * Dr, r.y + Math.sin(r.pitch) * Dr, '#f08a00', 4);
    }
    if (r.stall) outlined('STALL! Let go to dive!', px, r.y - 64, 20, '#ff6b5a');
    drawFx();
    hud(r.score, null, [`💨 Speed ${Math.round(r.v)}`, `📏 ${Math.round(r.dist / 10)} m`]);
    progressBar(r.dist / GOAL, '⛰️ Hill', '🏁 Field');
  };
  r.results = () => {
    const rows = [['📏 Distance', Math.round(r.dist / 10)], [`⭐ Stars × ${r.stars}`, r.stars * 50]];
    if (r.win) rows.push(['🏁 Landed on the field', 300]);
    if (r.soft) rows.push(['🪶 Smooth landing', 200]);
    return rows;
  };
  return r;
};

// ---------- 3. Zeppelin: ballast and gas, over the Alps to the mooring mast ----------
ROUNDS.zeppelin = () => {
  const D = diff(), G = H - 40, MAST = 3400, TOP = G - 150;
  const zg = x => {
    if (x < 420) return G;   // Lake Constance
    let m = 0;
    for (const [c, h, w] of [[1000, 190, 220], [1800, 250, 260], [2600, 170, 200]]) m = Math.max(m, h * Math.exp(-(((x - c) / w) ** 2)));
    return G - 10 - m - Math.sin(x * 0.03) * 6 * (m > 20 ? 1 : 0);
  };
  const STORMS = D.safe ? [] : [1400, 2250].slice(0, D.hazard > 0.6 ? 2 : 1);
  const SUN = [[500, 820], [2000, 2200]], SHADE = [[1150, 1330], [2420, 2560]];
  const r = { score: 0, lives: D.lives, inv: 0, stars: 0, t: 0, x: 120, y: G - 120, vy: 0, gas: 100, ballast: 100, temp: 0, objs: [], over: false, win: false, mastT: 0 };
  r.k = { zg, STORMS, MAST, TOP };
  for (let x = 400; x < MAST - 150; x += 240 + rnd(x, 1) * 140) r.objs.push({ x, y: clamp(zg(x) - 70 - rnd(x, 2) * 160, 60, G - 90) });
  const strike = sx => { const ph = mod(r.t + sx * 0.001, 3.4); return { warn: ph > 2.2 && ph < 3.1, bolt: ph >= 3.1 }; };
  r.update = dt => {
    r.t += dt; r.inv -= dt;
    const u = -axisY();
    if (D.safe) r.vy += -u * 110 * dt;
    else {
      const k = 1 - D.assist * 0.3;
      if (u > 0.2 && r.ballast > 0) { r.ballast = Math.max(0, r.ballast - 5 * u * k * dt); showFact('Dropping water ballast makes the airship lighter, so it rises. Use it wisely!'); }
      if (u < -0.2 && r.gas > 0) { r.gas = Math.max(0, r.gas - 4 * -u * k * dt); showFact('Letting gas out means less lift, so the airship sinks.'); }
      const zone = SUN.some(([a, b]) => r.x > a && r.x < b) ? 1 : SHADE.some(([a, b]) => r.x > a && r.x < b) ? -1 : 0;
      if (zone) showFact(zone > 0 ? 'Sunshine warms the gas so it lifts more. Watch out, you\'ll float up!' : 'Cool cloud shade chills the gas, so the airship sinks a bit.');
      r.temp += (zone - r.temp) * 0.5 * dt;
      const net = (r.gas - 100) * 0.006 + r.temp * 0.01 - (r.ballast - 100) * 0.006 + 0.004;
      r.vy += -net * 1100 * dt;
    }
    r.vy *= 1 - (0.6 + D.assist * 1.2) * dt;
    r.y += r.vy * dt;
    if (r.y < 45) { r.y = 45; r.vy = Math.max(0, r.vy); if (!D.safe) r.gas = Math.max(0, r.gas - 8 * dt); showFact('Too high! The gas expands up here, and safety valves let some out automatically.'); }
    const speed = 72 * clamp((MAST - 70 - r.x) / 400, 0.2, 1);
    r.x = Math.min(MAST - 70, r.x + speed * dt);
    for (const hx of [-60, 0, 60]) if (r.y + 20 > zg(r.x + hx)) {
      hurt(r, PX(), r.y - 40, 'Scrape! Mountain!'); r.vy = -70; r.y = zg(r.x + hx) - 22; break;
    }
    for (const sx of STORMS) {
      if (Math.abs(r.x - sx) < 500) showFact('Lightning and hydrogen don\'t mix! Steer clear of the storm\'s lightning.');
      if (strike(sx).bolt && Math.abs(r.x - sx) < 70 && r.y > 90) {
        hurt(r, PX(), r.y - 40, 'Hydrogen fire danger! 🔥');
        showFact('One spark can set hydrogen burning. That\'s exactly what happened to the Hindenburg in 1937.');
      }
    }
    collectStars(r, r.objs, r.x, r.y, 40, o => [o.x - r.x + PX(), o.y]);
    if (r.x >= MAST - 70) {
      r.mastT += dt;
      showFact('Line up your nose with the top of the mast and hold steady to tie up!');
      if (Math.abs(r.y - TOP) < 26 && Math.abs(r.vy) < 28) {
        r.over = true; r.win = true; r.end = 'Moored at the mast! Welcome, Captain!';
        RB.beep(520, 780, 0.2, 'triangle', 0.12);
      } else if (r.mastT > 30) { r.over = true; r.end = 'The ground crew couldn\'t catch your ropes in time.'; }
    }
    if (!D.safe && r.gas <= 0 && r.y > G - 60) { r.over = true; r.end = 'Out of gas! The airship sank to the ground.'; }
    if (r.lives <= 0) { r.over = true; r.end = 'The airship was too damaged to go on.'; }
    setWind(0.03);
  };
  r.draw = () => {
    const cx = r.x - PX();
    sky('#7fbef5', '#eaf4ff');
    for (const [a, b] of SUN) { const sx = a - cx; ctx.fillStyle = 'rgba(255,240,170,.22)'; ctx.fillRect(sx, -OFFY, b - a, VH); }
    for (let i = 0; i < 6; i++) cloud(mod(rnd(i, 1) * 1800 - cx * 0.2, 1800) - 150, 40 + rnd(i, 2) * 150, 0.6 + rnd(i, 3) * 0.6);
    for (const [a, b] of SHADE) { const sx = (a + b) / 2 - cx; cloud(sx, 70, 1.6, 'rgba(150,160,180,.9)'); ctx.fillStyle = 'rgba(40,50,80,.12)'; ctx.fillRect(a - cx, 70, b - a, VH); }
    groundFill(x => G - 140 - Math.sin(x * 0.004) * 50, '#b8c9e0', 0, W, 20, cx * 0.4);
    groundFill(zg, '#6fae5a', 0, W, 8, cx);
    ctx.fillStyle = '#fff';
    for (const [c, h] of [[1000, 190], [1800, 250], [2600, 170]]) { const sx = c - cx; ctx.beginPath(); ctx.moveTo(sx - 40, zg(c - 40) + 4); ctx.lineTo(sx, zg(c) - 1); ctx.lineTo(sx + 40, zg(c + 40) + 4); ctx.fill(); void h; }
    if (cx < 420) { ctx.fillStyle = '#4f9ad8'; ctx.fillRect(-cx, G - 2, 420, 50); }
    for (const sx0 of STORMS) {
      const sx = sx0 - cx; if (sx < -200 || sx > W + 200) continue;
      const s = strike(sx0);
      cloud(sx, 60, 1.8, s.warn ? '#7a7f9a' : '#5b6178'); cloud(sx + 30, 75, 1.3, '#454a5e');
      if (s.warn && Math.sin(r.t * 30) > 0) { ctx.fillStyle = 'rgba(255,230,80,.25)'; ctx.fillRect(sx - 70, 80, 140, zg(sx0) - 80); }
      if (s.bolt) { ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 5; ctx.beginPath(); let y = 80, x = sx; ctx.moveTo(x, y); while (y < zg(sx0)) { y += 40; x += rand(-25, 25); ctx.lineTo(x, y); } ctx.stroke(); }
    }
    const mx = MAST - cx;   // the mooring mast
    ctx.strokeStyle = '#5a5a6a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(mx - 20, G); ctx.lineTo(mx, TOP); ctx.lineTo(mx + 20, G); ctx.stroke();
    ctx.lineWidth = 2; for (let k = 1; k < 6; k++) { const yy = TOP + k * 25, w = k * 3.3; ctx.beginPath(); ctx.moveTo(mx - w, yy); ctx.lineTo(mx + w, yy); ctx.stroke(); }
    ctx.fillStyle = '#ffd84a'; circle(mx, TOP, 6);
    for (const o of r.objs) if (!o.dead) star(o.x - cx, o.y + Math.sin(r.t * 3 + o.x) * 4, 14, '#ffd84a', r.t);
    blink(r); drawZeppelin(PX(), r.y, 1.0, r.t); ctx.globalAlpha = 1;
    if (r.x >= MAST - 300) { ctx.setLineDash([4, 4]); ctx.strokeStyle = Math.abs(r.y - TOP) < 26 ? '#7dff9a' : '#ffd84a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(PX() + 72, r.y); ctx.lineTo(mx, TOP); ctx.stroke(); ctx.setLineDash([]); }
    drawFx();
    hud(r.score, r.lives, [`⬆️ Climb ${Math.round(-r.vy)}`]);
    if (!D.safe) {
      const [x, y] = gaugeAt(170);
      meter(x, y, 170, '💧', r.ballast / 100, '#7fc8ff');
      meter(x, y + 34, 170, '🎈', r.gas / 100, '#ffd84a');
    }
    progressBar(r.x / MAST, '🌊 Lake Constance', '🗼 Mast');
  };
  r.results = () => {
    const rows = [['📏 Distance', Math.round(r.x / 10)], [`⭐ Stars × ${r.stars}`, r.stars * 50]];
    if (r.win) {
      rows.push(['🗼 Moored at the mast', 400]);
      if (!D.safe) rows.push(['💧🎈 Ballast and gas left', Math.round((r.ballast + r.gas) * 1.5)], [`❤️ Hearts × ${r.lives}`, r.lives * 50]);
    }
    return rows;
  };
  return r;
};

// ---------- 4. Wright Flyer: twitchy pitch, 3 flights, beat 120 ft then 852 ft ----------
ROUNDS.wright = () => {
  const D = diff(), G = H - 60, FT = 1, END = 1350;
  const INST = D.safe ? -1.5 : D.assist > 0 ? 1.1 : 1.9;
  const r = { score: 0, lives: D.lives, inv: 0, stars: 0, t: 0, flight: 0, best: 0, flights: [], soft: 0, objs: [], over: false, win: false, gust: 0, gustT: 2 };
  r.k = { G, END };
  const startFlight = () => {
    Object.assign(r, { x: 0, y: G - 14, v: 10, th: 0, om: 0, state: 'rail', railT: 0, rest: 0 });
    r.flight++;
    r.objs = [];
    for (let x = 200; x < END; x += 160 + rnd(x + r.flight, 1) * 120) r.objs.push({ x, y: G - 30 - rnd(x, 2) * 60 });
    if (r.flight > 1) showBanner(`FLIGHT ${r.flight} OF 3`, 'The Wrights took turns flying that day', 1.8);
  };
  startFlight();
  r.update = dt => {
    r.t += dt;
    if (r.state === 'rest') { r.rest -= dt; if (r.rest <= 0) { if (r.flight >= 3 || r.best * FT >= 852) { r.over = true; r.win = r.best >= 120 / FT; r.end = r.best * FT >= 852 ? 'You beat Wilbur\'s 852 feet! Amazing flying!' : r.best * FT >= 120 ? 'You beat Orville\'s first flight!' : 'The Flyer is hard to fly! Keep practicing.'; } else startFlight(); } return; }
    if (r.state === 'rail') {   // rolling down the launch rail
      r.v = Math.min(70, r.v + 45 * dt); r.x += r.v * 1.15 * dt; r.railT += dt;
      if (r.railT > 1.3) { r.state = 'fly'; r.y = G - 24; r.th = 0.14; showFact('The Flyer took off from a wooden rail. It had skids, not wheels!'); }
      return;
    }
    const c = -axisY();
    r.gustT -= dt;
    if (r.gustT <= 0) { r.gustT = rand(1.5, 3.5); r.gust = rand(-1, 1) * 1.6 * D.hazard; }
    r.gust *= 1 - 0.8 * dt;
    r.om += (INST * r.th + 3.2 * c - 2.2 * r.om + r.gust - D.assist * 1.5 * r.th) * dt;
    r.th = clamp(r.th + r.om * dt, -0.6, 0.6);
    if (Math.abs(r.om) > 0.5) showFact('The Flyer was built twitchy on purpose so it could be steered, but the pilot had to correct it all the time!');
    r.v = clamp(r.v + (40 * (1 - r.v / 70) - 100 * Math.sin(r.th)) * dt, 25, 95);
    if (r.v < 40) showFact('Climbing too steeply slows you down. Too slow and the wings can\'t hold you up!');
    const climb = r.v * Math.sin(r.th) - (2 + Math.max(0, 50 - r.v) * 1.2) * (1 - D.assist * 0.4);
    r.y = Math.max(40, r.y - climb * dt);
    r.x += r.v * 1.15 * dt;
    collectStars(r, r.objs, PX(), r.y, 22, o => [o.x - r.x + PX(), o.y]);
    const ft = r.x * FT;
    if (ft >= 120 && !r.m120) { r.m120 = true; r.score += 100; RB.beep(784, 1175, 0.2, 'square', 0.06); showBanner('120 FEET!', 'As far as Orville\'s first flight! +100', 2); }
    if (ft >= 852 && !r.m852) { r.m852 = true; r.score += 300; RB.beep(988, 1568, 0.3, 'square', 0.06); showBanner('852 FEET!', 'You matched Wilbur\'s best flight! +300', 2.4); }
    if (r.x > END - 200) showFact('The end of the flat sand is ahead. Time to land gently!');
    const groundAt = G - (r.x > END ? (r.x - END) * 0.8 : 0);
    if (r.y + 14 >= groundAt) {
      const rate = -climb, ok = rate < 35 && r.th > -0.2;
      r.state = 'rest'; r.rest = 1.6; r.y = groundAt - 14;
      r.flights.push(Math.round(ft)); r.best = Math.max(r.best, r.x);
      if (ok) { r.soft++; pop(PX(), r.y - 40, `Landed! ${Math.round(ft)} ft`, '#9fffa8', 22); RB.beep(400, 300, 0.15, 'triangle', 0.1); }
      else { hurt(r, PX(), r.y - 40, `Crunch! ${Math.round(ft)} ft`); puff(PX(), r.y + 10, 14, ['#f2d79a', '#e0c07a']); }
    }
    setWind(0.05);
  };
  r.draw = () => {
    const cx = r.x - PX();
    sky('#9fcff5', '#fff4dc');
    for (let i = 0; i < 6; i++) cloud(mod(rnd(i, 1) * 1600 - cx * 0.15, 1600) - 150, 40 + rnd(i, 2) * 140, 0.7 + rnd(i, 3) * 0.5);
    ctx.fillStyle = '#5aa8d8'; ctx.fillRect(0, G - 90, W, 30);
    groundFill(x => G - 40 - Math.sin(x * 0.01) * 14, '#e3c88e', 0, W, 20, cx * 0.5);   // Kill Devil Hill behind
    ctx.fillStyle = '#ead09a'; ctx.fillRect(0, G, W, H + OFFY - G + 2);
    if (r.x > END - W) groundFill(x => G - Math.max(0, x - END) * 0.8, '#d9bd84', 0, W, 10, cx);
    ctx.fillStyle = '#8a5a2b'; ctx.fillRect(-cx - 30, G - 2, 90, 4);   // launch rail
    for (const [mark, lbl] of [[120, 'Orville 120 ft'], [852, 'Wilbur 852 ft']]) {
      const sx = mark / FT - cx; if (sx < -50 || sx > W + 50) continue;
      ctx.fillStyle = '#fff'; ctx.fillRect(sx - 1, G - 50, 3, 50); ctx.fillStyle = '#e8453a'; ctx.fillRect(sx + 2, G - 50, 24, 14);
      txt(lbl, sx, G + 16, 13, '#7a5a20');
    }
    if (r.best > 0) { const sx = r.best - cx; ctx.fillStyle = '#3d6fe0'; ctx.fillRect(sx - 1, G - 30, 3, 30); txt('your best', sx, G + 30, 12, '#3d6fe0'); }
    ctx.strokeStyle = '#8fae5a'; ctx.lineWidth = 2;
    for (let i = 0; i < 20; i++) { const gx = mod(i * 111 - cx, 2220) - 40; ctx.beginPath(); ctx.moveTo(gx, G); ctx.lineTo(gx - 4, G - 10); ctx.moveTo(gx, G); ctx.lineTo(gx + 5, G - 9); ctx.stroke(); }
    for (const o of r.objs) if (!o.dead) star(o.x - cx, o.y, 13, '#ffd84a', r.t);
    if (Math.abs(r.gust) > 0.4) for (let k = 0; k < 3; k++) { const yy = 120 + k * 70, xx = mod(r.t * 200 + k * 140, W); arrow(xx, yy, xx + 30, yy + (r.gust > 0 ? -10 : 10), 'rgba(255,255,255,.7)', 3); }
    drawFlyer(PX(), r.y, 1.5, r.th, r.state === 'rest' ? 0 : r.t);
    // pitch indicator: the nose angle the pilot is fighting
    const ix = PX(), iy = r.y - 52;
    ctx.strokeStyle = 'rgba(11,42,92,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ix, iy, 16, Math.PI, 0); ctx.stroke();
    ctx.strokeStyle = Math.abs(r.th) > 0.3 ? '#ff5a4a' : '#2fa84f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ix + Math.cos(-r.th) * 16, iy + Math.sin(-r.th) * 16); ctx.stroke();
    drawFx();
    hud(r.score + Math.round(r.best * FT * 0.6), r.lives, [`✈️ Flight ${r.flight} of 3`, `📏 ${Math.round((r.state === 'rest' ? r.flights[r.flights.length - 1] / FT || 0 : r.x) * FT)} ft`]);
    progressBar(r.x * FT / 852, '🛤️ Rail', '🏆 852 ft');
  };
  r.results = () => {
    const rows = [[`📏 Best flight ${Math.round(r.best * FT)} ft`, Math.round(r.best * FT * 0.6)], [`⭐ Stars × ${r.stars}`, r.stars * 50]];
    if (r.m120 || r.m852) rows.push(['🏆 Milestones', (r.m120 ? 100 : 0) + (r.m852 ? 300 : 0)]);
    if (r.soft) rows.push([`🛬 Gentle landings × ${r.soft}`, r.soft * 100]);
    return rows;
  };
  return r;
};

// ---------- 5. Lindbergh: navigate across the Atlantic by compass ----------
ROUNDS.prop = () => {
  const D = diff();
  const LAND = [
    [[0, 0], [900, 0], [1050, 400], [1250, 700], [1150, 900], [1350, 1150], [1200, 1350], [1000, 1450], [850, 1550], [700, 1650], [620, 1780], [520, 1850], [380, 1950], [300, 2100], [250, 2700], [0, 2700]],
    [[1000, 1450], [1300, 1380], [1400, 1450], [1150, 1600], [950, 1620]],
    [[1500, 1050], [1800, 1100], [1870, 1350], [1700, 1500], [1550, 1450], [1450, 1250]],
    [[4450, 900], [4700, 850], [4780, 1050], [4650, 1250], [4450, 1200], [4400, 1050]],
    [[4850, 500], [5050, 450], [5150, 700], [5250, 1000], [5350, 1200], [5100, 1280], [4880, 1250], [5000, 1100], [4900, 900], [4950, 700]],
    [[5100, 1380], [5450, 1300], [6400, 1150], [6400, 2700], [5200, 2700], [5150, 2000], [4950, 1800], [5050, 1500]],
  ];
  const WPS = [
    { x: 1150, y: 1500, n: 'Nova Scotia', f: 'Lindbergh followed the coast north to Nova Scotia, checking his compass all the way.' },
    { x: 1780, y: 1380, n: 'Newfoundland', f: 'St. John\'s, Newfoundland: the last land before 3,000 km of open ocean!' },
    { x: 4470, y: 1150, n: 'Ireland', f: 'Ireland! Lindbergh had steered almost perfectly across the ocean with just a compass.' },
    { x: 5020, y: 1250, n: 'England', f: 'Over the south of England. Paris is getting close!' },
    { x: 5200, y: 1450, n: 'Cherbourg', f: 'Cherbourg, on the coast of France. Night was falling.' },
    { x: 5650, y: 1650, n: 'Paris', f: '' },
  ];
  const STORMS = [];
  const nStorm = Math.round(9 * D.hazard);
  for (let i = 0; i < nStorm; i++) STORMS.push({ x: 2200 + rnd(i, 11) * 1900, y: 900 + rnd(i, 12) * 700, r: 100 + rnd(i, 13) * 70 });
  const r = { score: 0, lives: D.lives, inv: 0, t: 0, x: 450, y: 1880, hd: -0.35, fuel: 100, drowsy: 0, wp: 0, got: 0, over: false, win: false, dozeT: 0 };
  r.k = { WPS, STORMS, windAt: (x, y) => windAt(x, y) };
  const windAt = (x, y) => [14, x > 1900 && x < 4400 ? 22 + Math.sin(x / 600) * 16 : 6];
  r.tap = () => {
    if (r.drowsy < 30 && !r.dozeT) { pop(W / 2, H / 2, 'Wide awake!', '#fff', 20); return; }
    r.drowsy = Math.max(0, r.drowsy - 55); r.dozeT = 0;
    puff(W / 2, H / 2 + 40, 16, ['#9fe8ff', '#fff'], 160);
    RB.noise(0.3, 0.3);
  };
  r.update = dt => {
    r.t += dt; r.inv -= dt;
    let steer = axisX();
    if (mouse) { const want = Math.atan2(mouse.y - H / 2, mouse.x - W / 2); steer = clamp(Math.atan2(Math.sin(want - r.hd), Math.cos(want - r.hd)) * 2, -1, 1); }
    if (D.safe) {   // toddler: the plane gently points itself at the next flag
      const w = WPS[r.wp], want = Math.atan2(w.y - r.y, w.x - r.x);
      steer = steer || clamp(Math.atan2(Math.sin(want - r.hd), Math.cos(want - r.hd)) * 1.5, -1, 1);
    }
    const ocean = r.x > 1900 && r.x < 4400;
    if (!D.safe) r.drowsy = Math.min(100, r.drowsy + (ocean ? (D.assist ? 1.7 : 2.4) : 0.6) * dt);
    if (r.drowsy > 60) showFact('Lindbergh had been awake for over a day! He kept his window open so the cold air would keep him awake.');
    if (r.drowsy >= 100) {
      r.dozeT += dt; steer = Math.sin(r.t * 1.7) * 0.8;
      if (r.dozeT > 2.5) { hurt(r, W / 2, H / 2 - 40, 'Dozed off! Wake up!'); r.drowsy = 50; r.dozeT = 0; }
    }
    r.hd += steer * 1.5 * dt;
    const [wx, wy] = windAt(r.x, r.y), sp = D.safe ? 140 : 165;
    r.x += (Math.cos(r.hd) * sp + wx) * dt; r.y += (Math.sin(r.hd) * sp + wy) * dt;
    r.x = clamp(r.x, 50, 6300); r.y = clamp(r.y, 200, 2600);
    if (!D.safe) r.fuel = Math.max(0, r.fuel - 1.5 * dt);
    if (ocean) showFact('The wind pushes you sideways, so aim a little into it to stay on course.');
    for (const s of STORMS) if (Math.hypot(r.x - s.x, r.y - s.y) < s.r) {
      r.hd += Math.sin(r.t * 9) * 1.2 * dt;
      if (hurt(r, W / 2, H / 2 - 40, 'Bumpy storm!', 1.4)) showFact('Lindbergh flew through fog and storms. Ice even formed on his wings!');
    }
    const w = WPS[r.wp];
    if (Math.hypot(r.x - w.x, r.y - w.y) < (r.wp === WPS.length - 1 ? 110 : 150)) {
      if (r.wp === WPS.length - 1) {
        r.over = true; r.win = true; r.end = 'Le Bourget, Paris! You flew across the Atlantic!';
        showFact('About 100,000 people rushed onto the airfield to welcome Lindbergh to Paris!');
      } else {
        r.got++; r.score += 100; pop(W / 2, H / 2 - 60, `${w.n}! +100`, '#9fffa8', 22); RB.beep(660, 990, 0.2, 'triangle', 0.1);
        showFact(w.f); r.wp++;
      }
    } else if (r.wp < WPS.length - 1) {   // skipping ahead past a checkpoint is allowed
      const n = WPS[r.wp + 1];
      if (Math.hypot(r.x - n.x, r.y - n.y) < Math.hypot(w.x - n.x, w.y - n.y) - 100) r.wp++;
    }
    if (!D.safe && r.fuel <= 0) { r.over = true; r.end = 'Out of fuel! (Lindbergh landed with fuel to spare.)'; }
    if (r.lives <= 0) { r.over = true; r.end = 'Too sleepy and stormy to go on.'; }
    setWind(0.06);
  };
  r.draw = () => {
    const cx = r.x - W / 2, cy = r.y - H / 2;
    ctx.fillStyle = '#2f6fae'; ctx.fillRect(0, -OFFY, W, VH);
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    for (let i = 0; i < 40; i++) { const x = mod(i * 157 - cx, W + 100) - 50, y = mod(i * 97 - cy, VH + 60) - OFFY - 30; ctx.fillRect(x, y, 16, 2); }
    ctx.save(); ctx.translate(-cx, -cy);
    for (const poly of LAND) {
      ctx.fillStyle = '#6fae5a'; ctx.beginPath(); poly.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#e9e3c4'; ctx.lineWidth = 4; ctx.stroke();
    }
    ctx.fillStyle = '#c4553a'; circle(450, 1880, 10); txt('New York', 450, 1910, 16, '#fff');
    for (const s of STORMS) {
      ctx.fillStyle = 'rgba(70,75,95,.75)'; circle(s.x, s.y, s.r);
      ctx.fillStyle = 'rgba(40,44,60,.6)'; circle(s.x + 20, s.y - 10, s.r * 0.6);
      if (Math.sin(r.t * 5 + s.x) > 0.8) { ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s.x, s.y - 30); ctx.lineTo(s.x - 12, s.y); ctx.lineTo(s.x + 8, s.y + 4); ctx.lineTo(s.x - 4, s.y + 34); ctx.stroke(); }
    }
    WPS.forEach((w, i) => {
      const done = i < r.wp, last = i === WPS.length - 1;
      ctx.strokeStyle = done ? 'rgba(160,255,190,.6)' : i === r.wp ? '#ffd84a' : 'rgba(255,255,255,.5)';
      ctx.lineWidth = i === r.wp ? 5 : 3; ctx.setLineDash(done ? [] : [10, 8]);
      ctx.beginPath(); ctx.arc(w.x, w.y, last ? 110 : 150, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      txt((last ? '🗼 ' : done ? '✅ ' : '🚩 ') + w.n, w.x, w.y, 18, '#fff');
    });
    const w = WPS[r.wp];
    ctx.setLineDash([6, 10]); ctx.strokeStyle = 'rgba(255,216,74,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(w.x, w.y); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    blink(r); drawPlaneTop(W / 2, H / 2, 1.5, r.hd, r.t); ctx.globalAlpha = 1;
    if (r.drowsy > 60) {   // eyelids closing
      const k = clamp((r.drowsy - 60) / 40, 0, 1) * (0.6 + 0.4 * Math.sin(r.t * 2));
      ctx.fillStyle = `rgba(0,0,0,${0.85 * k})`; ctx.fillRect(0, -OFFY, W, VH * 0.42 * k); ctx.fillRect(0, H + OFFY - VH * 0.42 * k, W, VH * 0.42 * k);
      outlined(RB.touch ? '😴 Tap WAKE UP!' : '😴 Press SPACE to wake up!', W / 2, H * 0.72, 22, '#ffd84a');
    }
    offscreenArrow(w.x - cx, w.y - cy, w.n);
    drawFx();
    const [wx, wy] = windAt(r.x, r.y);
    hud(r.score, r.lives, [`🧭 Heading ${Math.round(mod(r.hd * 180 / Math.PI + 90, 360))}°`, `💨 Wind ${Math.round(Math.hypot(wx, wy))}`]);
    const [gx, gy] = gaugeAt(170);
    if (!D.safe) { meter(gx, gy, 170, '⛽', r.fuel / 100, r.fuel > 25 ? '#6be06b' : '#ff5a4a'); meter(gx, gy + 34, 170, '😴', r.drowsy / 100, r.drowsy > 60 ? '#ff8a5a' : '#c9a0ff'); }
    // minimap of the whole route
    const mw = 150, mh = 66, mx = 12, my = -OFFY + 128;
    ctx.fillStyle = 'rgba(11,42,92,.7)'; rrect(mx, my, mw, mh, 8); ctx.fill();
    ctx.save(); ctx.translate(mx, my); ctx.scale(mw / 6400, mh / 2700);
    ctx.fillStyle = 'rgba(111,174,90,.8)'; for (const poly of LAND) { ctx.beginPath(); poly.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.fill(); }
    ctx.fillStyle = '#ffd84a'; ctx.fillRect(w.x - 60, w.y - 60, 120, 120);
    ctx.fillStyle = '#fff'; ctx.fillRect(r.x - 80, r.y - 80, 160, 160);
    ctx.restore();
    progressBar((r.x - 450) / 5200, '🗽 New York', 'Paris 🗼');
  };
  r.results = () => {
    const rows = [[`🚩 Checkpoints × ${r.got}`, r.got * 100]];
    if (r.win) { rows.push(['🗼 Landed in Paris', 400]); if (!D.safe) rows.push([`⛽ Fuel left ${Math.round(r.fuel)}%`, Math.round(r.fuel) * 3], [`❤️ Hearts × ${r.lives}`, r.lives * 50]); }
    else rows.push(['📏 Distance', Math.round(Math.max(0, r.x - 450) / 20)]);
    return rows;
  };
  return r;
};

// ---------- 6. Helicopter mountain rescue ----------
ROUNDS.heli = () => {
  const D = diff(), G = H - 50, GRAV = 150;
  const PTS = [[0, G], [420, G], [560, G - 90], [700, G - 150], [760, G - 170], [860, G - 170], [960, G - 210], [1080, G - 250], [1150, G - 330], [1260, G - 360], [1330, G - 300], [1380, G - 262], [1470, G - 262], [1540, G - 200], [1640, G - 110], [1760, G - 60], [1980, G - 60], [2100, G - 140], [2250, G - 300], [2400, G - 420]];
  const WORLD = 2400;
  const gAt = x => { for (let i = 0; i < PTS.length - 1; i++) if (x >= PTS[i][0] && x <= PTS[i + 1][0]) return lerp(PTS[i][1], PTS[i + 1][1], (x - PTS[i][0]) / (PTS[i + 1][0] - PTS[i][0])); return G - 420; };
  const PAD = [90, 230];
  const r = { score: 0, lives: D.lives, inv: 0, t: 0, x: 160, y: G - 16, vx: 0, vy: 0, tilt: 0, landed: true, carrying: false, winch: 0, saved: 0, fuel: 100, gust: 0, gustT: 2, camX: 0, over: false, win: false,
    hikers: [{ x: 810, done: false }, { x: 1425, done: false }, { x: 1870, done: false }].slice(0, D.safe ? 2 : 3) };
  r.hikers.forEach(h => { h.y = gAt(h.x); });
  r.k = { gAt, PAD, G, PTS };
  r.update = dt => {
    r.t += dt; r.inv -= dt;
    let ax = axisX(), ay = axisY();
    r.tilt += (ax * 0.5 - r.tilt) * 4 * dt;
    const up = -ay;
    const T = D.safe || D.assist ? GRAV / Math.cos(r.tilt) * (1 + up * 0.75) : GRAV * (0.98 + up * 0.75);
    if (r.landed) {
      r.vx = 0; r.vy = 0; r.tilt *= 1 - 5 * dt;
      const onPad = r.x > PAD[0] && r.x < PAD[1];
      if (onPad && r.fuel < 100) r.fuel = Math.min(100, r.fuel + 30 * dt);
      if (up > 0.25) r.landed = false;
    } else {
      r.gustT -= dt;
      if (r.gustT <= 0) { r.gustT = rand(1.5, 3); r.gust = r.x > 900 && r.x < 1700 ? rand(-60, 60) * D.hazard : 0; }
      r.vx += (T * Math.sin(r.tilt) - 0.6 * r.vx + r.gust) * dt;
      r.vy += (GRAV - T * Math.cos(r.tilt) - 0.5 * r.vy) * dt;
      r.x = clamp(r.x + r.vx * dt, 30, WORLD - 30); r.y = Math.max(40, r.y + r.vy * dt);
      if (!D.safe) r.fuel = Math.max(0, r.fuel - 0.8 * dt);
    }
    if (r.t > 0.5) showFact('Tilt to move, then tilt the other way to stop. Helicopters keep sliding!');
    if (!r.landed) {
      const gy = gAt(r.x);
      for (const sx of [-38, 38]) if (gAt(r.x + sx) < r.y - 12) {   // rotor hits the mountain
        if (hurt(r, r.x - r.camX, r.y - 40, 'Rotor strike!')) {}
        r.vx = -Math.sign(sx) * 90; r.x -= Math.sign(sx) * 6;
      }
      if (r.y + 16 > gy) {
        const flat = Math.abs(gAt(r.x - 20) - gAt(r.x + 20)) < 8;
        if (Math.abs(r.vy) > 75 || Math.abs(r.vx) > 60 || !flat) { hurt(r, r.x - r.camX, r.y - 40, flat ? 'Hard landing!' : 'Too steep to land!'); r.vy = -90; r.y = gy - 18; }
        else {
          r.landed = true; r.y = gy - 16;
          showFact('Helicopters can land on tiny spots: rooftops, ships and mountain ledges.');
        }
      }
    }
    const onPad = r.landed && r.x > PAD[0] && r.x < PAD[1];
    if (onPad && r.carrying) {
      r.carrying = false; r.saved++; r.score += 300; r.fuel = 100; pop(r.x - r.camX, r.y - 50, 'Hiker safe! +300', '#9fffa8', 22); RB.beep(523, 1047, 0.3, 'triangle', 0.12);
      showFact('The first helicopter rescue was in 1944. Since then, helicopters have saved millions of people!');
      if (r.hikers.every(h => h.done)) { r.over = true; r.win = true; r.end = 'Everyone is safe! You\'re a hero rescue pilot!'; }
    }
    const h = r.hikers.find(q => !q.done && Math.abs(q.x - r.x) < 26);
    if (h && !r.carrying) {
      const above = h.y - (r.y + 16);
      const steady = Math.abs(r.vx) < 35 && Math.abs(r.vy) < 35;
      if ((r.landed && above > -6) || (above > 15 && above < 130 && steady)) {
        r.winch += dt; showFact('Rescue helicopters lower a cable called a hoist. Hold steady while the hiker is lifted!');
        if (r.winch > (r.landed ? 0.5 : 1.6)) { h.done = true; r.carrying = true; r.winch = 0; pop(r.x - r.camX, r.y - 50, 'Got them! Now to the hospital', '#fff', 20); }
      } else r.winch = Math.max(0, r.winch - dt * 2);
    } else r.winch = 0;
    if (!D.safe && r.fuel <= 0 && !r.landed) { r.over = true; r.end = 'Out of fuel! Land at the helipad to refuel next time.'; }
    if (r.fuel < 30) showFact('Low fuel! Land on the hospital helipad to refuel.');
    if (r.lives <= 0) { r.over = true; r.end = 'The helicopter needs repairs!'; }
    r.camX = clamp(r.x - W / 2, 0, Math.max(0, WORLD - W));
    r.anchor = { x: r.x - r.camX, y: r.y };
    setWind(r.landed ? 0.01 : 0.07);
  };
  r.draw = () => {
    const cx = r.camX;
    sky('#7fc0f5', '#e8f4ff');
    for (let i = 0; i < 5; i++) cloud(mod(rnd(i, 1) * 1600 - cx * 0.2, 1600) - 150, 40 + rnd(i, 2) * 120, 0.6 + rnd(i, 3) * 0.6);
    groundFill(x => G - 200 - Math.sin(x * 0.004) * 60, '#b8c9e0', 0, W, 20, cx * 0.4);
    ctx.fillStyle = '#7a8a6a'; ctx.beginPath(); ctx.moveTo(-cx, H + OFFY); PTS.forEach(([x, y]) => ctx.lineTo(x - cx, y)); ctx.lineTo(WORLD - cx, H + OFFY); ctx.fill();
    ctx.strokeStyle = '#5a6a4a'; ctx.lineWidth = 3; ctx.beginPath(); PTS.forEach(([x, y], i) => i ? ctx.lineTo(x - cx, y) : ctx.moveTo(x - cx, y)); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(1150 - cx, G - 330); ctx.lineTo(1260 - cx, G - 360); ctx.lineTo(1330 - cx, G - 300); ctx.lineTo(1260 - cx, G - 330); ctx.fill();
    ctx.fillStyle = '#3f7a3a'; for (let i = 0; i < 10; i++) { const tx = 1660 + i * 40; if (tx > 1760 && tx < 1980) continue; circle(tx - cx, gAt(tx) - 12, 12); }
    // hospital and helipad
    ctx.fillStyle = '#f4f4f4'; ctx.fillRect(250 - cx, G - 110, 140, 110); ctx.fillStyle = '#e8453a'; ctx.fillRect(310 - cx, G - 95, 20, 50); ctx.fillRect(295 - cx, G - 80, 50, 20);
    ctx.fillStyle = '#555'; ctx.fillRect(PAD[0] - cx, G - 4, PAD[1] - PAD[0], 6); txt('H', (PAD[0] + PAD[1]) / 2 - cx, G + 14, 18, '#ffd84a', 'center', 700, 'Bungee');
    for (const h of r.hikers) if (!h.done) {
      const sx = h.x - cx;
      ctx.fillStyle = '#ff8a3d'; ctx.fillRect(sx - 5, h.y - 22, 10, 14); ctx.fillStyle = '#f2c79a'; circle(sx, h.y - 27, 5);
      if (Math.sin(r.t * 6) > 0) { ctx.strokeStyle = '#ff8a3d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx + 5, h.y - 20); ctx.lineTo(sx + 12, h.y - 34); ctx.stroke(); }
      outlined('🆘', sx, h.y - 50, 18, '#fff');
      offscreenArrow(sx, h.y - 30, '🆘');
    }
    const sx = r.x - cx;
    if (r.winch > 0 || r.carrying) {
      const h = r.hikers.find(q => !q.done && Math.abs(q.x - r.x) < 26);
      const endY = r.carrying ? r.y + 30 : lerp(h ? h.y - 20 : r.y + 30, r.y + 30, clamp(r.winch / 1.6, 0, 1));
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sx, r.y + 10); ctx.lineTo(sx, endY); ctx.stroke();
      ctx.fillStyle = '#ff8a3d'; ctx.fillRect(sx - 4, endY, 8, 11); ctx.fillStyle = '#f2c79a'; circle(sx, endY - 3, 4);
    }
    if (r.carrying) offscreenArrow((PAD[0] + PAD[1]) / 2 - cx, G - 20, '🏥');
    blink(r); drawHeli(sx, r.y, 1.25, r.tilt, r.landed ? r.t * 0.3 : r.t); ctx.globalAlpha = 1;
    drawFx();
    hud(r.score, r.lives, [`🆘 Rescued ${r.saved} of ${r.hikers.length}`, r.carrying ? '🏥 Fly to the helipad!' : '🔎 Find a hiker']);
    if (!D.safe) { const [x, y] = gaugeAt(160); meter(x, y, 160, '⛽', r.fuel / 100, r.fuel > 30 ? '#6be06b' : '#ff5a4a'); }
  };
  r.results = () => {
    const rows = [[`🆘 Hikers rescued × ${r.saved}`, r.saved * 300]];
    if (r.win) { rows.push(['⏱️ Speedy rescue', Math.max(0, Math.round((100 - r.t) * 4))]); if (!D.safe) rows.push([`❤️ Hearts × ${r.lives}`, r.lives * 50]); }
    return rows;
  };
  return r;
};

// ---------- 7. Concorde: climb, punch through Mach 1 over the ocean, reach Mach 2 ----------
ROUNDS.jet = () => {
  const D = diff(), COAST = 16, NY = 100;
  const altY = h => H - 70 - h / 20 * (H - 160);
  const r = { score: 0, lives: D.lives, inv: 0, t: 0, h: 0.4, M: 0.4, gam: 0, dist: 0, fuel: 100, maxM: 0.4, booms: 0, boomT: 0, m1: false, m2: false, over: false, win: false, flash: 0 };
  r.k = { COAST, NY };
  r.update = dt => {
    r.t += dt; r.inv -= dt; r.flash -= dt; r.boomT -= dt;
    const overLand = r.dist < COAST || r.dist > NY - 4;
    let pitch = -axisY(), ab = actionHeld() && r.fuel > 0;
    if (D.safe) {   // toddler autopilot: climb to the right height, afterburner only over the sea
      const want = overLand ? 9 : 16;
      pitch = pitch || clamp((want - r.h) * 0.4, -1, 1);
      if (overLand && r.M > 0.9) ab = false;
    }
    r.gam += (clamp(pitch, -1, 1) * 0.32 - r.gam) * 3 * dt;
    if (r.M < 0.32) { r.gam = Math.min(r.gam, -0.1); showFact('Too slow! Planes need speed for their wings to make lift.'); }
    const rho = Math.exp(-r.h / 8);
    const T = (0.5 + (ab ? 0.48 : 0)) * (0.35 + 0.65 * Math.sqrt(rho)) * (1 + D.assist * 0.08);
    const wave = 1.2 * Math.exp(-(((r.M - 1.05) / 0.12) ** 2));
    const Dr = rho * r.M * r.M * (0.9 + wave) * 0.67;
    r.M = Math.max(0.2, r.M + ((T - Dr) * 0.35 - Math.sin(r.gam) * 0.5) * dt);
    r.h = clamp(r.h + r.M * Math.sin(r.gam) * 4 * dt, 0, 19.5);
    r.dist += r.M * 1.55 * dt;
    if (!D.safe) r.fuel = Math.max(0, r.fuel - (0.55 + (ab ? 2.8 : 0)) * dt);
    r.maxM = Math.max(r.maxM, r.M);
    if (r.t > 0.5) showFact('Concorde used afterburners for takeoff and to punch through the sound barrier.');
    if (r.M > 0.9 && r.M < 1) showFact('Close to Mach 1, air piles up in front of the plane: lots of extra drag! Afterburners help push through.');
    if (r.M >= 1 && overLand && r.boomT <= 0 && !D.safe) {
      r.boomT = 2; r.booms++; r.score -= 150; RB.noise(0.5, 0.5);
      pop(PX(), altY(r.h) - 50, 'BOOM over town! -150', '#ff8a7a', 20);
      showFact('Sonic booms rattle windows in towns, so Concorde only flew faster than sound over the ocean.');
    }
    if (!r.m1 && r.M >= 1 && !overLand) {
      r.m1 = true; r.flash = 0.5; r.score += 300; RB.noise(0.9, 0.6); RB.beep(120, 30, 0.8, 'sine', 0.3);
      showBanner('MACH 1!', 'Sound barrier broken! +300', 2.4); showFact('Mach 1! You broke the sound barrier, just like Chuck Yeager did in 1947.');
    }
    if (!r.m2 && r.M >= 2) {
      r.m2 = true; r.score += 500; RB.beep(523, 1047, 0.4, 'square', 0.08);
      showBanner('MACH 2!', 'Twice the speed of sound! +500', 2.6); showFact('Mach 2! Concorde flew from London to New York in about 3 and a half hours.');
    }
    if (r.h > 15) showFact('Up here the sky turns dark blue, and you can see the curve of the Earth!');
    if (r.h <= 0.05 && r.t > 2) { hurt(r, PX(), altY(r.h) - 40, 'Too low!'); r.h = 0.6; r.gam = 0.2; }
    if (r.dist >= NY) { r.over = true; r.win = true; r.end = r.m2 ? 'Welcome to New York, at Mach 2!' : 'Welcome to New York! Try for Mach 2 next time.'; }
    if (!D.safe && r.fuel <= 0 && r.dist < NY) { r.over = true; r.end = 'Out of fuel! Afterburners are very thirsty.'; }
    if (r.lives <= 0) { r.over = true; r.end = 'Too many close calls with the ground!'; }
    r.anchor = { x: PX(), y: altY(r.h) };
    setWind(0.03 + clamp(r.M / 2, 0, 1) * 0.07);
  };
  r.draw = () => {
    const k = clamp(r.h / 18, 0, 1);
    sky(mix('#4a9af0', '#0a1440', k), mix('#cfe8ff', '#4a78c8', k));
    if (k > 0.6) { ctx.globalAlpha = (k - 0.6) * 2; spaceStars(60, 4, W, H * 0.5, r.t); ctx.globalAlpha = 1; }
    const scroll = r.dist * 300;
    for (let i = 0; i < 8; i++) { const h = 1 + rnd(i, 2) * 7; cloud(mod(rnd(i, 1) * 2000 - scroll * (0.4 + rnd(i, 3) * 0.3), 2000) - 150, altY(h), 0.7 + rnd(i, 4) * 0.5, 'rgba(255,255,255,.8)'); }
    // the ground far below: England, then the Atlantic, then America
    const gy = H - 40, landColor = '#5f9e4f';
    ctx.fillStyle = '#2f6fae'; ctx.fillRect(0, gy, W, H + OFFY - gy + 2);
    const coastX = (COAST - r.dist) * 300 + PX(), nyX = (NY - 4 - r.dist) * 300 + PX();
    ctx.fillStyle = landColor;
    if (coastX > 0) ctx.fillRect(0, gy, Math.min(W, coastX), H + OFFY - gy + 2);
    if (nyX < W) ctx.fillRect(Math.max(0, nyX), gy, W, H + OFFY - gy + 2);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (let i = 0; i < 20; i++) { const x = mod(i * 97 - scroll, W + 40) - 20; if ((x > coastX || coastX < 0) && x < nyX) ctx.fillRect(x, gy + 8 + (i % 3) * 8, 20, 2); }
    if (coastX > 0) for (let i = 0; i < 12; i++) { const x = mod(i * 83 - scroll, Math.max(1, coastX)); ctx.fillStyle = '#d9c7a8'; ctx.fillRect(x, gy - 6, 8, 6); }
    const py = altY(r.h);
    if (r.M > 0.9) {
      ctx.fillStyle = `rgba(255,255,255,${clamp((r.M - 0.9) * 3, 0, 0.5)})`;
      ctx.beginPath(); ctx.moveTo(PX() + 50, py); ctx.lineTo(PX() - 30, py - 40); ctx.lineTo(PX() - 30, py + 40); ctx.fill();
    }
    blink(r); drawConcorde(PX(), py, 1.5, r.gam, actionHeld() && r.fuel > 0 ? 1 : 0.15, r.t); ctx.globalAlpha = 1;
    if (r.flash > 0 && !reduced()) { ctx.fillStyle = `rgba(255,255,255,${r.flash})`; ctx.fillRect(0, -OFFY, W, VH); }
    drawFx();
    const overLand = r.dist < COAST || r.dist > NY - 4;
    hud(r.score, r.lives, [`📈 ${r.h.toFixed(1)} km high`, overLand ? '🏘️ Stay subsonic' : '🌊 Go supersonic!']);
    const w = 230, [x, y] = gaugeAt(w);
    ctx.fillStyle = 'rgba(11,42,92,.62)'; rrect(x, y, w, 52 + (D.safe ? 0 : 34), 12); ctx.fill();
    txt(`Mach ${r.M.toFixed(2)}`, x + w / 2, y + 14, 17, r.M >= 1 ? '#ffd84a' : '#fff');
    ctx.fillStyle = 'rgba(255,255,255,.25)'; rrect(x + 10, y + 28, w - 20, 12, 6); ctx.fill();
    ctx.fillStyle = r.M >= 2 ? '#ffd84a' : '#4ae0ff'; rrect(x + 10, y + 28, Math.max(6, (w - 20) * clamp(r.M / 2.2, 0, 1)), 12, 6); ctx.fill();
    for (const m of [1, 2]) { const mx = x + 10 + (w - 20) * m / 2.2; ctx.fillStyle = '#ff5a4a'; ctx.fillRect(mx - 1.5, y + 24, 3, 20); }
    if (!D.safe) meter(x, y + 52, w, '⛽', r.fuel / 100, r.fuel > 25 ? '#6be06b' : '#ff5a4a');
    progressBar(r.dist / NY, '🇬🇧 London', 'New York 🗽');
  };
  r.results = () => {
    const rows = [[`💨 Top speed Mach ${r.maxM.toFixed(2)}`, Math.round(r.maxM * 100)]];
    if (r.m1) rows.push(['💥 Broke the sound barrier', 300]);
    if (r.m2) rows.push(['🚀 Reached Mach 2', 500]);
    if (r.booms) rows.push([`🏘️ Booms over land × ${r.booms}`, -150 * r.booms]);
    if (r.win) { rows.push(['🗽 Reached New York', 300]); if (!D.safe) rows.push([`⛽ Fuel left ${Math.round(r.fuel)}%`, Math.round(r.fuel) * 3]); }
    return rows;
  };
  return r;
};
