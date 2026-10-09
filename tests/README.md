# Tests

`tests/run.js` opens every page in a headless browser and checks that it works:

- the game list shows a card (and thumbnail) for every game, with best scores
- every page's link-preview picture exists, and nothing still says "Starfighter Run"
- **Floppy Bird**: an autopilot scores 9+ points, crashes use up the 3 lives, pause freezes time
- **Surf's Up**: an autopilot launches aerials and the five judges score the ride; the touch joystick carves
- **Space Wars**: the touch joystick flies the ship and the fire buttons show
- **Hamglider**: an autopilot lands on the target in every round of all three worlds (ocean, lava, storm); leaning on the ramp curves the takeoff; islands are safe landings; secrets unlock hamster balls; a bullseye plays a slow-motion replay; lava is a "TOO HOT!" bounce; worlds unlock in order and "Unlock all" opens everything; the joystick and WINGS button work on a phone
- **Web Hero**: just holding chains swings across the city, bonks bots and beats the Big Bandit; three falls end the game
- **Sparkle Meadow**: following the pink arrow makes all six animal friends (and saves them); sparkles unlock the unicorn horn
- **Witch Way Out**: flying the friendly line (with shields in the storm) escapes the pumpkin without being caught; doing nothing gets caught but the pumpkin eases off so everyone can finish
- **Flight School**: every lesson diagram draws (sliders at both ends); autopilots (`tests/flight-bots.js`) win all 14 rounds in Easy and Toddler modes, and every round ends even with no input in all three modes; the quiz gives second chances, saves stars and Flight Cards and unlocks the next level; Toddler mode opens every level and skips quizzes; a perfect final exam earns the honors certificate; "Unlock all levels" opens every level and the exam and is remembered; on a phone, holding fires the burner, STAGE stages and the joystick flies the helicopter
- **School folders**: the home page links to each grade's folder, and the 5th grade folder lists its subjects with saved stars
- **5th grade** (reading & rights, math, science, social studies): every lesson picture draws, every quiz can be aced, every game can be won with 3 stars
- muting one game mutes them all

The autopilots call each game's own `update()` in a loop, so a whole game takes a few seconds.
Screenshots are saved to `tests/output/` (not committed) so you can eyeball the result.

## Running

```sh
npm install                  # once: installs Playwright
npx playwright install chromium   # once, if you don't have a browser for it yet
npm test
```

When you add a game, add a block for it to `tests/run.js`, then make its link-preview picture with
`npm run previews` (add the game to the list at the top of `tools/make-previews.js` first).
