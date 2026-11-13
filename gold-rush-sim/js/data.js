// ============================================================
//  GOLD RUSH SIM - data and dials
//  Everything you might want to tweak lives in this file.
// ============================================================

// ---------------- TUNING (the dials) ----------------
export const TUNING = {
  // --- time and food ---
  DAY_LENGTH: 45,          // seconds in one game day
  FOOD_INFLATION: 1.12,    // food price multiplies by this every day (1.12 = +12% a day)
  RATION_BASE_PRICE: 3,    // price of one ration on day 1
  RATION_FOOD: 50,         // food restored by one ration
  RATION_ENERGY: 50,       // energy restored by one ration
  MAX_RATIONS: 8,          // how many rations you can carry
  FOOD_DRAIN: 0.67,        // food lost per second (100 food lasts about 150 seconds)
  START_MONEY: 10,
  START_RATIONS: 2,

  // --- mining ---
  PAN_TIME: 2.2,           // seconds per pan with the starter pan
  PAN_ENERGY: 4,           // energy per pan with no upgrades
  EMPTY_CHANCE: 0.15,      // chance a pan finds nothing
  RARE_CHANCE: 0.25,       // chance a find is the zone's rarer item
  JACKPOT_CHANCE: 0.02,    // chance of a x5 jackpot
  HOTSPOT_BONUS: 1.6,      // rare chance multiplier when panning in a glittering spot
  HOTSPOT_PANS: 6,         // pans before a glittering spot moves

  // --- value and XP curves ---
  ITEM_VALUE_BASE: 2,   ITEM_VALUE_GROWTH: 1.13,  // item N sells for BASE * GROWTH^N
  ITEM_XP_BASE: 4,      ITEM_XP_GROWTH: 1.12,     // item N gives BASE * GROWTH^N xp
  LEVEL_XP_BASE: 25,    LEVEL_XP_GROWTH: 1.13,    // xp needed to go from level N to N+1
  LEVELS_PER_ZONE: 2,   // a new zone unlocks every this many levels

  // --- player ---
  WALK_SPEED: 10,
  TURN_SPEED: 2.6,

  // --- leaderboard ---
  // Paste the Apps Script web app URL here to also send scores to the shared sheet.
  // Leave it empty and scores are only saved on this laptop.
  LEADERBOARD_URL: '',
};

// ---------------- UPGRADES ----------------
// cost of the next level = baseCost * growth^level
export const UPGRADES = [
  { id: 'tool',  name: 'Mining Rig',   baseCost: 20, growth: 1.7, desc: 'Pan faster',
    tiers: ['Tin Pan', 'Steel Pan', 'Rocker Box', 'Long Tom', 'Sluice Box', 'Water Wheel', 'Steam Dredge', 'Hydraulic Cannon'] },
  { id: 'luck',  name: 'Lucky Charm',  baseCost: 30, growth: 1.7, desc: 'More rare finds, fewer empty pans',
    tiers: ['No Charm', 'Lucky Penny', 'Horseshoe', 'Rabbit Foot', 'Four-Leaf Clover', 'Prospector\'s Compass', 'Dowsing Rod', 'Golden Eye'] },
  { id: 'bag',   name: 'Pack',         baseCost: 15, growth: 1.6, desc: 'Carry more before selling',
    tiers: ['Pockets', 'Cloth Sack', 'Leather Satchel', 'Saddle Bags', 'Miner\'s Pack', 'Mule', 'Ore Cart', 'Wagon'] },
  { id: 'stam',  name: 'Canteen',      baseCost: 25, growth: 1.7, desc: 'Each pan uses less energy',
    tiers: ['Tin Cup', 'Canteen', 'Big Canteen', 'Coffee Pot', 'Water Barrel', 'Camp Stove', 'Chuck Wagon', 'Iron Stomach'] },
];

