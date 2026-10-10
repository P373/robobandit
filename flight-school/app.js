// Flight School app: screens, modes, saving, quiz, cards, exam, certificate, music, read-aloud and the main loop.
'use strict';

const MODES = {
  toddler: { ico: '🧸', name: 'Toddler', desc: 'No quizzes, can\'t lose, and the lessons are read out loud.' },
  easy: { ico: '🙂', name: 'Easy', desc: 'Helpers switched on, 4 hearts, regular questions.' },
  challenge: { ico: '🔥', name: 'Challenge', desc: 'No helpers, 3 hearts, and harder questions too.' },
};

// ---------- Saved progress ----------
// fs_save v2: { v: 2, modes: { easy: { best: {id: n}, stars: {id: n}, exam: n } }, cards: { id: [a, b] }, name, settings, unlockAll }
const save = (() => {
  let s = null;
  try { s = JSON.parse(RB.store.get('fs_save') || 'null'); } catch (e) { /* fresh start */ }
  s = s && typeof s === 'object' ? s : {};
  const out = { v: 2, modes: {}, cards: {}, name: typeof s.name === 'string' ? s.name.slice(0, 24) : '', settings: {} };
  for (const m of Object.keys(MODES)) out.modes[m] = { best: {}, stars: {}, exam: 0 };
  if (s.v === 2) {
    for (const m of Object.keys(MODES)) if (s.modes && s.modes[m]) Object.assign(out.modes[m], s.modes[m]);
    out.cards = s.cards || {}; out.settings = s.settings || {}; out.unlockAll = !!s.unlockAll;
  } else if (Array.isArray(s.best)) {   // first version: 7 levels saved in order
    ['balloon', 'wing', 'wright', 'prop', 'jet', 'rocket', 'space'].forEach((id, i) => {
      if (s.best[i]) out.modes.easy.best[id] = +s.best[i];
      if (s.stars && s.stars[i]) out.modes.easy.stars[id] = +s.stars[i];
    });
  }
  return out;
})();
Object.assign(settings, { mode: MODES[save.settings.mode] ? save.settings.mode : 'easy', autoRead: !!save.settings.autoRead, music: save.settings.music !== false, reduced: !!save.settings.reduced });
const prog = () => save.modes[settings.mode];
const starsOf = i => prog().stars[LEVELS[i].id] || 0;
const bestOf = i => prog().best[LEVELS[i].id] || 0;
// "Unlock all" opens every level and the exam, for players whose progress is saved on another device.
const unlocked = i => save.unlockAll || settings.mode === 'toddler' || i === 0 || starsOf(i) > 0 || starsOf(i - 1) > 0;
const totalScore = (m = settings.mode) => Object.values(save.modes[m].best).reduce((a, b) => a + (+b || 0), 0) + (save.modes[m].exam || 0);
const allDone = () => LEVELS.every((_, i) => starsOf(i) > 0);
function persist() {
  save.settings = { ...settings };
  RB.store.set('fs_save', JSON.stringify(save));
  RB.store.set('fs_best', String(Math.max(...Object.keys(MODES).map(m => totalScore(m)))));
}

// ---------- Sound effects ----------
const sfx = {
  click: () => RB.beep(600, 800, 0.06, 'square', 0.05),
  right: () => { [523, 659, 784].forEach((f, i) => RB.beep(f, f, 0.14, 'triangle', 0.13, i * 0.09)); },
  wrong: () => { RB.beep(330, 220, 0.25, 'square', 0.07); RB.beep(247, 165, 0.3, 'square', 0.07, 0.15); },
  win: () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => RB.beep(f, f, 0.16, 'triangle', 0.12, i * 0.11)); },
};
let wind = null;
function setWind(v) { if (wind) wind.gain.value = paused ? 0 : v; }

