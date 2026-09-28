// ============================================================
// DRAW: the camera. Shows the game. It only READS the game,
// it never changes it.
// ============================================================

function drawGame() {
  drawTable();
  drawWalls();
  drawPlunger();
  drawBumpers();
  drawTarget();
  drawFlippers();
  drawScore();
  if (!game.over) drawBall();
  drawMessage();
  drawHUD();
  if (game.over) drawGameOver();
}

// Bumpers: glowing circles that flash white when hit.
function drawBumpers() {
  stroke(255, 180, 0);
  strokeWeight(3);
  for (const bumper of bumpers) {
    if (bumper.flashFrames > 0) fill(255);
    else fill(120, 40, 160);
    circle(bumper.layout.x, bumper.layout.y, BUMPER_RADIUS * 2);
  }
}

// The moving target: a bar that flashes white when hit.
function drawTarget() {
  if (target.flashFrames > 0) stroke(255);
  else stroke(57, 255, 20);
  strokeWeight(TARGET.thickness);
  strokeCap(SQUARE);
  const half = TARGET.width / 2;
  line(target.x - half, TARGET.y, target.x + half, TARGET.y);
}

// Score at the top of the table.
function drawScore() {
  noStroke();
  fill(255);
  textSize(18);
  textAlign(CENTER, TOP);
  text(Math.floor(game.score), TABLE.width / 2, 12);
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
}

// The plunger: a block that fills the lane below its top.
function drawPlunger() {
  noStroke();
  fill(255, 180, 0);
  const top = plungerTopY();
  rect(PLUNGER.x1 + 4, top, PLUNGER.x2 - PLUNGER.x1 - 8, TABLE.height - top);
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
    text("SHIFT or Z / = flippers", 140, middleY + 8);
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
    line(flipper.layout.x, flipper.layout.y, tip.x, tip.y);
  }
}

// The table surface.
function drawTable() {
  background(20, 10, 40);
}

// Every wall in the WALLS list, as a glowing line.
function drawWalls() {
  stroke(0, 240, 255);
  strokeWeight(4);
  for (const wall of WALLS) {
    line(wall.x1, wall.y1, wall.x2, wall.y2);
  }
}

// The ball: a shiny silver circle.
function drawBall() {
  noStroke();
  fill(220, 220, 235);
  circle(ball.x, ball.y, BALL_RADIUS * 2);
}
