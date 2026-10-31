// ============================================================
// ARCADE LEADERBOARD: the Google Sheet's script, for EVERY game.
// This file does NOT run on the website. A parent pastes it into
// the leaderboard sheet (Extensions > Apps Script) and deploys it
// as a web app. The games talk to that web app.
//
// The sheet checks every entry itself, because anyone can read and
// change a game's code. Never trust the player's computer.
//
// This copy in the repo is the master. Change it here first, then
// paste it into Apps Script and deploy a New version.
// ============================================================

const TOP_COUNT = 15;       // How many scores each leaderboard shows.
const MAX_NAME_LENGTH = 12  // Longest name possible

const BLOCKED_TAB = "Blocked words";  // Bad-word list: column A, one word per row. Only the parent edits it.
const OLD_PINBALL_TAB = "Sheet1";     // Pinball's tab before Part 2. setupTabs() renames it to "pinball".

// A first name, then (optional) a space and one letter: "Emmet" or "Emmet G".
// No room for a last name, by design.
const NAME_PATTERN = /^[A-Za-z]+( [A-Za-z])?$/;

// Every game allowed on the leaderboard. Each game's tab in the sheet is
// named after its id (the game's folder name). A game not on this list is
// turned away, so strangers can't make junk tabs.
//   minScore: the lowest score that gets on the board.
//   maxScore: anything higher is a fake score.
const GAMES = {
  "pinball":       { minScore: 2500, maxScore: 1000000 },     // winners only
  "storm-drop-99": { minScore: 1,    maxScore: 1000000000 },
  "cube-corner":   { minScore: 1,    maxScore: 1000000000 },
  "burger-stomp":  { minScore: 1,    maxScore: 1000000000 },
  "paddle-battle": { minScore: 1,    maxScore: 1000000000 },
  "space-escape":  { minScore: 1,    maxScore: 1000000000 },
  "donut-empire":  { minScore: 1,    maxScore: 1000000000 },
  "chalk-archer":  { minScore: 1,    maxScore: 1000000000 },
};

// ---------- What the website can ask for ----------

// Read a leaderboard.
//   ?game=cube-corner  -> that game's top scores, plus its rules
//   ?game=all          -> every game's top scores, in one trip
//   (no game)          -> old pinball's list, in the old shape
function doGet(e) {
  const game = e && e.parameter ? e.parameter.game : undefined;
  const blocked = blockedWords();

  if (!game) {
    return sendJson(oldShape(topScores("pinball", blocked)));
  }
  if (game === "all") {
    const games = {};
    for (const id of Object.keys(GAMES)) games[id] = topScores(id, blocked);
    return sendJson({ ok: true, topCount: TOP_COUNT, games: games });
  }
  if (!isKnownGame(game)) {
    return sendJson({ ok: false, error: "unknown game" });
  }
  return sendJson({
    ok: true,
    game: game,
    topCount: TOP_COUNT,
    maxNameLength: MAX_NAME_LENGTH,
    minScore: GAMES[game].minScore,
    scores: topScores(game, blocked),
  });
}

// Save a score: { game, name, score }. Check it, save it, send back the top scores.
// Old pinball sends { initials, score } with no game, and gets the old answer shape.
function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return sendJson({ ok: false, error: "bad data" });
  }

  const isOldPinball = !data.game;
  const game = isOldPinball ? "pinball" : String(data.game);
  if (!isKnownGame(game)) {
    return sendJson({ ok: false, error: "unknown game" });
  }

  const name = cleanName(isOldPinball ? data.initials : data.name);
  const score = Number(data.score);
  const blocked = blockedWords();

  const problem = nameProblem(name, blocked) || scoreProblem(game, score);
  if (problem) {
    return sendJson({ ok: false, error: problem });
  }

  const sheet = gameSheet(game);
  if (!sheet) {
    return sendJson({ ok: false, error: "this game's leaderboard isn't set up yet" });
  }

  // The lock stops two players saving at the exact same moment from clashing.
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    sheet.appendRow([name, score, new Date()]);
  } finally {
    lock.releaseLock();
  }

  const scores = topScores(game, blocked);
  if (isOldPinball) return sendJson({ ok: true, top: oldShape(scores) });
  return sendJson({ ok: true, scores: scores });
}