// ---------- Music: a little tune for each era ----------
const music = (() => {
  const SC = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11], pent: [0, 2, 4, 7, 9, 12, 14] };
  const ERAS = {
    classic: { bpm: 104, wave: 'triangle', root: 60, scale: SC.major, prog: [0, 3, 4, 0], style: 'waltz' },
    ragtime: { bpm: 118, wave: 'square', root: 58, scale: SC.major, prog: [0, 5, 1, 4], style: 'stride' },
    adventure: { bpm: 124, wave: 'triangle', root: 57, scale: SC.minor, prog: [0, 5, 2, 6], style: 'drive' },
    jet: { bpm: 136, wave: 'sawtooth', root: 52, scale: SC.minor, prog: [0, 5, 3, 4], style: 'drive' },
    space: { bpm: 72, wave: 'sine', root: 55, scale: SC.major, prog: [0, 4, 5, 3], style: 'pad' },
    modern: { bpm: 116, wave: 'square', root: 60, scale: SC.major, prog: [0, 4, 5, 3], style: 'pop' },
    mars: { bpm: 80, wave: 'triangle', root: 53, scale: SC.lydian, prog: [0, 1, 0, 4], style: 'pad' },
    cosmic: { bpm: 62, wave: 'sine', root: 50, scale: SC.minor, prog: [0, 5, 3, 6], style: 'pad' },
  };
  let era = null, master = null, timer = null, step = 0, nextT = 0, level = 1;
  const mtof = n => 440 * Math.pow(2, (n - 69) / 12);
  function ensure() {
    const ac = RB.audio(); if (!ac) return null;
    if (!master) {
      master = ac.createGain(); master.connect(ac.destination);
      RB.onMute(() => setGain());
    }
    return ac;
  }
  function setGain() { if (master) master.gain.value = RB.muted || !settings.music || paused ? 0 : 0.05 * level; }
  function note(ac, n, t, dur, wave, vol, att = 0.01) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = wave; o.frequency.value = mtof(n);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function tick() {
    const ac = ensure(); if (!ac || !era) return;
    const E = ERAS[era], spb = 60 / E.bpm / 2;
    if (nextT < ac.currentTime) nextT = ac.currentTime + 0.05;
    while (nextT < ac.currentTime + 0.3) {
      const bar = Math.floor(step / 8), s = step % 8, deg = E.prog[bar % E.prog.length];
      const tone = k => E.root + E.scale[(deg + k) % 7] + 12 * Math.floor((deg + k) / 7);
      const mel = () => E.root + 12 + SC.pent[Math.floor(rnd(step, 7) * 5)] + (E.scale === SC.minor ? -1 : 0) * (rnd(step, 9) < 0.3 ? 1 : 0);
      const t = nextT;
      if (E.style === 'waltz') { if (s % 6 === 0) note(ac, tone(0) - 12, t, spb * 3, E.wave, 0.5); else if (s % 2 === 0) note(ac, tone(s % 4 ? 2 : 4), t, spb * 1.5, E.wave, 0.3); if (rnd(step, 3) < 0.35) note(ac, mel(), t, spb * 2, 'triangle', 0.25); }
      if (E.style === 'stride') { if (s % 4 === 0) note(ac, tone(0) - 12 - (s === 4 ? 5 : 0), t, spb, E.wave, 0.25); if (s % 4 === 2) { note(ac, tone(2), t, spb, E.wave, 0.15); note(ac, tone(4), t, spb, E.wave, 0.15); } if (rnd(step, 4) < 0.5) note(ac, mel(), t, spb * 0.9, 'triangle', 0.3); }
      if (E.style === 'drive') { note(ac, tone(0) - 12, t, spb * 0.9, E.wave, s % 2 ? 0.18 : 0.3); if (s % 4 === 0 && rnd(step, 5) < 0.7) note(ac, mel(), t, spb * 2, 'triangle', 0.25); }
      if (E.style === 'pop') { if (s === 0 || s === 3 || s === 6) note(ac, tone(0) - 12, t, spb * 1.5, 'triangle', 0.4); if (s === 2 || s === 6) { note(ac, tone(2), t, spb * 0.6, E.wave, 0.12); note(ac, tone(4), t, spb * 0.6, E.wave, 0.12); } if (rnd(step, 6) < 0.4) note(ac, mel(), t, spb, 'triangle', 0.25); }
      if (E.style === 'pad') { if (s === 0) for (const k of [0, 2, 4]) note(ac, tone(k), t, spb * 8, E.wave, 0.22, spb * 3); if (rnd(step, 8) < 0.22) note(ac, mel() + 12, t, spb * 3, 'sine', 0.12, 0.05); }
      nextT += spb; step++;
    }
  }
  return {
    play(e, lvl = 1) {
      level = lvl;
      if (!ensure()) return;
      setGain();
      if (era === e) return;
      era = e; step = 0; nextT = 0;
      if (!timer) timer = setInterval(tick, 80);
    },
    stop() { era = null; if (timer) { clearInterval(timer); timer = null; } },
    refresh: setGain,
  };
})();

// ---------- Read aloud ----------
// the nicest voice on the device, chosen in common.js (RB.voice); parents can pick another in the ☰ menu
const canSpeak = RB.voice.ok;
function speak(text, force = false) {
  if (!canSpeak || (!force && (RB.muted || !settings.autoRead))) return;
  RB.speak(text);
}
function hush() { RB.hush(); }
function onFact(s) { if (settings.autoRead && settings.mode === 'toddler') speak(s); }

// ---------- Input ----------
addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && mode === 'play') e.preventDefault();
  keys[e.code] = true;
  if (e.repeat) return;
  if (paused) { if (['Space', 'Enter', 'KeyP', 'Escape'].includes(e.code)) resume(); return; }
  if (e.code === 'KeyM') RB.toggleMute();
  if (mode === 'play') {
    if (e.code === 'KeyP' || e.code === 'Escape') pause();
    else if ((e.code === 'Space' || e.code === 'Enter') && round && round.tap && !round.asking) round.tap();
  }
});
addEventListener('keyup', e => { keys[e.code] = false; });
canvas.addEventListener('pointerdown', e => {
  RB.audio();
  if (mode !== 'play' || paused) return;
  if (e.pointerType === 'mouse') { mouse = toLogical(e); canvas.setPointerCapture(e.pointerId); }
  if (inputStyle === 'hold') ptrHeld = true;
});
canvas.addEventListener('pointermove', e => { if (mouse && e.pointerType === 'mouse') mouse = toLogical(e); });
const release = e => { ptrHeld = false; if (e.pointerType === 'mouse') mouse = null; };
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
const act = $('actBtn');
act.addEventListener('pointerdown', e => {
  e.preventDefault(); e.stopPropagation(); RB.audio();
  btnHeld = true; act.classList.add('on');
  if (mode === 'play' && !paused && round && round.tap) round.tap();
});
const actUp = () => { btnHeld = false; act.classList.remove('on'); };
act.addEventListener('pointerup', actUp);
act.addEventListener('pointercancel', actUp);
act.addEventListener('pointerleave', actUp);
function clearInput() { for (const k in keys) keys[k] = false; ptrHeld = false; mouse = null; actUp(); stick.reset(); }
addEventListener('blur', clearInput);

function pause() {
  if (paused || mode !== 'play' || (round && round.asking)) return;
  paused = true; clearInput(); setWind(0); music.refresh(); hush();
  RB.showPause(resume);
}
function resume() { paused = false; RB.hidePause(); last = performance.now(); music.refresh(); }
RB.topbar({
  onPause: () => (paused ? resume() : pause()),
  shareInfo: { title: 'Flight School | RoboBandit', text: 'Learn how flying works, from hot air balloons to the edge of the universe! ✈️🚀👽' },
});
RB.onHide(pause);

