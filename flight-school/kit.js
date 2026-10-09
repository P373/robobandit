// Flight School shared kit: canvas, drawing helpers and the flying machines.
// Loaded first; everything here is a global used by the other flight-school/*.js files.
'use strict';

// ---------- Canvas ----------
const H = 540, MIN_W = 420, TAU = Math.PI * 2;
const canvas = document.getElementById('game');
const gameCtx = canvas.getContext('2d');
let ctx = gameCtx;   // drawing helpers draw on ctx, which the lesson diagrams briefly swap out
let W = 800, VH = H, OFFY = 0, scale = 1;
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  scale = Math.min(canvas.height / H, canvas.width / MIN_W);
  W = canvas.width / scale;
  VH = canvas.height / scale;
  OFFY = (VH - H) / 2;
}
addEventListener('resize', resize);
resize();

// ---------- Small helpers ----------
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const rnd = (i, k = 0) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
const mod = (a, n) => ((a % n) + n) % n;
const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (c1, c2, t) => { const a = hexRGB(c1), b = hexRGB(c2); return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`; };
function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); ctx.fill(); }
function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
function txt(s, x, y, size, color, align = 'center', weight = 700, font = 'Fredoka') {
  ctx.font = `${weight} ${size}px '${font}', system-ui, sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}
