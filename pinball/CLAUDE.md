# Pinball: Game Brief

## Mission

A pinball game for a group of Emmet's friends. They are going on a pinball-themed scavenger hunt together. Winning this game reveals **Clue #1**, and each friend has to solve it before the hunt. So this game is both an invitation and a puzzle.

- **Deadline:** live, tested and ready to share by **September 30**.
- **The most important rule:** every friend must be able to win. Aim for someone new to the game reaching the clue in about 5 to 10 minutes. Fun first, hard second.

## The clue belongs to Emmet

Emmet writes Clue #1 himself. Do not write it, suggest wording, or guess the answer. If he asks for help, ask questions that help him think. Do not write it for him.

Also talk with him about this: anything in the game's code can be read by anyone who opens the page source, so the clue is visible to a curious player. Let him choose what to do about it. Options include lightly scrambling it, or making "find it in the code" a secret bonus route. It is a real security design choice. Treat it that way.

## Players and controls

- **Players:** 4 to 5 kids, about 11, playing on school laptops (Macs) with a keyboard.
- **Left Shift:** left flipper. **Right Shift:** right flipper.
- **Space:** hold to pull the plunger back, release to launch.
- Backup keys: **Z** and **/** for the flippers, in case Shift misbehaves on some keyboard.
- Show the controls on screen before the first launch.

## Tool and why: the middle path

**Stage 1 (Session 1): 2D physics, flat view, in p5.js.** A working game drawn from above: ball, gravity, walls, two flippers, a plunger, bumpers and three targets.

**Stage 2: 3D look with Three.js.** The same physics, drawn in 3D (see Look and feel). The physics does not change. Only the drawing does.

**Keep both working.** Use a single setting such as `RENDERER = "2D"` or `"3D"` at the top of the code, so the 2D version is always a safe fallback. If 3D fights back, the party is never at risk.

Why it is built this way (teach this): the game's brain (physics and rules) is separate from its camera (drawing). Swapping the camera should not break the brain.

## Physics notes

- **Table tilt:** a real table slopes toward the player, so the ball rolls down. Treat "gravity" as that slope. It is a tuning dial, not Earth gravity.
- **No tunneling.** The ball moves fast and flippers are thin, so move the ball in several small substeps each frame and check collisions at each one. (Emmet's paddle game already uses this trick. Point that out.)
- **Flippers** are rotating paddles. When the ball hits a moving flipper, the flipper's speed should transfer into the ball. That is what makes a flipper shot feel powerful.
- **Bumpers** kick the ball away harder than it arrived.
- **Speed cap** on the ball so it never goes wild.
- Make it forgiving: a few balls per game, and consider a short ball save at the start.

## Win/lose and balance

Decide in plan mode. Starting idea: light all three targets to reveal the clue. Balance questions to ask Emmet:

- Do lit targets stay lit when you lose a ball?
- How many balls per game?
- Should it get easier for a player who keeps losing, so nobody gets stuck?

Test by having someone who has never played try it.

## Look and feel

- **Stage 1:** a flat view from above. It can look plain. It has to feel right.
- **Stage 2:** a lit, tilted 3D pinball table: a shiny ball, glowing bumpers, a camera looking down the table like a real machine.

## Theme and flavor

Pinball history he can use for names, target labels or loading screen facts:

- Pinball grew out of **bagatelle**, a table game from the 1700s and 1800s where you shot balls up a slanted board with a cue stick.
- **1947: Humpty Dumpty**, made by Gottlieb, is known as the first pinball machine with flippers. Before that, players could only launch the ball and nudge the machine.
- **New York City banned pinball** from the 1940s until **1976**, calling it gambling. A player named **Roger Sharpe** helped end the ban by calling his shot in front of the City Council and then making it.

Keep all art and names original.

## Session plan

- **Session 1:** Stage 1 playable, first save point, first publish (even if plain).
- **Session 2:** win condition, the clue, a real test with a first-time player, publish. After this session the link can be shared.
- **Session 3:** Stage 2 (3D look), sounds and polish. Updates go live on the same link.
- **Only if time allows:** a leaderboard. Initials only. The parent sets up any outside service.

## Done means

- A first-time player can reach the clue.
- It works in Chrome on a Mac with the keyboard.
- Libraries load from the local `lib/` folder.
- It is linked from the home page.
- No personal details anywhere in the code or commits.

## Status and next steps

### Design decisions from Session 1 (these replace older ideas above)

- **Table layout:** two levels. A solid wall splits them. The ball goes between levels only through the right tube (two-way). No inner lane on the left.
- **Top level:** 4 spinners (a hub with 4 arms, like a plus sign). The player presses **Up Arrow** and all 4 spin half a turn, then half a turn back. Consider a cooldown so they can't be spammed.
- **Bottom level:** 1 moving target (not 3 targets), 2 bumpers just above the flippers, 2 flippers, an outer lane on each side (drain), and 2 straight dead-end tubes that light up, score, and roll the ball back out.
- **Plunger:** a weak launch falls back. 3 weak launches in a row = lose the ball. Power bar turns green when the pull is strong enough (same math as physics).
- **Scoring:** 10 points per second alive, 200 per target hit, 350 per up shot (going up to the top level). Up shots give points only, no extra ball.
- **View:** Emmet wants a diagonal view. Physics stays flat. Only draw.js tilts the picture, with a `VIEW = "FLAT"` / `"ANGLED"` setting.
- **Win condition:** the old idea ("light 3 targets") no longer fits. Decide in Session 2.

### Design decisions from Session 2 (these replace older ideas above)

- **Luck fixes:** bumpers moved to the top level (Emmet placed them). Outer lanes kept but narrowed with **OUTLANE_WIDTH = 27**.
- **Win condition:** reach **WIN_SCORE = 2500** in one game. The win screen shows Clue #1 (`clue.js`, written by Emmet, left in plain text by his choice). Enter = keep playing the same game; the clue shows again on Game Over.
- **Help mode:** each lost game in a row adds 1 starting ball, up to **MAX_BALLS = 5**. Resets on a win or a page reload.
- **Scoring now:** 10/second alive, target 150, tube 250, up shot 500, spinner hit 50. Light both dead-end tubes = extra ball (then they reset). Tubes stay lit between balls, reset each game.
- **Spinners:** Up Arrow, half turn out and back, **SPINNER_COOLDOWN = 0.25**.
- **View:** angled, **CAMERA_DEPTH = 1**, **CAMERA_TILT = 1.2**.
- **Leaderboard:** shared, stored in a Google Sheet the parent owns (Apps Script web app, URL in `leaderboard.js`, script copy in `leaderboard-script.gs`). Top 15, 3 letters A to Z, winners only (2,500+). The sheet checks every entry itself (never trust the player's computer). If the sheet can't be reached, the game says "Leaderboard offline" and keeps working. To remove an entry, delete its row in the sheet. If the script changes, the parent must redeploy a new version.
- **Home page** links to the game.

### Session 3 (final day before sharing)

- Colors: yellow flippers (Emmet typed it), navy bumpers with the yellowish outline.
- "Leaderboard" link under the score opens `leaderboard.html` in a new tab. The link's box is in `LEADERBOARD_LINK` in `table.js`, used by both the drawing and the click check.
- **3D is live and the default** (`RENDERER_DEFAULT = "3D"`, camera in `draw3d.js`, Three.js 0.149 in `lib/`). Physics did not change. If a laptop can't do 3D (no WebGL, or 3D fails while drawing), the game switches to 2D by itself. Tested on Emmet's school laptop.
- To force 2D for testing, set `RENDERER_DEFAULT = "2D"`. Adding `?3d` to the address always asks for 3D.
- The `3d-try` branch was merged into `main`. It can be deleted.

### What works (tested)

- Physics: ball, gravity, walls, substeps (no tunneling), speed cap, flippers, plunger with power bar and weak launch rule.
- Outer lanes, balls, ball save, Game Over, win screen with clue, help mode.
- Bumpers, moving target, spinners, dead-end tubes (Emmet fixed the "ball above the tube counts as in the tube" Ghost Bug himself), angled camera, fits any screen.
- Initials entry and leaderboard flow, checked with a headless run of the game brain. The sheet reads correctly, rejects a fake low score, and sends the browser permission header.

### Built but NOT tested in the browser yet

- The leaderboard screen itself, and a real save of a 2,500+ score. The first real entry should be Emmet's.

### Known issues

- Getting back up through the chute is very hard. The two-way right tube (not built) would replace it.
- The "15" is written twice: `LEADERBOARD_SIZE` in `leaderboard.js` and `TOP_COUNT` in the sheet script. Change both together.
- No first-time-player playtest yet. Do one before sharing the link.

### Next time

1. Emmet plays a real 2,500+ game and saves the first leaderboard entry. Check it shows up in the sheet.
2. Playtest with someone who has never played. Watch without helping. Time to first win should be 5 to 10 minutes.
3. Tune from the playtest (WIN_SCORE, OUTLANE_WIDTH, BALL_SAVE_SECONDS, BUMPER_KICK).
4. Only if time allows: the two-way right tube, sounds.
5. Share the link.
6. When testing with a low WIN_SCORE, always set it back to 2500 before committing.
