import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banner } from '../components/Banner';
import { RatingBadge } from '../components/RatingBadge';
import { fetchMyAssessment, logout, type OverviewAgent } from '../api/client';
import type { AssessmentCardDetail } from '../data/types';
import { formatScore } from '../utils/format';

const ASSESSMENT_CONFIG = [
  {
    key: 'callIQ' as const,
    title: 'Call IQ Test',
    weighting: '10%',
    description:
      'Before you ever pick up the phone, you need to hear what great looks like. This assessment requires you to complete 20 recorded call reviews using the Sales Call Review Framework provided.',
    getScore: (a: OverviewAgent) => a.callIQScore as number | null,
  },
  {
    key: 'acceleratorCheck' as const,
    title: 'The Accelerator Check',
    weighting: '40%',
    description: 'Total Quiz Score across the Accelerator course content.',
    getScore: (a: OverviewAgent) => a.totalQuizScore as number | null,
  },
  {
    key: 'rolePlayProficiency' as const,
    title: 'Role Play Proficiency',
    weighting: '50%',
    description: 'Live role play assessment of sales conversation proficiency.',
    getScore: (a: OverviewAgent) => a.rolePlayScore,
  },
];

function AssessmentCard({
  title,
  weighting,
  description,
  score,
  detail,
}: {
  title: string;
  weighting: string;
  description: string;
  score: number | null;
  detail: AssessmentCardDetail;
}) {
  return (
    <div className="assessment-card">
      <div className="assessment-score-tile">
        <div className={score === null ? 'assessment-score-blank' : 'assessment-score-value'}>
          {formatScore(score)}
        </div>
        <div className="assessment-score-caption">Total Score</div>
      </div>
      <div className="assessment-detail">
        <div className="assessment-title-row">
          <span className="assessment-title">{title}</span>
          <span className="assessment-weighting">Weighting: {weighting}</span>
          {detail.rating && <RatingBadge rating={detail.rating} />}
        </div>
        <div className="assessment-description">{description}</div>
        {detail.remarks && (
          <div className={detail.isPlaceholder ? 'assessment-remarks assessment-remarks--placeholder' : 'assessment-remarks'}>
            {detail.remarks}
          </div>
        )}
      </div>
    </div>
  );
}

export function MyAssessment() {
  const [agent, setAgent] = useState<OverviewAgent | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyAssessment()
      .then(setAgent)
      .catch(() => navigate('/login', { replace: true }));
  }, [navigate]);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  if (!agent) {
    return (
      <div className="page">
        <Banner variant="agent" title="FREEDOM ACADEMY ASSESSMENT" />
        <div className="state-message">Loading…</div>
      </div>
    );
  }

  return (
    <div className="page">
      <Banner variant="agent" title="FREEDOM ACADEMY ASSESSMENT" agentName={agent.name} onLogout={handleLogout} />
      <div className="page-body">
        <div className="score-summary-row">
          <div className="summary-card">
            <div className="summary-score">{formatScore(agent.overallScore)}</div>
            <div className="summary-score-label">Overall Assessment Score</div>
          </div>
          <div className="summary-card">
            <div className="summary-name">{agent.name}</div>
            <RatingBadge rating={agent.overallRating} />
            <div className="summary-remarks">{agent.overallRemarks}</div>
          </div>
        </div>

        <div className="assessment-cards">
          {ASSESSMENT_CONFIG.map((cfg) => (
            <AssessmentCard
              key={cfg.key}
              title={cfg.title}
              weighting={cfg.weighting}
              description={cfg.description}
              score={cfg.getScore(agent)}
              detail={agent.cards[cfg.key]}
            />
          ))}
        </div>

        <div className="footer">
          Data Last Updated: {new Date().toLocaleString()} | Privacy Policy
        </div>
      </div>
    </div>
  );
}
