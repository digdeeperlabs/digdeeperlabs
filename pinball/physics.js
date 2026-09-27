// ============================================================
// PHYSICS: the brain. Moves things and follows the rules.
// It never draws anything. That's draw.js's job.
// ============================================================

// The ball's backpack: where it is (x, y) and how fast it's going (vx, vy).
const ball = { x: 0, y: 0, vx: 0, vy: 0 };

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
    // Gravity (the table's slope) speeds the ball up toward the player.
    ball.vy += GRAVITY / SUBSTEPS;

    // Move the ball a tiny bit.
    ball.x += ball.vx / SUBSTEPS;
    ball.y += ball.vy / SUBSTEPS;

    for (const wall of WALLS) {
      bounceOffWall(wall);
    }
  }

  capSpeed();

  // The bottom is open for now, so if the ball falls out, bring it back.
  if (ball.y - BALL_RADIUS > TABLE.height) {
    resetBall();
  }
}

// If the ball is touching this wall, push it out and bounce it.
function bounceOffWall(wall) {
  // Find the point on the wall closest to the ball.
  const wallX = wall.x2 - wall.x1;
  const wallY = wall.y2 - wall.y1;
  const along = ((ball.x - wall.x1) * wallX + (ball.y - wall.y1) * wallY) /
                (wallX * wallX + wallY * wallY);
  const t = Math.max(0, Math.min(1, along));  // stay between the two ends
  const closestX = wall.x1 + t * wallX;
  const closestY = wall.y1 + t * wallY;

  // How far is the ball's center from that point?
  const awayX = ball.x - closestX;
  const awayY = ball.y - closestY;
  const distance = Math.sqrt(awayX * awayX + awayY * awayY);
  if (distance >= BALL_RADIUS || distance === 0) return;  // not touching

  // The "normal": a length-1 arrow pointing from the wall to the ball.
  const normalX = awayX / distance;
  const normalY = awayY / distance;

  // Push the ball out so it's just touching, not stuck inside.
  ball.x = closestX + normalX * BALL_RADIUS;
  ball.y = closestY + normalY * BALL_RADIUS;

  // Bounce: flip the part of the speed going INTO the wall.
  const speedIntoWall = ball.vx * normalX + ball.vy * normalY;
  if (speedIntoWall < 0) {
    ball.vx -= (1 + WALL_BOUNCE) * speedIntoWall * normalX;
    ball.vy -= (1 + WALL_BOUNCE) * speedIntoWall * normalY;
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
