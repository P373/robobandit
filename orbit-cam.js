// 360° orbit camera for the RoboBandit 3D games, tuned in Witch Way Out after Super Mario Odyssey
// and camera-design best practice:
// - the 🎮 right stick (or Q / E, or a drag) swings it all the way around the player; up and down are slower,
//   stop short of straight overhead / underneath, and ease off near the limits instead of hitting a wall
// - LB (like Odyssey's L), clicking a stick, or R swings it back behind in a quick, smooth move
// - after 1.5 s without camera input it springs back behind, leading a little into turns
//   (it never moves on its own while you're holding the stick)
// - left and right steering follow the screen wherever the camera is (see steer())
// - invert up/down / left-right and camera speed come from the shared 🎮 controller settings
//
//   const cam = createOrbitCam({ canvas, enabled: () => playing, stick });   (fingers: true lets one finger drag it, for games with no touch stick)
//   each frame:  cam.input(dt, steerX);  then place the camera along cam.ray(heading, pitch, v) from the player
//   steering:    heading += steerX * rate * dt * cam.steer(steerX)
//
// cam.yaw / cam.el are where you've pointed it (0 = straight behind), cam.yawS / cam.elS the smoothed angles.
function createOrbitCam({ canvas, enabled = () => true, stick = null, el0 = 0.33, minEl = -0.17, maxEl = 1.05,
  turn = 2.8, tilt = 1.3, idleBack = 1.5, lead = 0.22, recenter = [4, 10, 11], mouseButtons = [0], fingers = false } = {}) {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const pad = () => (typeof RB !== 'undefined' && RB.pad) || {};   // (an old cached common.js has no right stick)
  const cfg = () => pad().config || {};
  const cam = { yaw: 0, el: el0, yawS: 0, elS: el0, idle: 99, snap: false, drag: null, steerRef: null, steerSign: 0,
    el0, minEl, maxEl, keyL: false, keyR: false };
  // near the top and bottom limits the tilt slows down, so it settles instead of slamming into a stop
  const softTilt = (el, d) => d * clamp((d > 0 ? maxEl - el : el - minEl) / 0.25, 0.15, 1);

  cam.reset = () => { cam.yaw = cam.yawS = 0; cam.el = cam.elS = el0; cam.idle = 99; cam.steerRef = null; cam.drag = null; };
  // Called once a frame while playing. sx is the steering input (-1..1): the camera leads a little into turns.
  cam.input = (dt, sx = 0) => {
    const L = pad().look || { x: 0, y: 0 }, sp = pad().camSpeed || 1;
    const lx = clamp(L.x + (cam.keyR ? 1 : 0) - (cam.keyL ? 1 : 0), -1, 1), ly = L.y;
    if (lx || ly) {
      cam.yaw -= lx * turn * sp * dt;   // push right: the view swings right
      cam.el = clamp(cam.el + softTilt(cam.el, ly * tilt * sp * dt), minEl, maxEl);   // push up: look up from lower down
      cam.idle = 0;
    } else if (!cam.drag) cam.idle += dt;
    if ((pad().pressed && recenter.some(i => pad().pressed(i))) || cam.snap) { cam.yaw = 0; cam.el = el0; cam.idle = 99; cam.snap = false; }
    cam.yaw = wrap(cam.yaw);
    if (cam.idle > idleBack) {   // a soft spring back behind, the short way round, leading into turns
      const k = 1 - Math.exp(-dt / 0.6);
      cam.yaw += wrap(-sx * lead - cam.yaw) * k; cam.el += (el0 - cam.el) * k;
    }
    // smooth the angles themselves, so the camera glides around on a circle (and a reset is a quick swing)
    cam.yawS = wrap(cam.yawS + wrap(cam.yaw - cam.yawS) * Math.min(1, dt * 10));
    cam.elS += (cam.el - cam.elS) * Math.min(1, dt * 10);
  };
  // Left and right are the screen's left and right, wherever the camera is (like Mario Odyssey): seen from
  // in front, pushing right turns the player toward their own left. The camera angle is "latched" while the
  // stick is held the same way, so a camera that is still swinging around never changes which way you turn.
  // Returns -1..1: multiply your turn rate by it.
  cam.steer = sx => {
    if (!sx) cam.steerRef = null;
    else if (cam.steerRef === null || Math.sign(sx) !== cam.steerSign) { cam.steerRef = cam.yawS; cam.steerSign = Math.sign(sx); }
    return clamp(Math.cos(cam.steerRef === null ? cam.yawS : cam.steerRef) * 1.6, -1, 1);
  };
  // The direction from the player out to the camera (a THREE.Vector3, written into out). heading: which way
  // the player faces, measured so that facing is (-sin heading, 0, -cos heading), i.e. 0 = toward -z and
  // turning left is positive; pitch tips the view a little with the player's nose.
  cam.ray = (heading, pitch, out) => {
    const a = heading + cam.yawS, el = clamp(cam.elS - (pitch || 0) * 0.25, minEl, maxEl);
    return out.set(Math.sin(a) * Math.cos(el), Math.sin(el), Math.cos(a) * Math.cos(el));
  };
  // how much to aim ahead of the player: all the way from behind, none when swung round or looking down
  cam.ahead = () => Math.pow(Math.max(0, Math.cos(cam.yawS)), 2) * clamp(1 - Math.abs(cam.elS - el0) / 0.7, 0, 1);

  // keys: Q / E swing it round, R snaps it back
  addEventListener('keydown', e => {
    if (e.code === 'KeyQ') cam.keyL = true;
    if (e.code === 'KeyE') cam.keyR = true;
    if (e.code === 'KeyR') cam.snap = true;
  });
  addEventListener('keyup', e => { if (e.code === 'KeyQ') cam.keyL = false; if (e.code === 'KeyE') cam.keyR = false; });
  addEventListener('blur', () => { cam.keyL = cam.keyR = false; });
  // drag with the mouse, or a second finger (the first one steers with the touch stick), or any finger with fingers: true
  if (canvas) {
    canvas.addEventListener('pointerdown', e => {
      if (!enabled()) return;
      const mouse = e.pointerType === 'mouse' && mouseButtons.includes(e.button);
      const finger = e.pointerType !== 'mouse' && (fingers || (stick && stick.id !== null && e.pointerId !== stick.id));
      if (mouse || finger) cam.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('pointermove', e => {
      const d = cam.drag;
      if (!d || e.pointerId !== d.id) return;
      cam.yaw -= (e.clientX - d.x) * 0.008 * (cfg().invRX ? -1 : 1);
      cam.el = clamp(cam.el + (e.clientY - d.y) * 0.005 * (cfg().invRY ? -1 : 1), minEl, maxEl);
      d.x = e.clientX; d.y = e.clientY; cam.idle = 0;
    });
    const end = e => { if (cam.drag && e.pointerId === cam.drag.id) cam.drag = null; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    if (!mouseButtons.includes(0)) canvas.addEventListener('contextmenu', e => e.preventDefault());   // right-drag
  }
  return cam;
}
