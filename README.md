# FA Assessment Dashboard (Phase 1 — mock data, real login)

Rebuild of Freedom Academy's Data Studio assessment report as a standalone React app:
a management **Overview** (`/overview`) and a per-agent **personal view** (`/login` → `/my-assessment`)
gated by real username/password login instead of hand-cloned Looker reports.

**This phase is UI-first with mock data.** Nothing here talks to the real Google Sheet yet — see
"Where the real data wiring goes next" at the bottom.

## How to run it locally

```bash
npm install
npm run seed     # generates hashed mock accounts + prints plaintext creds once
npm run dev:all   # starts the Vite frontend (5185) and the Express API (4001) together
```

Then open http://localhost:5185/overview or http://localhost:5185/login.

Individual pieces, if you want them separate:

```bash
npm run dev       # frontend only, http://localhost:5185
npm run dev:api   # backend only, http://localhost:4001
```

`npm run seed` must be run at least once before the API will start — it generates
`server/data/credentials.json` (bcrypt hashes) that the API reads at boot.

## Where the mock data and credentials live

- `src/data/mockAssessments.ts` — the 13-agent dataset (shape mirrors the real `AssessmentDash`
  sheet columns), plus the per-assessment card config. Fed to both `/overview` and `/my-assessment`
  via the API — the frontend never has direct access to any agent's record except its own.
- `src/data/types.ts` — shared types, rating colors, and the canned overall-rating remarks.
- `server/seed.ts` — generates one random password per agent, bcrypt-hashes it, writes hashes to
  `server/data/credentials.json` (gitignored) and prints the plaintext **once** to the console and to
  `seed-credentials.txt` (gitignored, repo root) so you can test logins. No plaintext password is ever
  written into the mock data file itself.
- `server/index.ts` — the Express API: `/login`, `/logout`, `/me/assessment` (auth-gated), and
  `/management/overview` (open). Sessions are an in-memory `Map<token, agentId>` — restarting the API
  invalidates all sessions, which is expected for a mock phase.

Re-run `npm run seed` any time to rotate all mock passwords.

## Assumptions and placeholders (read before treating anything here as final)

These all come directly from open questions or explicit "don't guess" instructions in the build brief:

1. **`/overview` has no login gate** — matches current Looker-by-link behavior. Deliberately left easy
   to add later: a manager-password check would be one extra line in the `/management/overview` handler
   in `server/index.ts`.
2. **Login username = agent's sheet-column-C email, for this mock phase only.** Explicitly called out
   as a placeholder decision in the brief, not final. Where real credentials will actually live (new
   columns on `AssessmentDash` vs. a separate accounts sheet/table) is still undecided.
3. **Two agents don't have a usable email**, so their seeded username is a synthetic placeholder
   (`<slug>@todo-confirm-email.local`), flagged in `seed-credentials.txt`:
   - **David Thorpe** — email domain was truncated in the source capture (`talkingwithnumbers.c…`).
   - **Joey wong** — email wasn't captured at all (row was scrolled off-screen in the source pull).
   Both must be re-issued real credentials once the real email is confirmed.
4. **"Joey test"'s email** (`joey.wong@freedomacademy.com…`) is reproduced exactly as it appeared in
   the sheet, including the mismatch with the display name "Joey test" — this looked like a
   pre-existing data-quality quirk in the source, not something to silently "fix." Flagging per the brief.
5. **Overall Freedom Assessment Score formula is inferred, not confirmed:**
   `0.10 × Call IQ + 0.40 × Total Quiz + 0.50 × Role Play`, with the Role Play term dropped entirely
   (not zeroed) when Role Play is blank. This reproduces every row in the source table exactly
   (e.g. Nelson Lopera: 0.10×0 + 0.40×94 + 0.50×93 = 84.1 → 84; Briony Evans, Role Play blank:
   0.10×0 + 0.40×98 = 39.2 → 39). Implemented in `computeOverallScore()` in `mockAssessments.ts`.
   **Confirm against the actual sheet formula before treating this as ground truth.**
6. **Overall Rating is hardcoded per agent**, not derived from a threshold function — the brief was
   explicit that the exact PASS/DISTINCTION cutoffs aren't visible from the source pull, so nothing
   here invents them.
7. **Per-assessment (card-level) Rating/Remarks are only confirmed for David Thorpe** (Accelerator
   Check and Role Play Proficiency, both DISTINCTION). All 12 other agents show a visible
   `[TODO: confirm from sheet]` placeholder in amber italics on those two cards rather than guessing
   at rating-tier copy that was never observed. The Call IQ Test card never shows a Rating/Remarks
   section for any agent — that's replicated from the source, not an omission on our part; worth
   confirming with the source's owner whether that's intentional or an unfinished widget upstream.
8. **The "DataStudio Link" column is replaced with an account-status indicator** (`Account created` /
   `Not yet invited`) instead of a literal "View personal dashboard" link. Reasoning: `/my-assessment`
   is gated by the logged-in session and only ever shows *that* session's own record, so a link to it
   from the Overview table couldn't actually deep-link to a specific agent's data without leaking
   another agent's record — which is exactly the risk section 5.2 says to avoid. This is a judgment
   call, not something observed in the source — push back if you'd rather have it work differently.
9. **Sessions are token-based (Bearer token in `localStorage`), not cookie-based** — simplest fit for a
   Vite dev client on one origin talking to an Express API on another during local dev.
10. Column M's exact header text ("Assessment #2: Accelerator Check [Remarks]") is assumed by pattern
    from columns K/O, not read directly — unconfirmed.

## What's real vs. what's mock, right now

- Real: the login flow, session gating, bcrypt hashing, and the UI/layout.
- Mock: all 13 agent records, all credentials, the overall-score formula, and every rating threshold.

## Where the real Google Sheets data wiring goes next

Everything currently reads from `src/data/mockAssessments.ts` via the two endpoints in
`server/index.ts`. To go live:

1. Replace `mockAssessments.ts` with a real read from the `Freedom Assessment Tracker` sheet,
   `AssessmentDash` tab (Google Sheets API, or push through Apps Script → JSON, matching the pattern
   used on the other AZ Digital dashboards).
2. Reconcile every mock number and rating against a full sheet export — this build only spot-checked
   13 rows from a screenshot, not a full pull.
3. Decide where real agent credentials get created/reset (see assumption #2) and re-seed accordingly.
4. Confirm the open items in assumptions #3, #4, #7, #10 with the sheet as source of truth before
   any real agent logs in.
