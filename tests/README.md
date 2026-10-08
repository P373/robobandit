# Tests

`tests/run.js` opens every page in a headless browser and checks that it works:

- the game list shows a card (and thumbnail) for every game, with best scores
- every page's link-preview picture exists, and nothing still says "Starfighter Run"
- **Floppy Bird**: an autopilot scores 9+ points, crashes use up the 3 lives, pause freezes time
- **Surf's Up**: an autopilot launches aerials and the five judges score the ride; the touch joystick carves
- **Space Wars**: the touch joystick flies the ship and the fire buttons show
- **Hamglider**: an autopilot lands on the target in all five rounds; the joystick and WINGS button work on a phone
- **Web Hero**: just holding chains swings across the city, bonks bots and beats the Big Bandit; three falls end the game
- **Sparkle Meadow**: following the pink arrow makes all six animal friends (and saves them); sparkles unlock the unicorn horn
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
