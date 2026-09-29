// ============================================================
// SKETCH: the game loop. Input -> Update -> Draw -> Repeat.
// p5 runs setup() once, then runs draw() about 60 times a second.
// ============================================================

// Which keys are held down right now. We use the key's "code" because
// it tells Left Shift ("ShiftLeft") apart from Right Shift ("ShiftRight").
const keysDown = {};
window.addEventListener("keydown", (event) => {
  keysDown[event.code] = true;
  // Stop Space and Up Arrow from scrolling the page.
  if (event.code === "Space" || event.code === "ArrowUp") event.preventDefault();
});
window.addEventListener("keyup", (event) => { keysDown[event.code] = false; });
// If the window loses focus, let go of every key so nothing gets stuck.
window.addEventListener("blur", () => {
  for (const code in keysDown) keysDown[code] = false;
});

function setup() {
  createCanvas(TABLE.width, TABLE.height + HUD_HEIGHT);
  startNewGame();
}

// Input: tell the brain which buttons are pressed.
function readInput() {
  leftFlipper.pressed = keysDown["ShiftLeft"] || keysDown["KeyZ"];
  rightFlipper.pressed = keysDown["ShiftRight"] || keysDown["Slash"];
  plunger.held = keysDown["Space"];
  game.restartHeld = keysDown["Enter"];
  spin.held = keysDown["ArrowUp"];
}

function draw() {
  readInput();      // Input
  updatePhysics();  // Update
  drawGame();       // Draw
}                   // ...and p5 repeats.
