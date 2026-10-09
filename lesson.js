// Shared engine for RoboBandit school lessons (5th-grade/*.html and friends). Load after common.js.
// A page calls School.start(unit): a list of lessons (slides with animated pictures, then a quiz) and games,
// plus the drawing functions for its pictures. See 5th-grade/math.html for a complete example.
//
// unit = {
//   id, title, icon, tagline, home,                    // id names the save slot; home is where 🏠 goes
//   items: [
//     { kind: 'lesson', id, icon, name, sub, badge,
//       slides: [{ k: 'WHAT IS IT?', t: 'Title', d: 'diagramKey', p: 'Words, with **bold** words', v: [['word', 'meaning']] }],
//       quiz: [{ q, a: [right, wrong, wrong], why }] },  // right answer first; they get shuffled
//     { kind: 'game', id, icon, name, sub, badge, how: [[emoji, text]], make: api => ({ tick(dt), bot(), stop() }) },
//   ],
//   diagrams: { diagramKey: (d, t) => { ... } },        // d is the drawing kit below, t is seconds since the slide opened
// }
'use strict';
const School = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rich = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const plain = s => String(s).replace(/\*\*/g, '');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const starStr = n => '★'.repeat(n) + '☆'.repeat(3 - n);
  const DW = 960, DH = 540, QUIZ_LEN = 4, PER_RIGHT = 100;

  const sfx = {
    click: () => RB.beep(660, 880, 0.05, 'square', 0.04),
    right: () => { RB.beep(660, 990, 0.12, 'triangle', 0.12); RB.beep(990, 1320, 0.16, 'triangle', 0.1, 0.1); },
    wrong: () => RB.beep(300, 160, 0.3, 'sawtooth', 0.06),
    pop: () => RB.beep(500, 900, 0.08, 'sine', 0.1),
    win: () => [523, 659, 784, 1047].forEach((f, i) => RB.beep(f, f * 1.01, 0.2, 'triangle', 0.1, i * 0.1)),
  };

  // ---------- Drawing kit for the lesson pictures and game boards ----------
  // Everything is drawn on a 960×540 canvas, whatever size it shows at; keep words 24px or bigger so they read on phones.
  const FONT = "'Fredoka', system-ui, sans-serif", EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const d = {
    W: DW, H: DH, ctx: null, clamp, lerp,
    // 0→1 (eased) between `at` and `at + dur` seconds
    in: (t, at, dur = 0.6) => { const k = clamp((t - at) / dur, 0, 1); return 1 - (1 - k) ** 3; },
    // 0→1 repeating every `period` seconds
    loop: (t, period) => (t % period) / period,
    bg(top, bot = top) {
      const c = d.ctx, g = c.createLinearGradient(0, 0, 0, DH);
      g.addColorStop(0, top); g.addColorStop(1, bot);
      c.fillStyle = g; c.fillRect(0, 0, DW, DH);
    },
    path(x, y, w, h, r) {
      const c = d.ctx; r = Math.min(r, w / 2, h / 2);
      c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    },
    paint(o) {
      const c = d.ctx;
      if (o.fill) { c.fillStyle = o.fill; c.fill(); }
      if (o.stroke) { c.strokeStyle = o.stroke; c.lineWidth = o.lw || 3; c.setLineDash(o.dash || []); c.stroke(); c.setLineDash([]); }
    },
    rect(x, y, w, h, o = {}) { d.path(x, y, w, h, o.r == null ? 10 : o.r); d.paint(o); },
    circle(x, y, r, o = {}) { d.ctx.beginPath(); d.ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); d.paint(o); },
    ellipse(x, y, rx, ry, o = {}) { d.ctx.beginPath(); d.ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), o.rot || 0, 0, Math.PI * 2); d.paint(o); },
    poly(pts, o = {}) {
      const c = d.ctx; c.beginPath();
      pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
      if (o.close) c.closePath();
      c.lineJoin = c.lineCap = 'round';
      d.paint(o.close ? o : { stroke: o.stroke || '#14254d', lw: o.lw, dash: o.dash });
    },
    line(x1, y1, x2, y2, o = {}) { d.poly([[x1, y1], [x2, y2]], o); },
    arrow(x1, y1, x2, y2, o = {}) {
      const c = d.ctx, col = o.color || '#14254d', lw = o.lw || 6, hd = o.head || 18, a = Math.atan2(y2 - y1, x2 - x1);
      c.save(); c.strokeStyle = c.fillStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.setLineDash(o.dash || []);
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2 - Math.cos(a) * hd * 0.6, y2 - Math.sin(a) * hd * 0.6); c.stroke();
      c.setLineDash([]); c.beginPath(); c.moveTo(x2, y2);
      c.lineTo(x2 - Math.cos(a - 0.45) * hd, y2 - Math.sin(a - 0.45) * hd);
      c.lineTo(x2 - Math.cos(a + 0.45) * hd, y2 - Math.sin(a + 0.45) * hd); c.closePath(); c.fill();
      c.restore();
    },
    // a curved arrow from (x1,y1) to (x2,y2) bending through the control point (cx,cy)
    curve(x1, y1, cx, cy, x2, y2, o = {}) {
      const c = d.ctx, col = o.color || '#14254d', lw = o.lw || 6, hd = o.head || 18;
      c.save(); c.strokeStyle = c.fillStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.setLineDash(o.dash || []);
      c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(cx, cy, x2, y2); c.stroke(); c.setLineDash([]);
      if (hd) {
        const a = Math.atan2(y2 - cy, x2 - cx);
        c.beginPath(); c.moveTo(x2, y2);
        c.lineTo(x2 - Math.cos(a - 0.45) * hd, y2 - Math.sin(a - 0.45) * hd);
        c.lineTo(x2 - Math.cos(a + 0.45) * hd, y2 - Math.sin(a + 0.45) * hd); c.closePath(); c.fill();
      }
      c.restore();
    },
    // point k (0..1) of the way along that same curve
    onCurve: (x1, y1, cx, cy, x2, y2, k) => [(1 - k) ** 2 * x1 + 2 * (1 - k) * k * cx + k * k * x2, (1 - k) ** 2 * y1 + 2 * (1 - k) * k * cy + k * k * y2],
    text(s, x, y, o = {}) {
      const c = d.ctx;
      c.save();
      c.font = `${o.weight || 600} ${o.size || 28}px ${o.font || FONT}`;
      c.textAlign = o.align || 'center'; c.textBaseline = o.base || 'middle';
      if (o.alpha != null) c.globalAlpha *= o.alpha;
      if (o.stroke) { c.lineWidth = o.lw || 6; c.strokeStyle = o.stroke; c.lineJoin = 'round'; c.strokeText(s, x, y, o.maxW); }
      c.fillStyle = o.color || '#14254d';
      c.fillText(s, x, y, o.maxW);
      c.restore();
    },
    // word-wrapped text; returns the y just below the last line
    wrap(s, x, y, maxW, o = {}) {
      const c = d.ctx, size = o.size || 26, lh = size * (o.lh || 1.25);
      c.save(); c.font = `${o.weight || 600} ${size}px ${FONT}`;
      const lines = [];
      let line = '';
      for (const w of String(s).split(' ')) {
        const tryL = line ? line + ' ' + w : w;
        if (c.measureText(tryL).width > maxW && line) { lines.push(line); line = w; } else line = tryL;
      }
      lines.push(line);
      c.restore();
      lines.forEach((l, i) => d.text(l, x, y + i * lh, { ...o, size, base: o.base || 'top' }));
      return y + lines.length * lh;
    },
    emoji(e, x, y, size = 48, o = {}) {
      const c = d.ctx;
      c.save(); c.translate(x, y);
      if (o.rot) c.rotate(o.rot);
      if (o.flip) c.scale(-1, 1);
      if (o.alpha != null) c.globalAlpha *= o.alpha;
      // an opaque fill: browsers fade colour emoji by the alpha of whatever fill was used last
      c.font = `${size}px ${EMOJI}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000';
      c.fillText(e, 0, size * 0.06);
      c.restore();
    },
    // a rounded label with words in it, centred on (x, y)
    pill(s, x, y, o = {}) {
      const c = d.ctx, size = o.size || 24;
      c.save(); c.font = `${o.weight || 700} ${size}px ${FONT}`;
      const w = c.measureText(s).width + size * 1.1, h = size * 1.6;
      c.restore();
      d.alpha(o.alpha == null ? 1 : o.alpha, () => {
        d.rect(x - w / 2, y - h / 2, w, h, { r: o.r == null ? h / 2 : o.r, fill: o.bg || '#fff', stroke: o.line || '#14254d', lw: o.lw || 3 });
        d.text(s, x, y + 1, { size, color: o.color || '#14254d', weight: o.weight || 700 });
      });
      return w;
    },
    alpha(a, fn) { const c = d.ctx; c.save(); c.globalAlpha *= clamp(a, 0, 1); fn(); c.restore(); },
    at(x, y, rot, scale, fn) { const c = d.ctx; c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(scale || 1, scale || 1); fn(); c.restore(); },
    // a simple person: skin, shirt colour, optional hat/hair; faces right
    person(x, y, s = 1, o = {}) {
      d.at(x, y, 0, s, () => {
        d.rect(-14, -6, 28, 46, { r: 10, fill: o.shirt || '#3d8ff0' });
        d.line(-8, 40, -10, 70, { stroke: o.pants || '#3a3f58', lw: 9 }); d.line(8, 40, 10, 70, { stroke: o.pants || '#3a3f58', lw: 9 });
        d.circle(0, -24, 17, { fill: o.skin || '#c98d5f' });
        if (o.hair) d.ellipse(0, -34, 18, 9, { fill: o.hair });
        if (o.hat) { d.ellipse(0, -36, 30, 6, { fill: o.hat }); d.rect(-14, -54, 28, 18, { r: 6, fill: o.hat }); }
        d.circle(6, -26, 2.5, { fill: '#14254d' });
      });
    },
  };

  // Sets up a canvas to draw at 960×540 logical pixels, sharp on any screen. Returns draw(fn) → fn(d).
  function board(cv) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), bctx = cv.getContext('2d');
    cv.width = DW * dpr; cv.height = DH * dpr;
    return fn => {
      const prev = d.ctx; d.ctx = bctx;
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.clearRect(0, 0, DW, DH);
      try { fn(d); } finally { d.ctx = prev; }
    };
  }

  // ---------- Saving ----------
  // { stars: {itemId: 0-3}, best: {itemId: score}, name }
  let U, save, key;
  function load() {
    try { save = JSON.parse(RB.store.get(key)) || {}; } catch (e) { save = {}; }
    save.stars = save.stars || {}; save.best = save.best || {}; save.name = save.name || '';
  }
  const persist = () => RB.store.set(key, JSON.stringify(save));
  const doneCount = () => U.items.filter(it => save.stars[it.id] > 0).length;
  const totalScore = () => U.items.reduce((a, it) => a + (save.best[it.id] || 0), 0);

  // ---------- Screens ----------
  let card, crumb, mode = 'map', cur = 0, slide = 0, quiz = [], qi = 0, qRight = 0, answered = false;
  let drawDia = null, diaT = 0, game = null;
  const item = () => U.items[cur];
  const num = it => it.kind === 'lesson' ? 'Lesson ' + (U.items.filter(x => x.kind === 'lesson').indexOf(it) + 1) : 'Game';

  function show(html) {
    stopGame(); quiet();
    card.innerHTML = html;
    // the "Lesson 1 · …" label goes up in the top-left corner, beside the 🏠 🔊 🔗 buttons, to save a row
    const chip = card.querySelector(':scope > .chip');
    crumb.replaceChildren(...(chip ? [chip] : []));
    drawDia = null;
    window.scrollTo(0, 0);
    fit();
  }
  // Sizes the picture or game board so the whole screen fits without scrolling (tablets, laptops),
  // down to a minimum; on phones the page scrolls and the button row stays stuck to the bottom.
  function fit() {
    const cvs = [...card.querySelectorAll('#dia, .board')];
    if (!cvs.length) return;
    cvs.forEach(c => { c.style.width = '100%'; });
    const over = document.documentElement.scrollHeight - innerHeight;
    if (over <= 0) return;
    cvs.forEach(c => {
      const h = c.getBoundingClientRect().height, nh = Math.max(170, h - over / cvs.length - 2);
      c.style.width = Math.round(nh * 16 / 9) + 'px';
    });
  }
  addEventListener('resize', () => fit());
  function on(id, fn) { const el = $(id); if (el) el.addEventListener('click', () => { RB.audio(); sfx.click(); fn(); }); }

  function mapScreen() {
    mode = 'map';
    const next = U.items.findIndex(it => !(save.stars[it.id] > 0));
    const tiles = U.items.map((it, i) => `<button class="tile ${it.kind}${i === next ? ' next' : ''}" data-i="${i}">
      <span class="ic">${it.icon}</span><span class="kind">${it.kind === 'game' ? '🎮 GAME' : num(it).toUpperCase()}</span>
      <b>${esc(it.name)}</b><small>${esc(it.sub || '')}</small>
      <span class="st">${starStr(save.stars[it.id] || 0)}</span></button>`).join('');
    show(`<span class="chip">${esc(U.grade || '')}</span>
      <h1>${esc(U.title)}</h1>
      <p class="lead">${rich(U.tagline || '')}</p>
      <div class="path">${tiles}</div>
      <p>🏆 Total score: <b>${totalScore()}</b> · ${doneCount()} of ${U.items.length} done</p>
      ${next >= 0 ? `<button class="btn" id="next">▶ ${next ? 'Next' : 'Start'}: ${U.items[next].icon} ${esc(U.items[next].name)}</button>` : ''}
      ${doneCount() === U.items.length ? '<button class="btn" id="cert">🎓 My certificate</button>' : ''}`);
    card.querySelectorAll('.tile').forEach(b => b.addEventListener('click', () => { RB.audio(); sfx.click(); open(+b.dataset.i); }));
    on('next', () => open(next));
    on('cert', certScreen);
  }

  function open(i) {
    cur = i; slide = 0;
    if (item().kind === 'lesson') lessonScreen(); else gameIntro();
  }

  function lessonScreen() {
    mode = 'lesson';
    const L = item(), S = L.slides[slide], lastSlide = slide === L.slides.length - 1;
    show(`<span class="chip">${num(L)} · ${L.icon} ${esc(L.name)}</span>
      ${S.k ? `<div class="kicker">${esc(S.k)}</div>` : ''}
      <h2>${esc(S.t)}</h2>
      <canvas id="dia" role="img" aria-label="${esc(S.t)}"></canvas>
      <p class="say">${rich(S.p)}</p>
      ${S.v ? `<div class="vocab">${S.v.map(([w, m]) => `<span><b>${esc(w)}</b>: ${esc(m)}</span>`).join('')}</div>` : ''}
      <div class="dots">${L.slides.map((_, k) => k === slide ? '<b>●</b>' : '●').join('')}</div>
      <div class="nav"><button class="btn alt" id="back">◀<span class="wide"> ${slide ? 'Back' : 'Map'}</span></button>
      ${'speechSynthesis' in window ? '<button class="btn alt" id="read" title="Read to me">🔈<span class="wide"> Read to me</span></button>' : ''}
      <button class="btn go" id="fwd">${lastSlide ? 'Quiz time! 🧠' : 'Next ▶'}</button></div>`);
    drawDia = board($('dia'));
    diaT = 0;
    drawDiagram(0);
    on('back', back);
    on('fwd', fwd);
    on('read', () => speak(plain(S.t) + '. ' + plain(S.p)));
  }
  function back() { if (slide) { slide--; lessonScreen(); } else mapScreen(); }
  function fwd() { if (slide === item().slides.length - 1) startQuiz(); else { slide++; lessonScreen(); } }
  function drawDiagram(dt) {
    if (!drawDia) return;
    diaT += dt;
    const k = item().slides[slide].d, fn = U.diagrams[k];
    if (!fn) throw new Error('no picture called ' + k);
    drawDia(dd => fn(dd, diaT));
  }

  function speak(s) {
    if (!('speechSynthesis' in window)) return;
    if (speechSynthesis.speaking) { speechSynthesis.cancel(); return; }
    const u = new SpeechSynthesisUtterance(s);
    u.rate = 0.95;
    speechSynthesis.speak(u);
  }
  function quiet() { if ('speechSynthesis' in window && speechSynthesis.speaking) speechSynthesis.cancel(); }

  function startQuiz() {
    quiz = shuffle(item().quiz).slice(0, QUIZ_LEN).map(q => ({ ...q, opts: shuffle(q.a.map((s, k) => ({ s, right: k === 0 }))) }));
    qi = 0; qRight = 0; quizScreen();
  }
  function quizScreen() {
    mode = 'quiz'; answered = false;
    const q = quiz[qi];
    show(`<span class="chip">🧠 Quiz · ${esc(item().name)} · Question ${qi + 1} of ${quiz.length}</span>
      <h2>${esc(q.q)}</h2>
      <div class="answers">${q.opts.map((o, k) => `<button class="ans" data-k="${k}">${'ABC'[k]}. ${esc(o.s)}</button>`).join('')}</div>
      <div id="fb"></div>`);
    card.querySelectorAll('.ans').forEach(b => b.addEventListener('click', () => answer(+b.dataset.k)));
  }
  function answer(k) {
    if (answered || mode !== 'quiz') return;
    answered = true; RB.audio();
    const q = quiz[qi], right = q.opts[k].right;
    if (right) { qRight++; sfx.right(); } else sfx.wrong();
    card.querySelectorAll('.ans').forEach((b, j) => {
      b.disabled = true;
      if (q.opts[j].right) b.classList.add('right');
      else if (j === k) b.classList.add('wrong');
    });
    const lastQ = qi === quiz.length - 1;
    $('fb').innerHTML = `<div class="why"><b>${right ? '✅ Right! +100' : '❌ Not quite.'}</b> ${rich(q.why)}</div>
      <div class="nav"><button class="btn go" id="nextQ">${lastQ ? 'See my stars ▶' : 'Next question ▶'}</button></div>`;
    on('nextQ', nextQ);
    $('fb').scrollIntoView({ block: 'nearest' });
  }
  function nextQ() {
    if (!answered) return;
    if (qi === quiz.length - 1) finish({ score: qRight * PER_RIGHT, stars: 1 + (qRight >= 3 ? 1 : 0) + (qRight === quiz.length ? 1 : 0),
      rows: [['🧠 Quiz: ' + qRight + ' of ' + quiz.length + ' right', qRight * PER_RIGHT]], hint: 'Get every question right for ★★★' });
    else { qi++; quizScreen(); }
  }

  function gameIntro() {
    mode = 'gameIntro';
    const G = item();
    show(`<span class="chip">🎮 Game · ${G.icon} ${esc(G.name)}</span>
      <h2>${G.icon} ${esc(G.name)}</h2>
      <ul class="how">${G.how.map(([e, s]) => `<li><span class="e">${e}</span><span>${s}</span></li>`).join('')}</ul>
      <div class="nav"><button class="btn alt" id="back">◀ Map</button>
      <button class="btn go" id="go">▶ Play!</button></div>`);
    on('back', mapScreen);
    on('go', startGame);
  }
  function startGame() {
    mode = 'game';
    const G = item();
    show(`<span class="chip">🎮 ${G.icon} ${esc(G.name)}</span><div id="gameRoot"></div>
      <button class="btn alt" id="quit" style="font-size:16px">◀ Map</button>`);
    on('quit', mapScreen);
    const api = { root: $('gameRoot'), d, board, sfx, esc, rich, shuffle, clamp, lerp, $, done: r => { if (mode === 'game') finish(r); } };
    game = G.make(api);
    fit();
  }
  function stopGame() { if (game && game.stop) game.stop(); game = null; }

  // the end of a lesson or game: stars, score and what to do next
  function finish(r) {
    mode = 'done';
    const it = item(), newBest = r.score > (save.best[it.id] || 0);
    save.best[it.id] = Math.max(save.best[it.id] || 0, r.score);
    save.stars[it.id] = Math.max(save.stars[it.id] || 0, r.stars);
    persist();
    sfx.win();
    const nxt = U.items[cur + 1];
    show(`<span class="chip">${it.kind === 'game' ? '🎮 Game' : num(it)} complete!</span>
      <h2>${it.icon} ${it.badge ? `You earned the <b>${esc(it.badge)}</b> badge!` : 'Nice work!'}</h2>
      <div class="stars">${starStr(r.stars)}</div>
      <div class="rows">${r.rows.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}
        <div class="tot"><span>Score</span><span>${r.score}</span></div></div>
      ${newBest ? '<p>🎉 New best!</p>' : ''}
      ${r.stars < 3 && r.hint ? `<p style="font-size:17px;color:var(--soft)">${esc(r.hint)}</p>` : ''}
      <div class="nav"><button class="btn alt" id="again">↺ ${it.kind === 'game' ? 'Play again' : 'Review'}</button>
      <button class="btn alt" id="map">🗺️ Map</button>
      ${nxt ? `<button class="btn go" id="nextIt">Next: ${nxt.icon} ${esc(nxt.name)} ▶</button>` : '<button class="btn go" id="cert">🎓 My certificate</button>'}</div>`);
    on('again', () => open(cur));
    on('map', mapScreen);
    on('nextIt', () => open(cur + 1));
    on('cert', certScreen);
  }

  function certScreen() {
    mode = 'cert';
    const all = doneCount() === U.items.length, when = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const stars = U.items.reduce((a, it) => a + (save.stars[it.id] || 0), 0);
    show(`<div class="cert">
        <div style="font-size:44px">🎓</div>
        <h1 style="font-size:28px">${esc(U.certTitle || U.title)}</h1>
        <p>This certifies that</p>
        <div class="nm" id="nm">${esc(save.name || 'Super Student')}</div>
        <p>${all ? esc(U.certText || 'finished every lesson and game!') : 'is on the way! Finish every lesson and game to complete it.'}</p>
        <div class="badges">${U.items.map(it => save.stars[it.id] ? it.icon : '⬜').join('')}</div>
        <p>⭐ ${stars} of ${U.items.length * 3} stars · 🏆 ${totalScore()} points</p>
        <p style="font-size:15px;color:#7a6a3a">${when} · RoboBandit ${esc(U.grade || '')}</p>
      </div>
      <p><input type="text" id="name" maxlength="24" placeholder="Type your name" value="${esc(save.name)}"></p>
      <button class="btn alt" id="map">🗺️ Map</button>`);
    const inp = $('name');
    inp.addEventListener('input', () => { save.name = inp.value.slice(0, 24); $('nm').textContent = save.name || 'Super Student'; persist(); });
    on('map', mapScreen);
  }

  // ---------- Keys: ← → for slides, 1-3 or A-C for answers, Enter to carry on, M for sound ----------
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'm') { RB.toggleMute(); return; }
    if (mode === 'lesson') {
      if (k === 'arrowright' || k === 'enter') { e.preventDefault(); RB.audio(); fwd(); }
      if (k === 'arrowleft') { e.preventDefault(); back(); }
    } else if (mode === 'quiz') {
      const n = '123abc'.indexOf(k);
      if (n >= 0 && !answered) answer(n % 3);
      else if ((k === 'enter' || k === 'arrowright') && answered) { e.preventDefault(); nextQ(); }
    } else if (game && game.key) game.key(k, e);
  });

  // ---------- Main loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    tick(dt);
    requestAnimationFrame(frame);
  }
  function tick(dt) {
    if (mode === 'lesson') drawDiagram(dt);
    else if (mode === 'game' && game && game.tick) game.tick(dt);
  }

  function start(unit) {
    U = unit; key = 'rb_' + unit.id;
    load();
    card = $('card');
    crumb = document.createElement('div'); crumb.className = 'crumb'; document.body.appendChild(crumb);
    RB.topbar({ home: unit.home || 'index.html', homeTitle: unit.homeTitle || 'Back to the folder',
      shareInfo: { title: document.title, text: unit.shareText || '' } });
    mapScreen();
    requestAnimationFrame(frame);
  }

  return {
    start, d, board, sfx, esc, shuffle,
    // for tests/run.js
    test: {
      get mode() { return mode; }, get game() { return game; }, get save() { return save; }, get unit() { return U; },
      open, tick, fwd, answer, nextQ, mapScreen,
      slide(i, s) { cur = i; slide = s; lessonScreen(); },
      draw: dt => drawDiagram(dt),
      // answers the current quiz question right (or wrong)
      pick(right = true) { answer(quiz[qi].opts.findIndex(o => o.right === right)); },
    },
  };
})();
