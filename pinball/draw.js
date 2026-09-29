// ============================================================
// DRAW: the camera. Shows the game. It only READS the game,
// it never changes it.
// ============================================================

// ---------- The camera ----------

// How far from your eyes a spot on the table is: 1 at the near end (bottom),
// bigger toward the far end (top). FLAT view: everything is the same distance.
function depthAt(y) {
  if (VIEW === "FLAT") return 1;
  return 1 + CAMERA_DEPTH * (1 - y / TABLE.height);
}

// Where a spot on the flat table shows up on the screen.
// Farther away = divide by a bigger number = smaller and closer to the middle.
function toScreen(x, y) {
  if (VIEW === "FLAT") return { x: x, y: y };
  const depth = depthAt(y);
  return {
    x: TABLE.width / 2 + (x - TABLE.width / 2) / depth,
    y: TABLE.height - (TABLE.height - y) * CAMERA_TILT / depth,
  };
}

// Drawing tools that go through the camera. Use these for anything ON the table.
function tableLine(x1, y1, x2, y2) {
  const a = toScreen(x1, y1);
  const b = toScreen(x2, y2);
  line(a.x, a.y, b.x, b.y);
}

function tableCircle(x, y, diameter) {
  const p = toScreen(x, y);
  circle(p.x, p.y, diameter / depthAt(y));
}

// A rectangle on the table. In the angled view it becomes a 4-sided shape.
function tableRect(x, y, width, height) {
  const a = toScreen(x, y);
  const b = toScreen(x + width, y);
  const c = toScreen(x + width, y + height);
  const d = toScreen(x, y + height);
  quad(a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y);
}

// ---------- Drawing the game ----------

function drawGame() {
  drawTable();
  drawTubes();
  drawWalls();
  drawPlunger();
  drawBumpers();
  drawSpinners();
  drawTarget();
  drawFlippers();
  drawScore();
  if (!game.over) drawBall();
  drawMessage();
  drawHUD();
  if (game.showingWin) drawWin();
  else if (game.over) drawGameOver();
}

// "Clue #1" and the clue, wrapped to fit. Used by the win and Game Over screens.
function drawClue(top) {
  noStroke();
  textAlign(CENTER, CENTER);
  fill(255, 43, 214);
  textSize(22);
  text("Clue #1", TABLE.width / 2, top);
  fill(255, 255, 0);
  textSize(18);
  textAlign(CENTER, TOP);
  text(CLUE, 30, top + 30, TABLE.width - 60, 200);  // wraps inside this box
}

// You win! Show the clue.
function drawWin() {
  noStroke();
  fill(0, 0, 0, 200);
  rect(0, 0, TABLE.width, TABLE.height + HUD_HEIGHT);
  textAlign(CENTER, CENTER);
  fill(57, 255, 20);
  textSize(40);
  text("YOU WIN!", TABLE.width / 2, 150);
  fill(255);
  textSize(18);
  text("Score: " + Math.floor(game.score), TABLE.width / 2, 200);
  drawClue(270);
  fill(255);
  textSize(16);
  textAlign(CENTER, CENTER);
  text("Press ENTER to keep playing", TABLE.width / 2, TABLE.height - 60);
  textSize(13);
  text("How high can you go?", TABLE.width / 2, TABLE.height - 35);
}

// Bumpers: glowing circles that flash white when hit.
function drawBumpers() {
  stroke(255, 180, 0);
  strokeWeight(3);
  for (const bumper of bumpers) {
    if (bumper.flashFrames > 0) fill(255);
    else fill(120, 40, 160);
    tableCircle(bumper.layout.x, bumper.layout.y, BUMPER_RADIUS * 2);
  }
}

// Spinners: 4 arms and a hub. Bright while spinning, dim during the cooldown.
function drawSpinners() {
  let armColor = color(0, 240, 255);                          // ready
  if (spin.phase !== "IDLE") armColor = color(255, 255, 0);   // spinning
  else if (spin.cooldownFrames > 0) armColor = color(120, 120, 60);  // cooling down

  strokeCap(ROUND);
  for (const spinner of spinners) {
    stroke(armColor);
    strokeWeight(SPINNER_THICKNESS);
    for (let arm = 0; arm < 4; arm++) {
      const armAngle = spinner.angle + arm * (Math.PI / 2);
      tableLine(spinner.layout.x, spinner.layout.y,
                spinner.layout.x + Math.cos(armAngle) * SPINNER_ARM,
                spinner.layout.y + Math.sin(armAngle) * SPINNER_ARM);
    }
    noStroke();
    fill(255);
    tableCircle(spinner.layout.x, spinner.layout.y, 10);  // the hub
  }
}

// The moving target: a bar that flashes white when hit.
function drawTarget() {
  if (target.flashFrames > 0) stroke(255);
  else stroke(57, 255, 20);
  strokeWeight(TARGET.thickness);
  strokeCap(SQUARE);
  const half = TARGET.width / 2;
  tableLine(target.x - half, TARGET.y, target.x + half, TARGET.y);
}

