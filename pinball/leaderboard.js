// ============================================================
// LEADERBOARD: talks to the Google Sheet over the internet.
// The sheet checks every score itself (see leaderboard-script.gs).
// If the sheet can't be reached, the game keeps working and the
// leaderboard just says it's offline.
// ============================================================

// The sheet's web app address. A parent set this up.
const LEADERBOARD_URL = "https://script.google.com/macros/s/AKfycbwFXl-_iknecEv35B7yzsZjrrocysftvLPIdHn7BdvsELPPYFQIRg_YSF8nhkfaVu7G5g/exec";
const LEADERBOARD_WAIT_SECONDS = 8;  // Give up and say "offline" after this long.
const LEADERBOARD_SIZE = 15;         // For the title. The sheet decides the real count (TOP_COUNT).

// The leaderboard's backpack:
//   status: "loading", "ready", "offline", or "rejected" (the sheet said no)
//   scores: the top 15, like [{ initials: "ABC", score: 3100 }, ...]
const leaderboard = { status: "loading", scores: [], message: "" };

// Ask the sheet for the top 15.
function loadLeaderboard() {
  leaderboard.status = "loading";
  askSheet(fetchWithTimeout(LEADERBOARD_URL), (list) => {
    leaderboard.scores = list;
    leaderboard.status = "ready";
  });
}

// Send a new score. The sheet saves it and sends back the new top 15.
function saveScore(initials, score) {
  leaderboard.status = "loading";
  const request = fetchWithTimeout(LEADERBOARD_URL, {
    method: "POST",
    body: JSON.stringify({ initials: initials, score: score }),
  });
  askSheet(request, (answer) => {
    if (answer.ok) {
      leaderboard.scores = answer.top;
      leaderboard.status = "ready";
    } else {
      leaderboard.status = "rejected";
      leaderboard.message = answer.error;
    }
  });
}

// Wait for the sheet's answer. If anything goes wrong, we're offline.
function askSheet(request, whenAnswered) {
  request
    .then((response) => response.json())
    .then(whenAnswered)
    .catch(() => { leaderboard.status = "offline"; });
}

// fetch() can wait forever on a blocked network, so give up after a while.
function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), LEADERBOARD_WAIT_SECONDS * 1000);
  return fetch(url, { ...options, signal: controller.signal });
}
