# Cube Corner: Game Brief

## Mission

Stack falling blocks and clear full rows before they reach the top.

## Players and controls

- **Players:** one player, on a laptop keyboard.
- **Left / Right arrows:** move the falling shape.
- **Up arrow:** rotate.
- **Down arrow:** hold to drop fast.
- **Enter:** play again after game over.

## Tool and why

**p5.js** (local copy in `lib/`, v1.11.1). The original was already a p5 sketch, and a grid of squares is simple 2D drawing, which is what p5 is good at.

## Win/lose and balance

- **Lose:** a new shape has no room at the top.
- **No win.** You play for points.
- **Points = (rows cleared at once)² × ROW_POINTS.** 1 row = 100, 2 = 400, 3 = 900, 4 = 1,600. Clearing rows together is worth much more, so it rewards risky stacking.
- **Speed-up:** every **ROWS_PER_LEVEL** (10) rows is a new level, and the wait between drops is multiplied by **SPEEDUP** (0.85). Exponential on purpose, so every game ends eventually.
- **Leaderboard:** points. Any score of 1 or more can be saved.

## Look and feel

- Neon arcade: glowing cubes on black, matching the home page.
- Each shape has its own neon color.
- Full rows flash **neon green** (Emmet's pick) for **FIZZ_SECONDS** before they vanish.

## Done means

- Playable at digdeeperlabs.com/cube-corner.
- Same speed on every computer (delta time, not frames).
- A real game-over screen with the score, Enter to play again, and the save box.
- In the home page menu and on the leaderboards page.

## Status and next steps

- Step 1 (game runs, end screen): in progress.
- Step 2: leaderboard.