// ---------- The checks (the bouncer) ----------

// Is this a game on the GAMES list? (hasOwnProperty, so sneaky ids like
// "constructor", which every JavaScript object secretly has, don't count.)
function isKnownGame(game) {
  return Object.prototype.hasOwnProperty.call(GAMES, game);
}

// Tidy a typed name: trim the ends and squash extra spaces in the middle.
// Letters stay the way the player typed them.
function cleanName(raw) {
  return String(raw == null ? "" : raw).trim().replace(/\s+/g, " ");
}

// The ONE name check, used when saving AND when building the top scores.
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

// The ONE score check: a whole number inside this game's limits.
function scoreProblem(game, score) {
  const limits = GAMES[game];
  if (!Number.isInteger(score) || score < limits.minScore || score > limits.maxScore) {
    return "score not allowed";
  }
  return "";
}

// The bad-word list from the Blocked words tab, lowercase with spaces removed.
// No tab means no blocked words (not a crash).
function blockedWords() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BLOCKED_TAB);
  if (!sheet) return [];
  return sheet.getDataRange().getValues()
    .map((row) => String(row[0]).toLowerCase().replace(/\s/g, ""))
    .filter((word) => word.length > 0);
}

// ---------- Reading the sheet ----------

// A game's tab, found by name. Row 1 is the header: Name, Score, Date.
// Until setupTabs() renames it, pinball's scores are still in "Sheet1".
function gameSheet(game) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(game);
  if (sheet) return sheet;
  if (game === "pinball") return spreadsheet.getSheetByName(OLD_PINBALL_TAB);
  return null;
}

// A game's best TOP_COUNT players, highest first: [{ name, score }].
// Each player shows up once, with their best score. "Emmet G" and "EMMET G"
// are the same player; the board shows the spelling from their first saved
// row. Only name and score leave the sheet. Dates stay private.
function topScores(game, blocked) {
  const sheet = gameSheet(game);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues().slice(1);  // skip the header row

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
    .slice(0, TOP_COUNT);
}

// Old pinball reads { initials, score }. Remove once every page uses "name".
function oldShape(scores) {
  return scores.map((player) => ({ initials: player.name, score: player.score }));
}

function sendJson(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------- Run these from the Apps Script editor (the website can't) ----------

// SETUP: pick setupTabs in the menu and click Run.
// Renames "Sheet1" to "pinball" (all rows stay) and makes a tab for every
// game on the GAMES list that doesn't have one yet. Safe to run again:
// it never deletes or overwrites anything. Run it again after adding a game.
function setupTabs() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const oldTab = spreadsheet.getSheetByName(OLD_PINBALL_TAB);
  if (oldTab && !spreadsheet.getSheetByName("pinball")) {
    oldTab.setName("pinball");
    Logger.log("Renamed " + OLD_PINBALL_TAB + " to pinball");
  }
  for (const game of Object.keys(GAMES)) {
    if (spreadsheet.getSheetByName(game)) {
      Logger.log(game + ": already there");
    } else {
      spreadsheet.insertSheet(game).appendRow(["Name", "Score", "Date"]);
      Logger.log(game + ": created");
    }
  }
}

// TEST: pick testNames in the menu and click Run, then read the Execution log.
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

  Logger.log("Games: " + Object.keys(GAMES).join(", "));
  Logger.log("nope is a game? " + isKnownGame("nope") + " (should be false)");
  Logger.log("constructor is a game? " + isKnownGame("constructor") + " (should be false)");
  const scoreTests = [["cube-corner", 0], ["cube-corner", 1], ["pinball", 2000], ["pinball", 2500]];
  for (const [game, score] of scoreTests) {
    Logger.log(game + " score " + score + " : " + (scoreProblem(game, score) || "OK"));
  }
}
