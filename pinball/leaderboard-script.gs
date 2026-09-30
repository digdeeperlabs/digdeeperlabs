// ============================================================
// PINBALL LEADERBOARD: the Google Sheet's script.
// This file does NOT run on the website. A parent pastes it into
// the leaderboard sheet (Extensions > Apps Script) and deploys it
// as a web app. The game talks to that web app.
//
// The sheet checks every entry itself, because anyone can read and
// change the game's code. Never trust the player's computer.
// ============================================================

const TOP_COUNT = 15;       // How many scores the leaderboard shows.
const MIN_SCORE = 2500;     // Winners only. Keep this the same as WIN_SCORE in the game.
const MAX_SCORE = 1000000;  // Anything higher than this is a fake score.

// The game asks for the leaderboard: send back the top scores.
function doGet() {
  return sendJson(topScores());
}

// The game sends a new score: check it, save it, send back the top scores.
function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return sendJson({ ok: false, error: "bad data" });
  }

  const initials = String(data.initials || "").toUpperCase();
  const score = Number(data.score);

  if (!/^[A-Z]{3}$/.test(initials)) {
    return sendJson({ ok: false, error: "initials must be 3 letters" });
  }
  if (!Number.isInteger(score) || score < MIN_SCORE || score > MAX_SCORE) {
    return sendJson({ ok: false, error: "score not allowed" });
  }

  // The lock stops two players saving at the exact same moment from clashing.
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    scoreSheet().appendRow([initials, score, new Date()]);
  } finally {
    lock.releaseLock();
  }
  return sendJson({ ok: true, top: topScores() });
}

// The first tab of the spreadsheet. Row 1 is the header: Initials, Score, Date.
function scoreSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
}

// The best TOP_COUNT players, highest first. Each set of initials shows up
// only once, with that player's best score. (Every game is still saved in
// the sheet.) Only initials and score are sent to the game. The date stays
// private in the sheet.
function topScores() {
  const rows = scoreSheet().getDataRange().getValues().slice(1);  // skip the header row

  // Keep each player's best score.
  const best = {};
  for (const row of rows) {
    const initials = row[0];
    const score = row[1];
    if (!/^[A-Z]{3}$/.test(initials) || typeof score !== "number") continue;
    if (!(initials in best) || score > best[initials]) best[initials] = score;
  }

  return Object.keys(best)
    .map((initials) => ({ initials: initials, score: best[initials] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_COUNT);
}

function sendJson(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
