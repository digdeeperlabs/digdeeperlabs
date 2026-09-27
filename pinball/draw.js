// ============================================================
// DRAW: the camera. Shows the game. It only READS the game,
// it never changes it.
// ============================================================

function drawGame() {
  drawTable();
  drawWalls();
  drawFlippers();
  drawBall();
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
