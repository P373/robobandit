// Shared by every RoboBandit game: corner buttons, sound, sharing and pausing.
// Load it (with common.css) before a game's own script; everything lives on the RB object.
const RB = (() => {
  const touch = ('ontouchstart' in window) || matchMedia('(pointer: coarse)').matches;
  // the arcade's front page, worked out from where this file lives (works from folders and from file://)
  const SITE_HOME = new URL('index.html', (document.currentScript && document.currentScript.src) || location.href).href;
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };

  // ---------- Sound ----------
  // One mute setting for the whole site: turn sound off in one game and it stays off in the others.
  let muted = store.get('rb_muted') === '1', ac = null;
  const muteHooks = [];
  function audio() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
    }
    if (ac.state === 'suspended' && !pauseEl) ac.resume();   // phones start audio suspended until a tap (but stay quiet while paused)
    return ac;
  }
  function beep(f1, f2, dur, type = 'triangle', vol = 0.12, delay = 0) {
    if (muted || !audio()) return;
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ac.destination);
    o.start(t); o.stop(t + dur);
  }
  // a burst of fading noise: splashes, whooshes
  function noise(dur, vol = 0.4) {
    pad.rumble(Math.min(dur * 1000, 400), Math.min(1, vol * 1.5));   // crashes and splashes shake the controller too
    if (muted || !audio()) return;
    const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
    const s = ac.createBufferSource(), g = ac.createGain();
    s.buffer = buf; g.gain.value = vol;
    s.connect(g).connect(ac.destination);
    s.start();
  }
  // a looping, filtered noise bed (surf, wind). Set .gain.value on what comes back; muting silences it.
  function ambient(freq = 600) {
    if (!audio()) return null;
    const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(), lp = ac.createBiquadFilter(), g = ac.createGain(), out = ac.createGain();
    src.buffer = buf; src.loop = true;
    lp.type = 'lowpass'; lp.frequency.value = freq;
    out.gain.value = muted ? 0 : 1;
    muteHooks.push(m => { out.gain.value = m ? 0 : 1; });
    g.gain.value = 0;
    src.connect(lp).connect(g).connect(out).connect(ac.destination);
    src.start();
    return g;
  }
  function setMuted(m) {
    muted = m;
    store.set('rb_muted', m ? '1' : '0');
    const b = document.getElementById('btnMute');
    if (b) b.textContent = m ? '🔇' : '🔊';
    muteHooks.forEach(f => f(m));
  }

  // ---------- Sharing ----------
  let toastEl, toastTimer;
  function toast(msg, ms = 2200) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'rb-toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('on'), ms);
  }
  // Shares this game's own page (its canonical link carries the right preview picture).
  async function share({ title = document.title, text = '', url } = {}) {
    const canon = document.querySelector('link[rel=canonical]');
    url = url || (canon ? canon.href : location.href.split(/[?#]/)[0]);
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); } catch (e) { /* closed the share sheet */ }
      return;
    }
    try { await navigator.clipboard.writeText(url); toast('🔗 Link copied! Paste it anywhere to share.'); }
    catch (e) { toast(url, 5000); }
  }

  // ---------- Corner buttons: 🏠 ⏸ 🔊 🔗 ----------
  // home / homeTitle: where 🏠 goes (pages inside a folder point it at that folder's index.html).
  function topbar({ onPause, shareInfo, home = 'index.html', homeTitle = 'All RoboBandit games' } = {}) {
    let bar = document.getElementById('topbar');
    if (!bar) { bar = document.createElement('div'); bar.id = 'topbar'; document.body.appendChild(bar); }
    bar.className = 'rb-topbar';
    bar.innerHTML = '';
    const add = (tag, id, icon, title, onClick) => {
      const el = document.createElement(tag);
      el.id = id; el.textContent = icon; el.title = title;
      if (tag === 'a') el.href = home;
      else el.type = 'button';
      if (onClick) el.addEventListener('click', e => { e.stopPropagation(); el.blur(); onClick(); });
      el.addEventListener('pointerdown', e => e.stopPropagation());
      bar.appendChild(el);
      return el;
    };
    add('a', 'btnHome', '🏠', homeTitle);
    if (onPause) add('button', 'btnPause', '⏸\uFE0F', 'Pause (P)', onPause);
    add('button', 'btnMute', muted ? '🔇' : '🔊', 'Sound on/off (M)', () => { audio(); setMuted(!muted); });
    if (shareInfo) add('button', 'btnShare', '🔗', 'Share this game', () => share(shareInfo));
    return bar;
  }

  // Where 🏠 goes on this page: its own 🏠 button if it has one (folder pages point at their folder), else the arcade.
  function homeHref() {
    const a = document.querySelector('#btnHome[href], .rb-topbar a[href]');
    return a ? a.href : SITE_HOME;
  }

  // ---------- Pausing ----------
  let pauseEl = null;
  function showPause(onResume, { extra = [] } = {}) {
    if (pauseEl) return;
    pauseEl = document.createElement('div');
    pauseEl.className = 'rb-pause';
    pauseEl.innerHTML = `<div class="rb-panel"><h2>PAUSED</h2>
      <button type="button">▶ KEEP PLAYING</button>${extra.map((x, i) => `<button type="button" class="rb-extra" data-x="${i}">${x.label}</button>`).join('')}<a href="${homeHref()}" class="rb-home">🏠 All games</a>
      <div class="rb-hint">${pad.connected ? '🎮 ☰ Menu to carry on · ⧉ View twice for all games' : touch ? 'Tap the button to carry on' : 'Press P or Space to carry on'}</div></div>`;
    pauseEl.querySelector('.rb-home').addEventListener('click', () => dispatchEvent(new Event('rb-leave')));
    pauseEl.addEventListener('pointerdown', e => e.stopPropagation());
    pauseEl.querySelector('button').addEventListener('click', () => { hidePause(); onResume(); });
    pauseEl.querySelectorAll('.rb-extra').forEach(b => b.addEventListener('click', () => extra[+b.dataset.x].onClick()));
    document.body.appendChild(pauseEl);
    if (ac && ac.state === 'running') ac.suspend();   // music, wind and sound effects all stop while paused
  }
  function hidePause() {
    if (!pauseEl) return;
    pauseEl.remove(); pauseEl = null;
    if (ac && ac.state === 'suspended') ac.resume();
  }
  // Calls fn when the player switches tabs or apps, or the window loses focus.
  function onHide(fn) {
    document.addEventListener('visibilitychange', () => { if (document.hidden) fn(); });
    addEventListener('blur', fn);
  }


  // ---------- Game controllers (Xbox and other standard gamepads) ----------
  // During play the controller presses the game's own keys, so every game works without changes:
  //   left stick / D-pad → arrow keys, Ⓐ or RT → Space, Ⓑ or LT → X, Ⓧ → Space, Ⓨ → H,
  //   ☰ Menu → P (pause), ⧉ View → M (sound).
  // Games with a touch joystick (touch-stick.js) also get the left stick as a smooth analog stick.
  // When a menu, pop-up or page of buttons is showing, the D-pad / stick moves a yellow highlight
  // between buttons, Ⓐ presses the highlighted one and Ⓑ is Escape (back).
  const pad = (() => {
    const KEYNAME = { Space: ' ', Enter: 'Enter', Escape: 'Escape', KeyP: 'p', KeyM: 'm', KeyX: 'x', KeyH: 'h', ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight' };
    const BUTTONS = { 0: 'Space', 1: 'KeyX', 2: 'Space', 3: 'KeyH', 6: 'KeyX', 7: 'Space', 9: 'KeyP', 12: 'ArrowUp', 13: 'ArrowDown', 14: 'ArrowLeft', 15: 'ArrowRight' };
    const sticks = [];
    // Controller settings, shared by every game (saved as rb_pad): invert each stick's axes,
    // camera speed, how big the stick dead zone is, and vibration.
    const DEFAULTS = { invLX: false, invLY: false, invRX: false, invRY: false, camSpeed: 1, dead: 1, rumble: true };
    const DEADZONES = [0.12, 0.22, 0.32];   // small, medium, large
    const cfg = { ...DEFAULTS };
    try {
      const saved = JSON.parse(store.get('rb_pad') || 'null');
      if (saved) Object.assign(cfg, saved);
      else {   // Witch Way Out's first camera options carry over
        const old = JSON.parse(store.get('ww_cam') || 'null');
        if (old) { cfg.invRY = !!old.invertY; if (old.speed != null) cfg.camSpeed = old.speed; }
      }
    } catch (e) { /* defaults */ }
    const saveCfg = () => store.set('rb_pad', JSON.stringify(cfg));
    let navOff = false;   // while the controller tester is testing, buttons only light up the picture
    const look = { x: 0, y: 0 }, game = { lx: 0, ly: 0 };   // game: the left stick as games see it   // the right stick, for games with a camera to swing around
    let pressedNow = [], ignore = [];   // ignore: buttons still held from before a menu opened or closed
    let running = false, held = {}, prevBtn = [], menuMode = false, focusEl = null, styled = false, last = { dir: null, t: 0, next: 0 }, cache = { t: 0, list: [] };
    try { if ('gamepadInputEmulation' in navigator) navigator.gamepadInputEmulation = 'gamepad'; } catch (e) { /* old Xbox Edge only */ }

    const pads = () => [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(g => g && g.connected);
    function key(type, code) {
      const ev = new KeyboardEvent(type, { code, key: KEYNAME[code] || code, bubbles: true, cancelable: true });
      (document.body || document).dispatchEvent(ev);
      cache.t = 0;   // the game may open or close a menu now: look again next frame
    }
    function press(code, on) {
      if (!!held[code] === on) return;
      held[code] = on;
      cache.t = 0;   // the game may open or close a menu now: look again next frame
      key(on ? 'keydown' : 'keyup', code);
    }
    const releaseAll = () => { for (const c in held) if (held[c]) press(c, false); };

    // ---- what's on screen: a game being played, or buttons to choose from? ----
    function shown(el) {
      if (el.disabled || el.closest('.rb-topbar, [hidden], [aria-hidden="true"]')) return false;
      if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return false;
      return getComputedStyle(el).pointerEvents !== 'none';
    }
    const big = el => { const r = el.getBoundingClientRect(); return r.width * r.height > innerWidth * innerHeight * 0.4; };
    function choices(fresh = false) {
      const now = performance.now();
      if (!fresh && now - cache.t < 200) return cache.list;
      const all = [...document.querySelectorAll('button, a[href], input, select, [role="button"], [tabindex]:not([tabindex="-1"])')].filter(shown);
      const game = [...document.querySelectorAll('canvas')].some(c => shown(c) && big(c));
      // On a game page only buttons inside a big covering panel count (title screens, pause, quizzes);
      // the small corner buttons and on-screen action buttons are left to the controller's own buttons.
      const inPanel = el => {
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
          const pos = getComputedStyle(a).position;
          if ((pos === 'fixed' || pos === 'absolute') && big(a)) return true;
        }
        return false;
      };
      const modal = document.querySelector('.rb-padscreen');   // the controller screen covers everything else
      cache = { t: now, list: modal ? all.filter(el => modal.contains(el)) : game ? all.filter(inPanel) : all };
      return cache.list;
    }

    // ---- moving the highlight ----
    function style() {
      if (styled) return;
      styled = true;
      const css = document.createElement('style');
      css.textContent = `.rb-pad-focus { outline: 5px solid #ffd84a !important; outline-offset: 3px; box-shadow: 0 0 0 9px rgba(11,42,92,.55) !important; }
        .rb-toast { position: fixed; z-index: 11; left: 50%; bottom: 24px; transform: translateX(-50%); max-width: calc(100% - 32px); padding: 12px 18px;
          border-radius: 14px; color: #fff; background: rgba(8,24,60,.92); font: 700 16px system-ui, sans-serif; text-align: center; pointer-events: none; opacity: 0; transition: opacity .25s; }
        .rb-toast.on { opacity: 1; }`;
      document.head.appendChild(css);
    }
    function setFocus(el) {
      if (focusEl === el) return;
      if (focusEl) focusEl.classList.remove('rb-pad-focus');
      focusEl = el;
      if (!el) return;
      el.classList.add('rb-pad-focus');
      try { el.focus({ preventScroll: true }); } catch (e) { /* not focusable */ }
      el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
    function pickDefault(list) {
      return list.find(el => el.matches('[data-pad-default], [autofocus]'))
        || list.find(el => el.matches('.btn:not(.alt):not(.chip), .big-btn, .go, #btnPlay, #btnStart, #btnGo, #ovBtn, #go, .lvl.next'))
        || list.find(el => el.matches('.card, .lvl:not(.locked)')) || list[0];
    }
    function move(dir, list) {
      if (!focusEl || !list.includes(focusEl)) { setFocus(pickDefault(list)); return; }
      if (focusEl.type === 'range' && (dir === 'ArrowLeft' || dir === 'ArrowRight')) {   // sliders slide
        const s = focusEl, step = (s.max - s.min) / 20 || 1;
        s.value = +s.value + (dir === 'ArrowRight' ? step : -step);
        s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
      const a = focusEl.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
      const [dx, dy] = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[dir];
      let best = null, bestCost = Infinity;
      for (const el of list) {
        if (el === focusEl) continue;
        const b = el.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2;
        const along = (bx - ax) * dx + (by - ay) * dy, side = Math.abs((bx - ax) * dy - (by - ay) * dx);
        if (along <= 4) continue;
        const cost = along + side * 2.2;
        if (cost < bestCost) { bestCost = cost; best = el; }
      }
      if (best) setFocus(best);
    }
    function activate() {
      if (!focusEl || !shown(focusEl)) return;
      if (focusEl.matches('input[type="checkbox"], input[type="radio"]')) focusEl.click();
      else if (focusEl.matches('input, select, textarea')) focusEl.focus();
      else {
        // games listen for pointerdown on some buttons and click on others: send both, like a real tap
        const opt = { bubbles: true, cancelable: true, pointerType: 'mouse', isPrimary: true };
        try { focusEl.dispatchEvent(new PointerEvent('pointerdown', opt)); focusEl.dispatchEvent(new PointerEvent('pointerup', opt)); } catch (e) { /* old browsers */ }
        focusEl.click();
      }
    }

    // ---- ⧉ View: back to all the games (press twice, so nobody leaves by accident) ----
    // The Xbox button itself belongs to the console, so web pages never see it.
    let leaveAt = -1e9, wantHome = 0;
    function leaveRequest(now) {
      const href = homeHref();
      if (href.split('#')[0] === location.href.split('#')[0]) return;   // already home
      if (now - leaveAt < 3000) {
        dispatchEvent(new Event('rb-leave'));   // lets a game save before we go
        location.href = href;
        return;
      }
      leaveAt = now; wantHome = now + 1500;
      if (!menuMode) { key('keydown', 'KeyP'); key('keyup', 'KeyP'); cache.t = 0; }   // pause the game while you decide
      toast('🏠 Press ⧉ View again to go back to all the games');
    }

    // ---- the polling loop ----
    function frame(now) {
      const list = pads();
      if (!list.length) { releaseAll(); running = false; look.x = look.y = 0; pressedNow = []; return; }
      requestAnimationFrame(frame);
      const btn = [], A = [0, 0, 0, 0];
      for (const g of list) {
        g.buttons.forEach((b, i) => { btn[i] = btn[i] || b.pressed || b.value > 0.5; });
        for (const i of [0, 1, 2, 3]) if (Math.abs(g.axes[i] || 0) > Math.abs(A[i])) A[i] = g.axes[i] || 0;
      }
      if (cfg.invLX) A[0] = -A[0];
      if (cfg.invLY) A[1] = -A[1];
      if (cfg.invRX) A[2] = -A[2];
      if (cfg.invRY) A[3] = -A[3];
      const dead = DEADZONES[cfg.dead] != null ? DEADZONES[cfg.dead] : 0.22, rdead = Math.max(0.1, dead - 0.04);
      const rmag = Math.hypot(A[2], A[3]), rk = rmag < rdead ? 0 : Math.min(1, (rmag - rdead) / (1 - rdead)) / rmag;
      look.x = A[2] * rk; look.y = A[3] * rk;
      const mag = Math.hypot(A[0], A[1]);
      const lx = mag < dead ? 0 : A[0] / mag * Math.min(1, (mag - dead) / (1 - dead)), ly = mag < dead ? 0 : A[1] / mag * Math.min(1, (mag - dead) / (1 - dead));
      const edge = i => btn[i] && !prevBtn[i];
      game.lx = lx; game.ly = ly;
      if (navOff) {   // testing: nothing reaches the game or the menus
        releaseAll(); prevBtn = btn; pressedNow = btn; ignore = btn.slice();
        for (const s of sticks) if (s.driving) { s.driving = false; s.stick.x = s.stick.y = 0; s.stick.active = false; }
        return;
      }
      // a button press always looks at the screen as it is right now (a menu may have just closed)
      const anyEdge = btn.some((b, i) => b && !prevBtn[i]);
      const menu = choices(anyEdge).length > 0;
      if (menu !== menuMode) { menuMode = menu; releaseAll(); if (!menu) setFocus(null); ignore = btn.slice(); }
      ignore = ignore.map((b, i) => b && btn[i]);   // a button counts again once it's let go
      if (edge(8)) leaveRequest(now);
      if (menu) {
        const opts = choices();
        if (focusEl && !opts.includes(focusEl)) setFocus(null);
        if (now < wantHome) {   // just pressed View: highlight the way home in the pause menu
          const home = opts.find(el => el.matches('.rb-home, [data-pad-home]') || (el.tagName === 'A' && el.href === homeHref()));
          if (home) { setFocus(home); wantHome = 0; }
        }
        if (!focusEl) setFocus(pickDefault(opts));
        const dir = btn[12] || ly < -0.5 ? 'ArrowUp' : btn[13] || ly > 0.5 ? 'ArrowDown' : btn[14] || lx < -0.5 ? 'ArrowLeft' : btn[15] || lx > 0.5 ? 'ArrowRight' : null;
        if (dir && (dir !== last.dir || now >= last.next)) { move(dir, opts); last.next = now + (dir === last.dir ? 130 : 380); }
        last.dir = dir;
        if (edge(0) || edge(2) || edge(7)) activate();
        if (edge(1)) { if (padScreen) padScreen.close(); else { key('keydown', 'Escape'); key('keyup', 'Escape'); } }
        if (edge(9)) { key('keydown', 'KeyP'); key('keyup', 'KeyP'); }
      } else {
        // the left stick: smooth analog steering where the game has a joystick, arrow keys everywhere else
        const st = sticks.find(s => s.stick.id === null && s.enabled());
        for (const s of sticks) if (s !== st && s.driving) { s.driving = false; s.stick.x = s.stick.y = 0; s.stick.active = false; }
        if (st) {
          st.driving = !!(lx || ly);
          st.stick.x = lx; st.stick.y = ly; st.stick.active = st.driving;
        }
        const want = {};
        for (const i in BUTTONS) if (btn[i] && !ignore[i]) want[BUTTONS[i]] = true;
        if (!st) {
          const on = (v, was) => was ? v > 0.3 : v > 0.5;   // a little stickiness so it doesn't flicker
          if (on(-ly, held.ArrowUp)) want.ArrowUp = true;
          if (on(ly, held.ArrowDown)) want.ArrowDown = true;
          if (on(-lx, held.ArrowLeft)) want.ArrowLeft = true;
          if (on(lx, held.ArrowRight)) want.ArrowRight = true;
        }
        for (const c of new Set([...Object.keys(held), ...Object.keys(want)])) press(c, !!want[c]);
      }
      prevBtn = btn; pressedNow = btn;
    }
    function start() {
      if (running || !pads().length) return;
      running = true; style();
      if (audio) audio();
      requestAnimationFrame(frame);
    }
    addEventListener('gamepadconnected', () => { start(); style(); toast('🎮 Controller ready! Ⓐ to play · ☰ Menu to pause'); });
    addEventListener('gamepaddisconnected', () => { if (!pads().length) { releaseAll(); setFocus(null); } });
    if (pads().length) start();
    return {
      // touch-stick.js registers each joystick so the left stick can drive it smoothly
      addStick(stick, enabled) { sticks.push({ stick, enabled, driving: false }); },
      rumble(ms, strength = 0.6) {
        if (!cfg.rumble) return;
        for (const g of pads()) {
          const v = g.vibrationActuator;
          if (v && v.playEffect) v.playEffect('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: Math.min(1, strength + 0.2) }).catch(() => {});
        }
      },
      get connected() { return pads().length > 0; },
      look,   // { x, y } from the right stick, -1 to 1 (y is +1 pulled down)
      pressed: i => !!pressedNow[i],   // is button i held right now (10 / 11 are the stick clicks)
      get menuMode() { return menuMode; },
      config: cfg, DEFAULTS, DEADZONES, game,
      setConfig(patch) { Object.assign(cfg, patch); saveCfg(); },
      get camSpeed() { return [0.65, 1, 1.45][cfg.camSpeed] || 1; },
      set navOff(v) { navOff = v; if (v) { releaseAll(); setFocus(null); } else ignore = prevBtn.slice(); },
      pads,
    };
  })();

  // ---------- 🎮 Controller tester and settings ----------
  // A full-screen page like gamepad-tester.com: a controller picture lights up every button, shows the
  // sticks and triggers, and lists the raw numbers. While testing, the controller only lights things up
  // (so pressing Ⓐ can't flip a setting); hold Ⓑ to finish testing and move on to the settings.
  let padScreen = null;
  function controllerScreen({ onClose } = {}) {
    if (padScreen) return;
    style2();
    const wrap = document.createElement('div');
    wrap.className = 'rb-padscreen';
    const hiddenPause = pauseEl; if (hiddenPause) hiddenPause.style.display = 'none';
    const B = (i, x, y, r, label, cls = '') => `<g class="b ${cls}" data-b="${i}"><circle cx="${x}" cy="${y}" r="${r}"/><text x="${x}" y="${y + 1}">${label}</text></g>`;
    const R = (i, x, y, w, h, label, rx = 8) => `<g class="b" data-b="${i}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/><text x="${x + w / 2}" y="${y + h / 2 + 1}">${label}</text></g>`;
    wrap.innerHTML = `<div class="rb-panel rb-padpanel">
      <h2>🎮 Controller</h2>
      <div class="pad-status" id="padStatus"></div>
      <svg viewBox="0 0 420 270" class="pad-svg" aria-label="Your controller">
        <g class="trig" data-t="6"><rect x="58" y="6" width="70" height="26" rx="8"/><rect class="fill" x="58" y="6" width="0" height="26" rx="8"/><text x="93" y="20">LT</text></g>
        <g class="trig" data-t="7"><rect x="292" y="6" width="70" height="26" rx="8"/><rect class="fill" x="292" y="6" width="0" height="26" rx="8"/><text x="327" y="20">RT</text></g>
        ${R(4, 52, 38, 84, 20, 'LB')}${R(5, 284, 38, 84, 20, 'RB')}
        <path class="body" d="M70 70 Q 210 50 350 70 Q 405 80 412 170 Q 418 250 360 252 Q 320 254 290 205 L 130 205 Q 100 254 60 252 Q 2 250 8 170 Q 15 80 70 70 Z"/>
        <g class="stick" data-s="L"><circle class="well" cx="110" cy="115" r="34"/>${B(10, 110, 115, 18, 'L', 'knob')}</g>
        <g class="stick" data-s="R"><circle class="well" cx="262" cy="178" r="34"/>${B(11, 262, 178, 18, 'R', 'knob')}</g>
        ${R(12, 146, 140, 22, 24, '▲', 4)}${R(13, 146, 186, 22, 24, '▼', 4)}${R(14, 121, 164, 24, 22, '◀', 4)}${R(15, 169, 164, 24, 22, '▶', 4)}
        ${B(8, 178, 105, 12, '⧉')}${B(9, 242, 105, 12, '☰')}
        ${B(3, 320, 88, 15, 'Y', 'y')}${B(2, 292, 116, 15, 'X', 'x')}${B(1, 348, 116, 15, 'B', 'bb')}${B(0, 320, 144, 15, 'A', 'a')}
      </svg>
      <div class="pad-nums" id="padNums"></div>
      <div class="pad-test" id="padTest">✋ <b>Testing:</b> press every button and move both sticks. <b>Hold Ⓑ</b> to finish testing.
        <div class="hold"><div id="padHold"></div></div></div>
      <div class="pad-settings" id="padSettings">
        <div class="row"><b>Left stick</b> <button type="button" data-k="invLY"></button><button type="button" data-k="invLX"></button></div>
        <div class="row"><b>Right stick (camera)</b> <button type="button" data-k="invRY"></button><button type="button" data-k="invRX"></button></div>
        <div class="row"><b>Camera speed</b> <button type="button" data-k="camSpeed"></button>
          <b>Dead zone</b> <button type="button" data-k="dead"></button></div>
        <div class="row"><b>Vibration</b> <button type="button" data-k="rumble"></button> <button type="button" id="padBuzz">Test 📳</button></div>
        <div class="row"><button type="button" id="padReset" class="alt">↺ Reset to defaults</button>
          <button type="button" id="padRetest" class="alt">🎮 Test again</button>
          <button type="button" id="padDone" data-pad-default>✓ Done</button></div>
      </div></div>`;
    wrap.addEventListener('pointerdown', e => e.stopPropagation());
    document.body.appendChild(wrap);
    padScreen = wrap;
    wrap.close = () => close();
    const $p = sel => wrap.querySelector(sel);
    const cfg = pad.config;
    const NAMES = {
      invLY: v => `Up/down: ${v ? 'Inverted' : 'Normal'}`, invLX: v => `Left/right: ${v ? 'Inverted' : 'Normal'}`,
      invRY: v => `Up/down: ${v ? 'Inverted' : 'Normal'}`, invRX: v => `Left/right: ${v ? 'Inverted' : 'Normal'}`,
      camSpeed: v => ['Slow', 'Normal', 'Fast'][v] || 'Normal', dead: v => ['Small', 'Medium', 'Large'][v] || 'Medium', rumble: v => v ? 'On' : 'Off',
    };
    const paint = () => wrap.querySelectorAll('[data-k]').forEach(b => { b.textContent = NAMES[b.dataset.k](cfg[b.dataset.k]); b.classList.toggle('on', cfg[b.dataset.k] !== pad.DEFAULTS[b.dataset.k]); });
    wrap.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.k, v = cfg[k];
      pad.setConfig({ [k]: typeof v === 'boolean' ? !v : (v + 1) % 3 });
      paint();
    }));
    $p('#padBuzz').addEventListener('click', () => { const was = cfg.rumble; cfg.rumble = true; pad.rumble(400, 0.8); cfg.rumble = was; });
    $p('#padReset').addEventListener('click', () => { pad.setConfig({ ...pad.DEFAULTS }); paint(); });
    let testing = false, holdB = 0, last = performance.now();
    const setTesting = on => {
      testing = on && pad.connected; pad.navOff = testing; holdB = 0;
      if (testing) wrap.dataset.seen = 1;
      wrap.classList.toggle('testing', testing);
    };
    $p('#padRetest').addEventListener('click', () => setTesting(true));
    // keys on the keyboard don't reach the game while this screen is open; Escape closes it
    const keyGuard = e => {
      if (e.code === 'Escape') { e.preventDefault(); close(); }
      e.stopImmediatePropagation();   // (buttons still work: Enter and Space press the highlighted one)
    };
    addEventListener('keydown', keyGuard, true);
    const close = () => {
      removeEventListener('keydown', keyGuard, true);
      pad.navOff = false; padScreen = null; wrap.remove();
      if (hiddenPause) hiddenPause.style.display = '';
      if (onClose) onClose();
    };
    $p('#padDone').addEventListener('click', close);
    paint(); setTesting(true);
    (function draw(now) {
      if (!padScreen) return;
      requestAnimationFrame(draw);
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      const g = pad.pads()[0];
      if (!g) {
        $p('#padStatus').innerHTML = '🔌 No controller found yet. <b>Press any button</b> on your controller to wake it up.';
        $p('#padNums').textContent = '';
        if (testing) setTesting(false);
        return;
      }
      if (!testing && !wrap.dataset.seen) { wrap.dataset.seen = 1; setTesting(true); }
      $p('#padStatus').innerHTML = `✅ <b>${esc(g.id.replace(/\s*\(.*$/, '') || 'Controller')}</b> is connected${g.mapping === 'standard' ? '' : ' (unusual layout: some buttons may differ)'}`;
      const pressed = i => g.buttons[i] && (g.buttons[i].pressed || g.buttons[i].value > 0.5);
      wrap.querySelectorAll('.b').forEach(el => el.classList.toggle('on', !!pressed(+el.dataset.b)));
      wrap.querySelectorAll('.trig').forEach(el => { const v = (g.buttons[+el.dataset.t] || {}).value || 0; el.querySelector('.fill').setAttribute('width', 70 * v); el.classList.toggle('on', v > 0.5); });
      // the sticks: the knob shows the direction the GAME sees (after your invert settings)
      const ax = i => g.axes[i] || 0;
      const seen = [ax(0) * (cfg.invLX ? -1 : 1), ax(1) * (cfg.invLY ? -1 : 1), ax(2) * (cfg.invRX ? -1 : 1), ax(3) * (cfg.invRY ? -1 : 1)];
      for (const [s, cx, cy, i] of [['L', 110, 115, 0], ['R', 262, 178, 2]]) {
        const k = wrap.querySelector(`[data-s="${s}"] .knob`);
        k.setAttribute('transform', `translate(${seen[i] * 20} ${seen[i + 1] * 20})`);
      }
      $p('#padNums').innerHTML = `Left stick <b>${ax(0).toFixed(2)}, ${ax(1).toFixed(2)}</b> · Right stick <b>${ax(2).toFixed(2)}, ${ax(3).toFixed(2)}</b> · Triggers <b>${(((g.buttons[6] || {}).value) || 0).toFixed(2)}, ${(((g.buttons[7] || {}).value) || 0).toFixed(2)}</b>` +
        `<br><span class="raw">${g.buttons.map((b, i) => `<span class="${b.pressed ? 'on' : ''}">${i}</span>`).join('')}</span>`;
      if (testing) {
        holdB = pressed(1) ? holdB + dt : 0;
        $p('#padHold').style.width = Math.min(100, holdB / 1.2 * 100) + '%';
        if (holdB > 1.2) { setTesting(false); }
      }
    })(performance.now());
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let styled2 = false;
  function style2() {
    if (styled2) return;
    styled2 = true;
    const css = document.createElement('style');
    css.textContent = `
      .rb-padscreen { position: fixed; inset: 0; z-index: 12; display: flex; overflow-y: auto; padding: 16px; background: rgba(8,16,40,.86); font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
      .rb-padpanel { margin: auto; width: 100%; max-width: 640px; box-sizing: border-box; text-align: center; color: #0b2a5c; background: #fffdf2;
        border: 4px solid #0b2a5c; border-radius: 22px; box-shadow: 0 8px 0 #0b2a5c; padding: 16px 18px 18px; }
      .rb-padpanel h2 { margin: 0 0 6px; font: 30px 'Bungee', system-ui, sans-serif; }
      .pad-status { font-size: 16px; min-height: 22px; }
      .pad-svg { width: 100%; max-width: 440px; display: block; margin: 6px auto; }
      .pad-svg .body { fill: #2a2f3d; stroke: #0b2a5c; stroke-width: 3; }
      .pad-svg .well { fill: #161a24; }
      .pad-svg .b circle, .pad-svg .b rect, .pad-svg .trig rect { fill: #4a5168; stroke: #0b2a5c; stroke-width: 2; transition: fill .05s; }
      .pad-svg text { fill: #fff; font: 700 13px system-ui, sans-serif; text-anchor: middle; dominant-baseline: middle; pointer-events: none; }
      .pad-svg .b.a circle { fill: #2f8f3a; } .pad-svg .b.bb circle { fill: #b03030; } .pad-svg .b.x circle { fill: #2f5fb0; } .pad-svg .b.y circle { fill: #b09020; }
      .pad-svg .b.on circle, .pad-svg .b.on rect { fill: #ffd84a !important; }
      .pad-svg .b.on text, .pad-svg .trig.on text { fill: #0b2a5c; }
      .pad-svg .knob circle { fill: #8a92a8; }
      .pad-svg .trig .fill { fill: #ffd84a; stroke: none; }
      .pad-nums { font-size: 14px; color: #3a4a6a; }
      .pad-nums .raw span { display: inline-block; min-width: 18px; margin: 3px 1px; padding: 1px 3px; border-radius: 5px; background: #e6ebf5; font-size: 12px; }
      .pad-nums .raw span.on { background: #ffd84a; }
      .pad-test { display: none; margin: 10px 0; padding: 10px; border-radius: 14px; background: #fff3b0; font-size: 16px; }
      .rb-padscreen.testing .pad-test { display: block; }
      .rb-padscreen.testing .pad-settings { opacity: .45; }
      .pad-test .hold { height: 10px; margin-top: 8px; border-radius: 5px; background: #e6d38a; overflow: hidden; }
      .pad-test .hold div { height: 100%; width: 0; background: #b03030; }
      .pad-settings .row { margin: 8px 0; font-size: 15px; }
      .pad-settings button { font: 700 15px system-ui, sans-serif; padding: 8px 12px; margin: 3px; border-radius: 12px; border: 3px solid #0b2a5c; background: #fff; color: #0b2a5c; cursor: pointer; }
      .pad-settings button.on { background: #ffe7a0; }
      .pad-settings #padDone { background: #ffd84a; box-shadow: 0 4px 0 #0b2a5c; }`;
    document.head.appendChild(css);
  }

  return {
    touch, store, audio, pad, beep, noise, ambient, setMuted,
    get muted() { return muted; },
    toggleMute: () => { audio(); setMuted(!muted); },
    onMute: f => muteHooks.push(f),
    toast, share, topbar, showPause, hidePause, onHide, controllerScreen,
    get pauseShowing() { return !!pauseEl; },
  };
})();
