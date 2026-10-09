// Floating thumb-stick for touch screens, shared by the RoboBandit games.
// Put a finger down anywhere on `surface` and drag: a ring appears where you touched and the
// inner knob follows your finger. stick.x and stick.y run from -1 to 1 (y is +1 when dragged down).
// Mouse input is ignored, so desktop controls keep working as before.
function createTouchStick(surface, { enabled = () => true, radius = 55 } = {}) {
  const css = document.createElement('style');
  css.textContent = `
    .touch-stick { position: fixed; z-index: 3; width: 120px; height: 120px; margin: -60px 0 0 -60px; border-radius: 50%;
      border: 3px solid rgba(255,255,255,.6); background: rgba(11,42,92,.25); pointer-events: none; display: none; }
    .touch-stick.on { display: block; }
    .touch-stick div { position: absolute; left: 35px; top: 35px; width: 50px; height: 50px; border-radius: 50%;
      background: rgba(255,255,255,.8); }`;
  document.head.appendChild(css);
  const ring = document.createElement('div'), knob = document.createElement('div');
  ring.className = 'touch-stick';
  ring.appendChild(knob);
  document.body.appendChild(ring);

  const stick = { x: 0, y: 0, active: false, id: null, ox: 0, oy: 0 };
  stick.reset = () => {
    stick.id = null; stick.active = false; stick.x = stick.y = 0;
    knob.style.transform = '';
    ring.classList.remove('on');
  };
  surface.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' || stick.id !== null || !enabled()) return;
    stick.id = e.pointerId; stick.active = true; stick.ox = e.clientX; stick.oy = e.clientY;
    ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px';
    ring.classList.add('on');
  });
  surface.addEventListener('pointermove', e => {
    if (e.pointerId !== stick.id) return;
    stick.x = Math.max(-1, Math.min(1, (e.clientX - stick.ox) / radius));
    stick.y = Math.max(-1, Math.min(1, (e.clientY - stick.oy) / radius));
    knob.style.transform = `translate(${stick.x * 35}px, ${stick.y * 35}px)`;
  });
  const end = e => { if (e.pointerId === stick.id) stick.reset(); };
  surface.addEventListener('pointerup', end);
  surface.addEventListener('pointercancel', end);
  addEventListener('blur', stick.reset);
  if (typeof RB !== 'undefined' && RB.pad) RB.pad.addStick(stick, enabled);   // a game controller's left stick can drive it too
  return stick;
}
