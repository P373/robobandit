// Flight School lesson diagrams. Each one draws a little animated scene at 480 × 270.
// They take (t, v): t is seconds since the slide opened, v is the slide's slider (0 to 1) if it has one.
'use strict';

const DW = 480, DH = 270;
function dLabel(s, x, y, size = 17, color = '#0b2a5c', align = 'center') { txt(s, x, y, size, color, align, 700); }
function dBubble(s, x, y, size = 16, bg = '#fff', fg = '#0b2a5c') {
  ctx.font = `700 ${size}px 'Fredoka', system-ui, sans-serif`;
  const w = ctx.measureText(s).width + 18;
  ctx.fillStyle = bg; rrect(x - w / 2, y - size * 0.85, w, size * 1.7, 10); ctx.fill();
  ctx.strokeStyle = '#0b2a5c'; ctx.lineWidth = 2; ctx.stroke();
  dLabel(s, x, y, size, fg);
}
function dSky(top = '#8fd0ff', bottom = '#e8f6ff') {
  const g = ctx.createLinearGradient(0, 0, 0, DH); g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, DW, DH);
}
function dGround(y, color = '#6cbf5a') { ctx.fillStyle = color; ctx.fillRect(0, y, DW, DH - y); }
function dSpace(t) { ctx.fillStyle = '#060a1e'; ctx.fillRect(0, 0, DW, DH); spaceStars(80, 2, DW, DH, t); }
// air "molecules": n dots bouncing inside a box, speed set by temperature
function molecules(seed, n, x, y, w, h, spd, color, t, r = 3) {
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const px = x + Math.abs(mod(rnd(i, seed) * 2 * w + t * spd * (0.6 + rnd(i, seed + 1)), 2 * w) - w);
    const py = y + Math.abs(mod(rnd(i, seed + 2) * 2 * h + t * spd * (0.6 + rnd(i, seed + 3)), 2 * h) - h);
    circle(px, py, r);
  }
}
function airfoil(cx, cy, len, ang) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(-len / 2, 0);
  ctx.bezierCurveTo(-len / 2, -len * 0.16, len * 0.05, -len * 0.2, len / 2, 0);
  ctx.bezierCurveTo(len * 0.05, -len * 0.04, -len / 2, len * 0.08, -len / 2, 0);
  ctx.fillStyle = '#e8453a'; ctx.fill(); ctx.strokeStyle = '#0b2a5c'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}
