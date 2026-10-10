# Tests

`tests/run.js` opens every page in a headless browser and checks that it works:

- the game list shows a card (and thumbnail) for every game, with best scores
- every page's link-preview picture exists, and nothing still says "Starfighter Run"
- **Floppy Bird**: an autopilot scores 9+ points, crashes use up the 3 lives, pause freezes time
- **Surf's Up**: an autopilot launches aerials and the five judges score the ride; the touch joystick carves
- **Space Wars**: the touch joystick flies the ship and the fire buttons show (and the six missions use our own ships and planets, not movie names)
- **Hamglider**: an autopilot lands on the target in every round of all four worlds (ocean, lava, storm, and the Cape Cod Canal, where it has to boost); leaning on the ramp curves the takeoff; islands (out past the target) and the canal banks are safe landings; the railroad bridge is solid; secrets unlock hamster balls; a bullseye plays a slow-motion replay; lava is a "TOO HOT!" bounce; worlds unlock in order and "Unlock all" opens everything; the joystick and WINGS button work on a phone
- **Web Hero**: just holding chains swings across the city, bonks bots and beats the Big Bandit; three falls end the game
- **Sparkle Meadow**: following the pink arrow makes all six animal friends (and saves them); sparkles unlock the unicorn horn
- **Witch Way Out**: flying the friendly line (with shields in the storm) escapes the pumpkin without being caught; doing nothing gets caught but the pumpkin eases off so everyone can finish
- **Flight School**: every lesson diagram draws (sliders at both ends); autopilots (`tests/flight-bots.js`) win all 14 rounds in Easy and Toddler modes, and every round ends even with no input in all three modes; the quiz gives second chances, saves stars and Flight Cards and unlocks the next level; Toddler mode opens every level and skips quizzes; a perfect final exam earns the honors certificate; "Unlock all levels" opens every level and the exam and is remembered; on a phone, holding fires the burner, STAGE stages and the joystick flies the helicopter
- **School folders**: the home page links to each grade's folder, and the 5th and 2nd grade folders list their subjects with saved stars, and the Preschool folder lists its games
- **5th grade** (reading & rights, math, science, social studies) and **2nd grade** (math, reading, science, social studies): every lesson picture draws, every quiz can be aced, every game can be won with 3 stars
- **Xbox controller** (a pretend one): the D-pad and Ⓐ pick games on the arcade page, press menu buttons and lesson buttons; Ⓐ flaps and holds the burner; the left stick steers smoothly; ☰ pauses; crashes rumble
- **Witch Way Out race**: nobody moves during the 3-2-1 countdown; Ⓧ throws the hat at a witch in range, knocks her off and the hat comes back; LT boosts (faster, the meter drains, magic dust appears); a magic box gives a power-up and Ⓑ sends the bats after the leader; a racer who boosts, throws hats and uses power-ups finishes 1st or 2nd with all six on the results list
- **Witch Way Out camera**: the right stick swings the camera all the way around the witch at a steady distance, clicking it snaps back, letting go drifts back behind her, and pushing right moves her right on screen from behind and in front
- pausing silences all music and sound; the controller's ⧉ View button pressed twice goes back to all the games (or a lesson's folder)
- every page links the shared files with the same `?v=` stamp (run `node tools/bump-version.js` after changing a shared file)
- **Lucky Leo**: a search over every place Leo can stand proves every level can be finished (and the golden key reached), with 5 rainbow gems each; walking, stomping a goblin, bumping a clover block and growing, kicking a snail shell, a pit costing a life, the goal opening the next level on the map, the golden key opening Rainbow Road, and three stomps on King Grumbles leading to the pot of gold and the ending; the high jump (crouch + jump), ground pound and boomerang hat (knocks out enemies, comes back, can be bounced on); Ⓐ jumps and Ⓧ runs on a controller; on a phone the map's levels can be tapped and the ◀ ▶ A buttons walk and jump
- **☰ Menu**: every game and lesson has one menu button; it pauses the game, lists all 10 games and 3 school folders (marking the one you're in, with working links even from inside a folder), keeps keys from reaching the game, and Esc / Ⓑ close it
- **Hamglider camera**: the right stick swings the shared orbit camera (`orbit-cam.js`) round Pip, LB swings it back, pushing right moves Pip right on screen from behind and in front, and it orbits at a steady distance
- **Controller screen** (Witch Way Out, from the title and the pause menu): testing lights up the picture without pressing anything, holding Ⓑ finishes, inverting each stick and switching vibration off save and take effect, Ⓑ / Escape go back
- **ABC Train** (Preschool): pressing GO drives to the station with the A, the train brakes by itself and the Alligator hops on (the letter is read out and saved); four letters fill the wagons and the animals hop off into the Animal Park; tapping an animal says its name; on a phone, Find the letter glides up to a station when STOP is pressed a little early, and only the right letter gets on
- **Read-aloud voice**: with pretend device voices, the natural one ("Samantha (Enhanced)") is picked over robotic ones (Fred, Albert), long text is read a sentence at a time, emoji are skipped and km/h is said in words; the ☰ menu lists the good voices and remembers the one picked
- muting one game mutes them all

The autopilots call each game's own `update()` in a loop, so a whole game takes a few seconds.
Screenshots are saved to `tests/output/` (not committed) so you can eyeball the result.

## Running

```sh
npm install                  # once: installs Playwright
npx playwright install chromium   # once, if you don't have a browser for it yet
npm test
ONLY=witch npm test       # just the tests whose name matches
```

After changing any shared file (`common.js`, `common.css`, `touch-stick.js`, `lesson.js`, …) run `node tools/bump-version.js`, so visitors never get a mix of old and new files.

When you add a game, add a block for it to `tests/run.js`, then make its link-preview picture with
`npm run previews` (add the game to the list at the top of `tools/make-previews.js` first).
