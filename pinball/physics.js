// ============================================================
// PHYSICS: the brain. Moves things and follows the rules.
// It never draws anything. That's draw.js's job.
// ============================================================

// The ball's backpack: where it is (x, y) and how fast it's going (vx, vy).
const ball = { x: 0, y: 0, vx: 0, vy: 0 };

// Each flipper's backpack: its layout from table.js, which way it's pointing,
// how fast it's turning, and whether its key is pressed.
function makeFlipper(layout) {
  return { layout: layout, angle: layout.restAngle, turnSpeed: 0, pressed: false };
}
const leftFlipper = makeFlipper(FLIPPERS.left);
const rightFlipper = makeFlipper(FLIPPERS.right);
const flippers = [leftFlipper, rightFlipper];

// Put the ball back at the start, not moving.
function resetBall() {
  ball.x = BALL_START.x;
  ball.y = BALL_START.y;
  ball.vx = 0;
  ball.vy = 0;
}

// One frame of physics, split into SUBSTEPS tiny moves.
// Checking walls after every tiny move stops a fast ball from
// jumping right over a thin wall (called "tunneling").
function updatePhysics() {
  for (let step = 0; step < SUBSTEPS; step++) {
    for (const flipper of flippers) {
      turnFlipper(flipper);
    }

    // Gravity (the table's slope) speeds the ball up toward the player.
    ball.vy += GRAVITY / SUBSTEPS;

    // Move the ball a tiny bit.
    ball.x += ball.vx / SUBSTEPS;
    ball.y += ball.vy / SUBSTEPS;

    for (const wall of WALLS) {
      bounceOffWall(wall);
    }
    for (const flipper of flippers) {
      bounceOffFlipper(flipper);
    }
  }

  capSpeed();

  // The bottom is open for now, so if the ball falls out, bring it back.
  if (ball.y - BALL_RADIUS > TABLE.height) {
    resetBall();
  }
}

// Turn a flipper a tiny bit toward up (key pressed) or rest (key let go).
function turnFlipper(flipper) {
  const target = flipper.pressed ? flipper.layout.upAngle : flipper.layout.restAngle;
  // Tip speed = turn speed x length, so turn speed = FLIPPER_POWER / length.
  const maxTurn = (FLIPPER_POWER / FLIPPER_LENGTH) / SUBSTEPS;
  const turn = Math.max(-maxTurn, Math.min(maxTurn, target - flipper.angle));
  flipper.angle += turn;
  flipper.turnSpeed = turn * SUBSTEPS;  // per frame, same units as ball speed
}

// Where the flipper's tip is right now.
function flipperTip(flipper) {
  return {
    x: flipper.layout.x + Math.cos(flipper.angle) * FLIPPER_LENGTH,
    y: flipper.layout.y + Math.sin(flipper.angle) * FLIPPER_LENGTH,
  };
}

function bounceOffWall(wall) {
  bounceOffLine(wall.x1, wall.y1, wall.x2, wall.y2, BALL_RADIUS, WALL_BOUNCE, null);
}

function bounceOffFlipper(flipper) {
  const tip = flipperTip(flipper);
  bounceOffLine(flipper.layout.x, flipper.layout.y, tip.x, tip.y,
                BALL_RADIUS + FLIPPER_THICKNESS / 2, FLIPPER_BOUNCE, flipper);
}

// If the ball is touching the line from (x1, y1) to (x2, y2), push it out
// and bounce it. "reach" is how close counts as touching. If the line is a
// flipper, its turning speed gets added into the bounce.
function bounceOffLine(x1, y1, x2, y2, reach, bounciness, flipper) {
  // Find the point on the line closest to the ball.
  const lineX = x2 - x1;
  const lineY = y2 - y1;
  const along = ((ball.x - x1) * lineX + (ball.y - y1) * lineY) /
                (lineX * lineX + lineY * lineY);
  const t = Math.max(0, Math.min(1, along));  // stay between the two ends
  const closestX = x1 + t * lineX;
  const closestY = y1 + t * lineY;

  // How far is the ball's center from that point?
  const awayX = ball.x - closestX;
  const awayY = ball.y - closestY;
  const distance = Math.sqrt(awayX * awayX + awayY * awayY);
  if (distance >= reach || distance === 0) return;  // not touching

  // The "normal": a length-1 arrow pointing from the line to the ball.
  const normalX = awayX / distance;
  const normalY = awayY / distance;

  // Push the ball out so it's just touching, not stuck inside.
  ball.x = closestX + normalX * reach;
  ball.y = closestY + normalY * reach;

  // How fast is this spot on the line moving? Walls: not at all.
  // Flippers: faster the farther you are from the pivot.
  let surfaceVX = 0;
  let surfaceVY = 0;
  if (flipper) {
    surfaceVX = -flipper.turnSpeed * (closestY - flipper.layout.y);
    surfaceVY = flipper.turnSpeed * (closestX - flipper.layout.x);
  }

  // Bounce: flip the part of the speed going INTO the line,
  // measured compared to the line's own movement.
  const speedInto = (ball.vx - surfaceVX) * normalX + (ball.vy - surfaceVY) * normalY;
  if (speedInto < 0) {
    ball.vx -= (1 + bounciness) * speedInto * normalX;
    ball.vy -= (1 + bounciness) * speedInto * normalY;
  }
}

// Speed cap: if the ball is faster than MAX_SPEED, slow it to MAX_SPEED.
function capSpeed() {
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (speed > MAX_SPEED) {
    ball.vx = (ball.vx / speed) * MAX_SPEED;
    ball.vy = (ball.vy / speed) * MAX_SPEED;
  }
}
