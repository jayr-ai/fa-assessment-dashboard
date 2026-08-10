import bcrypt from 'bcryptjs';

export interface Env {
  SESSIONS: KVNamespace;
  CREDENTIALS: KVNamespace;
  LIVE_DATA_URL: string;
}

interface Credential {
  agentId: string;
  passwordHash: string;
}

interface AssessmentCardDetail {
  rating: string | null;
  remarks: string | null;
  isPlaceholder: boolean;
}

interface LiveAgentAssessment {
  id: string;
  name: string;
  email: string | null;
  overallRating: string;
  overallRemarks: string;
  callIQScore: number;
  totalQuizScore: number;
  rolePlayScore: number | null;
  overallScore: number;
  accountProvisioned: boolean;
  cards: {
    callIQ: AssessmentCardDetail;
    acceleratorCheck: AssessmentCardDetail;
    rolePlayProficiency: AssessmentCardDetail;
  };
}

const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24h

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

let cachedAssessments: { data: LiveAgentAssessment[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

async function loadLiveAssessments(env: Env): Promise<LiveAgentAssessment[]> {
  if (cachedAssessments && Date.now() - cachedAssessments.fetchedAt < CACHE_TTL_MS) {
    return cachedAssessments.data;
  }
  const res = await fetch(env.LIVE_DATA_URL, { cf: { cacheTtl: 30, cacheEverything: true } });
  if (!res.ok) {
    throw new Error(`Live assessment data not found (HTTP ${res.status})`);
  }
  const data = (await res.json()) as LiveAgentAssessment[];
  cachedAssessments = { data, fetchedAt: Date.now() };
  return data;
}

async function handleLogin(req: Request, env: Env): Promise<Response> {
  const body = await req.json().catch(() => null) as { username?: string; password?: string } | null;
  const username = body?.username;
  const password = body?.password;
  if (typeof username !== 'string' || typeof password !== 'string') {
    return json({ error: 'username and password are required' }, 400);
  }

  const raw = await env.CREDENTIALS.get(username.toLowerCase());
  if (!raw) {
    return json({ error: 'Invalid username or password' }, 401);
  }
  const credential = JSON.parse(raw) as Credential;

  const valid = await bcrypt.compare(password, credential.passwordHash);
  if (!valid) {
    return json({ error: 'Invalid username or password' }, 401);
  }

  const token = crypto.randomUUID();
  await env.SESSIONS.put(token, credential.agentId, { expirationTtl: SESSION_TTL_SECONDS });

  const agents = await loadLiveAssessments(env);
  const agent = agents.find((a) => a.id === credential.agentId);
  return json({ token, agentName: agent?.name ?? null });
}

async function handleLogout(req: Request, env: Env): Promise<Response> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (token) await env.SESSIONS.delete(token);
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

async function requireAuth(req: Request, env: Env): Promise<string | null> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return env.SESSIONS.get(token);
}

async function handleMe(req: Request, env: Env): Promise<Response> {
  const agentId = await requireAuth(req, env);
  if (!agentId) return json({ error: 'Not authenticated' }, 401);

  try {
    const agents = await loadLiveAssessments(env);
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return json({ error: 'Record not found' }, 404);
    return json(agent);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Failed to load data' }, 502);
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(req.url);

    if (req.method === 'POST' && url.pathname === '/login') return handleLogin(req, env);
    if (req.method === 'POST' && url.pathname === '/logout') return handleLogout(req, env);
    if (req.method === 'GET' && url.pathname === '/me/assessment') return handleMe(req, env);

    return json({ error: 'Not found' }, 404);
  },
};
