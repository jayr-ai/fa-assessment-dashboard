export type Rating = 'DISTINCTION' | 'PASS' | 'MASTERY IN MOTION';

export interface AssessmentCardDetail {
  /** Assessment-level rating tier. Null when not shown in source (Call IQ card) or unconfirmed for this agent. */
  rating: Rating | null;
  /** Assessment-level remark copy. Null when not shown in source or unconfirmed for this agent. */
  remarks: string | null;
  /** True when rating/remarks are an intentional placeholder pending sheet confirmation (see README). */
  isPlaceholder: boolean;
}

export interface AgentAssessment {
  id: string;
  name: string;
  /** Null when the email wasn't captured / is unconfirmed — see README "Data caveats". */
  email: string | null;
  /** Set when the email value is a known data-quality quirk or truncation, not a typo. */
  emailNote?: string;
  overallRating: Rating;
  callIQScore: number;
  totalQuizScore: number;
  /** Null represents a blank cell in the source sheet ("–"), not a zero score. */
  rolePlayScore: number | null;
  overallScore: number;
  /** Whether a personal-view login account has been provisioned for this agent (mock: true for all seeded agents). */
  accountProvisioned: boolean;
  cards: {
    callIQ: AssessmentCardDetail;
    acceleratorCheck: AssessmentCardDetail;
    rolePlayProficiency: AssessmentCardDetail;
  };
}

export const RATING_COLORS: Record<Rating, string> = {
  DISTINCTION: '#22c55e',
  PASS: '#f59e0b',
  'MASTERY IN MOTION': '#ef4444',
};

export const OVERALL_REMARKS: Record<Rating, string> = {
  'MASTERY IN MOTION': 'You are not there yet. Go back, do the work, and re-sit.',
  PASS: 'You have earned your place. Keep refining.',
  DISTINCTION: 'You are ready!',
};
