# Growth Tank: Game Brief

## Mission

A 3D tank battle in a city, for anyone who finds the site. Every point of damage you deal becomes your power. Every hit you take drains it. Grow as big as you can and fight for #1.

## Players and controls

- One player on a laptop, keyboard and mouse.
- **W A S D:** move. **Mouse or ← →:** aim. **Click or Space:** shoot.
- 8 enemy tanks and 4 boss tanks, all bots.

## Tool and why

**Three.js**, because the game is 3D. A local copy goes in `growthtank/lib/three.min.js` (version 149, the same file Pinball uses), so school laptops can't block it.

## Win/lose and balance

- **Score:** your highest power in a game. (Emmet's call: this rewards fighting, not hiding.)
- **Lose:** your power drops to zero. You can rejoin or start a new game.
- **The big balance question:** a hit steals 30% of the shooter's power, so big tanks snowball. Tense means the leader should always feel hunted. Ideas to test: bots gang up on #1, or the leader takes extra damage.

## Look and feel

A gray city grid with parks, lit windows, and blue sky with fog. Bosses are gold and bigger. Tense: you can't see far, enemies appear around corners, and you can never relax at the top.

## Done means (version 1)

1. Runs from its own folder with a local library, and works on a school laptop.
2. All tuning numbers are in a `TUNING` section at the top.
3. A real high-score leaderboard that saves between games, using the studio's shared leaderboard (first name + last initial, 12 characters max). Score is highest power.
4. Listed on the home page.

## Status and next steps

- **Works:** the full game, pasted in from an earlier version. It still tracks "time at #1" as its score.
- **Next:**
  1. Make the folder, save the library locally, add `index.html`.
  2. Pull the numbers into `TUNING`.
  3. Switch the score from time at #1 to highest power.
  4. Add the game to the home page.
  5. Hook up the real leaderboard.