function outlined(s, x, y, size, color, align = 'center', font = 'Fredoka') {
  ctx.font = `700 ${size}px '${font}', system-ui, sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size / 6); ctx.strokeStyle = '#0b2a5c';
  ctx.strokeText(s, x, y); ctx.fillStyle = color; ctx.fillText(s, x, y);
}
function arrow(x1, y1, x2, y2, color, w = 6) {
  const a = Math.atan2(y2 - y1, x2 - x1), hl = w * 2.6;
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * hl * 0.6, y2 - Math.sin(a) * hl * 0.6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - Math.cos(a - 0.45) * hl, y2 - Math.sin(a - 0.45) * hl);
  ctx.lineTo(x2 - Math.cos(a + 0.45) * hl, y2 - Math.sin(a + 0.45) * hl); ctx.fill();
}
function star(x, y, r, fill = '#ffd84a', rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = 'rgba(160,100,0,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
}
function heart(x, y, s, full) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.3, y, x - s * 0.7, y - s * 0.9, x, y - s * 0.3);
  ctx.bezierCurveTo(x + s * 0.7, y - s * 0.9, x + s * 1.3, y, x, y + s * 0.9);
  ctx.fillStyle = full ? '#ff4d6d' : 'rgba(255,255,255,.35)'; ctx.fill();
}
function cloud(x, y, s, color = 'rgba(255,255,255,.9)') {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, 60 * s, 18 * s, 0, 0, TAU);
  ctx.ellipse(x + 26 * s, y - 14 * s, 34 * s, 22 * s, 0, 0, TAU);
  ctx.ellipse(x - 24 * s, y - 8 * s, 26 * s, 16 * s, 0, 0, TAU);
  ctx.fill();
}
function bird(x, y, s, t, color = '#2b2b3a') {
  const f = Math.sin(t * 10) * 7 * s;
  ctx.strokeStyle = color; ctx.lineWidth = 3 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 13 * s, y - f); ctx.quadraticCurveTo(x - 6 * s, y - 6 * s, x, y);
  ctx.quadraticCurveTo(x + 6 * s, y - 6 * s, x + 13 * s, y - f); ctx.stroke();
}
function sky(top, bottom) {
  const g = ctx.createLinearGradient(0, -OFFY, 0, H + OFFY);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(-2, -OFFY - 2, W + 4, VH + 4);
}

// ---------- Flying machines (all face right; ang > 0 is nose up) ----------
function balloonShape(x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x - r * 0.32, y + r * 1.15);
  ctx.bezierCurveTo(x - r * 1.3, y + r * 0.35, x - r * 1.1, y - r * 1.08, x, y - r * 1.08);
  ctx.bezierCurveTo(x + r * 1.1, y - r * 1.08, x + r * 1.3, y + r * 0.35, x + r * 0.32, y + r * 1.15);
  ctx.closePath();
}
function drawBalloon(x, y, r, flame = 0, c1 = '#ff6b3d', c2 = '#ffd84a', t = 0) {
  ctx.strokeStyle = '#5a3b1e'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.3, y + r * 1.13); ctx.lineTo(x - r * 0.3, y + r * 1.5);
  ctx.moveTo(x + r * 0.3, y + r * 1.13); ctx.lineTo(x + r * 0.3, y + r * 1.5); ctx.stroke();
  if (flame > 0) {
    const fh = r * (0.35 + 0.15 * Math.sin(t * 40)) * flame;
    ctx.fillStyle = 'rgba(255,190,40,.9)';
    ctx.beginPath(); ctx.moveTo(x - r * 0.12, y + r * 1.48); ctx.quadraticCurveTo(x, y + r * 1.48 - fh * 2, x + r * 0.12, y + r * 1.48); ctx.fill();
    ctx.fillStyle = 'rgba(80,160,255,.9)';
    ctx.beginPath(); ctx.moveTo(x - r * 0.06, y + r * 1.48); ctx.quadraticCurveTo(x, y + r * 1.48 - fh, x + r * 0.06, y + r * 1.48); ctx.fill();
  }
  ctx.fillStyle = '#a8692e'; rrect(x - r * 0.36, y + r * 1.5, r * 0.72, r * 0.45, 3); ctx.fill();
  ctx.fillStyle = '#7a4a1e'; ctx.fillRect(x - r * 0.38, y + r * 1.5, r * 0.76, r * 0.09);
  balloonShape(x, y, r); ctx.fillStyle = c1; ctx.fill();
  ctx.save(); balloonShape(x, y, r); ctx.clip();
  ctx.fillStyle = c2;
  for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(x + k * r * 0.62, y, r * 0.14, r * 1.3, 0, 0, TAU); ctx.fill(); }
  ctx.fillRect(x - r * 1.5, y + r * 0.25, r * 3, r * 0.16);
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(x - r * 0.42, y - r * 0.45, r * 0.22, r * 0.42, 0.4, 0, TAU); ctx.fill();
  ctx.restore();
  balloonShape(x, y, r); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2; ctx.stroke();
}
function drawGlider(x, y, s, ang) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-ang); ctx.scale(s, s);
  ctx.fillStyle = '#f4f6fb';
  ctx.beginPath(); ctx.moveTo(30, 0); ctx.quadraticCurveTo(24, -7, 6, -6); ctx.lineTo(-30, -2); ctx.lineTo(-30, 2); ctx.lineTo(6, 5); ctx.quadraticCurveTo(24, 6, 30, 0); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-24, -2); ctx.lineTo(-34, -16); ctx.lineTo(-28, -16); ctx.lineTo(-18, -2); ctx.fill();   // tail fin
  ctx.fillStyle = '#e8453a'; ctx.fillRect(-33, -16, 6, 4); ctx.fillRect(-6, -1, 20, 2);
  ctx.fillStyle = '#7fc8ff'; ctx.beginPath(); ctx.ellipse(16, -5, 8, 4, -0.1, 0, TAU); ctx.fill();
  ctx.fillStyle = '#c9d3e6'; ctx.beginPath(); ctx.ellipse(2, -3, 26, 3, 0, 0, TAU); ctx.fill();   // long wing, edge on
  ctx.restore();
}
function drawFlyer(x, y, s, ang, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-ang); ctx.scale(s, s);
  ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (const sx of [-16, -2, 12]) { ctx.moveTo(sx, -12); ctx.lineTo(sx, 7); }
  ctx.moveTo(14, -10); ctx.lineTo(40, -4); ctx.moveTo(14, 6); ctx.lineTo(40, -1);   // booms to the front elevator
  ctx.moveTo(-18, -10); ctx.lineTo(-40, -4); ctx.moveTo(-18, 6); ctx.lineTo(-40, 0); // booms to the rudder
  ctx.stroke();
  ctx.fillStyle = '#efe2c0';
  ctx.fillRect(-20, -14, 38, 3); ctx.fillRect(-20, 6, 38, 3);   // two wings
  ctx.fillRect(34, -7, 14, 2); ctx.fillRect(34, -2, 14, 2);     // elevator out front
  ctx.fillRect(-44, -12, 3, 16); ctx.fillRect(-39, -12, 3, 16); // rudder behind
  ctx.fillStyle = 'rgba(90,90,90,.75)';
  const blade = Math.abs(Math.cos(t * 30)) * 10 + 2;
  ctx.beginPath(); ctx.ellipse(-25, -6, 2.5, blade, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#5a4630'; ctx.fillRect(-6, 1, 14, 4);   // pilot lying on the lower wing
  ctx.fillStyle = '#e8b98a'; circle(10, 2, 3.2);
  ctx.fillStyle = '#333'; ctx.fillRect(-4, -6, 6, 6);     // engine
  ctx.restore();
}
function drawProp(x, y, s, ang, t, color = '#c9d1dc') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-ang); ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(30, -4); ctx.quadraticCurveTo(32, 4, 26, 7); ctx.lineTo(-30, 2); ctx.lineTo(-32, -4); ctx.quadraticCurveTo(0, -10, 30, -4); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-22, -4); ctx.lineTo(-34, -18); ctx.lineTo(-27, -18); ctx.lineTo(-14, -4); ctx.fill();   // fin
  ctx.fillStyle = '#9aa6b8'; ctx.fillRect(-12, -11, 30, 4);   // high wing
  ctx.fillStyle = '#2b4a7a'; ctx.fillRect(-26, -2, 22, 2); ctx.fillRect(4, -2, 22, 2);
  ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(8, 5); ctx.lineTo(4, 13); ctx.moveTo(8, 5); ctx.lineTo(14, 13); ctx.stroke();
  ctx.fillStyle = '#222'; circle(4, 13, 3); circle(14, 13, 3);
  ctx.fillStyle = '#7a8597'; circle(31, 1, 3.5);
  ctx.fillStyle = 'rgba(60,60,60,.55)';
  ctx.beginPath(); ctx.ellipse(33, 1, 2, Math.abs(Math.cos(t * 35)) * 12 + 3, 0, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawJet(x, y, s, ang, flame = 0, t = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-ang); ctx.scale(s, s);
  if (flame > 0) {
    const fl = (14 + Math.sin(t * 50) * 4) * flame;
    ctx.fillStyle = 'rgba(255,150,40,.85)';
    ctx.beginPath(); ctx.moveTo(-30, -4); ctx.lineTo(-30 - fl, 0); ctx.lineTo(-30, 4); ctx.fill();
    ctx.fillStyle = 'rgba(120,190,255,.9)';
    ctx.beginPath(); ctx.moveTo(-30, -2); ctx.lineTo(-30 - fl * 0.5, 0); ctx.lineTo(-30, 2); ctx.fill();
  }
  ctx.fillStyle = '#8fa3bf';
  ctx.beginPath(); ctx.moveTo(42, 0); ctx.quadraticCurveTo(30, -7, 8, -7); ctx.lineTo(-30, -5); ctx.lineTo(-30, 5); ctx.lineTo(8, 6); ctx.quadraticCurveTo(30, 6, 42, 0); ctx.fill();
  ctx.fillStyle = '#6f84a3';
  ctx.beginPath(); ctx.moveTo(-14, -5); ctx.lineTo(-30, -24); ctx.lineTo(-22, -24); ctx.lineTo(-2, -5); ctx.fill();   // swept fin
  ctx.beginPath(); ctx.moveTo(10, 2); ctx.lineTo(-12, 14); ctx.lineTo(-20, 14); ctx.lineTo(-6, 2); ctx.fill();         // swept wing
  ctx.fillStyle = '#e8453a'; ctx.fillRect(-10, -1, 34, 2);
  ctx.fillStyle = '#2c3e5c'; ctx.beginPath(); ctx.ellipse(20, -6, 9, 4, -0.08, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(22, -7, 4, 1.6, -0.08, 0, TAU); ctx.fill();
  ctx.restore();
}
// A three-stage rocket standing up; x,y is the bottom of the lowest stage still attached.
function drawRocket(x, y, s, stagesLeft, flame = 0, t = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (flame > 0) {
    const fl = (26 + Math.sin(t * 45) * 6) * flame;
    ctx.fillStyle = 'rgba(255,140,30,.9)';
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.quadraticCurveTo(0, fl * 1.6, 8, 0); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,150,.95)';
    ctx.beginPath(); ctx.moveTo(-4, 0); ctx.quadraticCurveTo(0, fl * 0.8, 4, 0); ctx.fill();
  }
  let yy = 0;
  const stageCol = ['#f4f6fb', '#e8ecf4', '#f4f6fb'];
  for (let k = 3 - stagesLeft; k < 3; k++) {   // k = 0 is the first (bottom) stage
    const w = 12 - k * 1.5, h = 26 - k * 3;
    if (k === 3 - stagesLeft) {   // fins on the lowest stage still attached
      ctx.fillStyle = '#e8453a';
      ctx.beginPath(); ctx.moveTo(-w, yy); ctx.lineTo(-w - 7, yy + 2); ctx.lineTo(-w, yy - 12); ctx.fill();
      ctx.beginPath(); ctx.moveTo(w, yy); ctx.lineTo(w + 7, yy + 2); ctx.lineTo(w, yy - 12); ctx.fill();
    }
    ctx.fillStyle = stageCol[k]; ctx.fillRect(-w, yy - h, w * 2, h);
    ctx.fillStyle = '#20253a'; ctx.fillRect(-w, yy - h, w * 2, 2.5);
    if (k === 0) { ctx.fillStyle = '#20253a'; ctx.fillRect(-w, yy - h * 0.6, w * 0.6, h * 0.25); ctx.fillRect(w * 0.4, yy - h * 0.6, w * 0.6, h * 0.25); }
    yy -= h;
  }
  ctx.fillStyle = '#3d8ff0';   // capsule and nose
  ctx.beginPath(); ctx.moveTo(-7, yy); ctx.lineTo(0, yy - 22); ctx.lineTo(7, yy); ctx.fill();
  ctx.fillStyle = '#ffd84a'; circle(0, yy - 7, 2.2);
  ctx.restore();
}
function drawLander(x, y, s, flame = 0, side = 0, t = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (flame > 0) {
    const fl = (16 + Math.sin(t * 50) * 4) * flame;
    ctx.fillStyle = 'rgba(255,170,60,.9)';
    ctx.beginPath(); ctx.moveTo(-5, 10); ctx.quadraticCurveTo(0, 10 + fl * 1.7, 5, 10); ctx.fill();
  }
  if (side) {
    ctx.fillStyle = 'rgba(220,240,255,.9)';
    const sx = side > 0 ? -15 : 15;
    ctx.beginPath(); ctx.moveTo(sx, -6); ctx.lineTo(sx - Math.sign(side) * 10, -8); ctx.lineTo(sx - Math.sign(side) * 10, -4); ctx.fill();
  }
  ctx.strokeStyle = '#b8bfc9'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-9, 4); ctx.lineTo(-17, 18); ctx.moveTo(9, 4); ctx.lineTo(17, 18);
  ctx.moveTo(-21, 18); ctx.lineTo(-13, 18); ctx.moveTo(13, 18); ctx.lineTo(21, 18); ctx.stroke();
  ctx.fillStyle = '#d9a72b'; ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(-9, 8); ctx.lineTo(9, 8); ctx.lineTo(13, 0); ctx.lineTo(9, -6); ctx.lineTo(-9, -6); ctx.fill();
  ctx.fillStyle = '#555'; ctx.beginPath(); ctx.moveTo(-4, 8); ctx.lineTo(-6, 12); ctx.lineTo(6, 12); ctx.lineTo(4, 8); ctx.fill();
  ctx.fillStyle = '#e4e7ec'; ctx.beginPath(); ctx.moveTo(-11, -6); ctx.lineTo(-8, -18); ctx.lineTo(8, -18); ctx.lineTo(11, -6); ctx.fill();
  ctx.fillStyle = '#20253a'; ctx.beginPath(); ctx.moveTo(-5, -10); ctx.lineTo(-3, -15); ctx.lineTo(3, -15); ctx.lineTo(5, -10); ctx.fill();
  ctx.restore();
}
function drawEarth(x, y, r, t = 0) {
  ctx.fillStyle = '#2f7de0'; circle(x, y, r);
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
  ctx.fillStyle = '#4fbf6a';
  for (let i = 0; i < 7; i++) {
    const a = rnd(i, 1) * TAU + t * 0.15, px = x + Math.cos(a) * r * 0.55, py = y + (rnd(i, 2) - 0.5) * r * 1.4;
    if (Math.cos(a) > -0.3) { ctx.beginPath(); ctx.ellipse(px, py, r * (0.18 + rnd(i, 3) * 0.2) * (0.5 + 0.5 * Math.cos(a)), r * 0.16, 0, 0, TAU); ctx.fill(); }
  }
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(x + (rnd(i, 5) - 0.5) * r * 1.6, y + (rnd(i, 6) - 0.5) * r * 1.6, r * 0.22, r * 0.05, 0.2, 0, TAU); ctx.fill(); }
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.2, x, y, r * 1.05);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,40,.55)');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
  ctx.strokeStyle = 'rgba(140,200,255,.6)'; ctx.lineWidth = Math.max(2, r * 0.04); ctx.beginPath(); ctx.arc(x, y, r + ctx.lineWidth / 2, 0, TAU); ctx.stroke();
}
function spaceStars(n, seed, w, h, t = 0) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i))})`;
    ctx.fillRect(rnd(i, seed) * w, rnd(i, seed + 1) * h, 1.6, 1.6);
  }
}

