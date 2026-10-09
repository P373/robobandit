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
  function showPause(onResume) {
    if (pauseEl) return;
    pauseEl = document.createElement('div');
    pauseEl.className = 'rb-pause';
    pauseEl.innerHTML = `<div class="rb-panel"><h2>PAUSED</h2>
      <button type="button">▶ KEEP PLAYING</button><a href="${homeHref()}" class="rb-home">🏠 All games</a>
      <div class="rb-hint">${pad.connected ? '🎮 ☰ Menu to carry on · ⧉ View twice for all games' : touch ? 'Tap the button to carry on' : 'Press P or Space to carry on'}</div></div>`;
    pauseEl.querySelector('.rb-home').addEventListener('click', () => dispatchEvent(new Event('rb-leave')));
    pauseEl.addEventListener('pointerdown', e => e.stopPropagation());
    pauseEl.querySelector('button').addEventListener('click', () => { hidePause(); onResume(); });
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
    const look = { x: 0, y: 0 };   // the right stick, for games with a camera to swing around
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
      cache = { t: now, list: game ? all.filter(inPanel) : all };
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
      const rmag = Math.hypot(A[2], A[3]), rk = rmag < 0.18 ? 0 : Math.min(1, (rmag - 0.18) / 0.82) / rmag;
      look.x = A[2] * rk; look.y = A[3] * rk;
      const mag = Math.hypot(A[0], A[1]), dead = 0.22;
      const lx = mag < dead ? 0 : A[0] / mag * Math.min(1, (mag - dead) / (1 - dead)), ly = mag < dead ? 0 : A[1] / mag * Math.min(1, (mag - dead) / (1 - dead));
      const edge = i => btn[i] && !prevBtn[i];
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
        if (edge(1)) { key('keydown', 'Escape'); key('keyup', 'Escape'); }
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
        for (const g of pads()) {
          const v = g.vibrationActuator;
          if (v && v.playEffect) v.playEffect('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: Math.min(1, strength + 0.2) }).catch(() => {});
        }
      },
      get connected() { return pads().length > 0; },
      look,   // { x, y } from the right stick, -1 to 1 (y is +1 pulled down)
      pressed: i => !!pressedNow[i],   // is button i held right now (10 / 11 are the stick clicks)
      get menuMode() { return menuMode; },
    };
  })();

  return {
    touch, store, audio, pad, beep, noise, ambient, setMuted,
    get muted() { return muted; },
    toggleMute: () => { audio(); setMuted(!muted); },
    onMute: f => muteHooks.push(f),
    toast, share, topbar, showPause, hidePause, onHide,
    get pauseShowing() { return !!pauseEl; },
  };
})();
