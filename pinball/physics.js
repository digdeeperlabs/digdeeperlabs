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

// Each bumper's backpack: its layout, and a flash timer for when it's hit.
const bumpers = BUMPERS.map((layout) => ({ layout: layout, flashFrames: 0 }));

// The moving target's backpack: where it is, which way it's sliding
// (1 = right, -1 = left), and a flash timer. It can't score while flashing.
const target = { x: TARGET.centerX, direction: 1, flashFrames: 0 };

// Each spinner's backpack. It has the same shape as a flipper's (layout,
// angle, turnSpeed), so it can use the flipper bounce recipe.
// "scored" = already gave points this spin.
const spinners = SPINNERS.map((layout) => ({ layout: layout, angle: 0, turnSpeed: 0, scored: false }));

// All 4 spinners move together:
//   "IDLE" = still,  "OUT" = turning the first half turn,  "BACK" = turning back
const spin = { held: false, phase: "IDLE", turned: 0, cooldownFrames: 0 };
const HALF_TURN = Math.PI;  // half a circle, in radians

// Up Arrow starts a spin, if the spinners are still and the cooldown is over.
function startSpin() {
  if (spin.held && spin.phase === "IDLE" && spin.cooldownFrames === 0) {
    spin.phase = "OUT";
    for (const spinner of spinners) spinner.scored = false;
  }
}

// Turn the spinners a tiny bit (called every substep).
function turnSpinners() {
  const step = SPINNER_SPEED / SUBSTEPS;
  let change = 0;
  if (spin.phase === "OUT") {
    change = Math.min(step, HALF_TURN - spin.turned);
    if (spin.turned + change >= HALF_TURN) spin.phase = "BACK";
  } else if (spin.phase === "BACK") {
    change = -Math.min(step, spin.turned);
    if (spin.turned + change <= 0) {
      spin.phase = "IDLE";
      spin.cooldownFrames = SPINNER_COOLDOWN * 60;
    }
  }
  spin.turned += change;
  for (const spinner of spinners) {
    spinner.angle = spin.turned;
    spinner.turnSpeed = change * SUBSTEPS;  // per frame, same units as ball speed
  }
}

// Bounce off all 4 arms. A spinning arm that smacks the ball scores once per spin.
function bounceOffSpinner(spinner) {
  for (let arm = 0; arm < 4; arm++) {
    const armAngle = spinner.angle + arm * (Math.PI / 2);  // arms are a quarter turn apart
    const tipX = spinner.layout.x + Math.cos(armAngle) * SPINNER_ARM;
    const tipY = spinner.layout.y + Math.sin(armAngle) * SPINNER_ARM;
    const hitSpeed = bounceOffLine(spinner.layout.x, spinner.layout.y, tipX, tipY,
                                   BALL_RADIUS + SPINNER_THICKNESS / 2, WALL_BOUNCE, spinner);
    if (hitSpeed >= MIN_HIT_SPEED && spin.phase !== "IDLE" && !spinner.scored) {
      spinner.scored = true;
      game.score += SPINNER_POINTS;
    }
  }
}

// Each dead-end tube's backpack: is it lit, and has the ball already scored
// on this trip in? (So one trip = one score, even if the ball rattles around.)
const tubes = DEAD_END_TUBES.map((layout) => ({ layout: layout, lit: false, scoredThisTrip: false }));

// Did the ball reach the back of a tube? Score, light it, and check for both lit.
function checkTubes() {
  for (const tube of tubes) {
    const t = tube.layout;
   const insideTube = ball.x > t.left && ball.x < t.right && ball.y < t.bottom && ball.y > t.top;
    const atBack = insideTube && ball.y < t.top + BALL_RADIUS + 4;

    if (atBack && !tube.scoredThisTrip) {
      tube.scoredThisTrip = true;
      tube.lit = true;
      game.score += TUBE_POINTS;
      showMessage("Tube! +" + TUBE_POINTS);
    }
    if (!insideTube) tube.scoredThisTrip = false;  // left the tube: next trip can score
  }

  // Both lit: extra ball! Then they turn off so you can do it again.
  if (tubes.every((tube) => tube.lit)) {
    game.ballsLeft += 1;
    showMessage("Both tubes: EXTRA BALL!");
    for (const tube of tubes) tube.lit = false;
  }
}

// The plunger's backpack: is Space held, and how far is it pulled (0 to 1)?
const plunger = { held: false, pull: 0 };

// What the ball is doing right now:
//   "READY"    = sitting on the plunger, waiting for a launch
//   "LAUNCHED" = flying up the plunger lane
//   "IN_PLAY"  = out on the table
let ballMode = "READY";
let weakLaunches = 0;  // weak launches in a row on this ball

// The game's backpack: balls, Game Over, ball save, and pop-up messages.
// Timers count frames. 60 frames = 1 second.
const game = {
  score: 0,
  ballsLeft: BALLS_PER_GAME,
  over: false,
  won: false,           // reached WIN_SCORE this game
  showingWin: false,    // the win screen is up (game paused)
  gamesLost: 0,         // lost games in a row (help mode: more starting balls)
  restartHeld: false,   // is Enter pressed?
  saveReady: true,      // can this ball still be saved?
  saveFramesLeft: 0,    // ball save is on while this is above 0
  message: "",
  messageFramesLeft: 0,
};