// Score at the top of the table.
function drawScore() {
  noStroke();
  fill(255);
  textSize(18);
  textAlign(CENTER, TOP);
  // Before winning, show progress toward the goal. After, just the score.
  const goal = game.won ? "  WIN!" : " / " + WIN_SCORE;
  text(Math.floor(game.score) + goal, TABLE.width / 2, 12);
}

// A pop-up message in the middle of the table, like "Ball lost!"
function drawMessage() {
  if (game.messageFramesLeft <= 0) return;
  noStroke();
  fill(255, 255, 0);
  textSize(22);
  textAlign(CENTER, CENTER);
  text(game.message, TABLE.width / 2, TABLE.height * 0.65);
}

// Game Over: dim the table and say how to play again.
function drawGameOver() {
  noStroke();
  fill(0, 0, 0, 170);
  rect(0, 0, TABLE.width, TABLE.height + HUD_HEIGHT);
  fill(255, 43, 214);
  textAlign(CENTER, CENTER);
  textSize(40);
  text("GAME OVER", TABLE.width / 2, TABLE.height / 2 - 40);
  fill(255);
  textSize(22);
  text("Score: " + Math.floor(game.score), TABLE.width / 2, TABLE.height / 2 + 5);
  textSize(16);
  text("Press ENTER to play again", TABLE.width / 2, TABLE.height / 2 + 45);
  if (startingBalls() > BALLS_PER_GAME) {
    fill(57, 255, 20);
    text("Next game: " + startingBalls() + " balls!", TABLE.width / 2, TABLE.height / 2 + 75);
  }
  if (game.won) drawClue(TABLE.height / 2 + 110);
}

// The plunger: a block that fills the lane below its top.
function drawPlunger() {
  noStroke();
  fill(255, 180, 0);
  const top = plungerTopY();
  tableRect(PLUNGER.x1 + 4, top, PLUNGER.x2 - PLUNGER.x1 - 8, TABLE.height - top);
}

// The info strip under the table.
function drawHUD() {
  noStroke();
  fill(5, 0, 10);
  rect(0, TABLE.height, TABLE.width, HUD_HEIGHT);

  const middleY = TABLE.height + HUD_HEIGHT / 2;
  textSize(13);
  textAlign(LEFT, CENTER);

  if (ballMode === "READY") {
    // Power bar: grows as you pull. It turns green once the pull is strong
    // enough to make it out (checked with the same math as the physics).
    const barWidth = 120;
    stroke(255);
    strokeWeight(1);
    noFill();
    rect(10, middleY - 8, barWidth, 16);
    noStroke();
    fill(plunger.pull * PLUNGER_MAX >= speedNeededToLaunch() ? color(57, 255, 20) : color(255, 60, 60));
    rect(10, middleY - 8, barWidth * plunger.pull, 16);

    fill(255);
    text("Hold SPACE, let go", 140, middleY - 8);
    text("SHIFT = flip   UP = spin", 140, middleY + 8);
  } else if (game.saveFramesLeft > 0) {
    fill(57, 255, 20);
    text("BALL SAVE ON", 10, middleY);
  }

  // Right side: balls left on top, weak launches under it.
  textAlign(RIGHT, CENTER);
  fill(255);
  text("Balls: " + game.ballsLeft, TABLE.width - 10, middleY - 8);
  if (weakLaunches > 0) {
    fill(255, 60, 60);
    text("Weak " + weakLaunches + "/" + WEAK_LAUNCHES_ALLOWED, TABLE.width - 10, middleY + 8);
  }
}

// Each flipper as a thick line with round ends, from pivot to tip.
function drawFlippers() {
  stroke(255, 43, 214);
  strokeWeight(FLIPPER_THICKNESS);
  strokeCap(ROUND);
  for (const flipper of flippers) {
    const tip = flipperTip(flipper);
    tableLine(flipper.layout.x, flipper.layout.y, tip.x, tip.y);
  }
}

// The room is dark. The table surface is a purple rectangle on top.
function drawTable() {
  background(5, 0, 10);
  noStroke();
  fill(20, 10, 40);
  tableRect(0, 0, TABLE.width, TABLE.height);
}

// Dead-end tubes: dark inside, bright orange when lit.
function drawTubes() {
  noStroke();
  for (const tube of tubes) {
    const t = tube.layout;
    if (tube.lit) fill(255, 140, 0);
    else fill(40, 20, 60);
    tableRect(t.left, t.top, t.right - t.left, t.bottom - t.top);
  }
}

// Every wall in the WALLS list, as a glowing line.
function drawWalls() {
  stroke(0, 240, 255);
  strokeWeight(4);
  for (const wall of WALLS) {
    tableLine(wall.x1, wall.y1, wall.x2, wall.y2);
  }
}

// The ball: a shiny silver circle.
function drawBall() {
  noStroke();
  fill(220, 220, 235);
  tableCircle(ball.x, ball.y, BALL_RADIUS * 2);
}
