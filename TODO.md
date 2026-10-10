# Later

## Space Wars: rebuild in 3D (three.js) and make it our own

Space Wars draws its fake 3D by hand on a 2D canvas (about 3,700 lines, six worlds). Plan:

1. Build a new 3D Space Wars beside the old one; keep the old one live until the new one matches it.
2. Start with the deep-space dogfight: free flight with the shared orbit camera (`orbit-cam.js`),
   homing shots, enemy waves. It gains the most from real 3D.
3. Then the trench run and the pod race (3D chases), then the rest; swap over when all six are ported and tested.

Done (October 2026): the movie names are gone. The worlds are now the Doom Moon trench run, the Forest Moon of
Verda, the Ice Planet Frostal, the Dunara rocket race, a Spike fighter dogfight and the Comet Runner escape.
The world `key`s (deathstar, endor, ...) and the `xw_*` save keys stay as internal names: the keys name the
pictures in thumbs/ and the save keys keep everyone's progress.
