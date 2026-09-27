// ============================================================
// SKETCH: the game loop. Input -> Update -> Draw -> Repeat.
// p5 runs setup() once, then runs draw() about 60 times a second.
// ============================================================

function setup() {
  createCanvas(TABLE.width, TABLE.height);
  resetBall();
}

function draw() {
  // Input: nothing yet. Flippers come in step 3.
  updatePhysics();  // Update
  drawGame();       // Draw
}                   // ...and p5 repeats.
