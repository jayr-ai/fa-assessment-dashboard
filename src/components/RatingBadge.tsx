import type { Rating } from '../data/types';

const BG: Record<Rating, string> = {
  DISTINCTION: 'var(--rating-distinction)',
  PASS: 'var(--rating-pass)',
  'MASTERY IN MOTION': 'var(--rating-mastery)',
};

export function RatingBadge({ rating }: { rating: Rating }) {
  return (
    <span className="rating-badge" style={{ background: BG[rating] }}>
      {rating}
    </span>
  );
}
