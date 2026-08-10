import type { AgentAssessment, Rating } from './types';

/**
 * Snapshot pulled from the live Looker Studio report + AssessmentDash sheet on 2026-08-10.
 * PLACEHOLDER SHAPE/EXAMPLE DATA ONLY — reconcile against the real sheet before going live.
 * See README "Assumptions & open questions" for every caveat referenced below.
 */

const PLACEHOLDER_CARD_NOTE = '[TODO: confirm from sheet]';

interface RawAgent {
  name: string;
  email: string | null;
  emailNote?: string;
  rating: Rating;
  callIQ: number;
  totalQuiz: number;
  rolePlay: number | null;
}

const RAW_AGENTS: RawAgent[] = [
  { name: 'Briony Evans', email: 'briony@beingactivefitness.com.au', rating: 'MASTERY IN MOTION', callIQ: 0, totalQuiz: 98, rolePlay: null },
  {
    name: 'David Thorpe',
    email: 'david.thorpe@talkingwithnumbers.c…',
    emailNote: 'Email domain truncated in source capture ("talkingwithnumbers.c…") — confirm exact domain before use.',
    rating: 'PASS',
    callIQ: 0,
    totalQuiz: 94,
    rolePlay: 92,
  },
  { name: 'Jason Besters', email: 'jasonbesters@gmail.com', rating: 'PASS', callIQ: 0, totalQuiz: 97, rolePlay: 87 },
  { name: 'Jayvee Respeto', email: 'jayvee.respeto@miyagi.coach', rating: 'DISTINCTION', callIQ: 100, totalQuiz: 100, rolePlay: 88 },
  { name: 'Jeremie Bradshaw', email: 'jeremie@jrco.com.au', rating: 'MASTERY IN MOTION', callIQ: 0, totalQuiz: 100, rolePlay: null },
  {
    name: 'Joey test',
    email: 'joey.wong@freedomacademy.com…',
    emailNote: 'Sheet shows this email against the name "Joey test" — a data-quality quirk in the source, not a capture typo. Replicated as-is.',
    rating: 'MASTERY IN MOTION',
    callIQ: 90,
    totalQuiz: 30,
    rolePlay: 80,
  },
  {
    name: 'Joey wong',
    email: null,
    emailNote: 'Email not captured — row was scrolled off screen during the source pull. Confirm before using.',
    rating: 'MASTERY IN MOTION',
    callIQ: 0,
    totalQuiz: 64,
    rolePlay: null,
  },
  { name: 'Michelle Libert', email: 'michlibert@outlook.com', rating: 'PASS', callIQ: 0, totalQuiz: 99, rolePlay: 87 },
  { name: 'Nate Jones', email: 'nategingerjones@gmail.com', rating: 'PASS', callIQ: 0, totalQuiz: 98, rolePlay: 68 },
  { name: 'Nelson Lopera', email: 'nelcorpservices@gmail.com', rating: 'PASS', callIQ: 0, totalQuiz: 94, rolePlay: 93 },
  { name: 'Nik Toth', email: 'nikolett.toth@miyagi.coach', rating: 'MASTERY IN MOTION', callIQ: 0, totalQuiz: 8, rolePlay: null },
  { name: 'Renee Beal', email: 'renee.crystalhealing@gmail.com', rating: 'MASTERY IN MOTION', callIQ: 0, totalQuiz: 100, rolePlay: null },
  { name: 'Russell Keddie', email: 'rustyrover72@yahoo.com.au', rating: 'MASTERY IN MOTION', callIQ: 0, totalQuiz: 90, rolePlay: null },
];

/**
 * Overall score formula OBSERVED, not confirmed against the sheet:
 * 0.10 * Call IQ + 0.40 * Total Quiz + 0.50 * Role Play (Role Play term dropped entirely, not zeroed,
 * when Role Play is blank — this matched every row we could check, e.g. Briony 0.10*0 + 0.40*98 = 39.2 -> 39).
 * Flag as inferred, per README.
 */
function computeOverallScore(callIQ: number, totalQuiz: number, rolePlay: number | null): number {
  const score = rolePlay === null
    ? 0.10 * callIQ + 0.40 * totalQuiz
    : 0.10 * callIQ + 0.40 * totalQuiz + 0.50 * rolePlay;
  return Math.round(score);
}

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Only David Thorpe's personal page was captured with full per-assessment rating/remarks.
const CONFIRMED_ACCELERATOR_REMARKS: Record<string, string> = {
  DISTINCTION: "You didn't just watch it. You absorbed it.",
};
const CONFIRMED_ROLEPLAY_REMARKS: Record<string, string> = {
  DISTINCTION: 'You performed like someone ready for a live prospect.',
};

function buildAgent(raw: RawAgent): AgentAssessment {
  const overallScore = computeOverallScore(raw.callIQ, raw.totalQuiz, raw.rolePlay);

  // Assessment-level tiers are separate from the overall rating and only confirmed for David Thorpe
  // (Accelerator Check / Role Play both DISTINCTION at 94 / 92 respectively). Everyone else is a placeholder.
  const isDavidThorpe = raw.name === 'David Thorpe';

  return {
    id: slugify(raw.name),
    name: raw.name,
    email: raw.email,
    emailNote: raw.emailNote,
    overallRating: raw.rating,
    callIQScore: raw.callIQ,
    totalQuizScore: raw.totalQuiz,
    rolePlayScore: raw.rolePlay,
    overallScore,
    accountProvisioned: true,
    cards: {
      callIQ: {
        // No Rating/Remarks shown for this card in the source, for any agent — replicated as-is.
        rating: null,
        remarks: null,
        isPlaceholder: false,
      },
      acceleratorCheck: isDavidThorpe
        ? { rating: 'DISTINCTION', remarks: CONFIRMED_ACCELERATOR_REMARKS.DISTINCTION, isPlaceholder: false }
        : { rating: null, remarks: PLACEHOLDER_CARD_NOTE, isPlaceholder: true },
      rolePlayProficiency: isDavidThorpe
        ? { rating: 'DISTINCTION', remarks: CONFIRMED_ROLEPLAY_REMARKS.DISTINCTION, isPlaceholder: false }
        : { rating: null, remarks: PLACEHOLDER_CARD_NOTE, isPlaceholder: true },
    },
  };
}

export const mockAssessments: AgentAssessment[] = RAW_AGENTS
  .map(buildAgent)
  .sort((a, b) => a.name.localeCompare(b.name));

export function getAgentById(id: string): AgentAssessment | undefined {
  return mockAssessments.find((a) => a.id === id);
}
