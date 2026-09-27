// ============================================================
// DRAW: the camera. Shows the game. It only READS the game,
// it never changes it.
// ============================================================

function drawGame() {
  drawTable();
  drawWalls();
  drawBall();
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
