// Shared by every RoboBandit game: corner buttons, sound, sharing and pausing.
// Load it (with common.css) before a game's own script; everything lives on the RB object.
const RB = (() => {
  const touch = ('ontouchstart' in window) || matchMedia('(pointer: coarse)').matches;
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
    if (ac.state === 'suspended') ac.resume();   // phones start audio suspended until a tap
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
  function topbar({ onPause, shareInfo } = {}) {
    let bar = document.getElementById('topbar');
    if (!bar) { bar = document.createElement('div'); bar.id = 'topbar'; document.body.appendChild(bar); }
    bar.className = 'rb-topbar';
    bar.innerHTML = '';
    const add = (tag, id, icon, title, onClick) => {
      const el = document.createElement(tag);
      el.id = id; el.textContent = icon; el.title = title;
      if (tag === 'a') el.href = 'index.html';
      else el.type = 'button';
      if (onClick) el.addEventListener('click', e => { e.stopPropagation(); el.blur(); onClick(); });
      el.addEventListener('pointerdown', e => e.stopPropagation());
      bar.appendChild(el);
      return el;
    };
    add('a', 'btnHome', '🏠', 'All RoboBandit games');
    if (onPause) add('button', 'btnPause', '⏸\uFE0F', 'Pause (P)', onPause);
    add('button', 'btnMute', muted ? '🔇' : '🔊', 'Sound on/off (M)', () => { audio(); setMuted(!muted); });
    if (shareInfo) add('button', 'btnShare', '🔗', 'Share this game', () => share(shareInfo));
    return bar;
  }

  // ---------- Pausing ----------
  let pauseEl = null;
  function showPause(onResume) {
    if (pauseEl) return;
    pauseEl = document.createElement('div');
    pauseEl.className = 'rb-pause';
    pauseEl.innerHTML = `<div class="rb-panel"><h2>PAUSED</h2>
      <button type="button">▶ KEEP PLAYING</button><a href="index.html">🏠 All games</a>
      <div class="rb-hint">${touch ? 'Tap the button to carry on' : 'Press P or Space to carry on'}</div></div>`;
    pauseEl.addEventListener('pointerdown', e => e.stopPropagation());
    pauseEl.querySelector('button').addEventListener('click', () => { hidePause(); onResume(); });
    document.body.appendChild(pauseEl);
  }
  function hidePause() { if (pauseEl) { pauseEl.remove(); pauseEl = null; } }
  // Calls fn when the player switches tabs or apps, or the window loses focus.
  function onHide(fn) {
    document.addEventListener('visibilitychange', () => { if (document.hidden) fn(); });
    addEventListener('blur', fn);
  }

  return {
    touch, store, audio, beep, noise, ambient, setMuted,
    get muted() { return muted; },
    toggleMute: () => { audio(); setMuted(!muted); },
    onMute: f => muteHooks.push(f),
    toast, share, topbar, showPause, hidePause, onHide,
    get pauseShowing() { return !!pauseEl; },
  };
})();
