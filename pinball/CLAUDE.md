# Pinball: Game Brief

## The mission

A pinball game for a group of Emmet's friends. They are going on a pinball-themed scavenger hunt together. Winning this game reveals **Clue #1**, and each friend has to solve it before the hunt. So this game is both an invitation and a puzzle.

- **Players:** 4 to 5 kids, about 11, playing on school laptops (Macs) with a keyboard.
- **Deadline:** live, tested and ready to share by **September 30**.
- **The most important rule:** every friend must be able to win. Aim for someone new to the game reaching the clue in about 5 to 10 minutes. Fun first, hard second.

## The clue belongs to Emmet

Emmet writes Clue #1 himself. Do not write it, suggest wording, or guess the answer. If he asks for help, ask questions that help him think. Do not write it for him.

Also talk with him about this: anything in the game's code can be read by anyone who opens the page source, so the clue is visible to a curious player. Let him choose what to do about it. Options include lightly scrambling it, or making "find it in the code" a secret bonus route. It is a real security design choice. Treat it that way.

## Controls

- **Left Shift:** left flipper. **Right Shift:** right flipper.
- **Space:** hold to pull the plunger back, release to launch.
- Backup keys: **Z** and **/** for the flippers, in case Shift misbehaves on some keyboard.
- Show the controls on screen before the first launch.

## How it gets built: the middle path

**Stage 1 (Session 1): 2D physics, flat view.** A working game drawn from above in p5.js: ball, gravity, walls, two flippers, a plunger, bumpers and three targets. It can look plain. It has to feel right.

**Stage 2: 3D look with Three.js.** The same physics, drawn as a lit, tilted 3D pinball table: a shiny ball, glowing bumpers, a camera looking down the table like a real machine. The physics does not change. Only the drawing does.

**Keep both working.** Use a single setting such as `RENDERER = "2D"` or `"3D"` at the top of the code, so the 2D version is always a safe fallback. If 3D fights back, the party is never at risk.

Why it is built this way (teach this): the game's brain (physics and rules) is separate from its camera (drawing). Swapping the camera should not break the brain.

## Physics notes

- **Table tilt:** a real table slopes toward the player, so the ball rolls down. Treat "gravity" as that slope. It is a tuning dial, not Earth gravity.
- **No tunneling.** The ball moves fast and flippers are thin, so move the ball in several small substeps each frame and check collisions at each one. (Emmet's paddle game already uses this trick. Point that out.)
- **Flippers** are rotating paddles. When the ball hits a moving flipper, the flipper's speed should transfer into the ball. That is what makes a flipper shot feel powerful.
- **Bumpers** kick the ball away harder than it arrived.
- **Speed cap** on the ball so it never goes wild.
- Make it forgiving: a few balls per game, and consider a short ball save at the start.

## Win condition and balance (decide in plan mode)

Starting idea: light all three targets to reveal the clue. Balance questions to ask Emmet:

- Do lit targets stay lit when you lose a ball?
- How many balls per game?
- Should it get easier for a player who keeps losing, so nobody gets stuck?

Test by having someone who has never played try it.

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
