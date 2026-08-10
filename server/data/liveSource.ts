import type { AgentAssessment } from '../../src/data/types';

export interface LiveAgentAssessment extends AgentAssessment {
  overallRemarks: string;
}

// Populated by apps-script/SyncAssessmentsToGitHub.gs, which the sheet owner pastes into
// Extensions > Apps Script and authorizes themselves — see ../../APPS_SCRIPT_SETUP.md.
const REPO = process.env.LIVE_DATA_REPO ?? 'jayr-ai/fa-assessment-dashboard';
const BRANCH = process.env.LIVE_DATA_BRANCH ?? 'main';
const JSON_PATH = 'data/assessments.json';
const LIVE_DATA_URL = process.env.LIVE_DATA_URL
  ?? `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${JSON_PATH}`;

const CACHE_TTL_MS = 60_000;
let cache: { data: LiveAgentAssessment[]; fetchedAt: number } | null = null;

export async function loadLiveAssessments(): Promise<LiveAgentAssessment[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  const res = await fetch(LIVE_DATA_URL, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(
      `Live assessment data not found at ${LIVE_DATA_URL} (HTTP ${res.status}). ` +
      'Has the Apps Script sync run yet? See APPS_SCRIPT_SETUP.md.'
    );
  }

  const data = (await res.json()) as LiveAgentAssessment[];
  cache = { data, fetchedAt: Date.now() };
  return data;
}

export async function findLiveAgentById(id: string): Promise<LiveAgentAssessment | undefined> {
  const agents = await loadLiveAssessments();
  return agents.find((a) => a.id === id);
}
