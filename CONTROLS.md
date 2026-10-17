# RoboBandit controls standard

Every RoboBandit game uses the same controls, matched to **EBITDA Hero**'s scheme so a player who
knows one game knows them all. The headline rule: **right trigger goes, left trigger brakes.**

Each game maps these standard bindings onto the mechanics it already has. A game never invents a key
for something the standard already names (sound, pause, map, guide, camera); where a game has a
mechanic the standard doesn't name (a shield, a power-up), it uses the nearest standard role below.

## Keyboard and mouse

| Role | Binding |
|---|---|
| Move / steer / fly (the same as the left stick) | **W A S D** |
| Vehicle accelerate / go | **W** (or the game's "go" key) |
| Vehicle brake, then reverse | **S** |
| Run / boost | hold **Shift** (either one) |
| Jump / main action | **Space** |
| Interact / help / talk | **E** |
| Get on or off (vehicle, ride, mount), use / take | **F** |
| Attack ("punch"): throw, fire, snap | **J** or left mouse |
| Second attack ("kick") / special | **K** or right mouse |
| Horn | hold **H** |
| Map and menu | **M** (shared, in common.js) |
| Camera: rotate left / right, back behind you | **Z / X**, **R** (shared, orbit-cam.js) |
| Pause / carry on | **Esc** |
| Sound on / off | **N** (shared, in common.js) |
| Controls guide | **F1**, **/** or **?** (shared, in common.js) |
| Menus: move focus / press | **Tab / Shift+Tab**, **Enter** (Space on buttons), **Esc** back |

Binding rules:
- **Arrow keys do not move or steer during gameplay.** (Lessons may still use ← → to turn slides.)
- **P does not pause** (common.js swallows it). **Tab** is for menu focus only.
- **C does not descend**: a "descend / drop / dive" key is **Ctrl** (either one), or **S** where S is free.
- Support **either Shift** and **either Ctrl**.
- Gameplay keys never fire while typing in a box or while the ☰ menu, the controls guide or the
  controller screen is open (common.js stops them).
- A game in play that uses Ctrl asks before leaving the page (`beforeunload`) so Ctrl + W can't close
  the tab by accident.

## Xbox-style controller

| Role | Binding |
|---|---|
| Move / steer / fly | left stick (and the D-pad) |
| Camera look | right stick |
| Jump / main action / interact | **A** |
| Run / boost | **X** |
| Get on or off, use / take | **Y** |
| Back, handbrake, descend / drop | **B** |
| **Go / accelerate**; attack ("punch") on foot | **RT** |
| **Brake, then reverse**; second attack ("kick") on foot | **LT** |
| Camera back behind you | right-stick click, **LB** or **RB** |
| Horn | left-stick click |
| Map and menu (twice: all games) | **View** |
| Pause / carry on | **Menu** |
| Menus | D-pad or left stick to move, **A** pick, **B** back |

Button names follow the controller that's plugged in (Xbox Ⓐ/LT/RT, PlayStation ✕/L2/R2,
Nintendo B/ZL/ZR by position). In text, write `{A}`, `{B}`, `{X}`, `{Y}`, `{LB}`, `{RB}`, `{LT}`, `{RT}`,
`{L3}`, `{R3}`, `{LS}`, `{RS}`, `{VIEW}`, `{MENU}`, `{DPAD}` and run it through `RB.padText()`; in HTML use
`<b data-pad="A">Ⓐ</b>` (common.js fills in the right name).

common.js turns the controller into keys during play: left stick / D-pad → W A S D, A → Space,
X → Shift, Y → F, RT → J, LT → K, left-stick click → H. A game changes these with `RB.pad.setButtons()`
(two-player games read each controller directly with `RB.pad.read(i)`).

## Touch

- A floating stick under the left thumb; drag with a second finger to look around (3D games).
- Action buttons only when they apply; each game keeps its own touch layout.
- A connected controller takes over: anything marked `class="rb-touch"` hides.

## The controls guide

Each game calls `RB.setControls({ name, camera, rows: [{ act, keys, pad, touch }], note })` once. That list
is shown by F1 / ? / /, by the 🕹️ CONTROLS button on the pause screen and in the ☰ menu, and as the
legend on the controller screen. The shared rows (pause, map, sound, guide, menus, and the camera for
3D games) are added automatically.

## Game by game

| Game | Go / RT | Brake / LT | A / Space | X / Shift | Y / F | B | Attack J / K | Other |
|---|---|---|---|---|---|---|---|---|
| Floppy Bird | flap | — | flap | — | — | — | — | click / tap flaps |
| Surf's Up | — | — | start | — | — | — | — | W / A tip the nose up the wave, S / D down |
| Web Hero | swing (hold) | — | jump / swing (hold) | — | — | — | — | click / hold to swing |
| Sparkle Meadow | — | — | help / jump | — | — | — | — | E also helps |
| Hamglider | boost | close wings (drop) | roll / open & close wings | boost | — | close wings | — | Ctrl closes wings; camera Z / X / R |
| Space Wars | main guns (hold) | special weapon | main guns | special / racer boost | — | — | J (or Space, left click) guns · K (or right click) special | quiz: A–D or 1–4, H hint |
| Witch Way Out | boost | air brake | shield | boost | use power-up | throw hat | J throws the hat | Ctrl brakes; camera Z / X / R; 2 players: P1 W A S D, left Shift / Ctrl, Space, G hat, F power-up · P2 I J K L, right Shift / Ctrl, Enter, O hat, U power-up |
| Lily Pad Lunch | snap | dive | hop | — | — | dive | J / left click snaps | A / D or mouse aim; S or Ctrl dives; LB / RB hop left / right; 2 players: P1 A / D, F, W, S · P2 J / L, Enter, I, K |
| Lucky Leo | throw hat | crouch / ground pound | jump | run (and sparks) | hop off Shamrock | jump | J throws the hat | E drops the saved power-up (also LB) |
| ABC Train | speed up | slow down, then back up | go / stop | horn | get off / all aboard | stop (handbrake) | — | H / left-stick click horn; W / S throttle; A / D pick the way at a fork; C / RB camera view; Esc pauses |
| Flight School | burner / thrust / action | — | action (stage, wake up, launch…) | action | — | — | — | W counts as "hold" in burner levels |
