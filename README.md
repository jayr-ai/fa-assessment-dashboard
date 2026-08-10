# FA Assessment Dashboard

React app for Freedom Academy's assessment results: a management **Overview** (`/overview`) and a
per-agent **personal view** (`/login` → `/my-assessment`) gated by real username/password login,
replacing the old hand-cloned-per-agent Looker Studio reports.

**Live**: https://jayr-ai.github.io/fa-assessment-dashboard/
Repo: [jayr-ai/fa-assessment-dashboard](https://github.com/jayr-ai/fa-assessment-dashboard)

## Status: fully deployed, not yet live to real agents

- **Data**: real, sourced from the `AssessmentDash` tab of the "Freedom Assessment Tracker" sheet,
  synced to [`data/assessments.json`](data/assessments.json) in this repo by an Apps Script the sheet
  owner runs — see [APPS_SCRIPT_SETUP.md](APPS_SCRIPT_SETUP.md).
- **Hosting**: the frontend is a static build on **GitHub Pages**; the login-gated API is a
  **Cloudflare Worker**. No Railway anywhere in this stack, by design.
- **Login**: real bcrypt-backed auth against Cloudflare KV, but credentials are dev-seeded
  (`npm run seed -- --remote`), not yet a real onboarding flow — see "Still open" below.

## Architecture

```
Google Sheet (AssessmentDash tab)
   │  Apps Script: onChange trigger + 30-min fallback (see APPS_SCRIPT_SETUP.md)
   ▼
data/assessments.json  in this GitHub repo
   │
   ├─→ fetched directly by the frontend for /overview (public data, no backend needed)
   │
   └─→ fetched by the Cloudflare Worker (60s cache) to answer /me/assessment
                                                              │
GitHub Pages (static React build)  ──login/logout/me──►  Cloudflare Worker (fa-assessment-api)
  https://jayr-ai.github.io/fa-assessment-dashboard/         https://fa-assessment-api.jayr-ai.workers.dev
                                                              │
                                                        Cloudflare KV
                                                        (SESSIONS, CREDENTIALS)
```

Nothing here needs an always-on server: GitHub Pages is static hosting, and the Worker only runs
per-request on Cloudflare's edge. `/overview` doesn't touch the Worker at all — it's open data, so
the frontend reads `data/assessments.json` straight from GitHub.

## How to run it locally

```bash
npm install
npm run seed          # seeds LOCAL wrangler KV simulation (safe default, no Cloudflare account needed)
npm run dev:all        # Vite frontend (5185) + `wrangler dev` Worker simulation (8787) together
```

Then open http://localhost:5185/fa-assessment-dashboard/.

`npm run seed` pulls agents from the live `data/assessments.json` in GitHub, so it needs that file to
already exist (i.e. the Apps Script has synced at least once — see
[APPS_SCRIPT_SETUP.md](APPS_SCRIPT_SETUP.md)).

Individual pieces:

```bash
npm run dev          # frontend only, http://localhost:5185
npm run dev:worker    # Worker only, http://localhost:8787 (local KV simulation)
```

## Deploying

**Frontend** — automatic. `.github/workflows/deploy-pages.yml` builds and deploys to GitHub Pages on
every push to `main` (except commits that only touch `data/**`, i.e. the Apps Script's own syncs).
The build reads the `VITE_WORKER_URL` repo variable (Settings → Secrets and variables → Actions →
Variables) to know where the Worker lives.

**Worker** — manual, from your machine:

```bash
export CLOUDFLARE_API_TOKEN=...   # scoped token: Workers Scripts:Edit + Workers KV Storage:Edit
npm run worker:deploy
```

**Seeding real credentials into the live Worker** (after any roster change in the sheet):

```bash
export CLOUDFLARE_API_TOKEN=...
npm run seed -- --remote
```

This writes hashed credentials straight into the production `CREDENTIALS` KV namespace and prints
plaintext once to `seed-credentials.txt` (gitignored) — without `--remote` it targets the local
wrangler simulation instead, which is the safe default for iterating.

### One-time Cloudflare setup (already done for this project, kept here for reference)

```bash
export CLOUDFLARE_API_TOKEN=...
npm run worker:kv:create   # creates SESSIONS + CREDENTIALS namespaces, paste ids into worker/wrangler.toml
npm run worker:deploy      # first deploy; note the resulting *.workers.dev URL
gh variable set VITE_WORKER_URL --body "https://<your-worker>.workers.dev"
npm run seed -- --remote
```

## What the real sheet resolved (no longer placeholders)

Pulling the real `AssessmentDash` tab (and its `REF` lookup tab, which holds the canned remark copy
per rating tier) resolved almost every unknown flagged in the original mock-phase build:

- **Real emails** for the two previously-unconfirmed agents: David Thorpe is
  `david.thorpe@talkingwithnumbers.com`; "Joey wong" is `wcsjoey@yahoo.com`.
- **The "Joey test" name/email mismatch is real**, not a capture artifact — the sheet itself has
  `joey.wong@freedomacademy.com.au` against the display name "Joey test."
- **Overall Freedom Assessment Score is a real stored column** (`G`), not something we infer — read
  directly (e.g. David Thorpe: 83.67, full precision, formatted for display via
  `src/utils/format.ts`).
- **Per-assessment Rating and Remarks are real, per-row sheet columns** (`J`/`K` Call IQ, `L`/`M`
  Accelerator Check, `N`/`O` Role Play), confirmed against the `REF` tab. No more
  `[TODO: confirm from sheet]` placeholders anywhere.
- **Call IQ Test card shows a Rating badge** (real data in column `J`) but no remarks — confirmed via
  `REF` that Call IQ genuinely has no canned remark copy defined for any tier; that's how the source
  system is set up, not a gap in this build.

## Still open

1. **`/overview` has no login gate**, matching current Looker-by-link behavior. Still easy to add
   later.
2. **Login credentials are still dev-seeded, not a real onboarding flow.** Username = real email,
   password = randomly generated each time `npm run seed` runs. Where/how real credentials get
   created or reset for agents is still undecided.
3. **Rating thresholds still aren't derivable from anything visible** — moot for rendering (ratings
   are sheet-stored, not computed), but relevant if you ever need to sanity-check a borderline score.
4. **Sessions are token-based** (Bearer token in `localStorage`, stored in Cloudflare KV with a 24h
   TTL), not cookie-based.

## Before this goes live to any real agent

1. Decide where real agent credentials get created/reset (see "Still open" #2) — right now anyone
   with the Cloudflare API token can run `npm run seed -- --remote` and read the plaintext.
2. Decide whether `/overview` needs a gate (see "Still open" #1).
3. Watch the Apps Script's **Executions** log for a while to confirm syncs are actually landing.
4. Reconcile a few real agents' dashboard views against what they'd expect, since this is the first
   time this data has been rendered outside of Looker Studio.