function startNewGame() {
  game.score = 0;
  game.ballsLeft = startingBalls();
  game.over = false;
  game.won = false;
  game.showingWin = false;
  for (const tube of tubes) tube.lit = false;  // (lit tubes stay lit between balls, not between games)
  newBall();
}

// Help mode: 1 extra starting ball for every lost game in a row, up to MAX_BALLS.
function startingBalls() {
  return Math.min(MAX_BALLS, BALLS_PER_GAME + game.gamesLost);
}

// Reached the goal for the first time this game? You win: pause and show the clue.
// After that, the same game keeps going and the score keeps climbing.
function checkWin() {
  if (!game.won && game.score >= WIN_SCORE) {
    game.won = true;
    game.showingWin = true;
    game.gamesLost = 0;
  }
}

// A fresh ball: new weak-launch count, and it gets a ball save.
function newBall() {
  weakLaunches = 0;
  game.saveReady = true;
  game.saveFramesLeft = 0;
  resetBall();
}

// Put the ball on top of the plunger, not moving, ready to launch.
function resetBall() {
  ball.x = (PLUNGER.x1 + PLUNGER.x2) / 2;
  ball.y = PLUNGER.restY - BALL_RADIUS;
  ball.vx = 0;
  ball.vy = 0;
  plunger.pull = 0;
  ballMode = "READY";
}

function showMessage(text) {
  game.message = text;
  game.messageFramesLeft = MESSAGE_SECONDS * 60;
}

// The ball fell out the bottom. Saved, or lost?
function drain() {
  if (game.saveFramesLeft > 0) {
    game.saveFramesLeft = 0;
    weakLaunches = 0;
    showMessage("Ball saved!");
    resetBall();  // same ball again, but no second save
  } else {
    loseBall("Ball lost!");
  }
}

// Take away a ball. Out of balls = Game Over.
function loseBall(reason) {
  game.ballsLeft -= 1;
  if (game.ballsLeft <= 0) {
    game.over = true;
    if (!game.won) game.gamesLost += 1;
  } else {
    showMessage(reason);
    newBall();
  }
}

// Count down the timers by one frame.
function updateTimers() {
  if (game.saveFramesLeft > 0) game.saveFramesLeft -= 1;
  if (game.messageFramesLeft > 0) game.messageFramesLeft -= 1;
  if (target.flashFrames > 0) target.flashFrames -= 1;
  if (spin.cooldownFrames > 0) spin.cooldownFrames -= 1;
  for (const bumper of bumpers) {
    if (bumper.flashFrames > 0) bumper.flashFrames -= 1;
  }
}

// Slide the target. When it reaches the end of its range, turn around.
function moveTarget() {
  target.x += target.direction * TARGET_SPEED;
  if (Math.abs(target.x - TARGET.centerX) >= TARGET.range) {
    target.x = TARGET.centerX + Math.sign(target.x - TARGET.centerX) * TARGET.range;
    target.direction *= -1;
  }
}

// Up shot: did the ball just go UP through the top of the chute this frame?
// (It was below the gap's top line last frame, and it's above it now.)
function checkUpShot(yBefore) {
  const insideChute = ball.x > TOP_GAP.left && ball.x < TOP_GAP.right;
  if (insideChute && yBefore > TOP_GAP.top && ball.y <= TOP_GAP.top) {
    game.score += UP_SHOT_POINTS;
    showMessage("Up shot! +" + UP_SHOT_POINTS);
  }
}

// Points for staying alive: a little bit every frame the ball is in play.
function scoreTime() {
  if (ballMode === "IN_PLAY") {
    game.score += POINTS_PER_SECOND / 60;
  }
}

// The top of the plunger moves down as you pull it back.
function plungerTopY() {
  return PLUNGER.restY + plunger.pull * PLUNGER.pullDistance;
}

// How fast a launch has to be for the ball to climb up to the corner and
// get turned onto the table. Climbing a distance d against gravity g
// takes a speed of about sqrt(2 x g x d).
function speedNeededToLaunch() {
  const laneX = (PLUNGER.x1 + PLUNGER.x2) / 2;
  const c = LAUNCH_CORNER;
  const slope = (c.y2 - c.y1) / (c.x2 - c.x1);
  const cornerY = c.y1 + (laneX - c.x1) * slope;  // the corner wall, straight above the ball
  // A slanted wall touches the ball a bit lower than straight above its center.
  const touchY = cornerY + BALL_RADIUS * Math.sqrt(1 + slope * slope);
  const climb = (PLUNGER.restY - BALL_RADIUS) - touchY;
  return Math.sqrt(2 * GRAVITY * climb);
}

// Hold Space to pull. Let go to launch.
function updatePlunger() {
  if (ballMode !== "READY") return;
  if (plunger.held) {
    plunger.pull = Math.min(1, plunger.pull + 1 / PLUNGER_PULL_TIME);
  } else if (plunger.pull >= PLUNGER_MIN_PULL) {
    launch();
  } else {
    plunger.pull = 0;  // just a tap: snap back, no launch
  }
}

