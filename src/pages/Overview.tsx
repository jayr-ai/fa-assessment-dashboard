import { useEffect, useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Banner } from '../components/Banner';
import { RatingBadge } from '../components/RatingBadge';
import { fetchOverview, type OverviewAgent } from '../api/client';
import type { Rating } from '../data/types';

type SortDir = 'asc' | 'desc';

const DONUT_COLORS: Record<Rating, string> = {
  'MASTERY IN MOTION': '#3b82f6',
  PASS: '#f59e0b',
  DISTINCTION: '#a855f7',
};

export function Overview() {
  const [agents, setAgents] = useState<OverviewAgent[] | null>(null);
  const [dataLastUpdated, setDataLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    fetchOverview()
      .then((data) => {
        setAgents(data.agents);
        setDataLastUpdated(data.dataLastUpdated);
      })
      .catch((e) => setError(e.message));
  }, []);

  const sortedAgents = useMemo(() => {
    if (!agents) return [];
    const copy = [...agents];
    copy.sort((a, b) => (sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
    return copy;
  }, [agents, sortDir]);

  const stats = useMemo(() => {
    if (!agents) return null;
    const total = agents.length;
    const distinction = agents.filter((a) => a.overallRating === 'DISTINCTION').length;
    const pass = agents.filter((a) => a.overallRating === 'PASS').length;
    const mastery = agents.filter((a) => a.overallRating === 'MASTERY IN MOTION').length;
    const passingRate = total > 0 ? ((pass + distinction) / total) * 100 : 0;
    return { total, distinction, pass, mastery, passingRate };
  }, [agents]);

  const donutData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'MASTERY IN MOTION', value: stats.mastery },
      { name: 'PASS', value: stats.pass },
      { name: 'DISTINCTION', value: stats.distinction },
    ].filter((d) => d.value > 0);
  }, [stats]);

  return (
    <div className="page">
      <Banner variant="overview" title="FREEDOM ACADEMY ASSESSMENT OVERVIEW" />
      <div className="page-body">
        {error && <div className="state-message">Couldn't load overview data: {error}</div>}
        {!error && !agents && <div className="state-message">Loading…</div>}

        {agents && stats && (
          <>
            <div className="kpi-row">
              <div className="kpi-card">
                <div className="kpi-value">{stats.total}</div>
                <div className="kpi-label">Total Takers</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-value" style={{ color: 'var(--rating-distinction)' }}>{stats.distinction}</div>
                <div className="kpi-label">Distinction</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-value" style={{ color: 'var(--rating-pass)' }}>{stats.pass}</div>
                <div className="kpi-label">Pass</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-value" style={{ color: 'var(--rating-mastery)' }}>{stats.mastery}</div>
                <div className="kpi-label">Mastery in Motion</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-value">{stats.passingRate.toFixed(1)}%</div>
                <div className="kpi-label">Passing Rate</div>
              </div>
              <div className="donut-card">
                <div style={{ width: 90, height: 90, flexShrink: 0 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={26} outerRadius={42} paddingAngle={2}>
                        {donutData.map((d) => (
                          <Cell key={d.name} fill={DONUT_COLORS[d.name as Rating]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="donut-legend">
                  {donutData.map((d) => (
                    <div className="donut-legend-item" key={d.name}>
                      <span className="donut-swatch" style={{ background: DONUT_COLORS[d.name as Rating] }} />
                      <span>{d.name} ({((d.value / stats.total) * 100).toFixed(1)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="overview-toolbar">
              <span className="overview-heading">Results</span>
            </div>

            <div className="table-card">
              <table>
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}>
                      Name {sortDir === 'asc' ? '▲' : '▼'}
                    </th>
                    <th>Overall Rating</th>
                    <th>Overall Remarks</th>
                    <th>Personal Dashboard</th>
                    <th>Call IQ Test Score</th>
                    <th>Total Quiz Score</th>
                    <th>Role Play Proficiency Score</th>
                    <th>Overall Freedom Assessment Score</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAgents.map((a) => (
                    <tr key={a.id}>
                      <td>{a.name}</td>
                      <td><RatingBadge rating={a.overallRating} /></td>
                      <td className="remarks-cell">{a.overallRemarks}</td>
                      <td className="link-cell">
                        {a.accountProvisioned ? (
                          <span className="account-status account-status--created">Account created</span>
                        ) : (
                          <span className="account-status account-status--pending">Not yet invited</span>
                        )}
                      </td>
                      <td>{a.callIQScore}</td>
                      <td>{a.totalQuizScore}</td>
                      <td>{a.rolePlayScore === null ? '–' : a.rolePlayScore}</td>
                      <td className="overall-score-cell">{a.overallScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="footer" style={{ border: 'none', marginTop: 18 }}>
              Data Last Updated: {dataLastUpdated ? new Date(dataLastUpdated).toLocaleString() : '—'}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
