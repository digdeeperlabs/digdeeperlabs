// ============================================================
// TUNING: the dials. Change these to change how the game feels.
// ============================================================

const GRAVITY = 0.2;     // How steep the table is. Speed added toward you every frame.
const BALL_RADIUS = 12;    // How big the ball is.
const WALL_BOUNCE = 0.5;  // How bouncy walls are. 0 = thud, no bounce. 1 = super bouncy.
const MAX_SPEED = 20;     // Speed cap, so the ball never goes wild.
const SUBSTEPS = 8;       // Tiny moves per frame. More = the ball can't glitch through walls.
const VIEW = "FLAT";      // "FLAT" = straight down from above. ("ANGLED" comes in step 8.)

// ============================================================
// TABLE LAYOUT: where everything is. Each spot is written ONCE,
// here. Physics and drawing both read it from here.
// ============================================================

const TABLE = {
  width: 400,
  height: 700,
};

const BALL_START = { x: 200, y: 60 };  // Where a new ball appears.

// Every wall is a straight line from (x1, y1) to (x2, y2).
const WALLS = [
  // Outside of the table
  { x1: 0,   y1: 100, x2: 0,   y2: 700 },  // left side
  { x1: 0,   y1: 100, x2: 100, y2: 0   },  // top-left corner
  { x1: 100, y1: 0,   x2: 300, y2: 0   },  // top
  { x1: 300, y1: 0,   x2: 400, y2: 100 },  // top-right corner: turns a launched ball left
  { x1: 400, y1: 100, x2: 400, y2: 700 },  // right side

  // Plunger lane: the ball launches up between this wall and the right side.
  { x1: 360, y1: 130, x2: 360, y2: 700 },

  // Floor of the top level. It slopes down to the right, toward where the tube
  // will go. Until we build the tube (step 9), the ball drops through the gap.
  { x1: 0,   y1: 300, x2: 320, y2: 340 },
];
