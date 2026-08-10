# FA Assessment Dashboard

React app for Freedom Academy's assessment results: a management **Overview** (`/overview`) and a
per-agent **personal view** (`/login` → `/my-assessment`) gated by real username/password login,
replacing the old hand-cloned-per-agent Looker Studio reports.

Repo: [jayr-ai/fa-assessment-dashboard](https://github.com/jayr-ai/fa-assessment-dashboard)

## Status: live data wired, not yet live to real agents

- **Data**: real, sourced from the `AssessmentDash` tab of the "Freedom Assessment Tracker" sheet,
  synced to [`data/assessments.json`](data/assessments.json) in this repo by an Apps Script the sheet
  owner runs — see [APPS_SCRIPT_SETUP.md](APPS_SCRIPT_SETUP.md). The Express API fetches that file
  live (60s cache) instead of reading a mock module.
- **Login**: real bcrypt-backed auth, but credentials are dev-seeded (`npm run seed`), not yet
  a real onboarding flow — see "Still open" below before any real agent gets a login.
- `src/data/mockAssessments.ts` is no longer used by the running app — it's kept only as an offline
  fixture / reference for the original 13-row snapshot this project started from.

## How to run it locally

```bash
npm install
npm run seed      # pulls live agents from GitHub, generates + hashes login passwords, prints them once
npm run dev:all    # Vite frontend (5185) + Express API (4001) together
```

Then open http://localhost:5185/overview or http://localhost:5185/login.

`npm run seed` requires `data/assessments.json` to already exist in the GitHub repo (i.e. the Apps
Script has run at least once — see [APPS_SCRIPT_SETUP.md](APPS_SCRIPT_SETUP.md)). If it 404s, that
script hasn't synced yet.

Individual pieces:

```bash
npm run dev       # frontend only, http://localhost:5185
npm run dev:api   # backend only, http://localhost:4001
```

## Where the data actually lives

```
Google Sheet (AssessmentDash tab)
   │  Apps Script: onChange trigger + 30-min fallback (see APPS_SCRIPT_SETUP.md)
   ▼
data/assessments.json  in this GitHub repo
   │  fetched live by the Express API (server/data/liveSource.ts), 60s in-memory cache
   ▼
/management/overview, /me/assessment  →  React frontend
```

- `apps-script/SyncAssessmentsToGitHub.gs` — paste-in script, run from the sheet's own Apps Script
  editor (by the sheet owner, since authorizing it is a one-time OAuth click tied to their identity).
  Column mapping is documented at the top of that file.
- `server/data/liveSource.ts` — fetches and caches `data/assessments.json` from GitHub raw content.
  Override with `LIVE_DATA_URL` (or `LIVE_DATA_REPO` / `LIVE_DATA_BRANCH`) env vars if needed.
- `server/seed.ts` — reads the same live source to generate login credentials
  (`server/data/credentials.json`, gitignored) and prints plaintext once to `seed-credentials.txt`
  (gitignored).

## What the real sheet resolved (no longer placeholders)

The original mock-phase build had several flagged unknowns. Pulling the real `AssessmentDash` tab
(and its `REF` lookup tab, which holds the canned remark copy per rating tier) resolved almost all of
them:

- **Real emails** for the two previously-unconfirmed agents: David Thorpe is
  `david.thorpe@talkingwithnumbers.com`; "Joey wong" is `wcsjoey@yahoo.com`.
- **The "Joey test" name/email mismatch is real**, not a capture artifact — the sheet itself has
  `joey.wong@freedomacademy.com.au` against the display name "Joey test."
- **Overall Freedom Assessment Score is a real stored column** (`G`, "Overall Freedom Assessment
  Score"), not a formula we need to infer — the mock phase's inferred
  `0.10×CallIQ + 0.40×Quiz + 0.50×RolePlay` formula turned out to match it, but we now just read the
  real value directly (e.g. David Thorpe: 83.67, not a rounded 84).
- **Per-assessment Rating and Remarks are real, per-row sheet columns** (`J`/`K` for Call IQ, `L`/`M`
  for Accelerator Check, `N`/`O` for Role Play), confirmed against the `REF` tab which holds the
  canned remark text per assessment × rating tier. Every agent now gets real card copy — no more
  `[TODO: confirm from sheet]` placeholders.
- **Column M's header is confirmed**: "Assessment #2: Accelerator Check [Remarks]."
- **Call IQ Test card now shows a Rating badge** (real data exists in column `J`) — this was a
  deliberate change from the mock phase, made after confirming with the user that the old Looker
  report's omission was just a rendering gap, not because the data doesn't exist. It still shows no
  remarks, because the `REF` tab confirms Call IQ genuinely has no canned remark copy defined for any
  tier — that part isn't a gap, it's how the source system is set up.

## Still open (unchanged from the mock phase)

1. **`/overview` has no login gate**, matching current Looker-by-link behavior. Still easy to add
   later — a manager-password check would be one addition to the `/management/overview` handler.
2. **Login credentials are still dev-seeded, not a real onboarding flow.** Username = email (now
   real), password = randomly generated on each `npm run seed` run. Where real credentials will
   actually be created/reset for agents is still undecided.
3. **Rating thresholds are still not derivable from anything we can see** — Ratings are sheet-stored
   values now (not something we compute), so this matters less than it did, but if you ever need to
   validate a borderline score, the exact PASS/DISTINCTION cutoffs still aren't visible from the
   sheet itself.
4. **Sessions are token-based** (Bearer token in `localStorage`), not cookie-based.

## What's real vs. what's still mock/dev-only

- Real: the data pipeline (Sheet → Apps Script → GitHub JSON → API), the login flow, session gating,
  bcrypt hashing, and the UI/layout.
- Dev-only: the seeded login passwords (rotate every time `npm run seed` runs) and the lack of any
  real credential-issuance workflow for agents.

## Before this goes live to any real agent

1. Decide where real agent credentials get created/reset (see "Still open" #2) and build that flow —
   right now anyone with shell access to this repo can run `npm run seed` and read the plaintext.
2. Decide whether `/overview` needs a gate (see "Still open" #1).
3. Watch the Apps Script's **Executions** log for a while to confirm syncs are actually landing
   (Extensions → Apps Script → Executions, on the sheet).
4. Reconcile a few real agents' dashboard views against what they'd expect, since this is the first
   time this data has been rendered outside of Looker Studio.
