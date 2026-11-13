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
- Save and the top-10 board are in localStorage on each laptop.

## Open items

- Shared leaderboard: `TUNING.LEADERBOARD_URL` in `data.js` is empty. When set, `submitScoreRemote()` in `game.js` POSTs name, xp, level, zone, day as JSON text to that URL. The parent is setting up the Apps Script side.
- Balance has not been playtested by a person. Main dials: `FOOD_INFLATION`, `DAY_LENGTH`, `LEVEL_XP_GROWTH`, `ITEM_VALUE_GROWTH`, upgrade `growth`.
- Frame rate on the real school laptops is unverified. Press G in game for fast graphics.
- Not yet added to the home page.