// ---------- Level pictures (drawn once with the game's own sprites) ----------
const iconCache = {};
function iconURL(id) {
  if (iconCache[id]) return iconCache[id];
  const c = document.createElement('canvas'); c.width = 160; c.height = 120;
  const prev = ctx; ctx = c.getContext('2d'); ctx.scale(2, 2);
  const bg = { space: ['#0b1238', '#2a3470'], planet: ['#060a1e', '#1a1440'], light: ['#04040f', '#1a1050'], aliens: ['#04050f', '#14204a'], mars: ['#d99a6a', '#f5d2a8'], rocket: ['#3d8ff0', '#0d1a4a'] }[id] || ['#7fc4ff', '#e8f6ff'];
  const g = ctx.createLinearGradient(0, 0, 0, 60); g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, 80, 60);
  if (['space', 'planet', 'light', 'aliens', 'rocket'].includes(id)) spaceStars(20, 4, 80, 60, 0);
  ({
    balloon: () => drawBalloon(40, 24, 15, 0.6, '#3d6fe0', '#ffd84a', 0),
    wing: () => drawGlider(40, 30, 1, 0.1),
    zeppelin: () => drawZeppelin(42, 30, 0.45, 0),
    wright: () => drawFlyer(40, 32, 0.75, 0.05, 0.2),
    prop: () => drawProp(40, 30, 0.95, 0.05, 0.1),
    heli: () => drawHeli(42, 32, 0.9, 0.1, 0.3),
    jet: () => drawConcorde(40, 30, 0.75, 0.08, 0.6, 0.1),
    rocket: () => drawRocket(40, 56, 0.75, 3, 1, 0.2),
    space: () => { ctx.fillStyle = '#9a9aa2'; ctx.fillRect(0, 48, 80, 12); drawLander(40, 30, 0.9, 0.5, 0, 0.1); },
    drone: () => { ctx.fillStyle = '#86c46a'; ctx.fillRect(0, 0, 80, 60); drawDroneTop(40, 30, 0.9, 0.2, 0, 0, true); },
    planet: () => { ctx.fillStyle = '#ffd84a'; circle(14, 30, 7); ctx.fillStyle = '#e0663a'; circle(56, 26, 12); ctx.strokeStyle = '#9fe8ff'; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.ellipse(36, 30, 22, 14, 0, Math.PI, 0); ctx.stroke(); ctx.setLineDash([]); },
    mars: () => { ctx.fillStyle = '#b5653a'; ctx.fillRect(0, 48, 80, 12); drawIngenuity(40, 30, 0.9, 0.3, 1); },
    light: () => { for (let i = 0; i < 8; i++) { ctx.strokeStyle = '#9fd0ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(rnd(i, 1) * 80, rnd(i, 2) * 60); ctx.lineTo(rnd(i, 1) * 80 + 20, rnd(i, 2) * 60); ctx.stroke(); } drawStarship(40, 30, 0.8, 0, 1); },
    aliens: () => { ctx.fillStyle = '#7dd36a'; ctx.beginPath(); ctx.ellipse(40, 32, 14, 17, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(34, 30, 4, 6, -0.4, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(46, 30, 4, 6, 0.4, 0, TAU); ctx.fill(); txt('?', 64, 16, 18, '#ffd84a', 'center', 700, 'Bungee'); },
  })[id]();
  ctx = prev;
  return (iconCache[id] = c.toDataURL());
}
const levelImg = (i, cls = 'ico') => `<img class="${cls}" src="${iconURL(LEVELS[i].id)}" alt="">`;
const cardFace = (e, levelIdx) => e[0] === '@' ? `<img src="${iconURL(e.slice(1))}" alt="">` : `<span>${e}</span>`;

// ---------- Screens ----------
let slide = 0, roundBest = 0, quiz = [], qi = 0, firstRight = 0, retryRight = 0, retrying = false, answered = false;
let diaCtx = null, diaT = 0, diaV = 0.3, examState = null;
const card = $('card'), scr = $('screen');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function show(html, cls = '') { scr.classList.remove('hidden'); card.className = 'card ' + cls; card.innerHTML = html; scr.scrollTop = 0; diaCtx = null; }
function hideScreen() { scr.classList.add('hidden'); }
function on(id, fn) { const el = $(id); if (el) el.addEventListener('click', () => { RB.audio(); sfx.click(); fn(); }); }
const starStr = n => '★'.repeat(n) + '☆'.repeat(3 - n);
function hideAct() { act.classList.add('hidden'); actUp(); }
const modeChip = () => `<button class="chip modechip" id="modeChip">${MODES[settings.mode].ico} ${MODES[settings.mode].name} ⚙️</button>`;

function titleScreen() {
  mode = 'title'; hush();
  cur = Math.max(0, LEVELS.findIndex((_, i) => !starsOf(i))); if (cur < 0) cur = 0;
  show(`<h1>FLIGHT<br>SCHOOL</h1>
    <p style="font-size:21px">✈️ How do things fly? 🚀</p>
    <p>Fly through the whole story of flight: balloons, gliders, zeppelins, the Wright brothers, helicopters, jets, rockets, the Moon, drones, Mars and beyond. Each level: <b>learn</b> 📖, <b>fly</b> 🕹️, then ace the <b>quiz</b> 🧠.</p>
    <div class="strip">${LEVELS.map((_, i) => levelImg(i, 'mini')).join('')}</div>
    ${totalScore() ? `<p>🏆 Your total score: <b>${totalScore()}</b></p>` : ''}
    <button class="btn" id="go">${totalScore() ? '▶ Keep going' : '▶ Start flying!'}</button><br>
    ${modeChip()} <button class="chip alt" id="cards">🃏 Flight Cards</button>`);
  on('go', mapScreen); on('modeChip', () => settingsScreen(titleScreen)); on('cards', () => cardsScreen(titleScreen));
}

function settingsScreen(back) {
  mode = 'settings';
  show(`<h2>⚙️ Settings</h2>
    <p style="margin:0">Who's flying today?</p>
    <div class="modes">${Object.entries(MODES).map(([k, m]) => `<button class="mode${k === settings.mode ? ' sel' : ''}" data-m="${k}"><span class="ic">${m.ico}</span><b>${m.name}</b><small>${m.desc}</small></button>`).join('')}</div>
    <label class="tog"><input type="checkbox" id="tRead" ${settings.autoRead ? 'checked' : ''}> 🔊 Read lessons and questions out loud</label>
    <label class="tog"><input type="checkbox" id="tMusic" ${settings.music ? 'checked' : ''}> 🎵 Music</label>
    <label class="tog"><input type="checkbox" id="tCalm" ${settings.reduced ? 'checked' : ''}> 🌙 Calm mode (less flashing and shaking)</label>
    <p style="font-size:15px;color:#5a6f99">Each mode keeps its own scores and stars. Flight Cards are shared.</p>
    <button class="btn" id="done">✓ Done</button>`);
  card.querySelectorAll('.mode').forEach(b => b.addEventListener('click', () => {
    sfx.click(); settings.mode = b.dataset.m;
    if (settings.mode === 'toddler') settings.autoRead = true;
    persist(); settingsScreen(back);
  }));
  $('tRead').addEventListener('change', e => { settings.autoRead = e.target.checked; persist(); });
  $('tMusic').addEventListener('change', e => { settings.music = e.target.checked; persist(); music.refresh(); });
  $('tCalm').addEventListener('change', e => { settings.reduced = e.target.checked; persist(); });
  on('done', back);
}

function mapScreen() {
  mode = 'map'; hideAct(); hush(); music.stop();
  const next = LEVELS.findIndex((_, i) => !starsOf(i));
  const tiles = LEVELS.map((l, i) => {
    const locked = !unlocked(i), st = starsOf(i);
    return `<button class="lvl${locked ? ' locked' : ''}${i === next && !locked ? ' next' : ''}" data-i="${i}" ${locked ? 'disabled' : ''}>
      ${locked ? '<span class="ic">🔒</span>' : levelImg(i)}<b>${i + 1}. ${esc(l.name)}</b><small>${l.year}</small>
      <span class="st">${starStr(st)}</span>${bestOf(i) ? `<small>Best ${bestOf(i)}</small>` : ''}</button>`;
  }).join('');
  const examReady = (allDone() || save.unlockAll) && settings.mode !== 'toddler';
  const anyLocked = LEVELS.some((_, i) => !unlocked(i)) || (!examReady && settings.mode !== 'toddler');
  show(`<h2>🗺️ The Story of Flight</h2>
    <p style="margin:0">🏆 Total: <b>${totalScore()}</b> · ${LEVELS.filter((_, i) => starsOf(i)).length} of ${LEVELS.length} levels · ${modeChip()}</p>
    <div class="levels">${tiles}
      <button class="lvl${examReady ? (prog().exam ? '' : ' next') : ' locked'}" id="exam" ${examReady ? '' : 'disabled'}><span class="ic">${examReady ? '🎓' : '🔒'}</span><b>Final Exam</b><small>${examReady ? (prog().exam ? `Best ${prog().exam}` : 'Ready!') : settings.mode === 'toddler' ? 'Not in Toddler mode' : 'Finish every level'}</small></button>
    </div>
    ${next >= 0 ? `<button class="btn" id="next">▶ Level ${next + 1}: ${esc(LEVELS[next].name)}</button>` : ''}
    ${allDone() ? '<button class="btn" id="cert">🎓 My certificate</button>' : ''}
    <button class="btn alt" id="cards">🃏 Flight Cards</button>
    ${anyLocked ? '<button class="btn alt" id="unlockAll" title="Played on another device? Open every level here.">🔓 Unlock all levels</button>' : ''}`, 'wide');
  card.querySelectorAll('.lvl[data-i]').forEach(b => b.addEventListener('click', () => { if (b.disabled) return; RB.audio(); sfx.click(); startLesson(+b.dataset.i); }));
  on('next', () => startLesson(next)); on('cert', certScreen); on('exam', examStart);
  on('cards', () => cardsScreen(mapScreen)); on('modeChip', () => settingsScreen(mapScreen));
  on('unlockAll', () => { save.unlockAll = true; persist(); mapScreen(); RB.toast('🔓 Every level is open!'); });
}

function startLesson(i) { cur = i; slide = 0; music.play(LEVELS[i].era, 0.4); lessonScreen(); }
function lessonScreen() {
  mode = 'lesson';
  const L = LEVELS[cur], S = L.slides[slide], lastSlide = slide === L.slides.length - 1, tod = settings.mode === 'toddler';
  diaV = S.ui && S.ui.v != null ? S.ui.v : 0.3;
  show(`<span class="chip">${levelImg(cur, 'chipimg')} Level ${cur + 1} · ${esc(L.name)} · ${L.year}</span>
    <h2>${esc(S.t)}</h2>
    <canvas id="dia"></canvas>
    ${S.ui ? `<label class="sl"><span>${S.ui.label}</span><input type="range" id="diaSl" min="0" max="100" value="${Math.round(diaV * 100)}"></label>` : ''}
    <p class="${tod ? 'big-p' : ''}">${esc(tod ? S.tp : S.p)}</p>
    <div class="dots">${L.slides.map((_, k) => k === slide ? '<b>●</b>' : '●').join('')}</div>
    <button class="btn alt" id="back">◀ ${slide ? 'Back' : 'Map'}</button>
    ${canSpeak ? '<button class="btn alt" id="read">🔊 Read to me</button>' : ''}
    ${starsOf(cur) && !lastSlide ? '<button class="btn alt" id="skip">Skip ▶▶</button>' : ''}
    <button class="btn" id="fwd">${lastSlide ? 'Let\'s fly! ✈️' : 'Next ▶'}</button>`);
  const c = $('dia'), dpr = Math.min(devicePixelRatio || 1, 2);
  c.width = DW * dpr; c.height = DH * dpr;
  diaCtx = c.getContext('2d'); diaCtx.scale(dpr, dpr); diaT = 0;
  const sl = $('diaSl'); if (sl) sl.addEventListener('input', () => { diaV = sl.value / 100; });
  const text = `${S.t}. ${tod ? S.tp : S.p}`;
  speak(text);
  on('back', () => { if (slide) { slide--; lessonScreen(); } else mapScreen(); });
  on('read', () => speak(text, true));
  on('skip', readyScreen);
  on('fwd', () => { if (lastSlide) readyScreen(); else { slide++; lessonScreen(); } });
}
function drawDiagram(dt) {
  if (!diaCtx || !diaCtx.canvas.isConnected) return;
  diaT += dt * (reduced() ? 0.5 : 1);
  ctx = diaCtx;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, DW, DH); ctx.clip();
  try { DIAGRAMS[LEVELS[cur].slides[slide].d](diaT, diaV); } finally { ctx.restore(); ctx = gameCtx; }
}

function readyScreen() {
  mode = 'ready'; hush();
  const L = LEVELS[cur], h = L.how, tod = settings.mode === 'toddler';
  show(`<span class="chip">${levelImg(cur, 'chipimg')} Level ${cur + 1} · Flight test</span>
    <h2>Time to fly!</h2>
    <ul class="how">
      ${tod ? `<li><span class="e">🕹️</span><span class="big-p">${h.toddler}</span></li>` : `
      <li><span class="e">🎯</span><span>${h.goal}</span></li>
      <li><span class="e">🕹️</span><span><span class="key-only">${h.keys}</span><span class="touch-only">${h.touch}</span></span></li>
      <li><span class="e">💡</span><span>${h.tip}</span></li>`}
    </ul>
    <button class="btn alt" id="back">◀ Lesson</button>
    <button class="btn" id="go">Start ▶</button>`);
  speak(tod ? h.toddler : h.goal.replace(/<[^>]+>/g, ''));
  on('back', () => { slide = L.slides.length - 1; lessonScreen(); });
  on('go', () => startRound(true));
}

function syncButton() {
  const L = LEVELS[cur];
  const B = round && round.btn !== undefined ? round.btn : L.button;
  if (L.input === 'stickbtn' && B && mode === 'play') {
    if ($('actLbl').textContent !== B.lbl) { $('actIco').textContent = B.ico; $('actLbl').textContent = B.lbl; }
    act.classList.remove('hidden');
  } else act.classList.add('hidden');
}
function startRound(fresh) {
  if (fresh) roundBest = 0;
  hush(); clearInput(); pops = []; parts = []; banner = null; fact = null;
  inputStyle = LEVELS[cur].input;
  round = ROUNDS[LEVELS[cur].id]();
  mode = 'play'; paused = false;
  hideScreen(); syncButton();
  if (!wind) wind = RB.ambient(500);
  music.play(LEVELS[cur].era, 1);
  showBanner(`LEVEL ${cur + 1}`, LEVELS[cur].name, 1.8);
  last = performance.now();
}
function endRound() {
  mode = 'roundEnd'; hideAct(); setWind(0); clearInput(); fact = null;
  const rows = round.results(), total = Math.max(0, rows.reduce((a, r) => a + r[1], 0));
  roundBest = Math.max(roundBest, total);
  if (round.win) sfx.win();
  const tod = !diff().quiz;
  show(`<span class="chip">${levelImg(cur, 'chipimg')} Level ${cur + 1} · Flight test</span>
    <h2>${round.win ? '🎉 ' : ''}${esc(round.end || 'Round over!')}</h2>
    <div class="rows">${rows.map(([k, v]) => `<div><span>${esc(k)}</span><b>${v}</b></div>`).join('')}
      <div class="tot"><span>Round score</span><span>${total}</span></div></div>
    ${roundBest > total ? `<p>Your best try this time: <b>${roundBest}</b> (that's the one that counts!)</p>` : ''}
    <button class="btn alt" id="again">↺ Fly again</button>
    <button class="btn" id="quiz">${tod ? 'Finish level ⭐' : 'Quiz time! 🧠'}</button>`);
  speak(round.end || '');
  on('again', () => startRound(false));
  on('quiz', () => tod ? levelEnd() : startQuiz());
}

function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const withOpts = q => ({ ...q, opts: shuffle(q.a.map((s, k) => ({ s, right: k === 0 }))) });
function startQuiz() {
  const bank = LEVELS[cur].quiz, hard = settings.mode === 'challenge';
  const pool = hard ? shuffle(bank) : shuffle(bank.filter(q => !q.h));
  quiz = (hard ? [...pool.filter(q => q.h).slice(0, 1), ...pool.filter(q => !q.h)] : pool).slice(0, QUIZ_LEN).map(withOpts);
  quiz = shuffle(quiz);
  qi = 0; firstRight = 0; retryRight = 0; retrying = false; quizScreen();
}
function quizScreen() {
  mode = 'quiz'; answered = false;
  const q = quiz[qi];
  show(`<span class="chip">🧠 ${retrying ? 'Second chance' : 'Quiz'} · Question ${qi + 1} of ${quiz.length}</span>
    <h2>${esc(q.q)}</h2>
    <div class="answers">${q.opts.map((o, k) => `<button class="ans" data-k="${k}">${'ABCD'[k]}. ${esc(o.s)}</button>`).join('')}</div>
    ${canSpeak ? '<button class="chip alt" id="read">🔊 Read to me</button>' : ''}
    <div id="fb"></div>`);
  const text = `${q.q} ${q.opts.map((o, k) => `${'ABCD'[k]}: ${o.s}.`).join(' ')}`;
  speak(text);
  on('read', () => speak(text, true));
  card.querySelectorAll('.ans').forEach(b => b.addEventListener('click', () => answer(+b.dataset.k)));
}
function answer(k) {
  if (answered) return;
  answered = true; RB.audio(); hush();
  const q = quiz[qi], right = q.opts[k].right;
  if (right) { sfx.right(); if (retrying) retryRight++; else firstRight++; } else sfx.wrong();
  q.missed = !right;
  card.querySelectorAll('.ans').forEach((b, j) => {
    b.disabled = true;
    if (q.opts[j].right) b.classList.add('right'); else if (j === k) b.classList.add('wrong');
  });
  const lastQ = qi === quiz.length - 1, pts = retrying ? RETRY_PTS : PER_RIGHT;
  $('fb').innerHTML = `<div class="why"><b>${right ? `✅ Right! +${pts}` : '❌ Not quite.'}</b> ${esc(q.why)}</div>
    <button class="btn" id="nextQ">${lastQ ? 'Continue ▶' : 'Next question ▶'}</button>`;
  speak((right ? 'Right! ' : 'Not quite. ') + q.why);
  on('nextQ', () => {
    if (!lastQ) { qi++; quizScreen(); return; }
    const missed = quiz.filter(x => x.missed);
    if (!retrying && missed.length) {
      retrying = true; quiz = missed.map(x => withOpts(x)); qi = 0;
      show(`<h2>🔁 Second chance!</h2><p>Let's try the ${missed.length === 1 ? 'one you missed' : `${missed.length} you missed`} again, for ${RETRY_PTS} points each.</p><button class="btn" id="go">Try again ▶</button>`);
      on('go', quizScreen);
    } else levelEnd();
  });
  $('nextQ').scrollIntoView({ block: 'nearest' });
}

function levelEnd() {
  mode = 'levelEnd'; hush();
  const L = LEVELS[cur], tod = !diff().quiz, n = QUIZ_LEN;
  const quizPts = tod ? 0 : firstRight * PER_RIGHT + retryRight * RETRY_PTS, total = roundBest + quizPts;
  const won = round && round.win;
  const stars = tod ? 1 + (won ? 2 : 0) : 1 + (firstRight >= 3 ? 1 : 0) + (firstRight === n && won ? 1 : 0);
  const P = prog(), newBest = total > (P.best[L.id] || 0);
  P.best[L.id] = Math.max(P.best[L.id] || 0, total);
  P.stars[L.id] = Math.max(P.stars[L.id] || 0, stars);
  const had = save.cards[L.id] || [false, false];
  const now = [true, had[1] || P.stars[L.id] >= 3];
  const fresh = L.cards.filter((_, k) => now[k] && !had[k]);
  save.cards[L.id] = now;
  persist(); sfx.win();
  const finished = cur === LEVELS.length - 1;
  show(`<span class="chip">Level ${cur + 1} complete!</span>
    <h2>${levelImg(cur, 'chipimg')} You earned the <b>${esc(L.badge)}</b> badge!</h2>
    <div class="stars">${starStr(stars)}</div>
    <div class="rows"><div><span>🕹️ Flight test</span><b>${roundBest}</b></div>
      ${tod ? '' : `<div><span>🧠 Quiz: ${firstRight} of ${n} first try${retryRight ? ` + ${retryRight} second chance` : ''}</span><b>${quizPts}</b></div>`}
      <div class="tot"><span>Level score</span><span>${total}</span></div></div>
    ${newBest ? '<p>🎉 New best for this level!</p>' : ''}
    ${fresh.length ? `<p><b>New Flight Card${fresh.length > 1 ? 's' : ''}!</b></p><div class="fcards">${fresh.map(c => cardHTML(c, true)).join('')}</div>` : ''}
    <p>🏆 Total score: <b>${totalScore()}</b></p>
    ${stars < 3 ? `<p style="font-size:16px;color:#5a6f99">${tod ? 'Finish the flight for ★★★' : 'Get every question right the first time and finish the flight for ★★★ (and a bonus Flight Card!)'}</p>` : ''}
    <button class="btn alt" id="map">🗺️ Map</button>
    ${finished ? '<button class="btn" id="cert">🎓 My certificate!</button>' : `<button class="btn" id="next">Next: ${esc(LEVELS[cur + 1].name)} ▶</button>`}`);
  on('map', mapScreen); on('next', () => startLesson(cur + 1)); on('cert', certScreen);
}

// ---------- Flight Cards ----------
function cardHTML(c, owned, levelName = '') {
  if (!owned) return `<div class="fcard locked"><div class="face"><span>🔒</span></div><b>???</b><small>${esc(levelName)}</small></div>`;
  return `<button class="fcard" data-f="${esc(c.f)}" data-n="${esc(c.n)}"><div class="face">${cardFace(c.e)}</div><b>${esc(c.n)}</b><small>${esc(c.y)}</small><p>${esc(c.f)}</p></button>`;
}
function cardsScreen(back) {
  mode = 'cards'; hush();
  let got = 0, all = 0;
  const html = LEVELS.map(l => l.cards.map((c, k) => { all++; const o = (save.cards[l.id] || [])[k]; if (o) got++; return cardHTML(c, o, l.name); }).join('')).join('');
  show(`<h2>🃏 Flight Cards</h2><p style="margin:0">You've collected <b>${got}</b> of ${all}. Finish a level for its first card, and get ★★★ for the second! Tap a card to flip it.</p>
    <div class="fcards album">${html}</div><button class="btn" id="back">◀ Back</button>`, 'wide');
  card.querySelectorAll('button.fcard').forEach(b => b.addEventListener('click', () => { b.classList.toggle('flip'); sfx.click(); if (b.classList.contains('flip')) speak(`${b.dataset.n}. ${b.dataset.f}`); }));
  on('back', back);
}

// ---------- Alien signal questions (asked during the last round) ----------
function askSignal(sig, toddler, done) {
  mode = 'ask'; clearInput(); hideAct();
  const opts = shuffle(sig.a.map((s, k) => ({ s, right: k === 0 })));
  const finish = ok => { hideScreen(); mode = 'play'; syncButton(); done(ok); };
  if (toddler) {
    show(`<span class="chip">📡 Signal found!</span><h2>${esc(sig.a[0])}</h2><div class="why">${esc(sig.why)}</div><button class="btn" id="ok">Keep looking ▶</button>`);
    speak(`${sig.a[0]}. ${sig.why}`);
    on('ok', () => finish(true)); return;
  }
  show(`<span class="chip">📡 Signal found! Be a detective</span>
    <div class="why" style="margin-top:8px"><b>Clue:</b> ${esc(sig.clue)}</div>
    <h2>What do you think it is?</h2>
    <div class="answers">${opts.map((o, k) => `<button class="ans" data-k="${k}">${'ABCD'[k]}. ${esc(o.s)}</button>`).join('')}</div><div id="fb"></div>`);
  speak(`Clue: ${sig.clue} What do you think it is?`);
  card.querySelectorAll('.ans').forEach(b => b.addEventListener('click', () => {
    if (card.querySelector('.ans:disabled')) return;
    const k = +b.dataset.k, ok = opts[k].right;
    ok ? sfx.right() : sfx.wrong();
    card.querySelectorAll('.ans').forEach((x, j) => { x.disabled = true; if (opts[j].right) x.classList.add('right'); else if (j === k) x.classList.add('wrong'); });
    $('fb').innerHTML = `<div class="why"><b>${ok ? '✅ Great detective work! +200' : '❌ Not quite.'}</b> ${esc(sig.why)}</div><button class="btn" id="ok">Keep scanning ▶</button>`;
    speak(sig.why);
    on('ok', () => finish(ok));
  }));
}

// ---------- Final exam: put history in order, then mixed questions ----------
function examStart() {
  const events = shuffle(LEVELS.flatMap(l => l.timeline));
  const pick = [];
  for (const e of events) if (pick.length < 6 && !pick.some(p => p.y === e.y)) pick.push(e);
  examState = { order: pick.slice().sort((a, b) => a.y - b.y), cards: shuffle(pick), placed: 0, mistakes: 0, timeline: 0, qs: shuffle(LEVELS.map(l => l.quiz[Math.floor(Math.random() * l.quiz.filter(q => !q.h).length)])).slice(0, 8).map(withOpts), qi: 0, right: 0 };
  music.play('cosmic', 0.4);
  examTimeline();
}
function examTimeline() {
  mode = 'exam';
  const E = examState;
  show(`<span class="chip">🎓 Final Exam · Part 1 of 2</span><h2>Put history in order!</h2>
    <p>Tap the events from the <b>oldest</b> to the <b>newest</b>.</p>
    <ol class="tl">${E.order.slice(0, E.placed).map(e => `<li><b>${e.y}</b> ${esc(e.s)}</li>`).join('')}</ol>
    <div class="answers">${E.cards.filter(c => !E.order.slice(0, E.placed).includes(c)).map(c => `<button class="ans" data-s="${esc(c.s)}">${esc(c.s)}</button>`).join('')}</div>`);
  card.querySelectorAll('.ans').forEach(b => b.addEventListener('click', () => {
    const want = E.order[E.placed];
    if (b.dataset.s === want.s) { sfx.right(); E.placed++; if (E.placed === E.order.length) { E.timeline = Math.max(0, 300 - E.mistakes * 30); examQuestion(); } else examTimeline(); }
    else { sfx.wrong(); E.mistakes++; b.classList.add('wrong'); setTimeout(() => b.classList.remove('wrong'), 500); }
  }));
}
function examQuestion() {
  const E = examState, q = E.qs[E.qi];
  show(`<span class="chip">🎓 Final Exam · Part 2 · Question ${E.qi + 1} of ${E.qs.length}</span><h2>${esc(q.q)}</h2>
    <div class="answers">${q.opts.map((o, k) => `<button class="ans" data-k="${k}">${'ABCD'[k]}. ${esc(o.s)}</button>`).join('')}</div><div id="fb"></div>`);
  speak(q.q);
  card.querySelectorAll('.ans').forEach(b => b.addEventListener('click', () => {
    if (card.querySelector('.ans:disabled')) return;
    const k = +b.dataset.k, ok = q.opts[k].right;
    if (ok) { E.right++; sfx.right(); } else sfx.wrong();
    card.querySelectorAll('.ans').forEach((x, j) => { x.disabled = true; if (q.opts[j].right) x.classList.add('right'); else if (j === k) x.classList.add('wrong'); });
    $('fb').innerHTML = `<div class="why"><b>${ok ? '✅ Right!' : '❌ Not quite.'}</b> ${esc(q.why)}</div><button class="btn" id="n">${E.qi === E.qs.length - 1 ? 'See my results ▶' : 'Next ▶'}</button>`;
    on('n', () => { if (E.qi < E.qs.length - 1) { E.qi++; examQuestion(); } else examEnd(); });
  }));
}
const EXAM_MAX = 300 + 8 * 100;
function examEnd() {
  const E = examState, total = E.timeline + E.right * 100, P = prog();
  const honors = total >= EXAM_MAX * 0.7;
  P.exam = Math.max(P.exam || 0, total);
  if (honors) save.cards.exam = [true, true];
  persist(); sfx.win();
  show(`<span class="chip">🎓 Final Exam complete!</span><h2>${honors ? '🏅 You passed with honors!' : 'You finished the exam!'}</h2>
    <div class="rows"><div><span>📜 Timeline (${E.mistakes} wrong taps)</span><b>${E.timeline}</b></div><div><span>🧠 Questions: ${E.right} of ${E.qs.length}</span><b>${E.right * 100}</b></div>
      <div class="tot"><span>Exam score</span><span>${total}</span></div></div>
    <p>🏆 Total score: <b>${totalScore()}</b></p>
    ${honors ? '' : `<p style="font-size:16px;color:#5a6f99">Score ${Math.ceil(EXAM_MAX * 0.7)} or more for honors on your certificate.</p>`}
    <button class="btn alt" id="map">🗺️ Map</button><button class="btn" id="cert">🎓 My certificate</button>`);
  on('map', mapScreen); on('cert', certScreen);
}

function certScreen() {
  mode = 'cert'; hideAct(); hush();
  const done = allDone(), when = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const stars = LEVELS.reduce((a, _, i) => a + starsOf(i), 0), honors = prog().exam >= EXAM_MAX * 0.7;
  show(`<div class="cert" id="certBox">
      <div style="font-size:40px">🎓</div>
      <h1 style="font-size:26px">${honors ? 'Flight Expert<br>with Honors' : 'Certified<br>Flight Expert'}</h1>
      <p>This certifies that</p>
      <div class="nm" id="nm">${esc(save.name || 'Super Pilot')}</div>
      <p>${done ? 'flew through the whole story of flight, from hot air balloons to the edge of the universe!' : 'is on the way to becoming a flight expert!'}</p>
      <div class="badges">${LEVELS.map((_, i) => starsOf(i) ? levelImg(i, 'mini') : '<span class="mini blank"></span>').join('')}</div>
      <p>⭐ ${stars} of ${LEVELS.length * 3} stars · 🏆 ${totalScore()} points · ${MODES[settings.mode].ico} ${MODES[settings.mode].name} mode${honors ? ' · 🏅 Honors' : ''}</p>
      <p style="font-size:15px;color:#7a6a3a">${when} · RoboBandit Flight School</p>
    </div>
    <p class="noprint"><input type="text" id="name" maxlength="24" placeholder="Type your name" value="${esc(save.name)}"></p>
    <div class="noprint"><button class="btn alt" id="map">🗺️ Map</button>
    <button class="btn alt" id="print">🖨️ Print</button>
    <button class="btn" id="share">🔗 Share</button></div>`);
  const inp = $('name');
  inp.addEventListener('input', () => { save.name = inp.value.slice(0, 24); $('nm').textContent = save.name || 'Super Pilot'; persist(); });
  on('map', mapScreen);
  on('print', () => window.print());
  on('share', () => RB.share({ title: 'Flight School | RoboBandit', text: `I'm a Certified Flight Expert with ${totalScore()} points! Can you beat me? ✈️🚀` }));
}

// ---------- Behind the menus: the current level's machine drifting by ----------
function drawMenuBack(t) {
  const id = LEVELS[cur].id, dark = ['rocket', 'space', 'planet', 'light', 'aliens'].includes(id), marsy = id === 'mars';
  sky(dark ? '#0b1238' : marsy ? '#d99a6a' : '#69b7ff', dark ? '#2a3470' : marsy ? '#f5d2a8' : '#eaf6ff');
  if (dark) spaceStars(80, 7, W, VH, t);
  for (let i = 0; i < 6; i++) cloud(mod(rnd(i, 1) * 1800 - t * 30, 1800) - 150, -OFFY + 60 + rnd(i, 2) * (VH - 120), 0.6 + rnd(i, 3) * 0.6, `rgba(255,255,255,${dark ? 0.12 : 0.8})`);
  const x = mod(t * 60, W + 300) - 150, y = H * 0.5 + Math.sin(t) * 30;
  ({
    balloon: () => drawBalloon(x, y - 40, 40, 0.5, '#3d6fe0', '#ffd84a', t), wing: () => drawGlider(x, y, 2, 0.05), zeppelin: () => drawZeppelin(x, y, 1.2, t),
    wright: () => drawFlyer(x, y, 2, 0.05, t), prop: () => drawProp(x, y, 2, 0.05, t), heli: () => drawHeli(x, y, 2, 0.15, t), jet: () => drawConcorde(x, y, 2, 0.05, 0.6, t),
    rocket: () => drawRocket(W * 0.5, mod(-t * 90, VH + 200) + 100 - OFFY, 2, 3, 1, t), space: () => drawLander(x, y, 2, 0.5, 0, t),
    drone: () => drawDroneTop(x, y, 2, t), planet: () => { ctx.fillStyle = '#e0663a'; circle(W * 0.7, H * 0.4, 50); }, mars: () => drawIngenuity(x, y, 2, t, 1),
    light: () => drawStarship(x, y, 1.6, t, 1), aliens: () => { ctx.fillStyle = 'rgba(159,232,255,.2)'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(W * 0.5, H * 0.5, 40 + mod(t * 60 + i * 60, 180), 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(159,232,255,.3)'; ctx.stroke(); } },
  })[id]();
}

// ---------- Main loop ----------
let last = performance.now(), idleT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw(dt);
  requestAnimationFrame(frame);
}
function update(dt) {
  if (mode === 'play' && !paused && round) {
    round.update(dt);
    stepFx(dt);
    round.clock = (round.clock || 0) + dt;   // every round ends after 4 minutes, even if nobody touches anything
    if (round.clock > 240 && !round.over) { round.over = true; round.end = 'Time\'s up! Let\'s see how you did.'; }
    syncButton();
    if (round.over && !round.endT) round.endT = 0.001;
    if (round.endT) { round.endT += dt; if (round.endT > 1.6) endRound(); }
  } else if (mode !== 'play' && mode !== 'ask') idleT += dt;
}
function draw(dt) {
  ctx = gameCtx;
  ctx.setTransform(scale, 0, 0, scale, 0, OFFY * scale);
  if ((mode === 'play' || mode === 'ask') && round) {
    round.draw();
    drawFact();
    drawBanner(paused || mode === 'ask' ? 0 : dt);
  } else {
    drawMenuBack(idleT);
    if (mode === 'lesson') drawDiagram(dt);
  }
}
titleScreen();
requestAnimationFrame(frame);
