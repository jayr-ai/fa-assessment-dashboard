import type { AgentAssessment } from '../data/types';

// Assumption (README): dev API runs on 4001, override via VITE_API_URL if needed.
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4001';

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
  const res = await fetch(`${API_BASE}/management/overview`);
  if (!res.ok) throw new Error('Failed to load overview data');
  return res.json();
}

export async function login(username: string, password: string): Promise<{ token: string; agentName: string | null }> {
  const res = await fetch(`${API_BASE}/login`, {
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
  await fetch(`${API_BASE}/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => undefined);
}

export async function fetchMyAssessment(): Promise<OverviewAgent> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}/me/assessment`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    clearToken();
    throw new Error('Not authenticated');
  }
  if (!res.ok) throw new Error('Failed to load your assessment');
  return res.json();
}