function meterDia(x, y, w, f, label) {
  ctx.fillStyle = 'rgba(255,255,255,.2)'; rrect(x, y, w, 14, 7); ctx.fill();
  ctx.fillStyle = f > 0.8 ? '#ff5a4a' : '#ffd84a'; rrect(x, y, Math.max(6, w * clamp(f, 0, 1)), 14, 7); ctx.fill();
  dLabel(label, x + w / 2, y + 28, 13, '#fff');
}
const DIAGRAMS = {
  'b-heat': (t, v) => {
    dSky('#bfe3ff', '#eef8ff'); dGround(250, '#7cc46a');
    molecules(1, 40, 10, 10, DW - 20, 230, 18, 'rgba(60,110,200,.55)', t, 3);   // cool air outside: slow and packed
    const rise = clamp((v - 0.35) / 0.55, 0, 1), by = 112 - rise * 34 + Math.sin(t * 1.5) * 2 * rise;
    ctx.save(); balloonShape(240, by, 66); ctx.fillStyle = mix('#dfe9ff', '#ffe0c4', v); ctx.fill(); ctx.clip();
    molecules(5, Math.round(22 - v * 12), 170, by - 70, 140, 140, 20 + v * 170, mix('#5a8ad8', '#ff5a2a', v), t, 4);
    ctx.restore();
    balloonShape(240, by, 66); ctx.strokeStyle = '#0b2a5c'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = '#5a3b1e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(219, by + 76); ctx.lineTo(223, by + 99); ctx.moveTo(261, by + 76); ctx.lineTo(257, by + 99); ctx.stroke();
    ctx.fillStyle = '#a8692e'; ctx.fillRect(222, by + 99, 36, 24);
    if (v > 0.05) { ctx.fillStyle = 'rgba(255,190,40,.9)'; ctx.beginPath(); ctx.moveTo(233, by + 99); ctx.quadraticCurveTo(240, by + 99 - 10 - v * 30 - Math.sin(t * 30) * 4, 247, by + 99); ctx.fill(); }
    dBubble(`Inside: ${Math.round(20 + v * 100)}°C`, 380, 40, 15, mix('#d8ecff', '#ffe2c8', v));
    dBubble(rise > 0 ? 'Lighter than the air outside: UP! ⬆️' : 'Not hot enough to float yet', 150, 30, 14, rise > 0 ? '#c9f5d3' : '#fff');
  },
  'b-animals': t => {
    dSky('#8fd0ff', '#fff4dc'); dGround(232, '#7cc46a');
    ctx.fillStyle = '#d9c7a8'; ctx.fillRect(330, 170, 130, 62); ctx.fillStyle = '#7d8aa3'; ctx.fillRect(330, 160, 130, 12);   // palace of Versailles
    for (let i = 0; i < 6; i++) { ctx.fillStyle = '#6a7fa8'; ctx.fillRect(340 + i * 20, 184, 10, 20); }
    const y = 130 - mod(t * 12, 70);
    drawBalloon(170, y, 54, 0, '#2a55b8', '#ffd84a');
    const by = y + 54 * 1.5;
    outlined('🐑', 154, by - 2, 16, '#fff'); outlined('🦆', 170, by - 6, 14, '#fff'); outlined('🐓', 186, by - 2, 16, '#fff');
    dBubble('Versailles, France · 1783', 360, 24, 15);
    dBubble('8 minutes in the air!', 380, 140, 14, '#fff3b0');
  },
  'b-people': t => {
    dSky('#ffcf9a', '#fff1d6'); dGround(238, '#8ab06a');
    for (let i = 0; i < 12; i++) {   // Paris rooftops
      const x = i * 42, h = 30 + rnd(i, 2) * 40;
      ctx.fillStyle = '#e8d2b0'; ctx.fillRect(x, 238 - h, 38, h);
      ctx.fillStyle = '#6a7fa8'; ctx.fillRect(x - 2, 238 - h - 8, 42, 9);
    }
    const x = 60 + mod(t * 30, 400);
    drawBalloon(x, 90 + Math.sin(t) * 6, 46, 0.7, '#3d6fe0', '#ffd84a', t);
    ctx.fillStyle = '#5a3b1e'; circle(x - 6, 90 + 46 * 1.5 - 2 + Math.sin(t) * 6, 4); circle(x + 7, 90 + 46 * 1.5 - 2 + Math.sin(t) * 6, 4);
    dBubble('Paris · November 21, 1783', 240, 24, 15);
    dBubble('First people to fly! ~25 minutes', 240, 256, 14, '#fff3b0');
  },
  'b-steer': t => {
    dSky(); dGround(240);
    const layers = [[60, 115, 1, 'High wind →'], [115, 170, -1, '← Middle wind'], [170, 230, 1, 'Low wind →']];
    for (const [y1, y2, dir, nm] of layers) {
      ctx.fillStyle = dir > 0 ? 'rgba(255,255,255,.18)' : 'rgba(61,111,224,.12)'; ctx.fillRect(0, y1, DW, y2 - y1);
      for (let i = 0; i < 4; i++) { const x = mod(i * 140 + t * 50 * dir, DW + 80) - 40; arrow(x - dir * 22, (y1 + y2) / 2, x + dir * 22, (y1 + y2) / 2, 'rgba(255,255,255,.9)', 4); }
      dLabel(nm, dir > 0 ? 60 : 420, y1 + 12, 13, '#0b2a5c');
    }
    const c = Math.cos(t * 0.7), x = 240 + Math.sin(t * 0.7) * 150, y = 142 + 50 * Math.tanh(c * 3) * (Math.sin(t * 0.35) > 0 ? 1 : -1);
    drawBalloon(x, y - 46, 24, Math.abs(Math.sin(t * 2)) > 0.6 ? 1 : 0, '#ff6b3d', '#ffd84a', t);
    dBubble('Go up or down to pick your wind!', 240, 24, 15, '#fff3b0');
  },
  'w-forces': t => {
    dSky();
    for (let i = 0; i < 4; i++) cloud(mod(i * 150 - t * 60, 640) - 80, 40 + i * 50, 0.5);
    drawProp(240, 140, 2.6, 0, t);
    const p = 1 + Math.sin(t * 3) * 0.08;
    arrow(240, 110, 240, 110 - 70 * p, '#2fa84f', 8); dLabel('LIFT', 240, 26, 18, '#2fa84f');
    arrow(240, 170, 240, 170 + 60 * p, '#e8453a', 8); dLabel('WEIGHT', 240, 252, 18, '#e8453a');
    arrow(330, 142, 330 + 70 * p, 142, '#3d6fe0', 8); dLabel('THRUST', 430, 112, 18, '#3d6fe0');
    arrow(150, 142, 150 - 60 * p, 142, '#f08a00', 8); dLabel('DRAG', 60, 112, 18, '#f08a00');
  },
  'w-bernoulli': t => {
    dSky('#d6eeff', '#f2f9ff');
    // streamlines: dots go faster over the top
    for (let row = 0; row < 7; row++) {
      const yb = 50 + row * 30, top = yb < 135, spd = top ? 170 - Math.abs(yb - 120) * 0.9 : 90;
      for (let i = 0; i < 8; i++) {
        const x = mod(i * 70 + t * spd, DW + 40) - 20;
        const bulge = Math.exp(-((x - 240) ** 2) / 9000);
        const y = yb + (top ? -bulge * (30 - (120 - yb) * 0.2) : bulge * 6);
        ctx.fillStyle = top ? '#3d6fe0' : '#7aa0d8'; circle(x, y, top ? 3.5 : 3);
      }
    }
    airfoil(240, 135, 220, -0.08);
    arrow(240, 120, 240, 40, '#2fa84f', 8);
    dBubble('Fast air on top = LOW pressure', 120, 22, 14, '#d8ecff');
    dBubble('Slower air below = HIGHER pressure', 240, 250, 14, '#ffe2c8');
    dLabel('LIFT', 280, 52, 20, '#2fa84f');
  },
  'w-stall': (t, v) => {
    dSky('#d6eeff', '#f2f9ff');
    const ang = v * 24, stall = ang > 16, cl = stall ? Math.max(0.2, 1.1 - (ang - 16) * 0.12) : ang / 16 * 1.1;
    const rad = ang * Math.PI / 180;
    for (let row = 0; row < 6; row++) {   // airflow: smooth over the top, until it stalls
      const yb = 60 + row * 32, top = yb < 140;
      for (let i = 0; i < 9; i++) {
        const x = mod(i * 60 + t * (top ? 150 : 100), DW + 40) - 20;
        let y = yb;
        const near = Math.exp(-((x - 230) ** 2) / 8000);
        if (top) y -= near * (20 + ang * 0.6) * (stall && x > 240 ? 0.2 : 1);
        else y += near * ang * 0.4;
        if (stall && top && x > 240 && x < 400 && row > 1) {   // swirly, broken-away air behind the top
          const a = t * 6 + i; ctx.strokeStyle = 'rgba(232,69,58,.6)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, 110 + Math.sin(a) * 10, 8, a, a + 4); ctx.stroke(); continue;
        }
        ctx.fillStyle = top ? '#3d6fe0' : '#7aa0d8'; circle(x, y, 3);
      }
    }
    airfoil(220, 140, 200, -rad);
    arrow(220, 125, 220, 125 - cl * 85, stall ? '#e8453a' : '#2fa84f', 8);
    dBubble(`Tilt: ${Math.round(ang)}°`, 70, 26, 16);
    dBubble(stall ? 'STALL! The air breaks away, lift drops' : ang < 3 ? 'Flat wing: just a little lift' : 'More tilt: more lift!', 300, 250, 14, stall ? '#ffd0c8' : '#c9f5d3');
  },
  'w-lilienthal': t => {
    dSky('#a8dcff', '#f0f9ff');
    ctx.fillStyle = '#7cc46a'; ctx.beginPath(); ctx.moveTo(0, DH); ctx.lineTo(0, 120); ctx.quadraticCurveTo(80, 110, 150, 180); ctx.lineTo(DW, 240); ctx.lineTo(DW, DH); ctx.fill();
    const k = mod(t * 0.25, 1), x = 40 + k * 400, y = 105 + k * 110 + Math.sin(k * 9) * 6;
    ctx.save(); ctx.translate(x, y); ctx.rotate(0.12);
    ctx.fillStyle = '#f4ead2'; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.quadraticCurveTo(0, -18, 40, 0); ctx.quadraticCurveTo(0, -8, -40, 0); ctx.fill();
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(-44, -6); ctx.stroke();
    ctx.fillStyle = '#f4ead2'; ctx.fillRect(-48, -14, 6, 12);
    ctx.fillStyle = '#333'; ctx.fillRect(-2, -2, 4, 20); circle(0, -4, 4);
    ctx.restore();
    dBubble('Otto Lilienthal · 1890s', 330, 28, 15);
    dBubble('~2,000 glider flights!', 330, 64, 14, '#fff3b0');
  },
  'z-rigid': t => {
    dSky('#a8d6ff', '#eef8ff');
    for (let i = 0; i < 4; i++) cloud(mod(i * 150 - t * 20, 640) - 80, 40 + i * 55, 0.5);
    ctx.save(); ctx.translate(240, 128);
    ctx.fillStyle = '#c4cad4'; ctx.beginPath(); ctx.ellipse(0, 0, 200, 52, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 196, 48, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = '#eef2f8'; ctx.fillRect(-200, -60, 400, 120);
    for (let k = -4; k <= 4; k++) { ctx.fillStyle = `rgba(255,${200 + k * 4},120,.55)`; rrect(k * 40 - 17, -38, 34, 76, 14); ctx.fill(); }   // gas bags
    ctx.strokeStyle = '#7d8aa3'; ctx.lineWidth = 2;
    for (let k = -5; k <= 5; k++) { ctx.beginPath(); ctx.moveTo(k * 40 - 20, -50); ctx.lineTo(k * 40 - 20, 50); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-200, -26); ctx.lineTo(200, -26); ctx.moveTo(-200, 26); ctx.lineTo(200, 26); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#8a929e'; ctx.beginPath(); ctx.moveTo(-170, -10); ctx.lineTo(-222, -46); ctx.lineTo(-208, -6); ctx.fill(); ctx.beginPath(); ctx.moveTo(-170, 10); ctx.lineTo(-222, 46); ctx.lineTo(-208, 6); ctx.fill();
    ctx.fillStyle = '#5a6272'; rrect(40, 48, 50, 16, 4); ctx.fill();
    ctx.fillStyle = '#5a6272'; ctx.fillRect(-60, 46, 18, 9); ctx.fillStyle = 'rgba(60,60,60,.6)'; ctx.beginPath(); ctx.ellipse(-64, 50, 2, Math.abs(Math.cos(t * 25)) * 10 + 2, 0, 0, TAU); ctx.fill();
    ctx.restore();
    dBubble('Metal frame', 110, 40, 13); dBubble('Gas bags', 300, 40, 13, '#ffe9c8');
    dBubble('Engines', 150, 210, 13); dBubble('Gondola (cabin)', 330, 220, 13);
  },
  'z-gas': (t, v) => {
    dSky('#c6e4ff', '#f4faff');
    const he = v > 0.5, lift = he ? 0.93 : 1;
    const strike = mod(t, 3) < 0.25, burning = !he && mod(t, 3) > 0.15 && mod(t, 3) < 2.2;
    if (strike) { ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(300, 0); ctx.lineTo(280, 40); ctx.lineTo(296, 44); ctx.lineTo(268, 92); ctx.stroke(); }
    drawZeppelin(240, 130, 2.3, t, burning ? 0.45 + Math.sin(t * 20) * 0.1 : 0);
    if (burning) for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(255,150,40,.8)'; ctx.beginPath(); ctx.ellipse(170 + i * 28, 92 - Math.abs(Math.sin(t * 9 + i)) * 14, 9, 16, 0, 0, TAU); ctx.fill(); }
    arrow(240, 80, 240, 80 - lift * 55, '#2fa84f', 7);
    dLabel(`Lift ${Math.round(lift * 100)}%`, 290, 40, 15, '#2fa84f');
    dBubble(he ? 'HELIUM: almost as much lift, and it can\'t burn ✅' : 'HYDROGEN: the most lift, but it burns! 🔥', 240, 242, 14, he ? '#c9f5d3' : '#ffd0c8');
  },
  'z-control': t => {
    dSky('#bfe3ff', '#eef8ff'); dGround(250, '#7cc46a');
    const ph = Math.floor(t / 3) % 3, k = mod(t, 3) / 3;
    const y = ph === 0 ? 150 - k * 60 : ph === 1 ? 90 + k * 60 : 150 - k * 30;
    if (ph === 2) { ctx.fillStyle = '#fff6c9'; circle(400, 50, 30); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + t; ctx.fillRect(400 + Math.cos(a) * 40, 50 + Math.sin(a) * 40, 4, 4); } }
    drawZeppelin(220, y, 1.9, t);
    if (ph === 0) for (let i = 0; i < 8; i++) { const d = mod(t * 2 + i / 8, 1); ctx.fillStyle = `rgba(61,111,224,${1 - d})`; circle(262 + (i % 2) * 6, y + 40 + d * 80, 3); }
    if (ph === 1) for (let i = 0; i < 6; i++) { const d = mod(t * 1.5 + i / 6, 1); ctx.fillStyle = `rgba(255,255,255,${1 - d})`; circle(220 + (i - 3) * 8, y - 38 - d * 40, 5 + d * 6); }
    dBubble(['💧 Drop water ballast → lighter → UP', '💨 Let out some gas → less lift → DOWN', '☀️ Sunshine warms the gas → it rises!'][ph], 240, 24, 15, '#fff3b0');
  },
  'z-hindenburg': t => {
    dSpace(t);
    const a = t * 0.8, zx = 170 + Math.cos(a) * 112, zy = 140 + Math.sin(a) * 36;
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(170, 140, 112, 36, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    if (Math.sin(a) < 0) drawZeppelin(zx, zy, 0.45, t);   // behind the Earth
    drawEarth(170, 140, 80, t);
    if (Math.sin(a) >= 0) drawZeppelin(zx, zy, 0.45, t);
    dBubble('1929: Graf Zeppelin flies around the world', 170, 250, 13, '#fff3b0');
    ctx.fillStyle = 'rgba(255,255,255,.92)'; rrect(300, 30, 166, 90, 12); ctx.fill();
    txt('🔥', 320, 56, 24, '#000'); dLabel('1937: Hindenburg', 392, 52, 14); dLabel('hydrogen fire', 392, 72, 13, '#7d3a2a');
    dLabel('→ airships fade away', 383, 98, 13, '#334');
    ctx.fillStyle = 'rgba(255,255,255,.92)'; rrect(300, 140, 166, 80, 12); ctx.fill();
    drawZeppelin(383, 166, 0.55, t); dLabel('Today: helium blimps ✅', 383, 202, 13, '#2a7a3a');
  },
  'r-shop': t => {
    ctx.fillStyle = '#f3e2c4'; ctx.fillRect(0, 0, DW, DH);
    ctx.fillStyle = '#d9c09a'; ctx.fillRect(0, 210, DW, 60);
    ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 3;   // a bicycle
    for (const wx of [70, 150]) { ctx.beginPath(); ctx.arc(wx, 180, 30, 0, TAU); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(70, 180); ctx.lineTo(105, 140); ctx.lineTo(150, 180); ctx.lineTo(115, 180); ctx.lineTo(105, 140); ctx.lineTo(140, 135); ctx.stroke();
    ctx.save(); ctx.translate(70, 180); ctx.rotate(t * 3); ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(30, 0); ctx.moveTo(0, -30); ctx.lineTo(0, 30); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#9a6a3a'; ctx.fillRect(230, 100, 220, 80);   // the wind tunnel
    ctx.fillStyle = '#cfe9ff'; ctx.fillRect(250, 112, 180, 56);
    ctx.save(); ctx.translate(240, 140); ctx.rotate(t * 20); ctx.fillStyle = '#555'; ctx.fillRect(-3, -24, 6, 48); ctx.restore();
    for (let i = 0; i < 6; i++) { const x = 260 + mod(t * 160 + i * 30, 170); ctx.fillStyle = 'rgba(61,111,224,.6)'; ctx.fillRect(x, 120 + (i % 3) * 16, 14, 2); }
    const shape = Math.floor(t / 0.8) % 5;
    airfoil(350, 142, 40 + shape * 4, -0.1 - shape * 0.03);
    dBubble('Dayton, Ohio · bicycle shop', 140, 30, 15);
    dBubble(`Wind tunnel: wing shape #${(Math.floor(t / 0.8) % 200) + 1}`, 340, 72, 14, '#fff3b0');
    dBubble('200+ shapes tested!', 340, 205, 14);
  },
  'r-control': t => {
    dSky();
    const phase = Math.floor(t / 2.5) % 3, k = Math.sin(t * 2.4);
    const labels = [['PITCH', 'nose up & down', 'elevator'], ['ROLL', 'tip the wings', 'wing warping'], ['YAW', 'turn left & right', 'rudder']];
    ctx.save(); ctx.translate(240, 140);
    if (phase === 0) { ctx.rotate(k * 0.3); drawFlyer(0, 0, 3, 0, t); }
    else if (phase === 1) {   // seen from the front: wings tip
      ctx.rotate(k * 0.35);
      ctx.fillStyle = '#efe2c0'; ctx.fillRect(-150, -30, 300, 6); ctx.fillRect(-150, 10, 300, 6);
      ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = -140; x <= 140; x += 40) { ctx.moveTo(x, -24); ctx.lineTo(x, 10); } ctx.stroke();
      ctx.fillStyle = '#e8b98a'; circle(0, 6, 7);
    } else {   // seen from above: nose swings
      ctx.rotate(k * 0.3);
      ctx.fillStyle = '#efe2c0'; ctx.fillRect(-26, -150, 40, 300);
      ctx.fillRect(70, -30, 20, 60); ctx.fillRect(-110, -6, 8, 12);
      ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(14, -10); ctx.lineTo(70, -10); ctx.moveTo(14, 10); ctx.lineTo(70, 10); ctx.moveTo(-26, 0); ctx.lineTo(-104, 0); ctx.stroke();
    }
    ctx.restore();
    const [a, b, c] = labels[phase];
    dBubble(`${a}: ${b}`, 240, 28, 18, '#fff3b0');
    dBubble(`controlled by the ${c}`, 240, 246, 15);
  },
  'r-first': t => {
    dSky('#bfe3ff', '#f4f8ff');
    ctx.fillStyle = '#ead09a'; ctx.beginPath(); ctx.moveTo(0, DH); for (let x = 0; x <= DW; x += 10) ctx.lineTo(x, 220 - Math.sin(x * 0.02) * 10); ctx.lineTo(DW, DH); ctx.fill();
    const k = mod(t, 7) / 6, kk = Math.min(1, k);
    const x = 40 + kk * 380, y = 200 - Math.sin(kk * Math.PI) * 40 - (kk < 1 ? 0 : 0);
    ctx.fillStyle = '#8a5a2b'; ctx.fillRect(20, 214, 80, 4);
    drawFlyer(x, y, 1.6, Math.cos(kk * Math.PI) * 0.15, t);
    dBubble(`⏱️ ${(kk * 12).toFixed(1)} s   📏 ${Math.round(kk * 120)} ft`, 240, 30, 17, '#fff3b0');
    dBubble('Kitty Hawk · Dec 17, 1903', 240, 70, 14);
  },
  'p-prop': t => {
    dSky();
    ctx.save(); ctx.translate(130, 135);   // front view: a spinning propeller
    ctx.fillStyle = '#b8bfc9'; circle(0, 0, 12);
    for (let i = 0; i < 2; i++) {
      ctx.save(); ctx.rotate(t * 4 + i * Math.PI);
      ctx.fillStyle = '#7a5a3a'; ctx.beginPath(); ctx.ellipse(0, -48, 12, 44, 0.15, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    dLabel('Front view', 130, 250, 15);
    drawProp(350, 135, 2.2, 0, t);
    for (let i = 0; i < 5; i++) { const x = 400 - mod(t * 150 + i * 40, 200); arrow(x + 0, 110 + (i % 3) * 24, x - 30, 110 + (i % 3) * 24, 'rgba(61,111,224,.7)', 4); }
    arrow(420, 70, 470, 70, '#3d6fe0', 7); dLabel('THRUST', 430, 46, 17, '#3d6fe0');
    dBubble('Each blade is a little wing!', 240, 24, 15, '#fff3b0');
  },
  'p-pilots': t => {
    ctx.fillStyle = '#fdf3e0'; ctx.fillRect(0, 0, DW, DH);
    const cards = [['🎓', 'Bessie Coleman', '1921', 'first African American woman with a pilot\'s license'], ['✈️', 'Charles Lindbergh', '1927', 'first solo nonstop across the Atlantic'], ['🌊', 'Amelia Earhart', '1932', 'first woman to fly solo across the Atlantic']];
    const on = Math.floor(t / 2.2) % 3;
    cards.forEach(([ic, nm, yr, what], i) => {
      const x = 16 + i * 154, y = 30 + (i === on ? -8 : 0);
      ctx.fillStyle = i === on ? '#fff3b0' : '#fff'; rrect(x, y, 140, 210, 14); ctx.fill();
      ctx.strokeStyle = '#0b2a5c'; ctx.lineWidth = i === on ? 4 : 2; ctx.stroke();
      txt(ic, x + 70, y + 40, 38, '#000');
      dLabel(nm, x + 70, y + 92, 15);
      dLabel(yr, x + 70, y + 118, 22, '#e8453a');
      ctx.font = "600 13px 'Fredoka', system-ui"; ctx.fillStyle = '#334';
      const words = what.split(' '); let line = '', ly = y + 148;
      for (const w of words) { if (ctx.measureText(line + w).width > 124) { ctx.fillText(line, x + 70, ly); line = ''; ly += 17; } line += w + ' '; }
      ctx.fillText(line, x + 70, ly);
    });
  },
  'p-atlantic': t => {
    ctx.fillStyle = '#3f84c8'; ctx.fillRect(0, 0, DW, DH);
    ctx.fillStyle = '#6cbf5a';
    ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(90, 30); ctx.lineTo(120, 90); ctx.lineTo(95, 150); ctx.lineTo(70, 230); ctx.lineTo(0, 270); ctx.fill();   // North America
    ctx.beginPath(); ctx.moveTo(480, 30); ctx.lineTo(400, 50); ctx.lineTo(380, 100); ctx.lineTo(395, 140); ctx.lineTo(370, 200); ctx.lineTo(420, 270); ctx.lineTo(480, 270); ctx.fill();   // Europe & Africa
    ctx.beginPath(); ctx.ellipse(355, 80, 14, 22, 0.3, 0, TAU); ctx.fill();   // Ireland & Britain
    const a = [110, 115], b = [392, 105];
    ctx.setLineDash([6, 6]); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(250, 40, b[0], b[1]); ctx.stroke(); ctx.setLineDash([]);
    const k = mod(t * 0.18, 1), q = 1 - k;
    const px = q * q * a[0] + 2 * q * k * 250 + k * k * b[0], py = q * q * a[1] + 2 * q * k * 40 + k * k * b[1];
    drawProp(px, py, 0.9, -0.1, t);
    ctx.fillStyle = '#e8453a'; circle(a[0], a[1], 5); circle(b[0], b[1], 5);
    dBubble('New York', 80, 140, 14); dBubble('Paris', 420, 128, 14);
    dBubble(`⏱️ ${(k * 33.5).toFixed(1)} hours`, 240, 230, 16, '#fff3b0');
    dLabel('ATLANTIC OCEAN', 240, 180, 16, 'rgba(255,255,255,.75)');
  },
  'h-davinci': t => {
    ctx.fillStyle = '#efe0bd'; ctx.fillRect(0, 0, DW, DH);
    ctx.fillStyle = 'rgba(120,80,30,.08)'; for (let i = 0; i < 30; i++) circle(rnd(i, 1) * DW, rnd(i, 2) * DH, 10 + rnd(i, 3) * 30);
    ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(170, 230); ctx.lineTo(310, 230); ctx.moveTo(240, 230); ctx.lineTo(240, 70); ctx.stroke();
    ctx.strokeRect(190, 222, 100, 10);
    for (let k = 0; k < 6; k++) {   // the spiral linen sail
      const y = 200 - k * 22, w = 90 - k * 8, ph = t * 2 + k * 0.9;
      ctx.beginPath(); ctx.ellipse(240, y, w, 12, 0, ph % TAU, ph % TAU + Math.PI * 1.4); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(106,74,42,.15)'; ctx.beginPath(); ctx.moveTo(150, 200); ctx.quadraticCurveTo(240, 40, 330, 200); ctx.fill();
    ctx.font = "italic 600 16px 'Fredoka', serif"; ctx.fillStyle = '#6a4a2a'; ctx.textAlign = 'left';
    ctx.fillText('Leonardo da Vinci, about 1490', 18, 30);
    ctx.fillText('"aerial screw"', 340, 120);
  },
  'h-rotor': (t, v) => {
    dSky(); dGround(226);
    const lift = v * v * 1.6, up = clamp((lift - 1) / 0.6, 0, 1), y = 194 - up * 100;
    drawHeli(220, y, 2.4, 0, t * v * 1.2 + 0.3 * v);
    arrow(340, y - 6, 340, y - 6 - lift * 45, '#2fa84f', 7); dLabel('LIFT', 384, y - 20 - lift * 18, 15, '#2fa84f');
    arrow(340, y + 4, 340, y + 46, '#e8453a', 7); dLabel('WEIGHT', 396, y + 34, 15, '#e8453a');
    dBubble(up > 0 ? 'Lift beats weight: up we go! ⬆️' : lift > 0.6 ? 'Almost… spin faster!' : 'Not enough lift yet', 240, 24, 15, up > 0 ? '#c9f5d3' : '#fff');
  },
  'h-tilt': t => {
    dSky(); dGround(236);
    const ph = Math.floor(t / 2.5) % 3, tilt = [0, 0.28, -0.22][ph];
    const x = 240 + (ph === 1 ? mod(t, 2.5) * 40 - 50 : ph === 2 ? 50 - mod(t, 2.5) * 20 : 0);
    drawHeli(x, 140, 2.4, tilt, t);
    const ax = Math.sin(tilt) * 60, ay = -Math.cos(tilt) * 60;
    arrow(x, 100, x + ax * 1.4, 100 + ay, '#2fa84f', 7);
    dBubble(['Rotor flat: HOVER in one spot', 'Tilt forward: fly forward →', 'Tilt back: slow down and stop'][ph], 240, 24, 16, '#fff3b0');
  },
  'h-tail': t => {
    dSky('#d6eeff', '#f2f9ff');
    const top = (cx, spin, tail) => {
      ctx.save(); ctx.translate(cx, 140); ctx.rotate(spin);
      ctx.fillStyle = 'rgba(40,40,40,.12)'; circle(0, 0, 70);
      ctx.fillStyle = '#e8453a'; ctx.fillRect(-60, -4, 50, 8); ctx.beginPath(); ctx.ellipse(0, 0, 22, 15, 0, 0, TAU); ctx.fill();
      if (tail) { ctx.fillStyle = 'rgba(60,60,60,.6)'; ctx.fillRect(-64, -12, 4, 24); arrow(-62, 0, -62, 30, '#3d6fe0', 4); }
      ctx.restore();
      ctx.save(); ctx.translate(cx, 140); ctx.rotate(t * 12);
      ctx.strokeStyle = 'rgba(40,40,40,.5)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-68, 0); ctx.lineTo(68, 0); ctx.stroke();
      ctx.restore();
    };
    top(120, -t * 2, false); top(360, 0, true);
    dBubble('No tail rotor: it spins! 😵', 120, 34, 14, '#ffd0c8');
    dBubble('Tail rotor: steady ✅', 360, 34, 14, '#c9f5d3');
    dLabel('Main rotor turns this way ↻', 240, 250, 14);
  },
  'j-engine': t => {
    ctx.fillStyle = '#eaf2fb'; ctx.fillRect(0, 0, DW, DH);
    const step = Math.floor(t / 1.2) % 4, zones = [[40, 140, 'SUCK', '#3d6fe0'], [140, 260, 'SQUEEZE', '#7a5ad8'], [260, 350, 'BANG', '#e8453a'], [350, 450, 'BLOW', '#f08a00']];
    ctx.fillStyle = '#9aa6b8'; ctx.beginPath(); ctx.moveTo(40, 70); ctx.lineTo(260, 95); ctx.lineTo(350, 95); ctx.lineTo(450, 110); ctx.lineTo(450, 160); ctx.lineTo(350, 175); ctx.lineTo(260, 175); ctx.lineTo(40, 200); ctx.fill();
    zones.forEach(([x1, x2, nm, c], i) => {
      ctx.fillStyle = i === step ? c : 'rgba(255,255,255,.35)'; ctx.globalAlpha = i === step ? 0.35 : 1;
      ctx.fillRect(x1, 60, x2 - x1, 150); ctx.globalAlpha = 1;
      dLabel(nm, (x1 + x2) / 2, 236, i === step ? 20 : 15, i === step ? c : '#7d8aa3');
    });
    for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(60 + i * 50, 135); ctx.scale(1, 1); ctx.fillStyle = '#556'; ctx.fillRect(-3, -50 + i * 8, 6, 100 - i * 16); ctx.restore(); }
    ctx.fillStyle = `rgba(255,${120 + Math.sin(t * 30) * 60},40,.9)`; ctx.beginPath(); ctx.ellipse(305, 135, 32, 22 + Math.sin(t * 20) * 4, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 14; i++) {   // air squeezes as it goes through, then rushes out hot
      const x = mod(t * 160 + i * 34, 480);
      const spread = x < 260 ? lerp(60, 26, x / 260) : lerp(26, 40, (x - 260) / 190);
      ctx.fillStyle = x > 300 ? '#ff8a3d' : '#3d6fe0'; circle(x, 135 + (rnd(i, 1) - 0.5) * spread * 2, 3);
    }
    dBubble('Jet engine · first jet plane flew in 1939', 240, 26, 14);
  },
  'j-newton': t => {
    dSky('#fff3e0', '#fffaf2');
    const k = mod(t * 0.4, 1), x = 110 + k * 230;
    for (let i = 0; i < 10; i++) { const d = mod(t * 3 + i / 10, 1); ctx.fillStyle = `rgba(61,111,224,${1 - d})`; circle(x - 46 - d * 70, 135 + (rnd(i, 3) - 0.5) * d * 50, 4); }
    ctx.fillStyle = '#e8453a'; ctx.beginPath(); ctx.ellipse(x, 135, 46 * (1 - k * 0.4), 34 * (1 - k * 0.4), 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c4322a'; ctx.beginPath(); ctx.moveTo(x - 44 * (1 - k * 0.4), 135); ctx.lineTo(x - 56 * (1 - k * 0.4), 127); ctx.lineTo(x - 56 * (1 - k * 0.4), 143); ctx.fill();
    arrow(x + 50, 80, x + 110, 80, '#2fa84f', 7); dLabel('Balloon goes →', x + 60, 56, 15, '#2fa84f');
    arrow(x - 60, 200, x - 120, 200, '#3d6fe0', 7); dLabel('← Air goes', x - 80, 226, 15, '#3d6fe0');
    dBubble('Every push has a push back!', 240, 24, 15, '#fff3b0');
  },
  'j-mach': (t, v) => {
    dSky();
    const mach = 0.3 + v * 1.7, px = 340, py = 135;
    for (let i = 1; i <= 8; i++) {
      const back = (i - mod(t * 3, 1)) * 0.3, ox = px - back * mach * 60, rr = back * 60;
      ctx.strokeStyle = `rgba(61,111,224,${0.85 - i * 0.09})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ox, py, rr, 0, TAU); ctx.stroke();
    }
    if (mach >= 1) {
      const a = Math.asin(1 / mach), L = 400;
      ctx.strokeStyle = 'rgba(232,69,58,.8)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(px - L * Math.cos(a), py - L * Math.sin(a)); ctx.lineTo(px + 6, py); ctx.lineTo(px - L * Math.cos(a), py + L * Math.sin(a)); ctx.stroke();
      if (Math.sin(t * 8) > -0.3) outlined('BOOM!', 120, 220, 34, '#ffd84a', 'center', 'Bungee');
    }
    drawJet(px, py, 1.3, 0, 1, t);
    dBubble(`Mach ${mach.toFixed(2)} · ${Math.round(mach * 1235)} km/h`, 240, 26, 17, mach >= 1 ? '#ffd84a' : '#fff');
    if (mach < 1) dBubble('Sound waves race ahead of the plane', 240, 250, 14);
  },
  'j-concorde': t => {
    dSky('#5a9ae8', '#dff0ff');
    ctx.fillStyle = '#2f7fc4'; ctx.fillRect(0, 230, DW, 40);
    for (let i = 0; i < 10; i++) { ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(mod(i * 60 - t * 200, DW), 240 + (i % 3) * 9, 24, 2); }
    const cx = mod(t * 140, DW + 300) - 150;
    for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(cx - 80 - i * 30, 92 + (i % 3) * 6, 26, 2); }
    drawConcorde(cx, 95, 1.8, 0.03, 0.6, t);
    const bx = mod(t * 60 + 200, DW + 300) - 150;
    ctx.save(); ctx.translate(bx, 175); ctx.scale(1.1, 1.1);
    ctx.fillStyle = '#f4f6fb';
    ctx.beginPath(); ctx.moveTo(60, 0); ctx.quadraticCurveTo(58, -14, 34, -16); ctx.quadraticCurveTo(20, -24, 0, -18); ctx.lineTo(-56, -10); ctx.lineTo(-70, -34); ctx.lineTo(-60, -34); ctx.lineTo(-44, -10); ctx.lineTo(-60, 0); ctx.quadraticCurveTo(0, 8, 60, 0); ctx.fill();
    ctx.fillStyle = '#3d6fe0'; ctx.fillRect(-56, -6, 110, 3); ctx.fillStyle = '#8fa3bf'; ctx.fillRect(-14, 6, 14, 6);
    ctx.restore();
    dBubble('Concorde: Mach 2 ≈ 2,180 km/h', 140, 30, 14, '#fff3b0');
    dBubble('Boeing 747: about 900 km/h', 340, 222, 13);
  },
  'k-arrows': t => {
    dSky('#2a2448', '#8a5a6a');
    ctx.fillStyle = '#3a2a3a'; ctx.beginPath(); ctx.moveTo(0, 270); ctx.lineTo(0, 200); ctx.lineTo(60, 180); ctx.lineTo(140, 210); ctx.lineTo(260, 190); ctx.lineTo(480, 220); ctx.lineTo(480, 270); ctx.fill();
    for (let i = 0; i < 4; i++) {
      const k = mod(t * 0.5 + i * 0.27, 1), x = 40 + k * 440, y = 200 - k * 150 + i * 14;
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.33);
      ctx.strokeStyle = '#d9b77a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(20, 0); ctx.stroke();
      ctx.fillStyle = '#888'; ctx.beginPath(); ctx.moveTo(20, -5); ctx.lineTo(30, 0); ctx.lineTo(20, 5); ctx.fill();
      ctx.fillStyle = '#c4322a'; ctx.fillRect(-6, -6, 18, 7);
      ctx.fillStyle = 'rgba(255,190,60,.9)'; ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-30 - Math.sin(t * 40 + i) * 6, -2); ctx.lineTo(-6, 0); ctx.fill();
      ctx.restore();
    }
    dBubble('China · about 800 years ago', 240, 26, 16, '#fff3b0');
    dBubble('Gunpowder fire arrows', 240, 246, 15);
  },
  'k-oxygen': t => {
    dSky('#0b1238', '#2a3470'); spaceStars(40, 4, DW, DH, t);
    ctx.save(); ctx.translate(140, 135); ctx.scale(2.6, 2.6);
    ctx.fillStyle = '#f4f6fb'; ctx.fillRect(-14, -36, 28, 72);
    ctx.fillStyle = '#ff8a3d'; ctx.fillRect(-12, -32, 24, 30);
    ctx.fillStyle = '#7fc8ff'; ctx.fillRect(-12, 0, 24, 30);
    ctx.fillStyle = '#3d8ff0'; ctx.beginPath(); ctx.moveTo(-14, -36); ctx.lineTo(0, -54); ctx.lineTo(14, -36); ctx.fill();
    ctx.fillStyle = '#e8453a'; ctx.beginPath(); ctx.moveTo(-14, 36); ctx.lineTo(-22, 40); ctx.lineTo(-14, 22); ctx.fill(); ctx.beginPath(); ctx.moveTo(14, 36); ctx.lineTo(22, 40); ctx.lineTo(14, 22); ctx.fill();
    ctx.fillStyle = 'rgba(255,170,40,.9)'; ctx.beginPath(); ctx.moveTo(-8, 36); ctx.quadraticCurveTo(0, 60 + Math.sin(t * 30) * 5, 8, 36); ctx.fill();
    ctx.restore();
    dBubble('FUEL', 140, 92, 14, '#ffe2c8'); dBubble('OXYGEN', 140, 172, 14, '#d8ecff');
    dBubble('🔥 Fire needs fuel + oxygen', 340, 70, 15, '#fff3b0');
    dBubble('No air in space…', 340, 130, 15);
    dBubble('…so rockets bring their own!', 340, 172, 15, '#c9f5d3');
  },
  'k-goddard': t => {
    dSky('#cfe4f5', '#f2f6f0'); dGround(232, '#d8e8d0');
    ctx.fillStyle = '#fff'; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.ellipse(rnd(i, 1) * DW, 236 + rnd(i, 2) * 30, 30, 4, 0, 0, TAU); ctx.fill(); }   // snowy field
    ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(200, 232); ctx.lineTo(220, 150); ctx.lineTo(240, 232); ctx.moveTo(210, 190); ctx.lineTo(230, 190); ctx.stroke();
    const k = mod(t, 4.5), up = k < 2.5 ? (k / 2.5) ** 1.3 : 1, x = 220 + up * 120, y = 160 - Math.sin(up * Math.PI * 0.8) * 120 + up * 40;
    if (k < 3.4) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(up * 1.2);
      ctx.strokeStyle = '#444'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, 10); ctx.moveTo(-6, -18); ctx.lineTo(6, -18); ctx.stroke();
      ctx.fillStyle = '#d9d9d9'; ctx.fillRect(-3, -28, 6, 10);
      if (k < 2.5) { ctx.fillStyle = 'rgba(255,170,40,.9)'; ctx.beginPath(); ctx.moveTo(-3, -18); ctx.quadraticCurveTo(0, -4 + Math.sin(t * 40) * 3, 3, -18); ctx.fill(); }
      ctx.restore();
    }
    dBubble(`⏱️ ${Math.min(2.5, k).toFixed(1)} s   📏 ${Math.round(up * 41)} ft high`, 240, 26, 16, '#fff3b0');
    dBubble('Robert Goddard · March 16, 1926', 240, 252, 14);
  },
  'k-stages': t => {
    const k = mod(t, 6), alt = k * 30;
    dSky(mix('#5aa8ff', '#060a1e', clamp(k / 5, 0, 1)), mix('#cfeaff', '#1a2a5a', clamp(k / 5, 0, 1)));
    if (k > 2.5) spaceStars(60, 6, DW, DH, t);
    const left = k < 2 ? 3 : k < 4 ? 2 : 1;
    drawRocket(240, 200 - Math.min(k, 1) * 30, 2.2, left, 1, t);
    for (let s = 0; s < 3 - left; s++) {   // dropped stages tumbling away
      const since = k - (s === 0 ? 2 : 4), dx = (s ? 1 : -1) * since * 30, dy = since * since * 30;
      ctx.save(); ctx.translate(240 + dx, 230 + dy); ctx.rotate(since * (s ? 1 : -1));
      ctx.fillStyle = '#d8dce6'; ctx.fillRect(-24 + s * 3, -26, 48 - s * 6, 52); ctx.restore();
    }
    dBubble(`Stage ${4 - left} firing`, 380, 40, 16, '#fff3b0');
    if (left < 3) dBubble('Empty stage drops off!', 110, 220, 14);
    dBubble('Saturn V: 3 stages, 111 m tall', 120, 30, 13);
    void alt;
  },
  'k-turn': t => {
    dSpace(t);
    ctx.fillStyle = '#2f7de0'; ctx.beginPath(); ctx.arc(240, 820, 640, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(140,200,255,.5)'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(240, 820, 652, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.setLineDash([5, 6]); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(240, 820, 730, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); ctx.setLineDash([]);
    // the gravity-turn path: straight up, then curving over to sideways
    const P = u => { const a = u * u; return [90 + u * 300 + a * 40, 182 - Math.sqrt(u) * 100 + a * 6]; };
    ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 3; ctx.beginPath();
    for (let u = 0; u <= 1; u += 0.02) { const [x, y] = P(u); u ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    const u = mod(t * 0.2, 1), [x, y] = P(u), [x2, y2] = P(Math.min(1, u + 0.02));
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(y2 - y, x2 - x) + Math.PI / 2); drawRocket(0, 10, 0.8, 1, 1, t); ctx.restore();
    dBubble('1. Straight up through thick air', 120, 236, 13);
    dBubble('2. Slowly tip over', 210, 52, 13);
    dBubble('3. Sideways super fast = ORBIT!', 360, 120, 13, '#fff3b0');
  },
  's-orbit': t => {
    dSpace(t);
    drawEarth(240, 150, 70, t);
    ctx.fillStyle = '#7a6a5a'; ctx.beginPath(); ctx.moveTo(222, 82); ctx.lineTo(240, 58); ctx.lineTo(258, 82); ctx.fill();   // Newton's mountain
    const speeds = [0.25, 0.45, 0.7, 1];
    const k = mod(t * 0.35, speeds.length), i = Math.floor(k), f = k - i;
    for (let j = 0; j <= i; j++) {
      const s = speeds[j], end = j < i ? 1 : f;
      ctx.strokeStyle = j === 3 ? '#ffd84a' : 'rgba(255,255,255,.65)'; ctx.lineWidth = 2;
      ctx.beginPath();
      let bx = 0, by = 0;
      for (let u = 0; u <= end; u += 0.01) {
        let ang, rr;
        if (j === 3) { ang = -Math.PI / 2 + u * TAU; rr = 92; }
        else { ang = -Math.PI / 2 + u * s * 2.2; rr = 92 - u * 22 / (s * 0.8 + 0.2); if (rr < 70) break; }
        bx = 240 + Math.cos(ang) * rr; by = 150 + Math.sin(ang) * rr;
        u === 0 ? ctx.moveTo(bx, by) : ctx.lineTo(bx, by);
      }
      ctx.stroke();
      if (j === i) { ctx.fillStyle = '#ffd84a'; circle(bx, by, 4); }
    }
    dBubble(i === 3 ? '28,000 km/h: it falls AROUND the Earth!' : 'Faster throw → lands farther away', 240, 252, 14, i === 3 ? '#fff3b0' : '#fff');
  },
  's-firsts': t => {
    dSpace(t);
    drawEarth(130, 140, 70, t);
    const a = t * 1.2, sx = 130 + Math.cos(a) * 100, sy = 140 + Math.sin(a) * 40;
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(130, 140, 100, 40, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#d9d9d9'; circle(sx, sy, 6);
    ctx.strokeStyle = '#d9d9d9'; ctx.lineWidth = 1.5; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 14 - k * 2, sy + 4 + k * 3); ctx.stroke(); }
    if (Math.sin(a) < 0) drawEarth(130, 140, 70, t);   // Sputnik passes behind the Earth
    if (Math.sin(t * 6) > 0.3) dLabel('beep!', sx + 18, sy - 12, 13, '#9fffa8');
    const items = [['🛰️', '1957', 'Sputnik 1'], ['👨‍🚀', '1961', 'Yuri Gagarin'], ['👩‍🚀', '1963', 'Valentina Tereshkova']];
    items.forEach(([ic, yr, nm], i) => {
      const y = 50 + i * 72, on = Math.floor(t / 2) % 3 === i;
      ctx.fillStyle = on ? '#fff3b0' : 'rgba(255,255,255,.9)'; rrect(260, y - 28, 205, 56, 12); ctx.fill();
      txt(ic, 286, y, 26, '#000');
      dLabel(yr, 340, y - 10, 18, '#e8453a'); dLabel(nm, 380, y + 12, 14, '#0b2a5c');
    });
  },
  's-moon': t => {
    dSpace(t);
    drawEarth(390, 60, 30, t);
    ctx.fillStyle = '#a8a8b0'; ctx.beginPath(); ctx.moveTo(0, 270); ctx.lineTo(0, 200); for (let x = 0; x <= DW; x += 20) ctx.lineTo(x, 200 + Math.sin(x * 0.05) * 4); ctx.lineTo(DW, 270); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(rnd(i, 1) * DW, 225 + rnd(i, 2) * 35, 20, 4, 0, 0, TAU); ctx.fill(); }
    drawLander(150, 172, 1.6);
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(230, 204); ctx.lineTo(230, 150); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(230, 150, 32, 20); ctx.fillStyle = '#e8453a'; for (let k = 0; k < 4; k++) ctx.fillRect(230, 150 + k * 5, 32, 2.5);
    ctx.fillStyle = '#3d5ab8'; ctx.fillRect(230, 150, 13, 10);
    const hop = Math.abs(Math.sin(t * 1.6)) * 30, ax = 300 + mod(t * 18, 120);
    ctx.fillStyle = '#f4f6fb'; rrect(ax - 9, 172 - hop, 18, 26, 6); ctx.fill(); circle(ax, 166 - hop, 9);
    ctx.fillStyle = '#ffd84a'; circle(ax + 3, 166 - hop, 5);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 5; i++) ctx.fillRect(300 + i * 24, 214, 8, 3);
    dBubble('Apollo 11 · July 20, 1969', 160, 30, 16, '#fff3b0');
    dBubble('Moon gravity: just 1/6 of Earth\'s', 300, 250, 13);
  },
  's-iss': t => {
    dSpace(t);
    drawEarth(240, 340, 220, t * 0.3);
    const a = -Math.PI / 2 + Math.sin(t * 0.3) * 0.5, x = 240 + Math.cos(a) * 250, y = 340 + Math.sin(a) * 250;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = '#d9d9d9'; ctx.fillRect(-60, -2, 120, 4);
    ctx.fillStyle = '#c9a63a'; for (const sx of [-58, -40, 28, 46]) ctx.fillRect(sx, -22, 14, 44);
    ctx.fillStyle = '#eee'; ctx.fillRect(-18, -7, 36, 14); ctx.fillRect(-6, -14, 12, 28);
    ctx.fillStyle = '#f4f6fb'; ctx.beginPath(); ctx.moveTo(-4, 16); ctx.lineTo(4, 16); ctx.lineTo(10, 40); ctx.lineTo(-10, 40); ctx.fill();   // docked shuttle
    ctx.fillStyle = '#333'; ctx.fillRect(-10, 38, 20, 3);
    ctx.restore();
    dBubble('Space Station + Space Shuttle', 240, 26, 16, '#fff3b0');
    dBubble('Around the Earth every 90 minutes!', 240, 196, 14);
  },
  'd-what': t => {
    dSky(); dGround(240);
    const x1 = mod(t * 50, DW + 200) - 100;
    drawProp(x1, 90, 1.6, 0, t, '#d9b23a');
    dBubble('"Queen Bee" target plane, 1935', 150, 30, 13);
    ctx.save(); ctx.translate(330, 170 + Math.sin(t * 2) * 6);
    ctx.fillStyle = '#333'; ctx.fillRect(-40, -3, 80, 6); ctx.fillStyle = '#e8453a'; rrect(-14, -10, 28, 16, 5); ctx.fill();
    for (const sx of [-40, 40]) { ctx.fillStyle = 'rgba(40,40,40,.6)'; ctx.fillRect(sx - 18 * Math.abs(Math.cos(t * 30 + sx)) - 2, -9, 36 * Math.abs(Math.cos(t * 30 + sx)) + 4, 3); ctx.fillStyle = '#333'; ctx.fillRect(sx - 2, -9, 4, 6); }
    ctx.restore();
    dBubble('Quadcopter, today', 330, 222, 13, '#fff3b0');
    dLabel('No pilot on board!', 240, 130, 18, '#e8453a');
  },
  'd-quad': (t, v) => {
    dSky(); dGround(240);
    const s = (v - 0.5) * 2, tilt = s * 0.3, x = 240 + Math.sin(t) * 0 + s * 120 * Math.abs(Math.sin(t * 0.8));
    ctx.save(); ctx.translate(240 + s * 80, 140); ctx.rotate(tilt);
    ctx.fillStyle = '#333'; ctx.fillRect(-70, -4, 140, 8); ctx.fillStyle = '#e8453a'; rrect(-22, -14, 44, 22, 6); ctx.fill();
    for (const sx of [-70, 70]) {
      const fast = (sx < 0 ? s : -s) > 0.05;
      const sp = 1 + (sx < 0 ? s : -s) * 0.6;
      ctx.fillStyle = 'rgba(40,40,40,.6)'; const w = 30 * Math.abs(Math.cos(t * 30 * sp + sx)) + 3; ctx.fillRect(sx - w, -14, w * 2, 3);
      ctx.fillStyle = '#333'; ctx.fillRect(sx - 3, -14, 6, 10);
      arrow(sx, -20, sx, -20 - 30 * sp, fast ? '#e8453a' : '#2fa84f', 5);
    }
    ctx.restore();
    void x;
    dBubble(Math.abs(s) < 0.1 ? 'All four the same: HOVER' : s > 0 ? 'Left props faster → tilt → fly right →' : '← fly left ← tilt ← right props faster', 240, 26, 15, '#fff3b0');
  },
  'd-brain': t => {
    dSky('#d6eeff', '#f2f9ff');
    const wob = Math.sin(t * 7) * 0.25 * Math.max(0, Math.sin(t * 1.3));
    ctx.save(); ctx.translate(240, 140); ctx.rotate(wob);
    ctx.fillStyle = '#333'; ctx.fillRect(-80, -4, 160, 8); ctx.fillStyle = '#e8453a'; rrect(-26, -16, 52, 26, 6); ctx.fill();
    for (const sx of [-80, 80]) { ctx.fillStyle = 'rgba(40,40,40,.6)'; const w = 30 * Math.abs(Math.cos(t * 30 + sx)) + 3; ctx.fillRect(sx - w, -14, w * 2, 3); }
    ctx.fillStyle = '#111'; circle(0, 14, 7); ctx.fillStyle = '#4ae0ff'; circle(0, 14, 3);
    ctx.restore();
    ctx.strokeStyle = '#7a5ad8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(80, 80, 22, 22 * Math.abs(Math.cos(t * 3)), 0, 0, TAU); ctx.stroke();
    dBubble('Gyroscope: feels tilting', 90, 120, 13);
    for (let i = 0; i < 3; i++) { ctx.strokeStyle = `rgba(61,111,224,${1 - mod(t + i / 3, 1)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(400, 40, 10 + mod(t + i / 3, 1) * 50, 1.8, 2.8); ctx.stroke(); }
    txt('🛰️', 410, 36, 22, '#000'); dBubble('GPS: knows where it is', 380, 100, 13);
    dBubble('Camera: sees the way', 240, 205, 13);
    dBubble(`Fixes per second: ${200 + Math.floor(t * 37) % 300}`, 240, 250, 14, '#fff3b0');
  },
  'd-jobs': t => {
    ctx.fillStyle = '#eaf5ea'; ctx.fillRect(0, 0, DW, DH);
    const jobs = [['💉', 'Delivering medicine'], ['🌾', 'Checking farm crops'], ['🎬', 'Filming movies'], ['🧭', 'Finding lost hikers']];
    jobs.forEach(([e, s], i) => {
      const x = 14 + (i % 2) * 150, y = 14 + Math.floor(i / 2) * 124;
      ctx.fillStyle = '#fff'; rrect(x, y, 140, 112, 12); ctx.fill(); ctx.strokeStyle = '#0b2a5c'; ctx.lineWidth = 2; ctx.stroke();
      txt(e, x + 70, y + 44 + Math.sin(t * 2 + i) * 4, 38, '#000'); dLabel(s, x + 70, y + 92, 13);
    });
    ctx.fillStyle = '#fff'; rrect(318, 14, 150, 236, 12); ctx.fill(); ctx.strokeStyle = '#0b2a5c'; ctx.stroke();
    ctx.fillStyle = 'rgba(232,69,58,.2)'; circle(393, 120, 60); ctx.strokeStyle = '#e8453a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(393, 120, 60, 0, TAU); ctx.stroke();
    txt('✈️', 393, 120, 34, '#000');
    dLabel('NO-FLY ZONE', 393, 200, 15, '#e8453a'); dLabel('around airports', 393, 222, 13);
  },
  'i-transfer': (t, v) => {
    dSpace(t);
    const cx = 240, cy = 135, rE = 62, rM = 96;
    ctx.fillStyle = '#ffd84a'; circle(cx, cy, 14); ctx.fillStyle = 'rgba(255,216,74,.25)'; circle(cx, cy, 22);
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, rE, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, rM, 0, TAU); ctx.stroke();
    const lead = v * 120, arrive = lead + 136, k = mod(t * 0.28, 1.25), u = Math.min(1, k);
    const a = u * Math.PI, aa = (rE + rM) / 2, e = (rM - rE) / (rM + rE), r = aa * (1 - e * e) / (1 + e * Math.cos(a));
    ctx.setLineDash([4, 5]); ctx.strokeStyle = '#9fe8ff'; ctx.beginPath();
    for (let q = 0; q <= Math.PI; q += 0.05) { const rr = aa * (1 - e * e) / (1 + e * Math.cos(q)); ctx.lineTo(cx + Math.cos(q) * rr, cy - Math.sin(q) * rr); }
    ctx.stroke(); ctx.setLineDash([]);
    const ea = -u * 136 * 1.85 * Math.PI / 180 * 0;   // Earth starts at angle 0 (right)
    drawEarth(cx + Math.cos(ea) * rE, cy - Math.sin(ea) * rE, 8, t);
    const ma = (lead + u * 136) * Math.PI / 180;
    ctx.fillStyle = '#e0663a'; circle(cx + Math.cos(ma) * rM, cy - Math.sin(ma) * rM, 7);
    ctx.fillStyle = '#fff'; circle(cx + Math.cos(a) * r, cy - Math.sin(a) * r, 3.5);
    const ok = Math.abs(arrive - 180) < 12;
    if (u >= 1) dBubble(ok ? '🎯 You meet Mars!' : arrive < 180 ? 'Missed: Mars already went past' : 'Missed: Mars isn\'t there yet', 240, 30, 15, ok ? '#c9f5d3' : '#ffd0c8');
    else dBubble(`Mars starts ${Math.round(lead)}° ahead of Earth`, 240, 30, 15);
    dLabel('Sun', cx, cy + 30, 13, '#ffd84a');
  },
  'i-window': t => {
    dSpace(t);
    const cx = 240, cy = 140, rE = 60, rM = 92;
    ctx.fillStyle = '#ffd84a'; circle(cx, cy, 13);
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(cx, cy, rE, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, rM, 0, TAU); ctx.stroke();
    const eA = t * 1.0, mA = t * 1.0 / 1.88 + 1.3;
    const ex = cx + Math.cos(eA) * rE, ey = cy - Math.sin(eA) * rE, mx = cx + Math.cos(mA) * rM, my = cy - Math.sin(mA) * rM;
    const lead = mod((mA - eA) * 180 / Math.PI, 360), open = Math.abs(lead - 44) < 14;
    ctx.strokeStyle = open ? '#7dff9a' : 'rgba(255,255,255,.3)'; ctx.lineWidth = open ? 3 : 1;
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(mx, my); ctx.stroke();
    drawEarth(ex, ey, 8, t); ctx.fillStyle = '#e0663a'; circle(mx, my, 6);
    dBubble(open ? '✅ LAUNCH WINDOW OPEN!' : 'Window closed… wait for it', 240, 28, 16, open ? '#c9f5d3' : '#fff');
    dBubble('Opens about every 26 months', 240, 250, 14, '#fff3b0');
  },
  'i-voyager': t => {
    dSpace(t);
    ctx.fillStyle = '#ffd84a'; circle(40, 220, 16);
    const P = [[60, 210], [150, 170], [250, 120], [330, 100], [470, 40]];
    ctx.fillStyle = '#d8a86a'; circle(160, 182, 14); dLabel('Jupiter', 160, 210, 12, '#fff');
    ctx.fillStyle = '#e8d29a'; circle(330, 116, 11); ctx.strokeStyle = '#e8d29a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(330, 116, 20, 5, -0.3, 0, TAU); ctx.stroke(); dLabel('Saturn', 330, 142, 12, '#fff');
    ctx.setLineDash([4, 5]); ctx.strokeStyle = '#9fe8ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]);
    ctx.quadraticCurveTo(140, 150, 180, 160); ctx.quadraticCurveTo(260, 110, 320, 98); ctx.quadraticCurveTo(360, 80, 470, 40); ctx.stroke(); ctx.setLineDash([]);
    const u = mod(t * 0.15, 1), seg = u < 0.33 ? 0 : u < 0.66 ? 1 : 2;
    const f = (u - seg * 0.33) / 0.34;
    const curves = [[[60, 210], [140, 150], [180, 160]], [[180, 160], [260, 110], [320, 98]], [[320, 98], [360, 80], [470, 40]]][seg];
    const q = 1 - f, x = q * q * curves[0][0] + 2 * q * f * curves[1][0] + f * f * curves[2][0], y = q * q * curves[0][1] + 2 * q * f * curves[1][1] + f * f * curves[2][1];
    ctx.fillStyle = '#fff'; circle(x, y, 4);
    dBubble('Swing past a planet = free speed boost!', 240, 250, 14, '#fff3b0');
    dBubble('Voyager 1 · 1977', 120, 30, 14);
  },
  'i-terror': t => {
    const ph = Math.floor(t / 2.2) % 4, k = mod(t, 2.2) / 2.2;
    dSky('#c98a5a', '#f2c79a'); ctx.fillStyle = '#b5653a'; ctx.fillRect(0, 230, DW, 40);
    if (ph === 0) drawCapsule(240, 60 + k * 60, 2, 1, 0.2);
    if (ph === 1) {
      const y = 110 + k * 30;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(220, y - 10); ctx.lineTo(200, y - 60); ctx.moveTo(260, y - 10); ctx.lineTo(280, y - 60); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(240, y - 60, 46, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#e8453a'; ctx.beginPath(); ctx.arc(240, y - 60, 46, Math.PI * 1.2, Math.PI * 1.4); ctx.lineTo(240, y - 60); ctx.fill();
      drawCapsule(240, y, 1.6, 0, 0);
    }
    if (ph === 2) {
      const y = 120 + k * 50;
      ctx.fillStyle = '#d9d9d9'; ctx.fillRect(210, 70, 60, 12);
      for (const sx of [212, 262]) { ctx.fillStyle = 'rgba(255,170,60,.9)'; ctx.beginPath(); ctx.moveTo(sx, 82); ctx.lineTo(sx + 3, 100 + Math.sin(t * 40) * 4); ctx.lineTo(sx + 6, 82); ctx.fill(); }
      ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(225, 82); ctx.lineTo(228, y - 14); ctx.moveTo(255, 82); ctx.lineTo(252, y - 14); ctx.stroke();
      drawRover(240, y, 1.4);
    }
    if (ph === 3) { drawRover(240, 228, 1.4); dLabel('🎉', 300, 190, 30); }
    dBubble(['1. Heat shield: SO hot!', '2. Giant parachute', '3. Sky crane lowers the rover', '4. Touchdown on Mars!'][ph], 240, 26, 16, '#fff3b0');
  },
  'm-thin': (t, v) => {
    dSky(mix('#8fd0ff', '#e6a46a', v), mix('#e8f6ff', '#f5d2a8', v)); dGround(236, mix('#6cbf5a', '#b5653a', v));
    molecules(3, Math.round(70 - v * 64), 10, 10, DW - 20, 220, 30, 'rgba(255,255,255,.7)', t, 3);
    const rpm = Math.round(lerp(450, 2400, v));
    drawIngenuity(240, 150 + Math.sin(t * 2) * 5, 2.6, t * lerp(0.3, 1.6, v), 1);
    dBubble(v < 0.5 ? '🌍 Earth: thick air' : '🔴 Mars: air 100× thinner', 120, 28, 14);
    dBubble(`Rotor: ${rpm.toLocaleString()} spins a minute`, 340, 28, 14, '#fff3b0');
    dBubble(`Gravity: ${v < 0.5 ? 'full Earth gravity' : 'about ⅓ of Earth\'s'}`, 240, 250, 13);
  },
  'm-ingenuity': t => {
    dSky('#e6a46a', '#f5d2a8');
    ctx.fillStyle = '#b5653a'; ctx.beginPath(); ctx.moveTo(0, DH); ctx.lineTo(0, 220); for (let x = 0; x <= DW; x += 20) ctx.lineTo(x, 220 + Math.sin(x * 0.03) * 6); ctx.lineTo(DW, DH); ctx.fill();
    ctx.fillStyle = '#8a4a2a'; for (let i = 0; i < 8; i++) circle(rnd(i, 1) * DW, 235 + rnd(i, 2) * 30, 3 + rnd(i, 3) * 4);
    drawRover(110, 222, 1.6);
    const h = 60 + Math.sin(t * 0.9) * 40;
    drawIngenuity(290, 200 - h, 1.8, t, 1);
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(290, 226, 22 - h * 0.1, 4, 0, 0, TAU); ctx.fill();
    dBubble('April 19, 2021: first flight on another planet!', 240, 26, 14, '#fff3b0');
    ctx.fillStyle = '#efe2c0'; ctx.fillRect(400, 70, 40, 28); ctx.strokeStyle = '#8a5a2b'; ctx.strokeRect(400, 70, 40, 28);
    dLabel('Wright Flyer', 420, 110, 12); dLabel('fabric!', 420, 126, 12);
  },
  'm-auto': t => {
    dSpace(t);
    drawEarth(50, 135, 26, t);
    ctx.fillStyle = '#e0663a'; circle(430, 135, 22);
    for (let i = 0; i < 5; i++) { const d = mod(t * 0.15 + i / 5, 1); ctx.strokeStyle = `rgba(159,232,255,${0.9 - d * 0.5})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(80 + d * 320, 135, 10, -0.6, 0.6); ctx.stroke(); }
    dBubble(`📡 Message on the way… ${Math.floor(mod(t * 2, 13))} min`, 240, 60, 14);
    dBubble('Too slow for a joystick!', 240, 196, 14, '#ffd0c8');
    dBubble('So Ingenuity flew itself 🤖', 240, 236, 14, '#c9f5d3');
  },
  'm-record': t => {
    dSky('#e6a46a', '#f5d2a8'); ctx.fillStyle = '#b5653a'; ctx.fillRect(0, 210, DW, 60);
    const n = Math.min(72, Math.floor(mod(t, 9) / 7 * 72) + 1);
    ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < 12; i++) { const x = 30 + i * 36; ctx.moveTo(x, 205); ctx.quadraticCurveTo(x + 18, 150, x + 36, 205); }
    ctx.stroke(); ctx.setLineDash([]);
    const k = mod(t, 9) / 7, x = 30 + Math.min(1, k) * 432, hop = Math.abs(Math.sin(Math.min(1, k) * 12 * Math.PI)) * 50;
    drawIngenuity(x, 192 - hop, 1.1, t, 1);
    dBubble(`Flight ${n} of 72!`, 240, 30, 18, '#fff3b0');
    dBubble('Planned: 5 flights. Flew: 72!', 240, 76, 14);
  },
  'l-speed': t => {
    dSpace(t);
    drawEarth(80, 140, 34, t);
    ctx.fillStyle = '#d9d9d9'; circle(420, 140, 12);
    const k = mod(t, 2.2) / 1.3, x = 114 + Math.min(1, k) * 294;
    ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(114, 140); ctx.lineTo(x, 140); ctx.stroke();
    ctx.fillStyle = '#fff6a0'; circle(x, 140, 5);
    dBubble(`Earth → Moon: ${(Math.min(1, k) * 1.3).toFixed(1)} s`, 260, 100, 15, '#fff3b0');
    const a = t * 7.5 * TAU / 3;   // 7.5 laps of Earth in a second (slowed down 3×)
    ctx.fillStyle = '#ffe14a'; circle(80 + Math.cos(a) * 44, 140 + Math.sin(a) * 44, 3);
    dBubble('Around Earth 7½ times in 1 second!', 160, 220, 13);
    dBubble('Sun → Earth: about 8 minutes', 360, 30, 13);
  },
  'l-year': t => {
    dSpace(t);
    ctx.fillStyle = '#ffd84a'; circle(50, 140, 16); dLabel('Sun', 50, 170, 12, '#ffd84a');
    ctx.fillStyle = '#ff9a6a'; circle(430, 140, 8); dLabel('Proxima Centauri', 420, 166, 12, '#fff');
    const k = mod(t * 0.2, 1.1), x = 66 + Math.min(1, k) * 356;
    ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(66, 140); ctx.lineTo(x, 140); ctx.stroke(); ctx.fillStyle = '#fff6a0'; circle(x, 140, 4);
    dBubble(`Light traveling: ${(Math.min(1, k) * 4.2).toFixed(1)} years`, 240, 100, 15, '#fff3b0');
    dBubble('1 light-year ≈ 9.5 trillion km', 240, 226, 14);
  },
  'l-limit': (t, v) => {
    dSpace(t);
    const beta = Math.min(0.999, v * 0.999), g = 1 / Math.sqrt(1 - beta * beta);
    for (let i = 0; i < 26; i++) { const y = rnd(i, 3) * DH, x = mod(rnd(i, 4) * DW - t * (40 + beta * 900), DW); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2 + beta * 40, y); ctx.stroke(); }
    const clock = (cx, cy, rate, label) => {
      ctx.fillStyle = '#fff'; circle(cx, cy, 30); ctx.strokeStyle = '#0b2a5c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 30, 0, TAU); ctx.stroke();
      const a = t * rate * 2 - Math.PI / 2; ctx.strokeStyle = '#e8453a'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 24, cy + Math.sin(a) * 24); ctx.stroke();
      dLabel(label, cx, cy + 44, 13, '#fff');
    };
    clock(90, 120, 1, 'Earth clock'); clock(390, 120, 1 / g, 'Ship clock');
    meterDia(160, 210, 160, Math.log10(g) / Math.log10(22.4), '⚡ Energy needed');
    dBubble(`${(beta * 100).toFixed(1)}% of light speed`, 240, 30, 16, '#fff3b0');
    dLabel(v > 0.98 ? 'Never 100%!' : `Ship clock ticks ${g < 1.05 ? 'almost the same' : (1 / g).toFixed(2) + '× as fast'}`, 240, 70, 14, '#9fe8ff');
  },
  'l-twins': t => {
    dSpace(t);
    const k = mod(t, 7) / 6, u = Math.min(1, k);
    drawEarth(70, 150, 28, t);
    const rx = 120 + Math.sin(u * Math.PI) * 300;
    ctx.save(); ctx.translate(rx, 100); ctx.rotate(u < 0.5 ? Math.PI / 2 : -Math.PI / 2); drawRocket(0, 14, 0.8, 1, 1, t); ctx.restore();
    const face = (x, y, age, gray) => { ctx.fillStyle = '#f2c79a'; circle(x, y, 18); ctx.fillStyle = gray ? '#bbb' : '#5a3b1e'; ctx.beginPath(); ctx.arc(x, y - 4, 18, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#333'; circle(x - 6, y, 2); circle(x + 6, y, 2); dLabel(`${age} yrs`, x, y + 32, 14, '#fff'); };
    face(70, 210 - 120, Math.round(10 + u * 20), u > 0.8);
    face(rx, 160, Math.round(10 + u * 3), false);
    dBubble('Trip at 99% of light speed', 280, 30, 14, '#fff3b0');
    if (u >= 1) dBubble('Earth twin aged 20 years. Space twin: only 3!', 280, 240, 13, '#c9f5d3');
  },
  'l-past': t => {
    dSpace(t);
    for (let i = 0; i < 6; i++) { ctx.strokeStyle = `rgba(160,120,255,${0.6 - i * 0.08})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(240, 140, 20 + i * 12, t * (2 + i * 0.3), t * (2 + i * 0.3) + 4.5); ctx.stroke(); }
    const steps = ['⏪ Go back in time', '🚫 Stop grandparents meeting', '👶 You\'re never born…', '❓ So who went back?'];
    steps.forEach((s, i) => {
      const a = -Math.PI / 2 + i * Math.PI / 2, x = 240 + Math.cos(a) * 125, y = 140 + Math.sin(a) * 95;
      dBubble(s, x, y, 13, Math.floor(t / 1.5) % 4 === i ? '#fff3b0' : '#fff');
    });
  },
  'a-planets': t => {
    dSpace(t);
    ctx.fillStyle = '#ffd88a'; circle(240, 90, 50);
    const px = 240 + ((mod(t * 0.35, 1) * 2 - 1) * 120);
    if (Math.abs(px - 240) < 120) { ctx.fillStyle = '#111'; circle(px, 95, 9); }
    ctx.strokeStyle = '#9fe8ff'; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = 60; x <= 420; x += 3) {
      const tt = (x - 60) / 360, ppx = 240 + ((tt * 2 - 1) * 120), dip = Math.abs(ppx - 240) < 50 ? 14 : 0;
      x === 60 ? ctx.moveTo(x, 190 + dip) : ctx.lineTo(x, 190 + dip);
    }
    ctx.stroke();
    ctx.fillStyle = '#fff'; circle(60 + mod(t * 0.35, 1) * 360, 190 + (Math.abs(px - 240) < 50 ? 14 : 0), 4);
    dLabel('Star brightness: a planet makes it dip!', 240, 226, 13, '#fff');
    dBubble('5,000+ exoplanets found', 240, 254, 14, '#fff3b0');
  },
  'a-fermi': t => {
    dSpace(t);
    ctx.save(); ctx.translate(180, 140); ctx.rotate(t * 0.05);
    for (let i = 0; i < 500; i++) {
      const arm = i % 2, r = rnd(i, 1) * 100, a = r * 0.05 + arm * Math.PI + (rnd(i, 2) - 0.5) * 0.7;
      ctx.fillStyle = `rgba(${200 + rnd(i, 3) * 55},${200 + rnd(i, 4) * 55},255,${0.4 + rnd(i, 5) * 0.6})`;
      ctx.fillRect(Math.cos(a) * r, Math.sin(a) * r * 0.6, 1.5, 1.5);
    }
    ctx.restore();
    ctx.fillStyle = '#ffe14a'; circle(220, 160, 2.5);
    ctx.strokeStyle = 'rgba(255,225,74,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(222, 158); ctx.lineTo(330, 70); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.95)'; circle(380, 80, 52);
    ctx.fillStyle = '#2f7de0'; circle(380, 80, 4);
    ctx.strokeStyle = '#3d6fe0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(380, 80, 10 + mod(t * 8, 30), 0, TAU); ctx.stroke();
    dLabel('Our radio bubble', 380, 146, 13, '#fff');
    dBubble('Galaxy: 100,000 light-years across', 180, 252, 13, '#fff3b0');
    dBubble('"Where is everybody?"', 120, 26, 14);
  },
  'a-evidence': t => {
    ctx.fillStyle = '#222'; ctx.fillRect(0, 0, DW, DH);
    const ph = Math.floor(t / 2.5) % 4, k = mod(t, 2.5) / 2.5, sharp = clamp((k - 0.3) / 0.4, 0, 1);
    ctx.fillStyle = '#5a7fb0'; ctx.fillRect(30, 30, 260, 200);
    ctx.save(); ctx.beginPath(); ctx.rect(30, 30, 260, 200); ctx.clip();
    const thing = (ox, oy) => {
      if (ph === 0) drawBalloon(160 + ox, 110 + oy, 28, 0, '#e8453a', '#ffd84a');
      if (ph === 1) { ctx.fillStyle = '#ffe9a0'; circle(130 + ox, 130 + oy, 6); circle(190 + ox, 130 + oy, 6); ctx.fillStyle = '#ff5a4a'; circle(160 + ox, 124 + oy, 4); }
      if (ph === 2) bird(160 + ox, 130 + oy, 3, t);
      if (ph === 3) { ctx.fillStyle = 'rgba(255,240,200,.9)'; circle(160 + ox, 130 + oy, 20); ctx.fillStyle = 'rgba(255,200,120,.5)'; circle(200 + ox, 150 + oy, 10); circle(225 + ox, 165 + oy, 6); }
    };
    const blur = (1 - sharp) * 12;
    if (blur > 0.5) { ctx.globalAlpha = 0.16; for (let j = 0; j < 10; j++) thing(Math.cos(j * 2.4) * blur * (j % 3 + 1) / 3, Math.sin(j * 2.4) * blur * (j % 3 + 1) / 3); }
    ctx.globalAlpha = sharp; thing(0, 0); ctx.globalAlpha = 1;
    ctx.restore();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.strokeRect(30, 30, 260, 200);
    dLabel(sharp < 0.5 ? 'UFO?! 🛸' : ['Weather balloon!', 'Airplane lights!', 'A bird!', 'Lens glare!'][ph], 160, 250, 16, '#fff');
    dBubble('🔍 Check the simple', 390, 100, 14, '#fff3b0'); dBubble('answer first!', 390, 132, 14, '#fff3b0');
  },
  'a-search': t => {
    dSpace(t);
    ctx.fillStyle = '#ddd'; ctx.save(); ctx.translate(90, 200); ctx.rotate(-0.5 + Math.sin(t * 0.4) * 0.3);
    ctx.beginPath(); ctx.ellipse(0, 0, 50, 18, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(-2, -40, 4, 40);
    ctx.restore(); ctx.fillStyle = '#aaa'; ctx.fillRect(84, 200, 12, 40);
    for (let i = 0; i < 3; i++) { ctx.strokeStyle = `rgba(159,232,255,${1 - mod(t + i / 3, 1)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(110, 150, 10 + mod(t + i / 3, 1) * 50, -1.6, -0.6); ctx.stroke(); }
    dLabel('Listening 📡', 90, 256, 13, '#fff');
    ctx.fillStyle = '#e8e4d8'; circle(240, 120, 44); ctx.fillStyle = '#c9a07a'; for (let i = 0; i < 6; i++) { ctx.fillRect(210 + i * 9, 100 + (i % 3) * 14, 18, 2); }
    ctx.fillStyle = 'rgba(40,110,200,.6)'; ctx.beginPath(); ctx.arc(240, 120, 36, 0.3, Math.PI - 0.3); ctx.fill();
    dLabel('Europa: ocean under ice', 240, 186, 13, '#fff');
    ctx.fillStyle = '#2f7fc4'; ctx.fillRect(330, 90, 130, 80);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(385, 120 + Math.sin(t * 2) * 4, 16, 26);
    dLabel('One glass from the ocean', 395, 186, 12, '#fff'); dLabel('isn\'t the whole sea!', 395, 204, 12, '#fff');
  },
};