// ---------------- THE 100 FINDS ----------------
// Two per zone, in order. Zone 1 gets the first two, zone 2 the next two, and so on.
// [name, color]
export const ITEMS = [
  ['Quartz', 0xe8e6e0], ['Pyrite', 0xc9b037],
  ['Magnetite', 0x3a3a40], ['Mica', 0xbfc7c9],
  ['Feldspar', 0xe3b9a0], ['Calcite', 0xf2e8c9],
  ['Hematite', 0x7a2e2a], ['Copper', 0xb87333],
  ['Silver', 0xd8dde3], ['Gold', 0xffc21a],
  ['Galena', 0x6d7480], ['Tin', 0xa9b0b5],
  ['Zinc', 0x8f9aa6], ['Nickel', 0xa5a58d],
  ['Malachite', 0x1fa37a], ['Azurite', 0x1f4fb8],
  ['Fluorite', 0x9a6ce0], ['Jasper', 0xb5452c],
  ['Agate', 0xc98a5a], ['Obsidian', 0x1b1b22],
  ['Garnet', 0x9c1f2e], ['Amethyst', 0x9b4fd6],
  ['Citrine', 0xf0b63a], ['Rose Quartz', 0xf3a6b8],
  ['Turquoise', 0x33c9c0], ['Lapis Lazuli', 0x2445a8],
  ['Onyx', 0x14141a], ['Carnelian', 0xd9502a],
  ['Tiger\'s Eye', 0xb5761d], ['Moonstone', 0xcfe0f5],
  ['Peridot', 0x9bd636], ['Topaz', 0xffb347],
  ['Cobalt', 0x2a52be], ['Tungsten', 0x6b6f76],
  ['Chromite', 0x4a4f57], ['Rutile', 0x8c2f1b],
  ['Zircon', 0x6fd0e8], ['Spinel', 0xe0356b],
  ['Aquamarine', 0x7fe3e0], ['Tourmaline', 0x2fae7a],
  ['Opal', 0xbfe9ff], ['Jade', 0x2e9e5b],
  ['Amber', 0xff9d1c], ['River Pearl', 0xf4efe6],
  ['Sunstone', 0xff7a3d], ['Labradorite', 0x4f7fa8],
  ['Rhodonite', 0xd9577f], ['Kunzite', 0xe5a3e6],
  ['Morganite', 0xf7b7a8], ['Iolite', 0x5a4fcf],
  ['Tanzanite', 0x4b3fd9], ['Sapphire', 0x1338be],
  ['Ruby', 0xe0115f], ['Emerald', 0x1fc46a],
  ['Palladium', 0xcfd3d6], ['Platinum', 0xe5e4e2],
  ['Diamond', 0xdff6ff], ['Black Opal', 0x25305e],
  ['Alexandrite', 0x3fae8f], ['Padparadscha', 0xff8f6b],
  ['Iridium', 0xd9dde0], ['Osmium', 0x8fa6c4],
  ['Rhodium', 0xe9eef2], ['Ruthenium', 0xa7adb3],
  ['Bismuth', 0xd86fd0], ['Vanadinite', 0xd9361f],
  ['Molybdenite', 0x7d8794], ['Columbite', 0x3b3440],
  ['Tantalite', 0x4d3b33], ['Beryl', 0xa8e6c1],
  ['Spodumene', 0xd9c7ef], ['Cinnabar', 0xe2291f],
  ['Benitoite', 0x2f6bff], ['Red Beryl', 0xe8274b],
  ['Paraiba Tourmaline', 0x19e0d2], ['Demantoid', 0x4fd12e],
  ['Jadeite', 0x35c46f], ['Imperial Topaz', 0xff8a2b],
  ['Blue Diamond', 0x6fb7ff], ['Pink Diamond', 0xffa3d1],
  ['Meteorite Iron', 0x777c85], ['Moldavite', 0x5c8f2f],
  ['Pallasite', 0xc9a227], ['Tektite', 0x23231f],
  ['Autunite', 0xd6f03a], ['Uraninite', 0x2c3320],
  ['Neodymium', 0xc4b5d6], ['Europium', 0xff5b6e],
  ['Scandium', 0xe6efe0], ['Yttrium', 0xbcd3e6],
  ['Painite', 0xb3402e], ['Musgravite', 0x7f8f6f],
  ['Grandidierite', 0x3fc9b5], ['Taaffeite', 0xc79be8],
  ['Red Diamond', 0xff2a2a], ['Jeremejevite', 0x8fcfff],
  ['Serendibite', 0x1c4a4f], ['Rhenium', 0xb9c0c7],
  ['Lonsdaleite', 0xf7ffe0], ['The Mother Lode', 0xffd700],
];

