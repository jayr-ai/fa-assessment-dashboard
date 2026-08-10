import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadLiveAssessments, findLiveAgentById } from './data/liveSource';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CREDENTIALS_PATH = path.join(__dirname, 'data', 'credentials.json');

if (!existsSync(CREDENTIALS_PATH)) {
  console.error('No credentials.json found. Run `npm run seed` first.');
  process.exit(1);
}

interface Credential {
  agentId: string;
  username: string;
  passwordHash: string;
  placeholderUsername: boolean;
}

const credentials: Credential[] = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf-8'));

// Session store: in-memory token -> agentId. Assumption (per README): token-based, not
// cookie-based, since this is a plain Vite dev client talking to a separate API origin.
const sessions = new Map<string, string>();

const app = express();
app.use(cors());
app.use(express.json());

function sendLiveDataError(res: express.Response, err: unknown) {
  const message = err instanceof Error ? err.message : 'Failed to load live assessment data';
  res.status(502).json({ error: message });
}

app.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'username and password are required' });
  }

  const credential = credentials.find((c) => c.username.toLowerCase() === username.toLowerCase());
  if (!credential) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const valid = await bcrypt.compare(password, credential.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, credential.agentId);

  try {
    const agent = await findLiveAgentById(credential.agentId);
    res.json({ token, agentName: agent?.name ?? null });
  } catch (err) {
    sendLiveDataError(res, err);
  }
});

app.post('/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) sessions.delete(token);
  res.status(204).end();
});

function requireAuth(req: express.Request, res: express.Response): string | null {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const agentId = token ? sessions.get(token) : undefined;
  if (!agentId) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }
  return agentId;
}

app.get('/me/assessment', async (req, res) => {
  const agentId = requireAuth(req, res);
  if (!agentId) return;
  try {
    const agent = await findLiveAgentById(agentId);
    if (!agent) return res.status(404).json({ error: 'Record not found' });
    res.json(agent);
  } catch (err) {
    sendLiveDataError(res, err);
  }
});

// Open access for now, matching current Looker-by-link behavior. See README section 6 —
// adding a manager password gate later is a small addition to this one handler.
app.get('/management/overview', async (_req, res) => {
  try {
    const agents = await loadLiveAssessments();
    res.json({
      agents,
      dataLastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    sendLiveDataError(res, err);
  }
});

const PORT = process.env.API_PORT ? Number(process.env.API_PORT) : 4001;
app.listen(PORT, () => {
  console.log(`FA Assessment Dashboard API listening on http://localhost:${PORT}`);
});
