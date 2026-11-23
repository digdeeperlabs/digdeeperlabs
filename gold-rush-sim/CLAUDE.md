# Gold Rush Sim: Game Brief

Built in one session on 2026-11-12 with Emmet and a parent. This was a "build something cool fast" session, not a teaching session, so the code was written for Emmet rather than by him.

## What it is

A 3D gold rush mining game. Pan in the river, sell in town, buy better gear, unlock better zones, do not starve. The run ends when the food bar hits zero. The leaderboard score is total XP.

## Emmet's design decisions

- About 100 finds (metals, minerals, gems), 50 zones, two finds per zone.
- Zones unlock by level. Level comes from XP. Better finds give more XP.
- Sell finds in town for money. Money buys gear (faster panning, luck, bag size, energy use) and food.
- Food bar drains all the time. Panning costs energy. Eating a ration refills both. No sleeping.
- Food prices climb every day, so a rich player cannot live forever.
- Name is a placeholder. He may rename it.

## How it is built

- `index.html`: page, HUD and menu styling.
- `js/data.js`: every dial (TUNING), the upgrades, the 100 finds, the 10 biomes. Change numbers here.
- `js/game.js`: state and rules at the top, then sound, 3D world, menus, input, update loop.
- `lib/three.bundle.js`: local copy of Three.js r187 plus bloom, sky and geometry helpers, bundled with esbuild.
- All art is generated in code. No image or sound files.
- It uses ES modules, so it must be opened through a web server (Go Live or the website), not by double-clicking the file.
- 50 zones are one valley layout re-skinned by biome (5 zones per biome), reached through the Trail Map board in town.
- The run save is in localStorage on each laptop.
- Leaderboard: the shared one (`../shared/leaderboard.js`). On "You Starved", `die()` calls `showSaveBox('gold-rush-sim', score)`. Score = total XP, rounded down. Min score 1. Emmet chose to delete the old "on this laptop" board.
- Loot: each pan picks a zone with `pickFindZone()`. Your zone is most likely, and each older zone is `OLD_ZONE_FALLOFF` (0.5) times as likely as the next. Emmet chose this over "equal chance", which would cut income to about a quarter in zone 20 (loot dilution).

## Status and next steps

- Works: weighted loot from older zones. On the home page. Shared leaderboard (sheet tab `gold-rush-sim` is set up and a test score saved).
- Ideas Emmet wants, not built yet:
  - A big floating zone title over the river: "MINER'S CREEK BEND / LEVEL 3" (zone name + level needed). Plan is written: canvas text as a sprite in the `props` group, dials ZONE_LABEL_HEIGHT, ZONE_LABEL_SIZE, ZONE_LABEL_BOB.
  - Walk between zones along one long river with chunk loading (only 3 zones loaded). Big change, several sessions.
- Balance has not been playtested by a person. Main dials: `FOOD_INFLATION`, `DAY_LENGTH`, `LEVEL_XP_GROWTH`, `ITEM_VALUE_GROWTH`, `OLD_ZONE_FALLOFF`, upgrade `growth`.
- Frame rate on the real school laptops is unverified. Press G in game for fast graphics.
