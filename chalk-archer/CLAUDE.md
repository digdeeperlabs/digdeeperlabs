# Chalk Archer: Game Brief

## Mission

A stick-figure archer on a chalkboard fights through room after room of enemies. Move to dodge, stand still to shoot. Clear a room, pick an upgrade, go again. How far can you get?

(Emmet: rewrite this in your own words.)

## Players and controls

- **Players:** one player, on a laptop keyboard. Also works on phones and tablets.
- **WASD or arrow keys:** move.
- **Space:** dash in the direction you're moving.
- **The bow fires by itself** when you stand still. It aims at the closest enemy.
- **Touch:** drag anywhere to move, double-tap to dash.
- **Upgrade cards:** click one after each room.

## Tool and why

Plain canvas, no libraries. The game was already built this way and runs well, so there's nothing to add. No `lib/` folder needed.

## Win/lose and balance

- **Lose:** your health hits 0. There's no win. The goal is to go as deep as you can.
- **A boss room every 5 rooms** (**BOSS_EVERY**). Enemies get tougher every room.
- **Score = kills only.** Points per kill:

  | Enemy | Points | Why |
  |---|---|---|
  | Runner (chaser) | 1 | Easy, comes straight at you |
  | Tank | 2 | Lots of health, but with Bloodletter it's free healing |
  | Bomber | 3 | Only if **you** shoot it. Blowing up on you is worth 0. |
  | Shooter | 4 | Keeps its distance and shoots. The dangerous one. |
  | Boss | 10 | |

- No points for clearing a room or picking up health orbs. Emmet decided: points are kills, nothing else.
- **Leaderboard:** total points for the run. Any score of 1 or more can be saved.

## Look and feel

- White chalk on a dark green chalkboard, hand-drawn font, wobbly hand-drawn borders.
- Screen shake on big hits, chalk-dust bursts when enemies die.
- Game-over title: "Erased" (or "Smudged" past room 10).

## Done means

- Playable at digdeeperlabs.com/chalk-archer.
- Scores follow the points table above.
- At game over, the player can type a name and save the score to the shared leaderboard.
- It's on the home page.

## Status and next steps

**Done (2026-11-01). Live at digdeeperlabs.com/chalk-archer.**

What works:
- Emmet's scoring (kills only, points table above). Bombers that blow up on you score 0.
- `TUNING` section at the top: **POINTS**, **PLAYER_START** (one source of truth for starting stats), **BOSS_EVERY**, **GAME_ID**.
- Game over shows the shared save box (`shared/leaderboard.js`). The name limit and minimum score come from the sheet. The first score is on the board.
- The Space key works in the name box (the game ignores keys while you type).
- A "Leaderboard" link on the title screen and in the top bar opens `leaderboards/?game=chalk-archer` in a new tab.
- It's in the home page's game menu (`shared/games.js`).

Broken / not done:
- The Mission above still needs rewriting in Emmet's own words.
- The blurb in `shared/games.js` says "Win a game to get on the leaderboard", but Chalk Archer has no win. Reword it.
- No "How to play" box yet beyond the title screen text. Emmet rewrites that text in his own words.

Next time:
- Reword the Mission and the blurb.
- Then the next game in the Part 3 order: Cube Corner.
