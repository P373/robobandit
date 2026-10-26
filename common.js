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
      // iPads and iPhones can stop the sound by themselves ("interrupted": a call, another app, the device voice
      // speaking, the screen locking). Whenever that happens, start it again as soon as the browser lets us.
      ac.onstatechange = () => { if (ac.state !== 'running' && ac.state !== 'closed' && !pauseEl && !document.hidden) setTimeout(wake, 300); };
    }
    wake();
    return ac;
  }
  // phones start audio suspended until a tap; Safari also has an "interrupted" state. Either way: back on (but stay quiet while paused)
  function wake() { if (ac && ac.state !== 'running' && ac.state !== 'closed' && !pauseEl) { try { const p = ac.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* not allowed yet */ } } }
  // every tap, click or key is a chance to wake the sound up again (browsers only allow it after a touch)
  for (const ev of ['pointerdown', 'touchend', 'keydown']) addEventListener(ev, wake, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
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
  function topbar({ onPause, shareInfo, home = 'index.html', homeTitle = 'All RoboBandit games', minimal = false } = {}) {   // minimal: just ☰ (home, sound and share are in the menu)
    let bar = document.getElementById('topbar');
    if (!bar) { bar = document.createElement('div'); bar.id = 'topbar'; document.body.appendChild(bar); }
    bar.className = 'rb-topbar';
    bar.innerHTML = '';
    const add = (tag, id, icon, title, onClick) => {
      const el = document.createElement(tag);
      el.id = id; el.textContent = icon; el.title = title;
      if (tag === 'a') { el.href = home; el.addEventListener('click', () => dispatchEvent(new Event('rb-leave'))); }
      else el.type = 'button';
      if (onClick) el.addEventListener('click', e => { e.stopPropagation(); el.blur(); onClick(); });
      el.addEventListener('pointerdown', e => e.stopPropagation());
      bar.appendChild(el);
      return el;
    };
    menuButton(bar);
    menuShare = shareInfo || null;
    if (minimal) { bar.classList.add('rb-minimal'); return bar; }
    add('a', 'btnHome', '🏠', homeTitle);
    if (onPause) add('button', 'btnPause', '⏸\uFE0F', 'Pause (Esc)', onPause);
    add('button', 'btnMute', muted ? '🔇' : '🔊', 'Sound on/off (N)', () => { audio(); setMuted(!muted); });
    if (shareInfo) add('button', 'btnShare', '🔗', 'Share this game', () => share(shareInfo));
    menuShare = shareInfo || null;
    return bar;
  }

  // ---------- 🗣️ Read aloud ----------
  // Browsers come with several voices and the default is often the most robotic one. This picks the
  // nicest-sounding English voice on the device (a child's voice where there is one, then the "natural",
  // "neural", "enhanced" and "premium" ones, Siri's, Google's), speaks a little slower and brighter for kids,
  // reads long text a sentence at a time (some browsers cut off long speech) with a lift on excited and
  // questioning sentences, and remembers a voice chosen in the ☰ menu (rb_voice).
  const voice = (() => {
    const ok = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
    let list = [], queue = [], current = null;
    const GOOD = [/\bana\b.*(natural|neural)/i, /(jenny|aria|ava|emma|michelle|libby|sonia|natasha|clara).*(natural|neural)/i, /natural/i, /neural/i,
      /(zoe|ava|samantha|allison|susan|nicky|joelle|serena|karen|moira|tessa|kate|fiona).*(premium|enhanced)/i, /premium/i, /enhanced/i, /siri/i,
      /^samantha/i, /google us english/i, /^ava\b/i, /^allison/i, /^karen/i, /^moira/i, /^tessa/i, /^serena/i, /google uk english female/i, /^daniel/i, /zira/i];
    const BAD = /compact|espeak|novelty|albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|junior|ralph|fred|kathy|grandma|grandpa|rocko|shelley|eddy|flo|reed|sandy/i;
    const score = v => {
      if (!/^en/i.test(v.lang)) return -1000;
      let s = /^en[-_]us/i.test(v.lang) ? 6 : /^en[-_](gb|au|ie|ca|nz)/i.test(v.lang) ? 4 : 2;
      const i = GOOD.findIndex(r => r.test(v.name));
      if (i >= 0) s += 60 - i * 2;
      if (BAD.test(v.name)) s -= 80;
      if (/female|woman|girl|child|kid/i.test(v.name)) s += 3;
      return s;
    };
    const load = () => { if (ok) list = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)).sort((a, b) => score(b) - score(a)); };
    if (ok) { load(); speechSynthesis.addEventListener ? speechSynthesis.addEventListener('voiceschanged', load) : (speechSynthesis.onvoiceschanged = load); }
    // 🌟 The RoboBandit voice: a natural-sounding voice that read our sentences aloud ahead of time
    // (tools/make-voice.py). Each sentence is a small mp3 in voice/, named by a hash of its words; when every
    // sentence of something has one, we play those instead of the device's voice (iPads' built-in voices are
    // robotic unless you download better ones). voice/index.json lists the sentences we have.
    const ROOT = SITE_HOME.replace(/index\.html$/, '');
    const rec = { have: null, bufs: new Map(), token: null, src: null };
    const key = t => { let a = 0x811c9dc5, b = 5381; for (let i = 0; i < t.length; i++) { const c = t.charCodeAt(i); a = Math.imul(a ^ c, 16777619) >>> 0; b = (Math.imul(b, 33) + c) >>> 0; } return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0'); };
    if (location.protocol !== 'file:') setTimeout(() => { try { fetch(ROOT + 'voice/index.json').then(r => r.ok ? r.json() : null).then(j => { if (j && j.clips) rec.have = new Set(j.clips); }).catch(() => {}); } catch (e) { /* file:// */ } });
    const useRec = () => !!rec.have && !store.get('rb_voice') || store.get('rb_voice') === 'rb';
    const clip = k => {
      if (!rec.bufs.has(k)) rec.bufs.set(k, fetch(ROOT + 'voice/' + k + '.mp3').then(r => { if (!r.ok) throw new Error('no clip'); return r.arrayBuffer(); })
        .then(data => new Promise((ok, no) => { const p = audio().decodeAudioData(data, ok, no); if (p && p.then) p.then(ok, no); }))
        .catch(e => { rec.bufs.delete(k); throw e; }));
      return rec.bufs.get(k);
    };
    async function playRec(parts, rate, done, fallback) {
      const token = rec.token = {}, ac = audio();
      try {
        const bufs = await Promise.all(parts.map(p => clip(key(p))));   // fetch them all at once, then play in a row
        for (let i = 0; i < bufs.length; i++) {
          if (rec.token !== token) return;
          await new Promise(ok => {
            const src = ac.createBufferSource(), g = ac.createGain();
            src.buffer = bufs[i]; src.playbackRate.value = rate; g.gain.value = 1;
            src.connect(g).connect(ac.destination); src.onended = ok; rec.src = src;
            setTimeout(ok, (bufs[i].duration / rate) * 1000 + 900);   // (if the sound was cut off, don't stay "speaking" for ever)
            src.start(ac.currentTime + (i ? 0.12 : 0.02));
          });
        }
        if (rec.token === token) { rec.token = rec.src = null; if (done) done(); }
      } catch (e) { if (rec.token === token) { rec.token = rec.src = null; fallback(); } }   // offline or missing: the device voice
    }
    const pick = () => {
      const saved = store.get('rb_voice');
      return (saved && list.find(v => v.voiceURI === saved)) || list[0] || null;
    };
    // tidy text for speaking: no emoji, no markup, and a few things said the way people say them
    const clean = t => String(t)
      .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, ' and ')
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '')
      .replace(/\bkm\/h\b/g, 'kilometres an hour').replace(/\bmph\b/g, 'miles an hour').replace(/\bm\/s\b/g, 'metres a second')
      .replace(/\s*·\s*/g, '. ').replace(/\s*—\s*/g, ', ').replace(/\s+/g, ' ').trim();
    const sentences = t => (clean(t).match(/[^.!?]+[.!?]*["”’)]*\s*/g) || []).map(x => x.trim()).filter(Boolean)
      .flatMap(x => x.length > 220 ? x.split(/,\s+/) : [x]);
    function next() {
      if (!queue.length) { current = null; return; }
      const job = queue.shift(), u = new SpeechSynthesisUtterance(job.text), v = pick();
      if (v) { u.voice = v; u.lang = v.lang; }
      u.rate = job.rate; u.pitch = job.pitch; u.volume = 1;
      u.onend = u.onerror = () => { if (current === u) { current = null; if (!queue.length && job.done) job.done(); next(); } };
      current = u;
      speechSynthesis.speak(u);
    }
    function speak(text, { rate = 0.95, pitch = 1.14, onend } = {}) {
      stop();
      if (ok && !list.length) load();
      const parts = sentences(text);
      if (!parts.length) return false;
      if (useRec() && audio() && parts.every(p => rec.have.has(key(p)))) {
        playRec(parts, Math.min(1.1, Math.max(0.9, rate / 0.95)), onend, () => deviceSpeak(parts, rate, pitch, onend));
        return true;
      }
      return deviceSpeak(parts, rate, pitch, onend);
    }
    function deviceSpeak(parts, rate, pitch, onend) {
      if (!ok) return false;
      // a little more sparkle on "Yay!" sentences and a lift on questions, like a person reading to a child
      const lift = t2 => /!["”’)]*$/.test(t2) ? [0.03, 0.08] : /\?["”’)]*$/.test(t2) ? [0, 0.12] : [0, 0];
      queue = parts.map((t2, i) => { const [dr, dp] = lift(t2); return { text: t2, rate: rate + dr, pitch: Math.min(2, pitch + dp), done: i === parts.length - 1 ? onend : null }; });
      next();
      return true;
    }
    function stop() {
      queue = []; current = null; rec.token = null;
      if (rec.src) { try { rec.src.onended = null; rec.src.stop(); } catch (e) { /* already done */ } rec.src = null; }
      if (ok) try { speechSynthesis.cancel(); } catch (e) { /* fine */ }
    }
    return {
      ok, speak, stop,
      get speaking() { return !!rec.token || (ok && (!!current || speechSynthesis.speaking)); },
      get recorded() { return useRec(); },
      hasRecorded: () => !!rec.have,
      key, sentences,
      voices: () => { if (!list.length) load(); return list.filter(v => !BAD.test(v.name)).slice(0, 10); },
      get chosen() { return pick(); },
      choose(v) { store.set('rb_voice', v === 'rb' ? 'rb' : v ? v.voiceURI : ''); },
    };
  })();
  // the ☰ menu's voice chooser: the best few voices on this device, each with a little sample
  function voiceMenu(panel) {
    const vs = voice.voices(), rec = voice.hasRecorded() && voice.recorded;
    const cur = rec ? null : voice.chosen;
    panel.innerHTML = `<h3>🗣️ Read-aloud voice</h3><div class="rb-menu-set rb-voices">${voice.hasRecorded() ? `<button type="button" data-v="rb" class="${rec ? 'on' : ''}">${rec ? '✔ ' : ''}🌟 RoboBandit voice</button>` : ''}${vs.map((v, i) =>
      `<button type="button" data-v="${i}" class="${cur && v.voiceURI === cur.voiceURI ? 'on' : ''}">${cur && v.voiceURI === cur.voiceURI ? '✔ ' : ''}${v.name.replace(/\s*\(.*\)\s*/, ' ').replace(/microsoft|google|apple/ig, '').trim() || v.name}</button>`).join('')}
      ${!vs.length && !voice.hasRecorded() ? '<p>This device has no voices to read aloud with.</p>' : ''}</div>
      <p class="rb-voice-tip">${voice.hasRecorded() ? 'The 🌟 RoboBandit voice reads our games and lessons in a friendly, natural voice (anything new it hasn\'t learned yet uses this device\'s voice). ' : ''}Tip: the nicest device voices are often called “Natural”, “Enhanced” or “Premium”. On an iPad or Mac you can download more in Settings → Accessibility → Spoken Content → Voices.</p>`;
    panel.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => {
      const v = b.dataset.v === 'rb' ? 'rb' : vs[+b.dataset.v]; voice.choose(v); voiceMenu(panel);
      voice.speak('Hi there! I\'m so happy to read with you. Are you ready? Let\'s go!');
    }));
  }

  // ---------- ☰ The RoboBandit menu: every game, the school folders and the settings, on every page ----------
  const SITE_ROOT = SITE_HOME.replace(/index\.html$/, '');
  const GAMES = [
    ['space-wars.html', '🚀', 'Space Wars'], ['floppy-bird.html', '🐦', 'Floppy Bird'], ['surfs-up.html', '🏄', "Surf's Up"],
    ['hamglider.html', '🐹', 'Hamglider'], ['web-hero.html', '🕸️', 'Web Hero'], ['sparkle-meadow.html', '🦄', 'Sparkle Meadow'],
    ['witch-way-out.html', '🧙', 'Witch Way Out'], ['flight-school.html', '✈️', 'Flight School'], ['lucky-leo.html', '☘️', 'Lucky Leo'], ['manifest-destiny.html', '🗺️', 'Manifest Destiny'],
    ['lily-pad-lunch.html', '🐸', 'Lily Pad Lunch'], ['pumpkin-pals.html', '🎃', 'Pumpkin Pals'], ['moto-rush.html', '🏍️', 'Moto Rush'], ['moto-mania.html', '🎈', 'Moto Mania'],
    ['preschool/abc-train.html', '🚂', 'ABC Train'],
  ];
  const FOLDERS = [['preschool/index.html', '🧸', 'Preschool'], ['2nd-grade/index.html', '✏️', '2nd Grade'], ['5th-grade/index.html', '🎒', '5th Grade']];
  // Remember the games this browser played last (newest first): the arcade page shows them under "Keep playing"
  (() => {
    const here = location.href.split(/[?#]/)[0], g = GAMES.find(([url]) => here === SITE_ROOT + url);
    if (!g) return;
    let list = [];
    try { list = JSON.parse(store.get('rb_recent') || '[]'); } catch (e) { /* start again */ }
    list = [{ url: g[0], t: Date.now() }, ...list.filter(x => x && x.url !== g[0])].slice(0, 8);
    store.set('rb_recent', JSON.stringify(list));
  })();
  let menuEl = null, menuShare = null, gameItems = null;
  // a game can add its own buttons at the top of the menu (e.g. Back to the map): setMenuItems(() => [{ label, onClick }])
  function setMenuItems(fn) { gameItems = fn; }
  function menuButton(bar) {
    if (bar.querySelector('.rb-menubtn')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'rb-menubtn'; b.id = 'btnMenu'; b.title = 'Menu: all games and settings';
    b.innerHTML = '☰<span>MENU</span>';
    b.addEventListener('pointerdown', e => e.stopPropagation());
    b.addEventListener('click', e => { e.stopPropagation(); b.blur(); openMenu(); });
    bar.insertBefore(b, bar.firstChild);
  }
  // The one menu every page shares (☰ on screen or on the controller). The top part is for the game you're in
  // (Back to the game, then the game's own items and its pause-screen buttons), the rest is the arcade's
  // (every game and folder, settings, 🏠 All games).
  // Closing it with ✕ / Esc / 🎮 Ⓑ goes back to how things were: if opening the menu paused the game, the game
  // carries on. "Back to the game" always carries on.
  let menuResume = false;
  function openMenu({ resume, focusHome = false, focusMap = false } = {}) {
    if (menuEl) return;
    // pause the game: every game already pauses when the window loses focus
    const wasPaused = !!pauseEl;
    dispatchEvent(new Event('blur'));
    menuResume = resume != null ? resume : !wasPaused && !!pauseEl;
    const hiddenPause = document.querySelector('.rb-pause');
    if (hiddenPause) hiddenPause.style.display = 'none';
    const here = location.href.split(/[?#]/)[0];
    const link = ([url, icon, name], cls) => {
      const href = SITE_ROOT + url, cur = here === href || (url.endsWith('index.html') && here === href.replace(/index\.html$/, ''));
      return `<a class="${cls}${cur ? ' cur' : ''}" href="${href}"><span>${icon}</span>${name}${cur ? '<small>playing now</small>' : ''}</a>`;
    };
    let items = [];
    try { items = (gameItems && gameItems()) || []; } catch (e) { items = []; }
    // the pause screen's own buttons belong here too (the controller screen is already under Settings)
    for (const x of pauseExtras) if (!/controller/i.test(x.label) && !items.some(y => y.label === x.label)) items = [...items, x];
    menuEl = document.createElement('div');
    menuEl.className = 'rb-menu';
    menuEl.innerHTML = `<div class="rb-menu-panel" role="dialog" aria-label="RoboBandit menu">
      <div class="rb-menu-head"><a href="${SITE_HOME}" class="rb-menu-logo" data-pad-home><img src="${SITE_ROOT}favicon.svg" alt="">ROBOBANDIT</a>
        <button type="button" class="rb-menu-x" title="Close (Esc)">✕</button></div>
      <h3>⭐ This game</h3><div class="rb-menu-set rb-menu-this"><button type="button" class="rb-menu-back" data-pad-default>▶ Back to the game</button>${items.map((x, i) => `<button type="button" data-g="${i}"${x.map ? ' data-map' : ''}>${x.label}</button>`).join('')}${controls ? '<button type="button" data-m="guide">🕹️ Controls (F1)</button>' : ''}</div>
      <h3>🎮 Games</h3><div class="rb-menu-games">${GAMES.map(g => link(g, 'rb-menu-game')).join('')}</div>
      <h3>📚 School folders</h3><div class="rb-menu-games">${FOLDERS.map(g => link(g, 'rb-menu-game')).join('')}</div>
      <h3>⚙️ Settings</h3><div class="rb-menu-set">
        <button type="button" data-m="sound">${muted ? '🔇 Sound: off' : '🔊 Sound: on'}</button>
        <button type="button" data-m="pad">🎮 Controller</button>
        ${voice.ok ? '<button type="button" data-m="voice">🗣️ Read-aloud voice</button>' : ''}
        ${document.fullscreenEnabled ? `<button type="button" data-m="fs">⛶ ${document.fullscreenElement ? 'Leave full screen' : 'Full screen'}</button>` : ''}
        ${menuShare ? '<button type="button" data-m="share">🔗 Share this game</button>' : ''}
        <a href="${SITE_HOME}" class="rb-home-all">🏠 All games</a></div></div>`;
    menuEl.addEventListener('pointerdown', e => { e.stopPropagation(); if (e.target === menuEl) closeMenu(); });
    menuEl.querySelector('.rb-menu-x').addEventListener('click', () => closeMenu());
    menuEl.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', () => { closeMenu(false); items[+b.dataset.g].onClick(); }));
    menuEl.querySelector('.rb-menu-back').addEventListener('click', () => closeMenu(true));
    menuEl.querySelectorAll('a').forEach(a => a.addEventListener('click', () => dispatchEvent(new Event('rb-leave'))));
    menuEl.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => {
      const m = b.dataset.m;
      if (m === 'sound') { audio(); setMuted(!muted); b.textContent = muted ? '🔇 Sound: off' : '🔊 Sound: on'; }
      else if (m === 'pad') { const r = menuResume; closeMenu(false); controllerScreen({ onClose: () => openMenu({ resume: r }) }); }
      else if (m === 'guide') { const r = menuResume; closeMenu(false); controlsGuide({ onClose: () => openMenu({ resume: r }) }); }
      else if (m === 'voice') { let v = menuEl.querySelector('.rb-voicebox'); if (!v) { v = document.createElement('div'); v.className = 'rb-voicebox'; b.closest('.rb-menu-set').after(v); } voiceMenu(v); }
      else if (m === 'fs') { closeMenu(false); if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); }
      else if (m === 'share') { closeMenu(false); share(menuShare); }
    }));
    menuEl.hiddenPause = hiddenPause;
    document.body.appendChild(menuEl);
    addEventListener('keydown', menuKeys, true);
    if (focusHome) pad.focusHome();
    if (focusMap) {   // M / ⧉ View: the map. The game's own map if it has one (Back to the map, Choose a level), else every game
      const el = menuEl.querySelector('[data-map]') || menuEl.querySelector('.rb-home-all');
      pad.focusOn(el); try { el.focus({ preventScroll: true }); } catch (e) { /* fine */ }
    }
  }
  // resume: true carries on with the game, false stays paused, left out goes back to how it was before the menu
  function closeMenu(resume) {
    if (!menuEl) return;
    if (typeof resume !== 'boolean') resume = menuResume;
    voice.stop();
    if (menuEl.hiddenPause) menuEl.hiddenPause.style.display = '';
    menuEl.remove(); menuEl = null; menuResume = false;
    removeEventListener('keydown', menuKeys, true);
    if (resume && pauseEl) pauseEl.querySelector('button').click();   // ▶ KEEP PLAYING
  }
  // while the menu is open, Esc (or 🎮 Ⓑ) closes it and no key reaches the game. Tab / Shift + Tab move between
  // the buttons, Enter (or Space) presses the one in focus: stopping the key here doesn't stop the browser doing that.
  function menuKeys(e) {
    if (e.code === 'Escape') { e.preventDefault(); closeMenu(); }   // (back to how things were)
    if (e.code !== 'Tab') e.stopImmediatePropagation();
  }
  // a page with its own corner buttons (Space Wars) still gets the menu
  const addMenuToBars = () => document.querySelectorAll('.rb-topbar').forEach(menuButton);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addMenuToBars); else addMenuToBars();

  // Where 🏠 goes on this page: its own 🏠 button if it has one (folder pages point at their folder), else the arcade.
  function homeHref() {
    const a = document.querySelector('#btnHome[href], .rb-topbar a[href]');
    return a ? a.href : SITE_HOME;
  }

  // ---------- Pausing ----------
  let pauseEl = null, pauseExtras = [];
  function showPause(onResume, { extra = [], sub = '' } = {}) {   // sub: a line under PAUSED (where you are in the game)
    if (pauseEl) return;
    pauseExtras = extra;
    pauseEl = document.createElement('div');
    pauseEl.className = 'rb-pause' + (extra.length > 3 ? ' rb-many' : '');   // (a long menu: smaller buttons, and it scrolls if it has to)
    pauseEl.innerHTML = `<div class="rb-panel"><h2>PAUSED</h2>${sub ? `<div class="rb-pause-sub">${sub}</div>` : ''}
      <button type="button">▶ KEEP PLAYING</button>${extra.map((x, i) => `<button type="button" class="rb-extra" data-x="${i}">${x.label}</button>`).join('')}${controls && !extra.some(x => /controls/i.test(x.label)) ? '<button type="button" class="rb-guide-btn">🕹️ CONTROLS</button>' : ''}<a href="${homeHref()}" class="rb-home">🏠 All games</a>
      <div class="rb-hint">${pad.connected ? padText('🎮 {A} to pick · {MENU} to carry on · {VIEW} for the menu') : touch ? 'Tap the button to carry on' : 'Press Esc to carry on · F1 for the controls'}</div></div>`;
    pauseEl.querySelector('.rb-home').addEventListener('click', () => dispatchEvent(new Event('rb-leave')));
    pauseEl.addEventListener('pointerdown', e => e.stopPropagation());
    pauseEl.querySelector('button').addEventListener('click', () => { hidePause(); onResume(); });
    pauseEl.querySelectorAll('.rb-extra').forEach(b => b.addEventListener('click', () => extra[+b.dataset.x].onClick()));
    const g = pauseEl.querySelector('.rb-guide-btn'); if (g) g.addEventListener('click', () => controlsGuide());
    document.body.appendChild(pauseEl);
    try { pauseEl.querySelector('button').focus({ preventScroll: true }); } catch (e) { /* fine */ }   // Enter or Space carries on
    if (ac && ac.state === 'running') ac.suspend();   // music, wind and sound effects all stop while paused
  }
  function hidePause() {
    if (!pauseEl) return;
    pauseEl.remove(); pauseEl = null; pauseExtras = [];
    if (ac && ac.state === 'suspended') ac.resume();
  }
  // Calls fn when the player switches tabs or apps, or the window loses focus.
  function onHide(fn) {
    document.addEventListener('visibilitychange', () => { if (document.hidden) fn(); });
    addEventListener('blur', fn);
  }


  // ---------- 🕹️ Controls: button names, the controls guide and the shared keys ----------
  // Button names follow the controller that's plugged in: Xbox (Ⓐ Ⓑ Ⓧ Ⓨ, LT / RT), PlayStation (✕ ◯ ▢ △, L2 / R2)
  // or Nintendo (B A Y X, ZL / ZR: the same buttons by position). Write {A}, {RT}, {MENU}… in any text and
  // padText() swaps in the right names; an element with data-pad="A" gets the name as its text (applyPadLabels).
  const LABELS = {
    xbox: { A: 'Ⓐ', B: 'Ⓑ', X: 'Ⓧ', Y: 'Ⓨ', LB: 'LB', RB: 'RB', LT: 'LT', RT: 'RT', LS: 'left stick', RS: 'right stick', L3: 'left-stick click', R3: 'right-stick click', VIEW: '⧉ View', MENU: '☰ Menu', DPAD: 'D-pad' },
    ps: { A: '✕', B: '◯', X: '▢', Y: '△', LB: 'L1', RB: 'R1', LT: 'L2', RT: 'R2', LS: 'left stick', RS: 'right stick', L3: 'L3', R3: 'R3', VIEW: 'Create', MENU: 'Options', DPAD: 'D-pad' },
    nin: { A: 'B', B: 'A', X: 'Y', Y: 'X', LB: 'L', RB: 'R', LT: 'ZL', RT: 'ZR', LS: 'left stick', RS: 'right stick', L3: 'left-stick click', R3: 'right-stick click', VIEW: '−', MENU: '+', DPAD: '+Control Pad' },
  };
  function padStyle() {
    const g = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(x => x && x.connected);
    const id = g ? g.id : '';
    return /054c|playstation|dualshock|dualsense|ps[345]/i.test(id) ? 'ps' : /057e|nintendo|switch|joy-?con|pro controller/i.test(id) ? 'nin' : 'xbox';
  }
  const btn = k => (LABELS[padStyle()] || LABELS.xbox)[k] || k;
  const padText = text => String(text).replace(/\{(A|B|X|Y|LB|RB|LT|RT|LS|RS|L3|R3|VIEW|MENU|DPAD)\}/g, (m, k) => btn(k));
  function applyPadLabels(root = document) { root.querySelectorAll('[data-pad]').forEach(el => { el.textContent = btn(el.dataset.pad); }); }

  // Each game lists its controls once (setControls) and they show up in the controls guide (F1, / or ?), the pause
  // screen, the ☰ menu and the controller screen:
  //   setControls({ name: 'Lucky Leo', camera: false, rows: [{ act: 'Jump', keys: 'Space', pad: '{A}', touch: 'A button' }, …] })
  let controls = null, guideEl = null;
  const COMMON_ROWS = cam => [
    ...(cam ? [{ act: 'Look around', keys: 'Mouse drag', pad: '{RS}', touch: 'Drag with a second finger' },
      { act: 'Turn the camera left / right', keys: 'Z / X', pad: '{RS}' },
      { act: 'Camera back behind you', keys: 'R', pad: '{R3}, {LB} or {RB}' }] : []),
    { act: 'Pause / carry on', keys: 'Esc', pad: '{MENU}', touch: '⏸ button' },
    { act: 'Map and menu', keys: 'M', pad: '{VIEW} (twice: all games)', touch: '☰ button' },
    { act: 'Sound on / off', keys: 'N', touch: '🔊 button' },
    { act: 'This controls guide', keys: 'F1, / or ?' },
    { act: 'Move around menus', keys: 'Tab / Shift + Tab, Enter', pad: '{DPAD} or {LS}, {A} pick, {B} back', touch: 'Tap' },
  ];
  function setControls(spec) {
    controls = spec;
    pad.legend = spec ? `<b>${spec.name}:</b> ` + spec.rows.filter(r => r.pad).map(r => `${r.pad} ${r.act.toLowerCase()}`).join(' · ') : '';
  }
  function controlsGuide({ onClose } = {}) {
    if (guideEl || !controls) return;
    style2();
    if (!pauseEl) dispatchEvent(new Event('blur'));   // the game pauses while you read
    const hiddenPause = pauseEl; if (hiddenPause) hiddenPause.style.display = 'none';
    const rows = [...controls.rows, ...COMMON_ROWS(controls.camera)];
    const cell = v => v ? esc(padText(v)).replace(/\{(\w+)\}/g, '$1') : '<span class="dim">—</span>';
    const el = document.createElement('div');
    el.className = 'rb-guide';
    el.innerHTML = `<div class="rb-panel rb-guidepanel" role="dialog" aria-label="Controls">
      <h2>🕹️ ${esc(controls.name)} controls</h2>
      <p class="rb-guide-note">${pad.connected ? `🎮 Showing your ${padStyle() === 'ps' ? 'PlayStation' : padStyle() === 'nin' ? 'Nintendo' : 'Xbox'} controller's buttons.` : '🎮 Plug in a controller and its own button names show here.'}</p>
      <div class="rb-guide-wrap"><table><thead><tr><th></th><th>⌨️ Keyboard &amp; mouse</th><th>🎮 Controller</th><th>📱 Touch</th></tr></thead>
      <tbody>${rows.map(r => `<tr${COMMON_ROWS(true).some(c => c.act === r.act) ? ' class="common"' : ''}><th>${esc(r.act)}</th><td>${cell(r.keys)}</td><td>${cell(r.pad)}</td><td>${cell(r.touch)}</td></tr>`).join('')}</tbody></table></div>
      ${controls.note ? `<p class="rb-guide-note">${esc(padText(controls.note))}</p>` : ''}
      <button type="button" data-pad-default class="rb-guide-done">✓ Got it</button></div>`;
    el.addEventListener('pointerdown', e => { e.stopPropagation(); if (e.target === el) close(); });
    const keyGuard = e => { if (e.code === 'Escape' || e.code === 'F1' || e.key === '?' || e.key === '/') { e.preventDefault(); close(); } if (e.code !== 'Tab') e.stopImmediatePropagation(); };
    const close = () => {
      removeEventListener('keydown', keyGuard, true);
      el.remove(); guideEl = null;
      if (hiddenPause) hiddenPause.style.display = '';
      if (onClose) onClose();
    };
    el.close = close;
    el.querySelector('.rb-guide-done').addEventListener('click', close);
    document.body.appendChild(el);
    guideEl = el;
    addEventListener('keydown', keyGuard, true);
    try { el.querySelector('.rb-guide-done').focus({ preventScroll: true }); } catch (e) { /* fine */ }
  }

  // A game that uses Ctrl (descend / brake) guards the page while you play, so Ctrl + W can't close the tab
  // by accident: guardLeave(() => playing). Leaving on purpose (🏠, the menu, View twice) fires rb-leave first.
  let leaveGuard = null, leaving = false;
  const guardLeave = fn => { leaveGuard = fn; };
  addEventListener('rb-leave', () => { leaving = true; });
  addEventListener('beforeunload', e => { if (!leaving && leaveGuard && leaveGuard()) { e.preventDefault(); e.returnValue = ''; } });

  // Keys that work the same in every game (EBITDA Hero's layout): N sound, M map / menu, F1 / ? / / controls guide.
  // P never pauses (Esc does, in each game), and no game key fires while you're typing in a box.
  addEventListener('keydown', e => {
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) && !/^(range|checkbox|radio|button)$/.test(t.type || '')) {
      if (e.code !== 'Escape' && e.code !== 'Tab') e.stopImmediatePropagation();
      return;
    }
    if (e.metaKey || e.altKey) return;
    if (e.code === 'F1' || e.key === '?' || e.key === '/') {
      if (!controls) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (!guideEl && !padScreen) controlsGuide();
      return;
    }
    if (e.code === 'KeyN') { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) { audio(); setMuted(!muted); } return; }
    if (e.code === 'KeyM') {
      e.stopImmediatePropagation();
      if (!e.repeat && !guideEl && !padScreen) { if (menuEl) closeMenu(); else openMenu({ focusMap: true }); }
      return;
    }
    if (e.code === 'KeyP') e.stopImmediatePropagation();
  }, true);

  // ---------- Game controllers (Xbox and other standard gamepads) ----------
  // Every RoboBandit game uses the same layout (see CONTROLS.md, matched to EBITDA Hero):
  //   left stick move / steer · right stick camera · Ⓐ jump / main action · Ⓧ run / boost · Ⓨ get on or off, use
  //   RT go / attack · LT brake / secondary · right-stick click, LB or RB recenter the camera · left-stick click horn
  //   ☰ Menu pauses (and carries on), ⧉ View is the map: the menu with the game's map (or 🏠 every game), twice goes home.
  // During play the controller presses the game's own keys, so the keyboard and the controller always do the same:
  //   left stick / D-pad → W A S D, Ⓐ → Space, Ⓧ → Shift, Ⓨ → F, RT → J, LT → K, left-stick click → H (setButtons changes them).
  // Games with a touch joystick (touch-stick.js) also get the left stick as a smooth analog stick.
  // When a menu, pop-up or page of buttons is showing, the D-pad / stick moves a yellow highlight
  // between buttons, Ⓐ presses the highlighted one and Ⓑ is Escape (back).
  const pad = (() => {
    const KEYNAME = { Space: ' ', Enter: 'Enter', Escape: 'Escape', ShiftLeft: 'Shift', ShiftRight: 'Shift', ControlLeft: 'Control', ControlRight: 'Control',
      ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight' };
    for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') KEYNAME['Key' + c] = c.toLowerCase();
    const BUTTONS = { 0: 'Space', 2: 'ShiftLeft', 3: 'KeyF', 6: 'KeyK', 7: 'KeyJ', 10: 'KeyH', 12: 'KeyW', 13: 'KeyS', 14: 'KeyA', 15: 'KeyD' };
    let map = BUTTONS, legend = '';   // a game can give the buttons its own jobs (setButtons)
    const sticks = [];
    // Controller settings (saved as rb_pad): camera speed, how big the stick dead zone is and vibration are shared
    // by every game. Inverted sticks are kept for each game on its own (inverts), and only for the sticks a game
    // says can be inverted (useInvert): a flying stick (pull back to tip the nose up) or a 3D camera. That's how
    // console games do it ("Invert Y" for flying / the camera): menus and walking, driving or a train's throttle
    // are never upside down, and a setting made in a flying game can't flip another game.
    const DEFAULTS = { inverts: {}, camSpeed: 1, dead: 1, rumble: true };
    const DEADZONES = [0.12, 0.22, 0.32];   // small, medium, large
    const cfg = { ...DEFAULTS };
    try {
      const saved = JSON.parse(store.get('rb_pad') || 'null');
      if (saved) for (const k in DEFAULTS) if (k in saved) cfg[k] = saved[k];   // (the old all-games invert switches are dropped)
      else {   // Witch Way Out's first camera options carry over
        const old = JSON.parse(store.get('ww_cam') || 'null');
        if (old && old.speed != null) cfg.camSpeed = old.speed;
      }
      if (!cfg.inverts || typeof cfg.inverts !== 'object') cfg.inverts = {};
    } catch (e) { /* defaults */ }
    const saveCfg = () => store.set('rb_pad', JSON.stringify(cfg));
    // this game's name in the saved settings, e.g. 'hamglider.html' or 'preschool/abc-train.html'
    const here = location.href.split(/[?#]/)[0];
    const GAME_KEY = (here.startsWith(SITE_ROOT) ? here.slice(SITE_ROOT.length) : here.replace(/^.*\//, '')) || 'index.html';
    // the sticks this game lets you invert: { LY: 'Flying: up/down', RY: 'Camera: up/down', RX: 'Camera: left/right' }
    const invertable = {};
    const axisName = k => String(k).replace(/^inv/, '');
    const inv = k => { k = axisName(k); return !!invertable[k] && !!(cfg.inverts[GAME_KEY] || {})[k]; };   // is this stick axis inverted in this game?
    let navOff = false;   // while the controller tester is testing, buttons only light up the picture
    let direct = false;   // a two-player game reads each controller itself (read(i)): play stops pressing keys
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
      const modal = document.querySelector('.rb-padscreen, .rb-guide, .rb-menu');   // the controller screen, controls guide and menu cover everything else
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
      // nothing further that way (the end of a row of buttons): ↓ / ↑ go on to the next / previous one in the list,
      // so every button can always be reached with up and down alone
      if (!best && (dy || dx)) { const i = list.indexOf(focusEl); best = list[i + (dy > 0 || dx > 0 ? 1 : -1)] || null; if (dx && best && Math.abs(best.getBoundingClientRect().top - a.top) > a.height) best = null; }
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
    let wantEl = null;
    const focusHome = () => { wantHome = performance.now() + 1500; wantEl = null; cache.t = 0; };   // highlight 🏠 as soon as the menu is up
    const focusOn = el => { wantEl = el; wantHome = performance.now() + 1500; cache.t = 0; };   // ...or this button
    function leaveRequest(now) {
      const href = homeHref();
      if (href.split('#')[0] === location.href.split('#')[0]) return;   // already home
      if (now - leaveAt < 3000) {
        dispatchEvent(new Event('rb-leave'));   // lets a game save before we go
        location.href = href;
        return;
      }
      leaveAt = now;
      if (padScreen) padScreen.close();
      if (!menuEl) openMenu({ focusMap: true });   // the menu (the map) pauses the game while you decide
      else focusHome();
      toast(href === SITE_HOME ? '🏠 Press ⧉ View again to go back to all the games' : '🏠 Press ⧉ View again to go back to the folder');
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
      const dead = DEADZONES[cfg.dead] != null ? DEADZONES[cfg.dead] : 0.22, rdead = Math.max(0.1, dead - 0.04);
      const rmag = Math.hypot(A[2], A[3]), rk = rmag < rdead ? 0 : Math.min(1, (rmag - rdead) / (1 - rdead)) / rmag;
      look.x = A[2] * rk * (inv('RX') ? -1 : 1); look.y = A[3] * rk * (inv('RY') ? -1 : 1);
      const mag = Math.hypot(A[0], A[1]);
      // mx / my: the left stick as it really is (menus always use this); lx / ly: as this game sees it (inverted if asked)
      const mx = mag < dead ? 0 : A[0] / mag * Math.min(1, (mag - dead) / (1 - dead)), my = mag < dead ? 0 : A[1] / mag * Math.min(1, (mag - dead) / (1 - dead));
      const lx = inv('LX') ? -mx : mx, ly = inv('LY') ? -my : my;
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
      if (edge(9)) {   // ☰: the RoboBandit menu, from anywhere (and ☰ again closes it)
        if (padScreen) padScreen.close();
        else if (guideEl) guideEl.close();
        else if (menuEl) closeMenu();
        else if (pauseEl && pauseEl.style.display !== 'none') pauseEl.querySelector('button').click();   // ☰ pauses and carries on
        else openMenu();
        cache.t = 0;
      }
      if (menu) {
        const opts = choices();
        if (focusEl && !opts.includes(focusEl)) setFocus(null);
        if (now < wantHome) {   // just pressed View: highlight the way home in the pause menu
          const home = (wantEl && opts.includes(wantEl) && wantEl) || opts.find(el => el.matches('.rb-home-all, .rb-home')) || opts.find(el => el.matches('[data-pad-home]') || (el.tagName === 'A' && el.href === homeHref()));
          if (home) { setFocus(home); wantHome = 0; }
        }
        if (!focusEl) setFocus(pickDefault(opts));
        const dir = btn[12] || my < -0.5 ? 'ArrowUp' : btn[13] || my > 0.5 ? 'ArrowDown' : btn[14] || mx < -0.5 ? 'ArrowLeft' : btn[15] || mx > 0.5 ? 'ArrowRight' : null;
        if (dir && (dir !== last.dir || now >= last.next)) { move(dir, opts); last.next = now + (dir === last.dir ? 130 : 380); }
        last.dir = dir;
        if (edge(0) || edge(2) || edge(7)) activate();
        if (edge(1)) { if (padScreen) padScreen.close(); else if (guideEl) guideEl.close(); else if (menuEl) closeMenu(); else { key('keydown', 'Escape'); key('keyup', 'Escape'); } }
      } else if (direct) {   // the game reads each controller on its own: nothing pressed for it here
        releaseAll();
        for (const s of sticks) if (s.driving) { s.driving = false; s.stick.x = s.stick.y = 0; s.stick.active = false; }
      } else {
        // the left stick: smooth analog steering where the game has a joystick, arrow keys everywhere else
        const st = sticks.find(s => s.stick.id === null && s.enabled());
        for (const s of sticks) if (s !== st && s.driving) { s.driving = false; s.stick.x = s.stick.y = 0; s.stick.active = false; }
        if (st) {
          st.driving = !!(lx || ly);
          st.stick.x = lx; st.stick.y = ly; st.stick.active = st.driving;
        }
        const want = {};
        for (const i in map) if (map[i] && btn[i] && !ignore[i]) want[map[i]] = true;
        if (!st) {   // the left stick is W A S D, like the keyboard
          const on = (v, was) => was ? v > 0.3 : v > 0.5;   // a little stickiness so it doesn't flicker
          if (on(-ly, held.KeyW)) want.KeyW = true;
          if (on(ly, held.KeyS)) want.KeyS = true;
          if (on(-lx, held.KeyA)) want.KeyA = true;
          if (on(lx, held.KeyD)) want.KeyD = true;
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
    // a controller takes over from the touch buttons (anything marked .rb-touch hides), and the button names follow it
    const padOn = on => { if (document.body) document.body.classList.toggle('rb-pad-on', on); applyPadLabels(); };
    addEventListener('gamepadconnected', () => { start(); style(); padOn(true); toast(padText('🎮 Controller ready! {A} to play · {MENU} pauses · F1 for the controls')); });
    addEventListener('gamepaddisconnected', () => { if (!pads().length) { releaseAll(); setFocus(null); padOn(false); } });
    const firstLabels = () => { applyPadLabels(); if (pads().length && document.body) document.body.classList.add('rb-pad-on'); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', firstLabels); else firstLabels();
    if (pads().length) start();
    return {
      // touch-stick.js registers each joystick so the left stick can drive it smoothly
      addStick(stick, enabled) { sticks.push({ stick, enabled, driving: false }); },
      // e.g. setButtons({ 2: 'KeyX', 6: 'KeyZ' }, 'Ⓧ throw · LT boost'): those buttons press these keys in this game
      // (null leaves a button doing nothing); the legend is shown on the controller screen
      setButtons(m, text) { map = { ...BUTTONS, ...m }; if (text != null) legend = text; },
      get legend() { return padText(legend); }, set legend(v) { legend = v; },
      rumble(ms, strength = 0.6, index = null) {   // index: just that controller (a two-player game)
        if (!cfg.rumble) return;
        for (const g of index == null ? pads() : pads().slice(index, index + 1)) {
          const v = g.vibrationActuator;
          if (v && v.playEffect) v.playEffect('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: Math.min(1, strength + 0.2) }).catch(() => {});
        }
      },
      get connected() { return pads().length > 0; },
      look,   // { x, y } from the right stick, -1 to 1 (y is +1 pulled down)
      pressed: i => !!pressedNow[i],   // is button i held right now (10 / 11 are the stick clicks)
      get menuMode() { return menuMode; },
      config: cfg, DEFAULTS, DEADZONES, game, inv, GAME_KEY, focusHome, focusOn,
      // a game names the sticks it lets you invert, e.g. useInvert({ LY: 'Flying: up/down' }) (orbit-cam.js adds the camera's)
      useInvert(axes) { Object.assign(invertable, axes); },
      get invertable() { return { ...invertable }; },
      setInvert(k, on) { k = axisName(k); cfg.inverts = { ...cfg.inverts, [GAME_KEY]: { ...(cfg.inverts[GAME_KEY] || {}), [k]: !!on } }; saveCfg(); },
      flat: false,   // (old: flat games now simply don't call useInvert)
      setConfig(patch) { Object.assign(cfg, patch); saveCfg(); },
      get camSpeed() { return [0.65, 1, 1.45][cfg.camSpeed] || 1; },
      set navOff(v) { navOff = v; if (v) { releaseAll(); setFocus(null); } else ignore = prevBtn.slice(); },
      // two players: the game reads each controller itself while playing (menus still work from any controller)
      get direct() { return direct; }, set direct(v) { if (!!v !== direct) { direct = !!v; releaseAll(); } },
      // the i-th controller on its own (null if there isn't one): sticks with the dead zone and this game's invert
      // settings, and pressed(b) for its buttons
      read(i) {
        const g = pads()[i];
        if (!g) return null;
        const dead = DEADZONES[cfg.dead] != null ? DEADZONES[cfg.dead] : 0.22, rdead = Math.max(0.1, dead - 0.04);
        const st = (x, y, dz) => { const m = Math.hypot(x, y); if (m < dz) return [0, 0]; const k = Math.min(1, (m - dz) / (1 - dz)) / m; return [x * k, y * k]; };
        const ax = j => g.axes[j] || 0;
        const [lx, ly] = st(ax(0), ax(1), dead), [rx, ry] = st(ax(2), ax(3), rdead);
        return { lx: inv('LX') ? -lx : lx, ly: inv('LY') ? -ly : ly, rx: inv('RX') ? -rx : rx, ry: inv('RY') ? -ry : ry,
          pressed: b => !!(g.buttons[b] && (g.buttons[b].pressed || g.buttons[b].value > 0.5)), id: g.id };
      },
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
    const invRows = Object.entries(pad.invertable);
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
      ${pad.legend ? `<div class="pad-legend">${pad.legend}</div>` : ''}
      <div class="pad-nums" id="padNums"></div>
      <div class="pad-test" id="padTest">✋ <b>Testing:</b> press every button and move both sticks. <b>Hold Ⓑ</b> to finish testing.
        <div class="hold"><div id="padHold"></div></div></div>
      <div class="pad-settings" id="padSettings">
        ${invRows.length ? `<div class="row"><b>Invert (this game only)</b> ${invRows.map(([k, label]) => `<button type="button" data-inv="${k}" data-label="${esc(label)}"></button>`).join('')}</div>`
          : `<div class="row pad-flat">↕️ Inverted sticks are for flying and 3D cameras (pull back to tip the nose up). This game has neither, so its sticks always work the normal way.</div>`}
        <div class="row">${invRows.some(([k]) => k[0] === 'R') ? '<b>Camera speed</b> <button type="button" data-k="camSpeed"></button>' : ''}
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
      camSpeed: v => ['Slow', 'Normal', 'Fast'][v] || 'Normal', dead: v => ['Small', 'Medium', 'Large'][v] || 'Medium', rumble: v => v ? 'On' : 'Off',
    };
    const paint = () => {
      wrap.querySelectorAll('[data-k]').forEach(b => { b.textContent = NAMES[b.dataset.k](cfg[b.dataset.k]); b.classList.toggle('on', cfg[b.dataset.k] !== pad.DEFAULTS[b.dataset.k]); });
      wrap.querySelectorAll('[data-inv]').forEach(b => { const on = pad.inv(b.dataset.inv); b.textContent = `${b.dataset.label}: ${on ? 'Inverted' : 'Normal'}`; b.classList.toggle('on', on); });
    };
    wrap.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.k, v = cfg[k];
      pad.setConfig({ [k]: typeof v === 'boolean' ? !v : (v + 1) % 3 });
      paint();
    }));
    wrap.querySelectorAll('[data-inv]').forEach(b => b.addEventListener('click', () => { pad.setInvert(b.dataset.inv, !pad.inv(b.dataset.inv)); paint(); }));
    $p('#padBuzz').addEventListener('click', () => { const was = cfg.rumble; cfg.rumble = true; pad.rumble(400, 0.8); cfg.rumble = was; });
    $p('#padReset').addEventListener('click', () => {   // (another game's invert settings are its own)
      const { [pad.GAME_KEY]: _mine, ...others } = cfg.inverts;
      pad.setConfig({ ...pad.DEFAULTS, inverts: others }); paint();
    });
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
      const seen = [ax(0) * (pad.inv('LX') ? -1 : 1), ax(1) * (pad.inv('LY') ? -1 : 1), ax(2) * (pad.inv('RX') ? -1 : 1), ax(3) * (pad.inv('RY') ? -1 : 1)];
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
      .pad-legend { margin: 2px 0 8px; padding: 6px 10px; border-radius: 10px; font-size: 14px; line-height: 1.5; background: #fff6d6; color: #3a2a0a; }
      .pad-nums { font-size: 14px; color: #3a4a6a; }
      .pad-flat { font-size: 14px; line-height: 1.45; padding: 8px 10px; border-radius: 12px; background: #eef4ff; }
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
      .pad-settings #padDone { background: #ffd84a; box-shadow: 0 4px 0 #0b2a5c; }
      .rb-guide { position: fixed; inset: 0; z-index: 12; display: flex; overflow-y: auto; padding: 16px; background: rgba(8,16,40,.86); font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
      .rb-guidepanel { margin: auto; width: 100%; max-width: 860px; box-sizing: border-box; color: #0b2a5c; background: #fffdf2; border: 4px solid #0b2a5c; border-radius: 22px; box-shadow: 0 8px 0 #0b2a5c; padding: 16px 18px 18px; text-align: center; }
      .rb-guidepanel h2 { margin: 0 0 4px; font: 26px 'Bungee', system-ui, sans-serif; }
      .rb-guide-note { margin: 4px 0 8px; font-size: 14px; color: #3a4a6a; }
      .rb-guide-wrap { overflow-x: auto; }
      .rb-guidepanel table { width: 100%; border-collapse: collapse; font-size: 15px; text-align: left; }
      .rb-guidepanel th, .rb-guidepanel td { padding: 6px 8px; border-bottom: 1px solid #e0e6f0; vertical-align: top; }
      .rb-guidepanel thead th { background: #0b2a5c; color: #fff; position: sticky; top: 0; }
      .rb-guidepanel tbody th { font-weight: 700; white-space: nowrap; }
      .rb-guidepanel tr.common th, .rb-guidepanel tr.common td { background: #f2f5fb; color: #3a4a6a; }
      .rb-guidepanel .dim { color: #b0b8c8; }
      .rb-guide-done { margin-top: 12px; font: 700 18px system-ui, sans-serif; padding: 10px 22px; border-radius: 14px; border: 3px solid #0b2a5c; background: #ffd84a; color: #0b2a5c; box-shadow: 0 4px 0 #0b2a5c; cursor: pointer; }`;
    document.head.appendChild(css);
  }

  return {
    touch, store, audio, pad, beep, noise, ambient, setMuted, setMenuItems,
    setControls, controlsGuide, padText, btn, applyPadLabels, padStyle, guardLeave, get guideOpen() { return !!guideEl; },
    get muted() { return muted; },
    toggleMute: () => { audio(); setMuted(!muted); },
    onMute: f => muteHooks.push(f),
    toast, share, topbar, showPause, hidePause, onHide, controllerScreen, openMenu, closeMenu,
    speak: voice.speak, hush: voice.stop, voice,
    get pauseShowing() { return !!pauseEl; },
  };
})();
