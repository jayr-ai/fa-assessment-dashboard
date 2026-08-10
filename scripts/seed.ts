import bcrypt from 'bcryptjs';
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

/**
 * Seed login credentials into the Cloudflare Worker's CREDENTIALS KV namespace.
 *
 * IDEMPOTENT: only creates credentials for agents who don't already have one in KV. Re-running
 * this after a roster change (new agent took the assessment) leaves everyone else's password
 * untouched — it does NOT regenerate the whole roster, since that would silently invalidate
 * passwords you've already handed out to existing agents.
 *
 * PLACEHOLDER DECISION (per prompt section 6, still not final): username = agent's Email
 * (AssessmentDash column C, sourced live). If an agent has no email on record, a clearly flagged
 * placeholder username is generated instead so a login can still exist for testing.
 *
 * Passwords are randomly generated here and never stored in plaintext — only their bcrypt hash
 * goes into KV. Plaintext for newly-created accounts is printed once and appended to
 * seed-credentials.txt (gitignored) — agents who already had an account are left out, since we
 * don't (and shouldn't) know their existing plaintext password.
 *
 * Usage:
 *   npm run seed              # writes to LOCAL wrangler KV simulation (safe default)
 *   npm run seed -- --remote  # writes to the REAL Cloudflare KV namespace (needs wrangler auth)
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const WORKER_DIR = path.join(REPO_ROOT, 'worker');

const LIVE_DATA_URL = process.env.LIVE_DATA_URL
  ?? 'https://raw.githubusercontent.com/jayr-ai/fa-assessment-dashboard/main/data/assessments.json';

const isRemote = process.argv.includes('--remote');
const scopeArgs = [isRemote ? '--remote' : '--local'];

interface LiveAgent {
  id: string;
  name: string;
  email: string | null;
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 10; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function loadLiveAgents(): Promise<LiveAgent[]> {
  const res = await fetch(LIVE_DATA_URL);
  if (!res.ok) {
    throw new Error(
      `Live assessment data not found at ${LIVE_DATA_URL} (HTTP ${res.status}). ` +
      'Has the Apps Script sync run yet? See APPS_SCRIPT_SETUP.md.'
    );
  }
  return res.json() as Promise<LiveAgent[]>;
}

function credentialExists(key: string): boolean {
  const args = ['wrangler', 'kv', 'key', 'get', key, '--binding', 'CREDENTIALS', ...scopeArgs, '--text'];
  const result = spawnSync('npx', args, { cwd: WORKER_DIR, encoding: 'utf-8' });
  if (result.status !== 0) return false; // remote: 404 -> non-zero exit
  if (result.stdout.includes('Value not found')) return false; // local: exits 0 either way
  return true;
}

function putKv(key: string, value: string) {
  const args = ['wrangler', 'kv', 'key', 'put', key, value, '--binding', 'CREDENTIALS', ...scopeArgs];
  const result = spawnSync('npx', args, { cwd: WORKER_DIR, encoding: 'utf-8' });
  if (result.status !== 0) {
    throw new Error(`wrangler kv key put failed for "${key}":\n${result.stderr || result.stdout}`);
  }
}

async function seed() {
  const agents = await loadLiveAgents();

  const newLines: string[] = [];
  let createdCount = 0;
  let skippedCount = 0;

  for (const agent of agents) {
    const hasEmail = !!agent.email;
    const username = hasEmail ? (agent.email as string) : `${agent.id}@todo-confirm-email.local`;
    const key = username.toLowerCase();

    if (credentialExists(key)) {
      skippedCount++;
      continue;
    }

    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);
    putKv(key, JSON.stringify({ agentId: agent.id, passwordHash }));
    createdCount++;

    newLines.push(`${agent.name}`);
    newLines.push(`  username: ${username}${hasEmail ? '' : '  [PLACEHOLDER — no email on record, see README]'}`);
    newLines.push(`  password: ${password}`);
    newLines.push('');
  }

  if (createdCount > 0) {
    const header = [
      `--- Seeded ${new Date().toISOString()} (${isRemote ? 'REMOTE' : 'local'}) ---`,
      '',
    ];
    appendFileSync(path.join(REPO_ROOT, 'seed-credentials.txt'), [...header, ...newLines].join('\n') + '\n');
    console.log(newLines.join('\n'));
  }

  console.log(
    `${createdCount} new account(s) created${isRemote ? ' in REMOTE KV' : ' in local KV'}, ` +
    `${skippedCount} already existed (left untouched).`
  );
  if (createdCount > 0) {
    console.log('New plaintext credentials appended to seed-credentials.txt (gitignored).');
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
