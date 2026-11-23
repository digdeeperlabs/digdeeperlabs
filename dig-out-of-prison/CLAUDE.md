# Dig Out of Prison: Game Brief

## Mission

Dig down through the floor of your cell, one block at a time, and escape through the old sewer as fast as you can, without getting caught by the police at night.

(Emmet: rewrite this in your own words.)

## Players and controls

- **Players:** one player, on a laptop keyboard and mouse. Touch buttons show up on phones and tablets.
- **WASD:** move. **Mouse** (click the game first) or **← →:** look.
- **Hold E** (or Space): dig.
- **F:** talk to the other prisoners (shops).
- **C:** put the rug over the hole, or take it off.
- **W / S:** climb up and down in the shaft.

## Tool and why

**Three.js** (local copy in `lib/`, r149 from pinball). The game is 3D and first person. Emmet's original loaded r128 from the internet. Everything it uses works the same in r149.

## Win/lose and balance

- **Win:** dig **DEPTH_BLOCKS = 40** blocks (80 m) into the sewer.
- **No lose.** If the police catch you, they take everything in your pack and put you back in your cell.
- **Economy:** sell dirt, clay, stone and gold to Rico for 🧻, then buy better tools (Shovel 20, Pickaxe 60, Jackhammer 150), sharpening and food.
- **Two modes**, both in the `MODES` table at the top of the code (one source of truth):
  - **Normal:** start with 6 🧻, the pack holds 20, the normal drain and police.
  - **Hard:** start with 0 🧻, the pack holds 12, energy and tools drain 2× faster, Rico pays 30% less, night comes sooner, and the police are faster.
- **Leaderboard:** the **fastest escape** wins, with separate boards for Normal and Hard. The sheet rejects any time under **100 seconds** (Emmet's call) as a cheat.

## Look and feel

- Blocky 3D characters, a prison block with cells and bars, day and night lighting.
- The screen glows red when a guard is looking at you.

## Done means

- Playable at digdeeperlabs.com/dig-out-of-prison.
- A timer on screen. The win screen shows the time and the mode.
- A save box on the win screen, saving to the right board (Normal or Hard).
- In the home page menu, with both boards on the leaderboards page.

## Status and next steps

- Step 1 (game on the site, `MODES` table, timer): in progress.
- Step 2: the sheet learns "lowest wins" (the parent deploys a New version).
- Step 3: the leaderboard hookup.
