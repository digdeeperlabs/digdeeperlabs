// ============================================================
// SHARED LEADERBOARD: every game uses this file to talk to the
// Google Sheet. It's the ONE place that knows the sheet's address.
//
// The sheet checks every score itself (see leaderboard-script.gs).
// It also tells the game its rules (longest name, lowest score),
// so those numbers live in the sheet only. If the sheet can't be
// reached, the game keeps working and the box says it's offline.
//
// How a game uses it:
//   <link rel="stylesheet" href="../shared/arcade.css">
//   <script src="../shared/leaderboard.js"></script>
//   showSaveBox("chalk-archer", score, someElement);
// ============================================================

// The sheet's web app address. A parent set this up.
const LEADERBOARD_URL = "https://script.google.com/macros/s/AKfycbwFXl-_iknecEv35B7yzsZjrrocysftvLPIdHn7BdvsELPPYFQIRg_YSF8nhkfaVu7G5g/exec";
const LEADERBOARD_WAIT_SECONDS = 8;  // Give up and say "offline" after this long.

// The leaderboard's backpack:
//   status: "loading", "ready", "offline", or "rejected" (the sheet said no)
//   scores: the top scores, like [{ name: "Emmet G", score: 120 }, ...]
//   message: why the sheet said no
//   rules: { topCount, maxNameLength, minScore }, straight from the sheet
//   allGames: every game's top scores, like { "chalk-archer": [...], ... }
const leaderboard = { status: "loading", scores: [], message: "", rules: null, allGames: {} };

// The address of a game's leaderboard page. Every game's folder sits
// next to the leaderboards folder, so "../" gets there from any game.
function leaderboardPageUrl(gameId) {
  return "../leaderboards/?game=" + encodeURIComponent(gameId);
}

// Ask the sheet for a game's top scores and its rules.
function loadLeaderboard(gameId) {
  leaderboard.status = "loading";
  const url = LEADERBOARD_URL + "?game=" + encodeURIComponent(gameId);
  return askSheet(fetchWithTimeout(url), (answer) => {
    leaderboard.scores = answer.scores;
    leaderboard.rules = {
      topCount: answer.topCount,
      maxNameLength: answer.maxNameLength,
      minScore: answer.minScore,
    };
  });
}

// Ask the sheet for EVERY game's top scores, in one trip.
function loadAllLeaderboards() {
  leaderboard.status = "loading";
  return askSheet(fetchWithTimeout(LEADERBOARD_URL + "?game=all"), (answer) => {
    leaderboard.allGames = answer.games;
  });
}

// Send a new score. The sheet saves it and sends back the new top scores.
function saveScore(gameId, name, score) {
  leaderboard.status = "loading";
  const request = fetchWithTimeout(LEADERBOARD_URL, {
    method: "POST",
    body: JSON.stringify({ game: gameId, name: name, score: score }),
  });
  return askSheet(request, (answer) => {
    leaderboard.scores = answer.scores;
  });
}

// Wait for the sheet's answer and fill the backpack.
// ok: true  -> "ready".   ok: false -> "rejected".   No answer -> "offline".
function askSheet(request, whenOk) {
  return request
    .then((response) => response.json())
    .then((answer) => {
      if (answer.ok) {
        whenOk(answer);
        leaderboard.status = "ready";
      } else {
        leaderboard.status = "rejected";
        leaderboard.message = answer.error;
      }
    })
    .catch(() => { leaderboard.status = "offline"; });
}

// fetch() can wait forever on a blocked network, so give up after a while.
function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), LEADERBOARD_WAIT_SECONDS * 1000);
  return fetch(url, { ...options, signal: controller.signal });
}

// ------------------------------------------------------------
// THE SAVE BOX: a ready-made "type your name" box for game over.
// Put it inside any element. It returns the box, so the game can
// remove it when a new run starts.
// ------------------------------------------------------------
function showSaveBox(gameId, score, parent) {
  const box = document.createElement("div");
  box.className = "save-box";
  parent.appendChild(box);

  const message = document.createElement("p");
  message.className = "save-message";
  message.textContent = "Connecting to the leaderboard...";
  box.appendChild(message);

  loadLeaderboard(gameId).then(() => {
    if (leaderboard.status === "offline") {
      message.textContent = "Leaderboard offline. Try again later!";
    } else if (leaderboard.status === "rejected") {
      message.textContent = "Leaderboard problem: " + leaderboard.message;
    } else if (score < leaderboard.rules.minScore) {
      message.textContent = "Score " + leaderboard.rules.minScore + " or more to get on the leaderboard.";
      box.appendChild(makeScoreTable(leaderboard.scores, ""));
    } else {
      message.textContent = "Save your score! First name + last initial.";
      box.appendChild(makeNameForm(gameId, score, box, message));
    }
  });
  return box;
}

// The name box and Save button. Enter saves too.
function makeNameForm(gameId, score, box, message) {
  const form = document.createElement("form");
  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = leaderboard.rules.maxNameLength;  // the sheet's rule, not a copy
  input.placeholder = "Emmet G";
  input.autocomplete = "off";
  input.spellcheck = false;
  const button = document.createElement("button");
  button.type = "submit";
  button.textContent = "Save";
  form.append(input, button);

  form.addEventListener("submit", (event) => {
    event.preventDefault();  // a form normally reloads the page. Not this one.
    const name = input.value.trim().replace(/\s+/g, " ");
    if (name === "") return;

    input.disabled = true;
    button.disabled = true;
    message.textContent = "Saving...";
    saveScore(gameId, name, score).then(() => {
      if (leaderboard.status === "ready") {
        message.textContent = "Saved!";
        form.remove();
        box.appendChild(makeScoreTable(leaderboard.scores, name));
      } else {
        // Rejected or offline: say why, and let the player try again.
        message.textContent = leaderboard.status === "offline"
          ? "Leaderboard offline. Try again in a moment."
          : leaderboard.message;
        input.disabled = false;
        button.disabled = false;
        input.focus();
      }
    });
  });

  setTimeout(() => input.focus(), 0);  // ready to type right away
  return form;
}

// The top scores as a table: rank, name, score.
// Names go in with textContent, so nobody can sneak code in through a name.
function makeScoreTable(scores, savedName) {
  const table = document.createElement("table");
  table.className = "score-table";
  if (scores.length === 0) {
    table.insertRow().insertCell().textContent = "No scores yet. Be the first!";
    return table;
  }
  scores.forEach((entry, i) => {
    const row = table.insertRow();
    row.insertCell().textContent = (i + 1) + ".";
    row.insertCell().textContent = entry.name;
    row.insertCell().textContent = entry.score.toLocaleString();
    if (entry.name.toLowerCase() === savedName.toLowerCase()) row.className = "you";
  });
  return table;
}
