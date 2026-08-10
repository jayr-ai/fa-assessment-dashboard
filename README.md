# FA Assessment Dashboard

React app for Freedom Academy's assessment results: a management **Overview** (`/overview`) and a
per-agent **personal view** (`/login` → `/my-assessment`) gated by real username/password login,
replacing the old hand-cloned-per-agent Looker Studio reports.

**Live**: https://freedomacademy.azdigitalph.com/assessment/ (a card on the Freedom Academy dashboard
hub, alongside Sales Dashboard / Meta Ads Report / Revenue Dashboard)
Source repo: [jayr-ai/fa-assessment-dashboard](https://github.com/jayr-ai/fa-assessment-dashboard)
Deployed frontend lives in: [jayr-ai/au-fa-dashboard](https://github.com/jayr-ai/au-fa-dashboard)`/assessment/`

> This repo does **not** deploy its own GitHub Pages site — that was retired once this moved onto
> the shared Freedom Academy hub domain (see "Deploying" below for why, and how to redeploy).

## Status: fully deployed, not yet live to real agents

- **Data**: real, sourced from the `AssessmentDash` tab of the "Freedom Assessment Tracker" sheet,
  synced to [`data/assessments.json`](data/assessments.json) in this repo by an Apps Script the sheet
  owner runs — see [APPS_SCRIPT_SETUP.md](APPS_SCRIPT_SETUP.md).
- **Hosting**: the frontend is a static build, deployed as a subfolder of the `au-fa-dashboard` repo
  so it can live on the existing `freedomacademy.azdigitalph.com` custom domain (GitHub Pages
  custom domains are one-per-repo, and that domain already belongs to `au-fa-dashboard`'s hub page).
  The login-gated API is a **Cloudflare Worker**. No Railway anywhere in this stack, by design.
- **Login**: real bcrypt-backed auth against Cloudflare KV, but credentials are dev-seeded
  (`npm run seed -- --remote`), not yet a real onboarding flow — see "Still open" below.

## Architecture

```
Google Sheet (AssessmentDash tab)
   │  Apps Script: onChange trigger + 30-min fallback (see APPS_SCRIPT_SETUP.md)
   ▼
data/assessments.json  in this GitHub repo (jayr-ai/fa-assessment-dashboard)
   │
   ├─→ fetched directly by the frontend for /overview (public data, no backend needed)
   │
   └─→ fetched by the Cloudflare Worker (60s cache) to answer /me/assessment
                                                              │
freedomacademy.azdigitalph.com/assessment/  ──login/logout/me──►  Cloudflare Worker (fa-assessment-api)
  (static build, deployed into jayr-ai/au-fa-dashboard)              fa-assessment-api.jayr-ai.workers.dev
                                                              │
                                                        Cloudflare KV
                                                        (SESSIONS, CREDENTIALS)
```

Nothing here needs an always-on server: it's static hosting, and the Worker only runs per-request on
Cloudflare's edge. `/overview` doesn't touch the Worker at all — it's open data, so the frontend reads
`data/assessments.json` straight from GitHub.

## How to run it locally

```bash
npm install
npm run seed          # seeds LOCAL wrangler KV simulation (safe default, no Cloudflare account needed)
npm run dev:all        # Vite frontend (5185) + `wrangler dev` Worker simulation (8787) together
```

Then open http://localhost:5185/assessment/ (the dev server still serves at the `/assessment/` base
path, matching production, even though nothing's actually nested under a hub locally).

`npm run seed` pulls agents from the live `data/assessments.json` in GitHub, so it needs that file to
already exist (i.e. the Apps Script has synced at least once — see
[APPS_SCRIPT_SETUP.md](APPS_SCRIPT_SETUP.md)).

Individual pieces:

```bash
npm run dev          # frontend only, http://localhost:5185
npm run dev:worker    # Worker only, http://localhost:8787 (local KV simulation)
```

## Deploying

**Frontend** — manual, since it deploys into a *different* repo (`au-fa-dashboard`) than this one.
There's no cross-repo CI for this (would need a PAT with write access to that repo stored as a
secret here — not worth it for how rarely this needs a redeploy):

```bash
VITE_WORKER_URL="https://fa-assessment-api.jayr-ai.workers.dev" npm run build
rm -rf ../au-fa-dashboard/assessment
cp -r dist ../au-fa-dashboard/assessment
cd ../au-fa-dashboard && git add assessment/ && git commit -m "Update Assessment Dashboard" && git push
```

(adjust the relative path if your local clones aren't siblings). This repo's own GitHub Pages is
disabled — don't re-enable it, `freedomacademy.azdigitalph.com/assessment/` is the one canonical URL.

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

This is **idempotent** — it only creates credentials for agents who don't already have one, and
leaves everyone else's password untouched. Run it any time the sheet gets a new agent; existing
agents are silently skipped, not regenerated (regenerating everyone on every run would invalidate
passwords you've already handed out). Newly-created plaintext is appended to `seed-credentials.txt`
(gitignored) — agents who already existed aren't listed, since we don't (and shouldn't) know their
existing plaintext. Without `--remote` it targets the local wrangler simulation instead, the safe
default for iterating.

**Current process for getting agents their login**: run `npm run seed -- --remote` after a new agent
takes the assessment, then manually send that agent their username/password from
`seed-credentials.txt` (email, Slack, text — whatever channel). No auto-delivery yet; see "Still
open" below.

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

1. ~~`/overview` login gate~~ — **resolved 2026-08-10, user confirmed no gate needed.** Stays open,
   matching current Looker-by-link behavior. Not revisiting unless requirements change.
2. **Credential delivery is manual, by design for now** (user decision 2026-08-10): after
   `npm run seed -- --remote` creates a new agent's account, you personally send them their
   username/password via whatever channel (email/Slack/text). No auto-delivery. Revisit if this
   stops scaling — options considered were auto-email (needs a mail service like Resend) or
   GoHighLevel (reuses existing CRM/messaging infra) — both are still on the table if manual sending
   becomes a bottleneck.
3. **Rating thresholds still aren't derivable from anything visible** — moot for rendering (ratings
   are sheet-stored, not computed), but relevant if you ever need to sanity-check a borderline score.
4. **Sessions are token-based** (Bearer token in `localStorage`, stored in Cloudflare KV with a 24h
   TTL), not cookie-based.

## Before this goes live to any real agent

1. Watch the Apps Script's **Executions** log for a while to confirm syncs are actually landing.
2. Reconcile a few real agents' dashboard views against what they'd expect, since this is the first
   time this data has been rendered outside of Looker Studio.
3. Otherwise this is ready — data pipeline, auth, hosting, and the credential-issuance process are
   all decided and working.
