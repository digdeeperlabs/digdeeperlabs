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

  // Presses, not holds: each press does one thing. (event.repeat is true when
  // a held key auto-repeats, so holding Enter doesn't press it over and over.)
  if (event.repeat) return;
  if (event.code === "Enter") pressEnter();
  if (event.code === "Backspace") eraseInitial();
  if (event.code === "KeyL") pressLeaderboardKey();
  if (/^Key[A-Z]$/.test(event.code)) typeInitial(event.code.slice(3));  // "KeyA" -> "A"
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
  spin.held = keysDown["ArrowUp"];
}

// p5 runs this when the mouse is clicked. Clicking the "Leaderboard" link
// opens the leaderboard page in a new tab.
function mouseClicked() {
  const box = LEADERBOARD_LINK;
  const insideX = mouseX >= box.x && mouseX <= box.x + box.width;
  const insideY = mouseY >= box.y && mouseY <= box.y + box.height;
  if (insideX && insideY) window.open("leaderboard.html", "_blank");
}

function draw() {
  readInput();      // Input
  updatePhysics();  // Update
  drawGame();       // Draw
}                   // ...and p5 repeats.
