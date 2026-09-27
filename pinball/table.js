// ============================================================
// TUNING: the dials. Change these to change how the game feels.
// ============================================================

const GRAVITY = 0.2;     // How steep the table is. Speed added toward you every frame.
const BALL_RADIUS = 12;    // How big the ball is.
const WALL_BOUNCE = 0.4;  // How bouncy walls are. 0 = thud, no bounce. 1 = super bouncy.
const MAX_SPEED = 20;     // Speed cap, so the ball never goes wild.
const SUBSTEPS = 8;       // Tiny moves per frame. More = the ball can't glitch through walls.
const FLIPPER_POWER = 18;     // How hard flippers hit: how fast the flipper tip moves.
const FLIPPER_LENGTH = 60;    // How long each flipper is.
const FLIPPER_THICKNESS = 12; // How fat each flipper is.
const FLIPPER_BOUNCE = 0.3;   // How bouncy flippers are. Low = the ball can rest on a raised flipper.
const PLUNGER_MAX = 20;         // Strongest launch: the ball's speed at a full pull.
const PLUNGER_PULL_TIME = 60;   // Frames to pull all the way back. 60 frames = 1 second.
const PLUNGER_MIN_PULL = 0.1;   // Pulls smaller than this don't launch, so a quick tap doesn't count.
const WEAK_LAUNCHES_ALLOWED = 3; // Weak launches in a row before you lose the ball.
const VIEW = "FLAT";      // "FLAT" = straight down from above. ("ANGLED" comes in step 8.)

// ============================================================
// TABLE LAYOUT: where everything is. Each spot is written ONCE,
// here. Physics and drawing both read it from here.
// ============================================================

const TABLE = {
  width: 400,
  height: 700,
};

const HUD_HEIGHT = 50;  // The info strip under the table (power bar, messages).

// The plunger fills the bottom of the plunger lane, from x1 to x2.
// A new ball starts sitting on top of it.
const PLUNGER = {
  x1: 360,
  x2: 400,
  restY: 670,         // Top of the plunger when you're not pulling.
  pullDistance: 25,   // How far down it goes at a full pull.
};

// Every wall is a straight line from (x1, y1) to (x2, y2).

// The top-right corner turns a launched ball left, onto the table.
// It has a name because the plunger math needs to know where it is.
const LAUNCH_CORNER = { x1: 300, y1: 0, x2: 400, y2: 100 };

const WALLS = [
  // Outside of the table
  { x1: 0,   y1: 100, x2: 0,   y2: 700 },  // left side
  { x1: 0,   y1: 100, x2: 100, y2: 0   },  // top-left corner
  { x1: 100, y1: 0,   x2: 300, y2: 0   },  // top
  LAUNCH_CORNER,                           // top-right corner
  { x1: 400, y1: 100, x2: 400, y2: 700 },  // right side

  // Plunger lane: the ball launches up between this wall and the right side.
  { x1: 360, y1: 130, x2: 360, y2: 700 },

  // Floor of the top level. It slopes down to the right, toward where the tube
  // will go. Until we build the tube (step 9), the ball drops through the gap.
  { x1: 0,   y1: 300, x2: 320, y2: 340 },

  // Guide walls: slope down from the sides into each flipper's pivot.
  { x1: 0,   y1: 530, x2: 105, y2: 610 },  // left guide
  { x1: 360, y1: 530, x2: 255, y2: 610 },  // right guide
];

// Flippers. (x, y) is the pivot, the pin the flipper turns around.
// Angles are in radians: 0 points right, and bigger numbers turn clockwise.
// The gap between the two tips at rest is about 45, almost 2 balls wide.
const FLIPPERS = {
  left:  { x: 105, y: 610, restAngle: 0.5,           upAngle: -0.5 },
  right: { x: 255, y: 610, restAngle: Math.PI - 0.5, upAngle: Math.PI + 0.5 },
};