// ---------------- BIOMES ----------------
// 10 biomes, 5 zones each = 50 zones.
// g1/g2 = ground colors, tree = pine | oak | cactus | dead | crystal | none
export const BIOMES = [
  { name: "Miner's Creek",  g1: 0x5f8a3a, g2: 0x7d9a45, rock: 0x7b7770, gravel: 0x9a8f7c, sand: 0xc2b08a, tree: 'oak',     treeCol: 0x4c8a2f, treeN: 260, shallow: 0x3aa7a0, deep: 0x0f4d5a, mtn: 55, roll: 5,  snow: 70,  fog: 0xbcd6ea, turb: 3,  ray: 1.2 },
  { name: 'Oak Foothills',  g1: 0x8a9440, g2: 0xb5a352, rock: 0x8a7f6a, gravel: 0xa3957a, sand: 0xd1bd8c, tree: 'oak',     treeCol: 0x6b8f2a, treeN: 180, shallow: 0x4aa8a8, deep: 0x14505c, mtn: 65, roll: 8,  snow: 80,  fog: 0xd4dbd0, turb: 4,  ray: 1.4 },
  { name: 'Pine Ridge',     g1: 0x3f6b3a, g2: 0x55733c, rock: 0x6c6f73, gravel: 0x8c8a84, sand: 0xa89f88, tree: 'pine',    treeCol: 0x1f5a34, treeN: 520, shallow: 0x3a98a8, deep: 0x0c3f55, mtn: 85, roll: 7,  snow: 48,  fog: 0xb4cde0, turb: 2,  ray: 1.0 },
  { name: 'Red Canyon',     g1: 0xb5623a, g2: 0xc97a45, rock: 0x9c4a2c, gravel: 0xb88563, sand: 0xdba878, tree: 'dead',    treeCol: 0x6a4a34, treeN: 90,  shallow: 0x4fb0a0, deep: 0x1a5a55, mtn: 95, roll: 9,  snow: 400, fog: 0xe6c3a0, turb: 6,  ray: 2.0 },
  { name: 'Desert Wash',    g1: 0xd6b878, g2: 0xc9a565, rock: 0xa88a5c, gravel: 0xc2ab85, sand: 0xe8d4a0, tree: 'cactus',  treeCol: 0x3f8a4a, treeN: 140, shallow: 0x58c0b0, deep: 0x1f6a66, mtn: 45, roll: 4,  snow: 400, fog: 0xe6d2a8, turb: 4,  ray: 1.6 },
  { name: 'Snow Pass',      g1: 0xdfe7ee, g2: 0xc5d2dc, rock: 0x70777f, gravel: 0x9aa2aa, sand: 0xc8d0d6, tree: 'pine',    treeCol: 0x2a5c4a, treeN: 300, shallow: 0x5ab0c8, deep: 0x17506e, mtn: 100, roll: 6, snow: 6,   fog: 0xdce8f2, turb: 2,  ray: 0.8 },
  { name: 'Glacier Lake',   g1: 0xcfe6f2, g2: 0xa9cfe2, rock: 0x5f7486, gravel: 0x8fa5b3, sand: 0xbcd6e2, tree: 'crystal', treeCol: 0x8fdcff, treeN: 110, shallow: 0x6fd6e8, deep: 0x1a6a94, mtn: 110, roll: 5, snow: 3,   fog: 0xcfe4f5, turb: 1.5, ray: 0.6 },
  { name: 'Ember Volcano',  g1: 0x2e2a2a, g2: 0x47352e, rock: 0x1c1a1c, gravel: 0x4a4444, sand: 0x5c4a40, tree: 'crystal', treeCol: 0xff5a1f, treeN: 130, shallow: 0xc76a3a, deep: 0x4a1a12, mtn: 120, roll: 10, snow: 400, fog: 0x8a5a4a, turb: 12, ray: 3.2 },
  { name: 'Crystal Gorge',  g1: 0x3d3566, g2: 0x57408a, rock: 0x2c2748, gravel: 0x6a5f96, sand: 0x8d7fc0, tree: 'crystal', treeCol: 0xc46bff, treeN: 320, shallow: 0x8a6bff, deep: 0x2a1a6e, mtn: 105, roll: 8, snow: 400, fog: 0x8f7fc9, turb: 5,  ray: 1.8 },
  { name: 'Starfall Crater',g1: 0x1f3540, g2: 0x2b4a55, rock: 0x16252e, gravel: 0x3f5f6a, sand: 0x58808a, tree: 'crystal', treeCol: 0x3fffd0, treeN: 380, shallow: 0x2fffd0, deep: 0x0a4a5a, mtn: 130, roll: 9, snow: 400, fog: 0x4f8f96, turb: 3,  ray: 0.9 },
];
export const ZONE_SUFFIX = ['Shallows', 'Bend', 'Fork', 'Gulch', 'Falls'];