function drawZeppelin(x, y, s, t, glow = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#8a929e';   // tail fins
  ctx.beginPath(); ctx.moveTo(-58, -4); ctx.lineTo(-80, -22); ctx.lineTo(-74, -2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-58, 4); ctx.lineTo(-80, 22); ctx.lineTo(-74, 2); ctx.fill();
  const g = ctx.createLinearGradient(0, -20, 0, 20);
  g.addColorStop(0, '#e9edf2'); g.addColorStop(0.5, '#c4cad4'); g.addColorStop(1, '#8f97a4');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 72, 19, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(80,90,110,.35)'; ctx.lineWidth = 1;
  for (let k = -50; k <= 50; k += 14) { const h = 19 * Math.sqrt(1 - (k / 72) ** 2); ctx.beginPath(); ctx.moveTo(k, -h); ctx.lineTo(k, h); ctx.stroke(); }
  if (glow > 0) { ctx.fillStyle = `rgba(255,120,40,${glow})`; ctx.beginPath(); ctx.ellipse(0, 0, 72, 19, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#5a6272'; rrect(14, 16, 22, 8, 3); ctx.fill();   // gondola
  ctx.fillStyle = '#ffe9a0'; for (let k = 0; k < 4; k++) ctx.fillRect(17 + k * 5, 18, 3, 3);
  for (const px of [-20, -40]) {   // engine cars with spinning props
    ctx.fillStyle = '#5a6272'; ctx.fillRect(px, 17, 10, 5);
    ctx.fillStyle = 'rgba(60,60,60,.55)'; ctx.beginPath(); ctx.ellipse(px - 2, 19.5, 1.5, Math.abs(Math.cos(t * 30 + px)) * 6 + 1, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
// Side-view helicopter; tilt > 0 leans the rotor forward (to the right).
function drawHeli(x, y, s, tilt, t, color = '#e8453a') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(s, s);
  ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-12, 13); ctx.lineTo(14, 13); ctx.moveTo(-6, 8); ctx.lineTo(-8, 13); ctx.moveTo(8, 8); ctx.lineTo(10, 13); ctx.stroke();   // skids
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(-40, -2); ctx.lineTo(-40, 2); ctx.lineTo(-8, 4); ctx.fill();   // tail boom
  ctx.beginPath(); ctx.moveTo(-38, -2); ctx.lineTo(-44, -12); ctx.lineTo(-40, -12); ctx.lineTo(-34, -2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(2, 0, 16, 10, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#9fd8ff'; ctx.beginPath(); ctx.ellipse(8, -2, 9, 7, 0, -Math.PI / 2, Math.PI / 2); ctx.fill();
  ctx.fillStyle = 'rgba(60,60,60,.6)'; ctx.beginPath(); ctx.ellipse(-42, -6, Math.abs(Math.cos(t * 40)) * 7 + 1, 7, 0, 0, TAU); ctx.fill();   // tail rotor
  ctx.fillStyle = '#333'; ctx.fillRect(0, -14, 3, 5);
  const span = 34 * Math.abs(Math.cos(t * 28)) + 6;
  ctx.fillStyle = 'rgba(40,40,40,.65)'; ctx.fillRect(1.5 - span, -15, span * 2, 2.5);
  ctx.fillStyle = 'rgba(40,40,40,.15)'; ctx.fillRect(-38, -15.5, 79, 3.5);
  ctx.restore();
}
function drawConcorde(x, y, s, ang, burn = 0, t = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-ang); ctx.scale(s, s);
  if (burn > 0) {
    const fl = (16 + Math.sin(t * 50) * 4) * burn;
    ctx.fillStyle = 'rgba(255,150,40,.85)';
    for (const ey of [4, 7]) { ctx.beginPath(); ctx.moveTo(-20, ey - 1.5); ctx.lineTo(-20 - fl, ey); ctx.lineTo(-20, ey + 1.5); ctx.fill(); }
  }
  ctx.fillStyle = '#f4f6fb';
  ctx.beginPath(); ctx.moveTo(56, 1); ctx.lineTo(44, -2); ctx.lineTo(10, -4); ctx.lineTo(-40, -3); ctx.lineTo(-44, 1); ctx.lineTo(-38, 3); ctx.lineTo(44, 3); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-30, -3); ctx.lineTo(-44, -20); ctx.lineTo(-38, -20); ctx.lineTo(-20, -3); ctx.fill();   // fin
  ctx.fillStyle = '#d9dee8'; ctx.beginPath(); ctx.moveTo(14, 3); ctx.lineTo(-34, 6); ctx.lineTo(-38, 3); ctx.fill();   // delta wing edge-on
  ctx.fillStyle = '#b8bfcc'; ctx.fillRect(-22, 3, 16, 5);   // engines
  ctx.fillStyle = '#2c3e5c'; for (let i = 0; i < 12; i++) ctx.fillRect(-28 + i * 5, -2, 2, 1.6);
  ctx.fillStyle = '#3d6fe0'; ctx.fillRect(-40, -1, 90, 1);
  ctx.restore();
}
// Top-down machines
function drawPlaneTop(x, y, s, heading, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(heading); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(6, 10, 26, 8, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#c9d1dc';
  ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(16, -3); ctx.lineTo(-22, -2); ctx.lineTo(-22, 2); ctx.lineTo(16, 3); ctx.fill();
  ctx.fillStyle = '#b3bcc9'; ctx.beginPath(); ctx.moveTo(8, -28); ctx.lineTo(14, -28); ctx.lineTo(14, 28); ctx.lineTo(8, 28); ctx.fill();   // long wing
  ctx.beginPath(); ctx.moveTo(-16, -9); ctx.lineTo(-12, -9); ctx.lineTo(-12, 9); ctx.lineTo(-16, 9); ctx.fill();
  ctx.fillStyle = 'rgba(60,60,60,.5)'; ctx.fillRect(24, -Math.abs(Math.cos(t * 30)) * 9 - 1, 2, Math.abs(Math.cos(t * 30)) * 18 + 2);
  ctx.restore();
}
function drawDroneTop(x, y, s, t, tx = 0, ty = 0, pkg = false, color = '#e8453a') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(8, 12, 20, 14, 0, 0, TAU); ctx.fill();
  ctx.transform(1, 0, 0, 1 - Math.abs(ty) * 0.15, 0, 0);
  ctx.strokeStyle = '#333'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-14, -14); ctx.lineTo(14, 14); ctx.moveTo(14, -14); ctx.lineTo(-14, 14); ctx.stroke();
  for (const [ax, ay] of [[-14, -14], [14, -14], [-14, 14], [14, 14]]) {
    ctx.fillStyle = 'rgba(200,220,240,.45)'; circle(ax, ay, 10);
    ctx.strokeStyle = 'rgba(40,40,40,.7)'; ctx.lineWidth = 2;
    const a = t * 40 * (ax * ay > 0 ? 1 : -1);
    ctx.beginPath(); ctx.moveTo(ax + Math.cos(a) * 9, ay + Math.sin(a) * 9); ctx.lineTo(ax - Math.cos(a) * 9, ay - Math.sin(a) * 9); ctx.stroke();
  }
  ctx.fillStyle = color; rrect(-7, -7, 14, 14, 4); ctx.fill();
  ctx.fillStyle = '#9fffa8'; circle(0, -4, 2);
  if (pkg) { ctx.fillStyle = '#c99a5a'; ctx.fillRect(-6, -2, 12, 10); ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 1.5; ctx.strokeRect(-6, -2, 12, 10); }
  ctx.restore();
}
function drawIngenuity(x, y, s, t, rpm = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-5, 4); ctx.lineTo(-14, 16); ctx.moveTo(5, 4); ctx.lineTo(14, 16); ctx.moveTo(-2, 4); ctx.lineTo(-5, 16); ctx.moveTo(2, 4); ctx.lineTo(5, 16); ctx.stroke();
  ctx.fillStyle = '#d9d0c0'; rrect(-7, -3, 14, 9, 2); ctx.fill();
  ctx.fillStyle = '#444'; ctx.fillRect(-1, -24, 2, 22);
  ctx.fillStyle = '#2a3a6a'; ctx.fillRect(-9, -27, 18, 3);   // solar panel
  for (const ry of [-12, -18]) {
    const span = rpm > 0.05 ? 24 * Math.abs(Math.cos(t * 40 * rpm + ry)) + 4 : 24;
    ctx.fillStyle = rpm > 0.3 ? 'rgba(40,40,40,.55)' : '#555';
    ctx.fillRect(-span, ry, span * 2, 2);
    if (rpm > 0.3) { ctx.fillStyle = 'rgba(40,40,40,.15)'; ctx.fillRect(-26, ry - 0.5, 52, 3); }
  }
  ctx.restore();
}
function drawRover(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#333'; for (const wx of [-14, 0, 14]) circle(wx, 0, 5);
  ctx.fillStyle = '#e9e4d8'; ctx.fillRect(-18, -12, 36, 8);
  ctx.fillStyle = '#c9c2b2'; ctx.fillRect(-18, -6, 36, 3);
  ctx.fillStyle = '#e9e4d8'; ctx.fillRect(10, -30, 3, 18); ctx.fillRect(7, -34, 10, 5);
  ctx.fillStyle = '#333'; ctx.fillRect(13, -33, 3, 3);
  ctx.restore();
}
function drawCapsule(x, y, s, heat = 0, ang = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  if (heat > 0) {
    const g = ctx.createRadialGradient(0, 14, 2, 0, 14, 40);
    g.addColorStop(0, `rgba(255,230,140,${heat})`); g.addColorStop(0.5, `rgba(255,120,40,${heat * 0.7})`); g.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 18, 40, 26, 0, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = '#e9e9ee'; ctx.beginPath(); ctx.moveTo(-8, -14); ctx.lineTo(8, -14); ctx.lineTo(18, 8); ctx.lineTo(-18, 8); ctx.fill();
  ctx.fillStyle = '#8a5a3a'; ctx.beginPath(); ctx.ellipse(0, 9, 19, 5, 0, 0, Math.PI); ctx.fill();
  ctx.restore();
}

// ---------- Settings that rounds look at ----------
// mode: 'toddler' (no quizzes, can't lose), 'easy' or 'challenge'.
const settings = { mode: 'easy', autoRead: false, music: true, reduced: false };
const REDUCED_OS = matchMedia('(prefers-reduced-motion: reduce)').matches;
const reduced = () => settings.reduced || REDUCED_OS;
const DIFFS = {
  toddler: { lives: 3, safe: true, hazard: 0.35, assist: 1, quiz: false },
  easy: { lives: 4, safe: false, hazard: 0.75, assist: 0.55, quiz: true },
  challenge: { lives: 3, safe: false, hazard: 1.1, assist: 0, quiz: true },
};
const diff = () => DIFFS[settings.mode] || DIFFS.easy;

// ---------- Input ----------
// Each level picks a control style: 'hold' (hold anywhere / Space), 'stick' (joystick / arrow keys)
// or 'stickbtn' (joystick plus a big action button).
const keys = {};
let ptrHeld = false, btnHeld = false;
let mouse = null;   // { x, y } in logical coords while a mouse button is down on the canvas
let round = null, mode = 'title', paused = false, cur = 0;
let inputStyle = 'hold';
const stick = createTouchStick(canvas, { enabled: () => mode === 'play' && !paused && inputStyle !== 'hold' });
const holding = () => !!(keys.Space || keys.ArrowUp || keys.KeyW || ptrHeld || btnHeld);
const actionHeld = () => !!(keys.Space || keys.Enter || btnHeld);
// Mouse steering: rounds set round.anchor = {x, y} (where the craft is on screen) and a held mouse steers toward it.
function mouseAxis(which) {
  if (!mouse || !round || !round.anchor) return 0;
  return clamp((which === 'x' ? mouse.x - round.anchor.x : mouse.y - round.anchor.y) / 80, -1, 1);
}
const axisX = () => ((keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0)) || (stick.active ? stick.x : 0) || mouseAxis('x');
const axisY = () => ((keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0)) || (stick.active ? stick.y : 0) || mouseAxis('y');
const toLogical = e => ({ x: e.clientX * (canvas.width / innerWidth) / scale, y: e.clientY * (canvas.height / innerHeight) / scale - OFFY });

// ---------- Effects shared by the rounds ----------
let pops = [], parts = [], banner = null, fact = null;
function pop(x, y, s, color = '#ffd84a', size = 26) { pops.push({ x, y, s, color, size, t: 0 }); }
function puff(x, y, n, colors, spd = 140, up = 0) {
  if (reduced()) n = Math.ceil(n / 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, s = rand(spd * 0.3, spd);
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - up, life: rand(0.5, 1.1), max: 1.1, c: colors[i % colors.length], r: rand(2, 5) });
  }
}
function stepFx(dt) {
  for (const p of pops) { p.t += dt; p.y -= 40 * dt; }
  pops = pops.filter(p => p.t < 1.2);
  for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; p.life -= dt; }
  parts = parts.filter(p => p.life > 0);
  if (fact) { fact.t += dt; if (fact.t > fact.time) fact = null; }
}
function drawFx() {
  for (const p of parts) { ctx.globalAlpha = clamp(p.life / p.max * 1.5, 0, 1); ctx.fillStyle = p.c; circle(p.x, p.y, p.r); }
  ctx.globalAlpha = 1;
  for (const p of pops) { ctx.globalAlpha = clamp(1.6 - p.t * 1.4, 0, 1); outlined(p.s, p.x, p.y, p.size, p.color); }
  ctx.globalAlpha = 1;
}
function showBanner(big, small = '', time = 2.2, color = '#ffd84a') { banner = { big, small, t: 0, time, color }; }
function drawBanner(dt) {
  if (!banner) return;
  banner.t += dt;
  if (banner.t > banner.time) { banner = null; return; }
  const a = reduced() ? 1 : clamp(Math.min(banner.t * 5, (banner.time - banner.t) * 3), 0, 1);
  ctx.globalAlpha = a;
  outlined(banner.big, W / 2, H * 0.3, Math.min(44, W / 11), banner.color, 'center', 'Bungee');
  if (banner.small) outlined(banner.small, W / 2, H * 0.3 + 42, Math.min(21, W / 21), '#fff');
  ctx.globalAlpha = 1;
}
// A "did you know?" bubble along the bottom that ties what just happened to the lesson.
// Each fact shows once per round (keyed by its text).
function showFact(s, time = 4.5) {
  if (!round) return;
  round.facts = round.facts || {};
  if (round.facts[s]) return;
  round.facts[s] = true;
  fact = { s, t: 0, time };
  if (typeof onFact === 'function') onFact(s);
}
function wrapLines(s, maxW, size) {
  ctx.font = `600 ${size}px 'Fredoka', system-ui, sans-serif`;
  const out = []; let line = '';
  for (const w of s.split(' ')) {
    if (line && ctx.measureText(line + ' ' + w).width > maxW) { out.push(line); line = w; } else line = line ? line + ' ' + w : w;
  }
  if (line) out.push(line);
  return out;
}
function drawFact() {
  if (!fact) return;
  const a = clamp(Math.min(fact.t * 4, (fact.time - fact.t) * 3), 0, 1);
  const w = Math.min(560, W - (actShown() ? 150 : 30)), size = W < 500 ? 15 : 17, lines = wrapLines('💡 ' + fact.s, w - 28, size);
  const h = lines.length * (size + 5) + 18, btn = actShown(), x = btn ? 12 : W / 2 - w / 2, y = H + OFFY - 60 - h;
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(255,253,244,.95)'; rrect(x, y, w, h, 14); ctx.fill();
  ctx.strokeStyle = '#0b2a5c'; ctx.lineWidth = 3; ctx.stroke();
  lines.forEach((l, i) => txt(l, x + 14, y + 18 + i * (size + 5), size, '#0b2a5c', 'left', 600));
  ctx.globalAlpha = 1;
}
// Losing a heart. In toddler mode nothing is ever lost: you just get a friendly bounce.
function hurt(r, x, y, msg, cool = 1.5) {
  if (r.inv > 0) return false;
  r.inv = cool;
  if (diff().safe) { pop(x, y, 'Oops! 🙂', '#fff', 22); RB.beep(400, 300, 0.15, 'triangle', 0.08); return false; }
  r.lives--; r.hits = (r.hits || 0) + 1;
  RB.beep(220, 70, 0.3, 'sawtooth', 0.12); RB.noise(0.25, 0.25);
  pop(x, y, msg, '#ff8a7a', 22);
  return true;
}
function blink(r) { if (r.inv > 0 && Math.floor(r.inv * 10) % 2) ctx.globalAlpha = 0.5; }
// Top-left panel: score, hearts and extra lines.
function hud(score, lives, extra = []) {
  const top = -OFFY + 12, showLives = lives != null && !diff().safe;
  const n = Math.max(3, diff().lives);
  ctx.fillStyle = 'rgba(11,42,92,.55)';
  rrect(10, top, 170, 44 + extra.length * 24 + (showLives ? 26 : 0), 14); ctx.fill();
  txt(`⭐ ${score}`, 22, top + 22, 24, '#fff', 'left');
  let y = top + 48;
  if (showLives) { for (let i = 0; i < n; i++) heart(30 + i * 26, y - 2, 9, i < lives); y += 26; }
  for (const e of extra) { txt(e, 22, y, 17, '#e6f1ff', 'left', 600); y += 24; }
}
// Where a gauge of width w goes: top middle, or under the corner buttons on narrow screens.
function gaugeAt(w) { return W < 700 ? [W - w - 10, -OFFY + 64] : [W / 2 - w / 2, -OFFY + 14]; }
function meter(x, y, w, icon, f, color) {
  ctx.fillStyle = 'rgba(11,42,92,.55)'; rrect(x, y, w, 30, 12); ctx.fill();
  txt(icon, x + 16, y + 15, 16, '#fff');
  ctx.fillStyle = 'rgba(255,255,255,.25)'; rrect(x + 32, y + 9, w - 42, 12, 6); ctx.fill();
  ctx.fillStyle = color; rrect(x + 32, y + 9, Math.max(5, (w - 42) * clamp(f, 0, 1)), 12, 6); ctx.fill();
}
function panel(x, y, w, lines) {
  ctx.fillStyle = 'rgba(11,42,92,.62)'; rrect(x, y, w, 12 + lines.length * 22, 12); ctx.fill();
  lines.forEach(([s, c], i) => txt(s, x + 12, y + 17 + i * 22, 16, c || '#fff', 'left'));
}
const actShown = () => { const b = document.getElementById('actBtn'); return b && !b.classList.contains('hidden'); };
function progressBar(f, left, right, color = '#ffd84a') {
  const x = 20, w = W - 40 - (actShown() ? 120 : 0), y = H + OFFY - 28;
  ctx.fillStyle = 'rgba(11,42,92,.5)'; rrect(x, y - 9, w, 18, 9); ctx.fill();
  ctx.fillStyle = color; rrect(x + 3, y - 6, Math.max(12, (w - 6) * clamp(f, 0, 1)), 12, 6); ctx.fill();
  txt(left, x + 10, y - 22, 15, '#fff', 'left'); txt(right, x + w - 10, y - 22, 15, '#fff', 'right');
}
const PX = () => Math.min(W * 0.3, 260);
function hit(ax, ay, ar, bx, by, br) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy < (ar + br) * (ar + br); }
// A field of collectible stars: grab with grab(r, x, y, radius) each frame.
function collectStars(r, list, x, y, rad, toScreen) {
  for (const o of list) {
    if (o.dead) continue;
    const [sx, sy] = toScreen(o);
    if (hit(sx, sy, 14, x, y, rad)) {
      o.dead = true; r.stars = (r.stars || 0) + 1; r.score += 50;
      RB.beep(880, 1320, 0.12, 'triangle', 0.12); RB.beep(1320, 1760, 0.12, 'triangle', 0.1, 0.07);
      pop(sx, sy - 20, '+50'); puff(sx, sy, 10, ['#ffd84a', '#fff']);
    }
  }
}
