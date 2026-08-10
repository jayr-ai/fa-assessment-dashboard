# Apps Script setup: sync AssessmentDash to GitHub

One-time setup so the "Freedom Assessment Tracker" sheet keeps `data/assessments.json` in
[jayr-ai/fa-assessment-dashboard](https://github.com/jayr-ai/fa-assessment-dashboard) up to date.
This has to be done from your own Google account — pasting code and authorizing it isn't something
that can be done on your behalf, since it's a one-time OAuth consent click tied to your identity.

## 1. Create a GitHub token

The script needs a token that can write to just this one repo.

1. Go to **github.com → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Resource owner: `jayr-ai`. Repository access: **Only select repositories** → `fa-assessment-dashboard`.
3. Permissions: **Contents → Read and write**. Nothing else is needed.
4. Generate it and copy the token — you won't see it again.

## 2. Paste the script into the sheet

1. Open the [Freedom Assessment Tracker](https://docs.google.com/spreadsheets/d/19M1bPihRjYwr6dttvMNuKBJWSVONU3m21Dy38p78k4k/edit) sheet.
2. **Extensions → Apps Script**.
3. Delete whatever's in the default `Code.gs` (or add a new script file) and paste in the contents of
   [`apps-script/SyncAssessmentsToGitHub.gs`](apps-script/SyncAssessmentsToGitHub.gs) from this repo.
4. Save the project (any name is fine, e.g. "Sync to GitHub").

The script opens the spreadsheet by ID (`SpreadsheetApp.openById(...)`), so it works whether this
project is container-bound to the sheet or a standalone project — no dependency on `getActive()`.

## 3. Set the script properties

Still in the Apps Script editor: **Project Settings (gear icon) → Script Properties → Add script property**, three times:

| Property | Value |
|---|---|
| `GITHUB_TOKEN` | the token from step 1 |
| `GITHUB_REPO` | `jayr-ai/fa-assessment-dashboard` |
| `GITHUB_BRANCH` | `main` |

## 4. Run `setupTriggers` once

1. Back in the editor, select the `setupTriggers` function from the function dropdown (next to Run/Debug).
2. Click **Run**.
3. Google will prompt for authorization — this is the one-time consent click. Review the permissions
   (it needs to read the spreadsheet and make external requests to GitHub) and approve.
4. Check **Executions** (left sidebar) — you should see `setupTriggers` and `syncAssessmentsToGitHub`
   both complete successfully. If `syncAssessmentsToGitHub` errors, the message will say why (usually
   a missing/incorrect script property).

This installs two triggers, both calling `syncAssessmentsToGitHub`:
- **onChange** — fires soon after any edit to the spreadsheet, including new assessment rows.
- **Every 30 minutes** — a fallback in case an edit doesn't fire the change event (also means one
  sync will always land within 30 minutes even if something's flaky).

It also runs one sync immediately, so `data/assessments.json` should appear in the repo right after.

## 5. Verify

```bash
curl https://raw.githubusercontent.com/jayr-ai/fa-assessment-dashboard/main/data/assessments.json
```

Should return the full agent list. Then, in the dashboard project:

```bash
npm run seed && npm run dev:all
```

`npm run seed` now pulls real agents (and real emails) from this live JSON instead of the old mock
data — check `seed-credentials.txt` for real login usernames.

## Re-running / changing things later

- **Rotate the GitHub token**: update the `GITHUB_TOKEN` script property, no code changes needed.
- **Change sync frequency**: edit the `everyMinutes(30)` call in `setupTriggers()`, then re-run
  `setupTriggers` (it clears old triggers for this function before adding new ones, so it's safe to
  re-run any time).
- **Manual one-off sync**: run `syncAssessmentsToGitHub` directly from the function dropdown.
