/**
 * FA Assessment Dashboard — sync AssessmentDash to GitHub as JSON.
 *
 * Paste this whole file into: Extensions > Apps Script, on the "Freedom Assessment Tracker"
 * spreadsheet. Then run setupTriggers() once (Run menu -> setupTriggers) and approve the
 * permission prompts. See ../APPS_SCRIPT_SETUP.md for the full walkthrough.
 *
 * Column layout this expects on the "AssessmentDash" tab (confirmed 2026-08-10):
 *   A Last Updated | B Name | C Email | D Total Quiz Score | E Call IQ Test Score
 *   F Role Play Proficiency Score | G Overall Freedom Assessment Score | H Overall Rating
 *   I Overall Remarks | J Assessment #1: Rating | K Assessment #1: Call IQ Test [Remarks]
 *   L Assessment #2: Rating | M Assessment #2: Accelerator Check [Remarks]
 *   N Assessment #3: Rating | O Assessment #3: Role Play Proficiency [Remarks]
 *   P DataStudio Link (not synced)
 */

var SHEET_NAME = 'AssessmentDash';
var JSON_PATH = 'data/assessments.json';

// Fallback only if column I (Overall Remarks) is ever blank for a row.
var OVERALL_REMARKS_FALLBACK = {
  'DISTINCTION': 'You are ready!',
  'PASS': 'You have earned your place. Keep refining.',
  'MASTERY IN MOTION': 'You are not there yet. Go back, do the work, and re-sit.'
};

function slugify_(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');
}

function num_(value) {
  if (value === '' || value === null || value === undefined) return null;
  var n = Number(value);
  return isNaN(n) ? null : n;
}

function str_(value) {
  var s = (value === null || value === undefined) ? '' : String(value).trim();
  return s === '' ? null : s;
}

function buildAssessmentsJson_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Sheet tab "' + SHEET_NAME + '" not found.');

  var values = sheet.getDataRange().getValues();
  var rows = values.slice(1).filter(function (r) { return str_(r[1]); }); // Name (col B) required

  var agents = rows.map(function (row) {
    var name = str_(row[1]);
    var overallRating = str_(row[7]);

    return {
      id: slugify_(name),
      name: name,
      email: str_(row[2]),
      overallRating: overallRating,
      overallRemarks: str_(row[8]) || OVERALL_REMARKS_FALLBACK[overallRating] || '',
      callIQScore: num_(row[4]) || 0,
      totalQuizScore: num_(row[3]) || 0,
      rolePlayScore: num_(row[5]),
      overallScore: num_(row[6]),
      accountProvisioned: true,
      cards: {
        callIQ: {
          rating: str_(row[9]),
          remarks: str_(row[10]),
          isPlaceholder: false
        },
        acceleratorCheck: {
          rating: str_(row[11]),
          remarks: str_(row[12]),
          isPlaceholder: false
        },
        rolePlayProficiency: {
          rating: str_(row[13]),
          remarks: str_(row[14]),
          isPlaceholder: false
        }
      }
    };
  });

  agents.sort(function (a, b) { return a.name.localeCompare(b.name); });
  return agents;
}

function syncAssessmentsToGitHub() {
  var agents = buildAssessmentsJson_();
  var payload = JSON.stringify(agents, null, 2);

  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('GITHUB_TOKEN');
  var repo = props.getProperty('GITHUB_REPO');
  var branch = props.getProperty('GITHUB_BRANCH') || 'main';

  if (!token || !repo) {
    throw new Error(
      'Set GITHUB_TOKEN and GITHUB_REPO in Project Settings > Script Properties first. ' +
      'See APPS_SCRIPT_SETUP.md.'
    );
  }

  var apiUrl = 'https://api.github.com/repos/' + repo + '/contents/' + JSON_PATH;

  // Look up the current file's SHA so this is an update, not a duplicate-create error.
  var sha = null;
  var getResp = UrlFetchApp.fetch(apiUrl + '?ref=' + branch, {
    method: 'get',
    headers: { Authorization: 'token ' + token },
    muteHttpExceptions: true
  });
  if (getResp.getResponseCode() === 200) {
    sha = JSON.parse(getResp.getContentText()).sha;
  }

  var body = {
    message: 'Sync assessment data ' + new Date().toISOString(),
    content: Utilities.base64Encode(payload, Utilities.Charset.UTF_8),
    branch: branch
  };
  if (sha) body.sha = sha;

  var putResp = UrlFetchApp.fetch(apiUrl, {
    method: 'put',
    contentType: 'application/json',
    headers: { Authorization: 'token ' + token },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });

  var code = putResp.getResponseCode();
  if (code !== 200 && code !== 201) {
    throw new Error('GitHub sync failed (HTTP ' + code + '): ' + putResp.getContentText());
  }
  Logger.log('Synced ' + agents.length + ' agents to ' + repo + '@' + branch + '/' + JSON_PATH);
}

/**
 * Run this once manually (Run menu -> setupTriggers) to install:
 *  - an onChange trigger, so results sync soon after a new row lands
 *  - a 30-minute time-based trigger, as a fallback in case onChange misses an edit
 * Re-running is safe — it clears any prior triggers for this function first.
 */
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncAssessmentsToGitHub') ScriptApp.deleteTrigger(t);
  });

  ScriptApp.newTrigger('syncAssessmentsToGitHub')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onChange()
    .create();

  ScriptApp.newTrigger('syncAssessmentsToGitHub')
    .timeBased()
    .everyMinutes(30)
    .create();

  Logger.log('Triggers installed: onChange + every 30 minutes.');

  // Run an immediate sync so there's data in GitHub right away.
  syncAssessmentsToGitHub();
}
