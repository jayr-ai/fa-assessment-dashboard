import type { AgentAssessment } from '../data/types';

// The login-gated API (Cloudflare Worker). Override via VITE_WORKER_URL for prod builds;
// defaults to wrangler's local dev port.
const WORKER_BASE = import.meta.env.VITE_WORKER_URL ?? 'http://localhost:8787';

// Overview is open data with no auth, so it's fetched directly from the synced JSON in this
// repo rather than round-tripping through the Worker — no backend needed for this page at all.
const LIVE_DATA_URL = import.meta.env.VITE_LIVE_DATA_URL
  ?? 'https://raw.githubusercontent.com/jayr-ai/fa-assessment-dashboard/main/data/assessments.json';

const TOKEN_KEY = 'fa_assessment_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export interface OverviewAgent extends AgentAssessment {
  overallRemarks: string;
}

export interface OverviewResponse {
  agents: OverviewAgent[];
  dataLastUpdated: string;
}

export async function fetchOverview(): Promise<OverviewResponse> {
  const res = await fetch(`${LIVE_DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load overview data');
  const agents: OverviewAgent[] = await res.json();
  return { agents, dataLastUpdated: new Date().toISOString() };
}

export async function login(username: string, password: string): Promise<{ token: string; agentName: string | null }> {
  const res = await fetch(`${WORKER_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Login failed');
  }
  const data = await res.json();
  setToken(data.token);
  return data;
}

export async function logout(): Promise<void> {
  const token = getToken();
  clearToken();
  if (!token) return;
  await fetch(`${WORKER_BASE}/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => undefined);
}

export async function fetchMyAssessment(): Promise<OverviewAgent> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${WORKER_BASE}/me/assessment`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    clearToken();
    throw new Error('Not authenticated');
  }
  if (!res.ok) throw new Error('Failed to load your assessment');
  return res.json();
}
