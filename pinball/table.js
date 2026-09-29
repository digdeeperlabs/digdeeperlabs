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
const BALLS_PER_GAME = 3;       // How many balls you start with.
const WIN_SCORE = 2500;         // Reach this score in one game to win and see the clue.
const MAX_BALLS = 5;            // Help mode: each lost game adds 1 starting ball, up to this many.
const BALL_SAVE_SECONDS = 3;    // A new ball that drains this fast comes back free (once per ball).
const MESSAGE_SECONDS = 2;      // How long pop-up messages stay on screen.
const OUTLANE_WIDTH = 27;       // How wide the side lanes are. Narrower = harder to fall in. Keep it above 25 (the ball is 24 wide) or the ball gets stuck on top.
const BUMPER_RADIUS = 18;      // How big the bumpers are.
const BUMPER_KICK = 6;          // Extra speed a bumper adds on top of a perfect bounce.
const TARGET_SPEED = 1;         // How fast the moving target slides (pixels per frame).
const TUBE_POINTS = 250;        // Points for getting the ball to the back of a dead-end tube. Light both = extra ball.
const TARGET_POINTS = 150;     // Points for hitting the moving target.
const SPINNER_ARM = 28;         // How long each spinner arm is, from the hub to the tip.
const SPINNER_THICKNESS = 6;    // How fat the spinner arms are.
const SPINNER_SPEED = 0.3;      // How fast spinners turn (radians per frame). Faster = harder smack.
const SPINNER_COOLDOWN = 0.25;     // Seconds to wait after a spin before you can spin again.
const SPINNER_POINTS = 50;      // Points when a spinning arm hits the ball.
const UP_SHOT_POINTS = 500;    // Points for shooting the ball back up to the top level.
const MIN_HIT_SPEED = 1;       // A hit slower than this doesn't score, so a resting ball can't farm points.
const HIT_FLASH_FRAMES = 15;   // How long a bumper or target flashes after a hit. The target can't score again until it stops.
const POINTS_PER_SECOND = 10;   // Points for every second the ball stays in play.
const CAMERA_DEPTH = 1;  // ANGLED view: how much smaller the far end looks. 0 = no angle.
const CAMERA_TILT = 1.2;   // ANGLED view: how tall the table looks on screen. Smaller = flatter angle.
const VIEW = "angled";     // "FLAT" = straight down from above. ("ANGLED" comes in step 8.)

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

// The gap in the top level's floor, where the ball drops to the bottom level.
// A chute (two short walls) runs down from it, so the ball falls straight
// instead of flying sideways. (Step 9 swaps this for the tube.)
const TOP_GAP = { left: 250, right: 290, top: 340, bottom: 420 };

const WALLS = [
  // Outside of the table
  { x1: 0,   y1: 100, x2: 0,   y2: 700 },  // left side
  { x1: 0,   y1: 100, x2: 100, y2: 0   },  // top-left corner
  { x1: 100, y1: 0,   x2: 300, y2: 0   },  // top
  LAUNCH_CORNER,                           // top-right corner
  { x1: 400, y1: 100, x2: 400, y2: 700 },  // right side

  // Plunger lane: the ball launches up between this wall and the right side.
  { x1: 360, y1: 130, x2: 360, y2: 700 },

  // Floor of the top level: two walls that slope down into the gap.
  { x1: 0,   y1: 300, x2: TOP_GAP.left,  y2: TOP_GAP.top },  // left part
  { x1: 360, y1: 310, x2: TOP_GAP.right, y2: TOP_GAP.top },  // right part

  // The chute under the gap.
  { x1: TOP_GAP.left,  y1: TOP_GAP.top, x2: TOP_GAP.left,  y2: TOP_GAP.bottom },
  { x1: TOP_GAP.right, y1: TOP_GAP.top, x2: TOP_GAP.right, y2: TOP_GAP.bottom },

  // Outer lanes: a skinny lane down each side. Fall in and the ball is gone.
  // The left lane starts at the left side (x = 0). The right lane ends at the plunger lane wall (x = 360).
  { x1: OUTLANE_WIDTH,       y1: 470, x2: OUTLANE_WIDTH,       y2: 700 },  // left outer lane wall
  { x1: 360 - OUTLANE_WIDTH, y1: 470, x2: 360 - OUTLANE_WIDTH, y2: 700 },  // right outer lane wall

  // Guide walls: slope down from the outer lane walls into each flipper's pivot.
  { x1: OUTLANE_WIDTH,       y1: 540, x2: 105, y2: 610 },  // left guide
  { x1: 360 - OUTLANE_WIDTH, y1: 540, x2: 255, y2: 610 },  // right guide
];

// Dead-end tubes on the bottom level. Open at the bottom, closed at the top.
// Shoot the ball in, it reaches the back (top), lights up, and rolls back out.
// Each tube sits above a guide wall, so the ball rolls out toward a flipper.
const DEAD_END_TUBES = [
  { left: 40,  right: 72,  top: 320, bottom: 410 },  // left tube, next to the left wall
  { left: 296, right: 328, top: 345, bottom: 430 },  // right tube, next to the chute
];

// Build each tube's walls from its numbers above: two sides and a closed top.
for (const tube of DEAD_END_TUBES) {
  WALLS.push({ x1: tube.left,  y1: tube.top, x2: tube.left,  y2: tube.bottom });
  WALLS.push({ x1: tube.right, y1: tube.top, x2: tube.right, y2: tube.bottom });
  WALLS.push({ x1: tube.left,  y1: tube.top, x2: tube.right, y2: tube.top });
}

// Bumpers: round, on the top level. (x, y) is the center.
const BUMPERS = [
  { x: 130, y: 170 },  // left
  { x: 230, y: 170 },  // right
];

// Spinners: 4 on the top level. (x, y) is the hub. Each has 4 arms, like a +.
// Spaced so the ball (24 wide) always fits between spinners, bumpers and walls.
const SPINNERS = [
  { x: 60,  y: 140 },
  { x: 70,  y: 250 },
  { x: 190, y: 245 },
  { x: 300, y: 210 },
];

// The moving target: a short bar that slides left and right.
// It stays between the left tube and the chute, with room for the ball.
const TARGET = {
  y: 390,
  centerX: 170,   // middle of its slide
  range: 40,      // how far it slides each way from the middle
  width: 50,
  thickness: 10,
};

// Flippers. (x, y) is the pivot, the pin the flipper turns around.
// Angles are in radians: 0 points right, and bigger numbers turn clockwise.
// The gap between the two tips at rest is about 45, almost 2 balls wide.
const FLIPPERS = {
  left:  { x: 105, y: 610, restAngle: 0.5,           upAngle: -0.5 },
  right: { x: 255, y: 610, restAngle: Math.PI - 0.5, upAngle: Math.PI + 0.5 },
};
