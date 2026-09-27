// ============================================================
// DRAW: the camera. Shows the game. It only READS the game,
// it never changes it.
// ============================================================

function drawGame() {
  drawTable();
  drawWalls();
  drawPlunger();
  drawFlippers();
  drawBall();
  drawHUD();
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
  }

  if (weakLaunches > 0) {
    fill(255, 60, 60);
    textAlign(RIGHT, CENTER);
    text("Weak launch " + weakLaunches + "/" + WEAK_LAUNCHES_ALLOWED, TABLE.width - 10, middleY);
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