// The plunger snaps back up and flings the ball. More pull = more speed.
function launch() {
  ball.vy = -plunger.pull * PLUNGER_MAX;
  plunger.pull = 0;
  ball.y = plungerTopY() - BALL_RADIUS;  // the snap carries the ball up with it
  ballMode = "LAUNCHED";
}

// After the ball moves: did it make it out, or fall back onto the plunger?
function checkLaunch() {
  const inLane = ball.x - BALL_RADIUS > PLUNGER.x1 - 1;
  const onPlunger = inLane && ball.vy >= 0 && ball.y >= plungerTopY() - BALL_RADIUS - 1;

  if (ballMode === "LAUNCHED") {
    if (!inLane) {
      ballMode = "IN_PLAY";  // made it out onto the table
      weakLaunches = 0;
      if (game.saveReady) {  // start this ball's ball save
        game.saveReady = false;
        game.saveFramesLeft = BALL_SAVE_SECONDS * 60;
      }
    } else if (onPlunger) {
      weakLaunches += 1;     // too weak, fell back down
      if (weakLaunches >= WEAK_LAUNCHES_ALLOWED) {
        loseBall(WEAK_LAUNCHES_ALLOWED + " weak launches: ball lost!");
      } else {
        ballMode = "READY";
      }
    }
  } else if (ballMode === "IN_PLAY" && onPlunger) {
    ballMode = "READY";      // rolled back into the lane from the top: launch again
  }
}

// One frame of physics, split into SUBSTEPS tiny moves.
// Checking walls after every tiny move stops a fast ball from
// jumping right over a thin wall (called "tunneling").
function updatePhysics() {
  // Win screen: paused. Enter = keep playing this game.
  if (game.showingWin) {
    if (game.restartHeld) game.showingWin = false;
    return;
  }

  // Game Over: nothing moves. Enter = new game.
  if (game.over) {
    if (game.restartHeld) startNewGame();
    return;
  }

  updateTimers();
  moveTarget();
  scoreTime();
  updatePlunger();
  startSpin();

  const yBefore = ball.y;
  for (let step = 0; step < SUBSTEPS; step++) {
    for (const flipper of flippers) {
      turnFlipper(flipper);
    }
    turnSpinners();

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
    for (const bumper of bumpers) {
      bounceOffBumper(bumper);
    }
    for (const spinner of spinners) {
      bounceOffSpinner(spinner);
    }
    bounceOffTarget();
    // The top of the plunger is a floor for the plunger lane. No bounce.
    bounceOffLine(PLUNGER.x1, plungerTopY(), PLUNGER.x2, plungerTopY(), BALL_RADIUS, 0, null);
  }

  capSpeed();
  checkLaunch();
  checkUpShot(yBefore);
  checkTubes();
  checkWin();

  // If the ball falls out the bottom, it drained.
  if (ball.y - BALL_RADIUS > TABLE.height) {
    drain();
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

// Bumpers: a perfect bounce, plus an extra kick straight out from the center.
// So the ball always leaves faster than it arrived.
function bounceOffBumper(bumper) {
  const awayX = ball.x - bumper.layout.x;
  const awayY = ball.y - bumper.layout.y;
  const distance = Math.sqrt(awayX * awayX + awayY * awayY);
  const reach = BALL_RADIUS + BUMPER_RADIUS;
  if (distance >= reach || distance === 0) return;  // not touching

  const normalX = awayX / distance;
  const normalY = awayY / distance;
  ball.x = bumper.layout.x + normalX * reach;
  ball.y = bumper.layout.y + normalY * reach;

  const speedInto = ball.vx * normalX + ball.vy * normalY;
  if (speedInto < 0) {
    ball.vx += (-2 * speedInto + BUMPER_KICK) * normalX;
    ball.vy += (-2 * speedInto + BUMPER_KICK) * normalY;
    bumper.flashFrames = HIT_FLASH_FRAMES;
  }
}

// The target bounces like a wall. A hit scores, unless it's still flashing.
function bounceOffTarget() {
  const half = TARGET.width / 2;
  const hitSpeed = bounceOffLine(target.x - half, TARGET.y, target.x + half, TARGET.y,
                                 BALL_RADIUS + TARGET.thickness / 2, WALL_BOUNCE, null);
  if (hitSpeed >= MIN_HIT_SPEED && target.flashFrames === 0) {
    game.score += TARGET_POINTS;
    target.flashFrames = HIT_FLASH_FRAMES;
  }
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
// flipper or a spinner arm, its turning speed gets added into the bounce.
// Gives back how hard the ball hit (0 = no hit).
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
  if (distance >= reach || distance === 0) return 0;  // not touching

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
    return -speedInto;
  }
  return 0;
}

// Speed cap: if the ball is faster than MAX_SPEED, slow it to MAX_SPEED.
function capSpeed() {
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (speed > MAX_SPEED) {
    ball.vx = (ball.vx / speed) * MAX_SPEED;
    ball.vy = (ball.vy / speed) * MAX_SPEED;
  }
}
