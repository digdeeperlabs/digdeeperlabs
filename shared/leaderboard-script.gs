// ============================================================
// PINBALL LEADERBOARD: the Google Sheet's script.
// This file does NOT run on the website. A parent pastes it into
// the leaderboard sheet (Extensions > Apps Script) and deploys it
// as a web app. The game talks to that web app.
//
// The sheet checks every entry itself, because anyone can read and
// change the game's code. Never trust the player's computer.
//
// This copy in the repo is the master. Change it here first, then
// paste it into Apps Script and deploy a New version.
// ============================================================

const TOP_COUNT = 15;       // How many scores the leaderboard shows.
const MIN_SCORE = 2500;     // Winners only. Keep this the same as WIN_SCORE in the game.
const MAX_SCORE = 1000000; // Anything higher than this is a fake score.
const MAX_NAME_LENGTH = 12  // Longest name possible 

const SCORE_TAB = "Sheet1";           // The tab the scores are saved in. Found by name, not position.
const BLOCKED_TAB = "Blocked words";  // Bad-word list: column A, one word per row. Only the parent edits it.

// A first name, then (optional) a space and one letter: "Emmet" or "Emmet G".
// No room for a last name, by design.
const NAME_PATTERN = /^[A-Za-z]+( [A-Za-z])?$/;

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

  const name = cleanName(data.initials);  // The game still calls it "initials".
  const score = Number(data.score);

  const problem = nameProblem(name, blockedWords());
  if (problem) {
    return sendJson({ ok: false, error: problem });
  }
  if (!Number.isInteger(score) || score < MIN_SCORE || score > MAX_SCORE) {
    return sendJson({ ok: false, error: "score not allowed" });
  }

  // The lock stops two players saving at the exact same moment from clashing.
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    scoreSheet().appendRow([name, score, new Date()]);
  } finally {
    lock.releaseLock();
  }
  return sendJson({ ok: true, top: topScores() });
}

// Tidy a typed name: trim the ends and squash extra spaces in the middle.
// Letters stay the way the player typed them.
function cleanName(raw) {
  return String(raw == null ? "" : raw).trim().replace(/\s+/g, " ");
}

// The ONE name check, used when saving AND when building the top 15.
// Returns "" if the name is fine, or a message saying what's wrong.
function nameProblem(name, blocked) {
  if (name.length === 0 || name.length > MAX_NAME_LENGTH || !NAME_PATTERN.test(name)) {
    return "Use your first name + last initial, letters only, " + MAX_NAME_LENGTH + " max";
  }
  const squashed = name.toLowerCase().replace(/ /g, "");
  if (blocked.some((word) => squashed.includes(word))) {
    return "Try a different name";  // Don't say which word.
  }
  return "";
}

// The bad-word list from the Blocked words tab, lowercase with spaces removed.
// No tab yet means no blocked words (not a crash).
function blockedWords() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BLOCKED_TAB);
  if (!sheet) return [];
  return sheet.getDataRange().getValues()
    .map((row) => String(row[0]).toLowerCase().replace(/\s/g, ""))
    .filter((word) => word.length > 0);
}

// The scores tab. Row 1 is the header: Name, Score, Date.
function scoreSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SCORE_TAB);
}

// The best TOP_COUNT players, highest first. Each player shows up only once,
// with their best score. "Emmet G" and "EMMET G" are the same player; the
// board shows the spelling from their first saved row. (Every game is still
// saved in the sheet.) Only name and score are sent to the game. The date
// stays private in the sheet.
function topScores() {
  const rows = scoreSheet().getDataRange().getValues().slice(1);  // skip the header row
  const blocked = blockedWords();

  // Keep each player's best score. The key is the name in lowercase.
  const best = {};
  for (const row of rows) {
    const name = cleanName(row[0]);
    const score = row[1];
    if (nameProblem(name, blocked) || typeof score !== "number") continue;
    const key = name.toLowerCase();
    if (!(key in best)) best[key] = { name: name, score: score };
    else if (score > best[key].score) best[key].score = score;
  }

  return Object.values(best)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_COUNT)
    .map((player) => ({ initials: player.name, score: player.score }));  // the game still reads "initials"
}

function sendJson(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

// TEST: in the Apps Script editor, pick testNames in the menu and click Run.
// Then open the Execution log. The website can't call this.
// To test the bad-word list, add a harmless word like ZEBRA to the Blocked
// words tab, run this again ("Zebra Q" should say "Try a different name"),
// then delete ZEBRA from the tab.
function testNames() {
  const blocked = blockedWords();
  Logger.log("Blocked words loaded: " + blocked.length);
  const samples = [
    "EMMET", "Emmet G", "ABC", "  Emmet   G ",            // should be OK
    "MAX POWERS", "E G G", "EMMET1", "Abcdefghijklm", "",  // should fail
    "Zebra Q",                                             // fails only if ZEBRA is blocked
  ];
  for (const raw of samples) {
    const name = cleanName(raw);
    const problem = nameProblem(name, blocked);
    Logger.log(JSON.stringify(raw) + " -> " + JSON.stringify(name) + " : " + (problem || "OK"));
  }
}
