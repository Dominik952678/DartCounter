import React, { useMemo, useState } from 'react';
import type { Profile, MatchHistory } from '../types';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { HeadToHead } from './HeadToHead';

interface ProfileDashboardProps {
  profileName: string;
  profile: Profile;
  matches: MatchHistory[];
  allProfiles?: Record<string, Profile>;
  onUpdateProfile?: (name: string, updates: Partial<Profile>) => void;
  onDeleteProfile?: (name: string) => void;
  onClose: () => void;
}

export const ProfileDashboard: React.FC<ProfileDashboardProps> = ({ profileName, profile, matches, allProfiles, onUpdateProfile, onDeleteProfile, onClose }) => {
  const [compareWith, setCompareWith] = useState<string>('');

  const { overallAvg, first9Avg, checkoutQuote, last5Avg, last5First9, last5Checkout, chartData, segmentData, radarData } = useMemo(() => {
    const overallAvg = profile.dartsThrown > 0 ? ((profile.pointsScored / profile.dartsThrown) * 3).toFixed(2) : "–";
    const first9Avg = profile.first9Darts && profile.first9Darts > 0 ? ((profile.first9Pts! / profile.first9Darts) * 3).toFixed(2) : "–";
    const checkoutQuote = profile.checkoutAttempts && profile.checkoutAttempts > 0 
      ? (((profile.checkoutSuccesses || 0) / profile.checkoutAttempts) * 100).toFixed(1) + "%" 
      : "–";

    const playerMatches = matches
      .filter(m => m.players.some(p => p.name === profileName))
      .reverse();

    const last5 = playerMatches.slice(0, 5);
    let last5Darts = 0, last5Pts = 0;
    let last5First9Darts = 0, last5First9Pts = 0;
    let last5CheckAtt = 0, last5CheckSucc = 0;
    
    last5.forEach(m => {
        const pStat = m.players.find(p => p.name === profileName)!;
        if (pStat.matchDarts) last5Darts += pStat.matchDarts;
        if (pStat.matchPts) last5Pts += pStat.matchPts;
        if (pStat.first9Darts) last5First9Darts += pStat.first9Darts;
        if (pStat.first9Pts) last5First9Pts += pStat.first9Pts;
        if (pStat.checkoutAttempts) last5CheckAtt += pStat.checkoutAttempts;
        if (pStat.checkoutSuccesses) last5CheckSucc += pStat.checkoutSuccesses;
    });

    const last5Avg = last5Darts > 0 ? ((last5Pts / last5Darts) * 3).toFixed(2) : "–";
    const last5First9 = last5First9Darts > 0 ? ((last5First9Pts / last5First9Darts) * 3).toFixed(2) : "–";
    const last5Checkout = last5CheckAtt > 0 ? ((last5CheckSucc / last5CheckAtt) * 100).toFixed(1) + "%" : "–";

    const chartData = playerMatches.slice(0, 15).reverse().map((m, i) => {
        const pStat = m.players.find(p => p.name === profileName)!;
        const avg = pStat.matchDarts ? (pStat.matchPts! / pStat.matchDarts) * 3 : parseFloat(pStat.avg);
        return { name: `${i+1}`, avg: parseFloat(avg.toFixed(2)) };
    });

    const segmentData = Object.entries(profile.segmentHits || {})
      .map(([segment, hits]) => ({ name: segment === "0" ? "Miss" : (segment === "25" ? "Bull" : segment), hits }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10);

    const radarData = [
      { subject: '20', hits: profile.segmentHits?.['20'] || 0 },
      { subject: '19', hits: profile.segmentHits?.['19'] || 0 },
      { subject: '18', hits: profile.segmentHits?.['18'] || 0 },
      { subject: '17', hits: profile.segmentHits?.['17'] || 0 },
      { subject: '16', hits: profile.segmentHits?.['16'] || 0 },
      { subject: '15', hits: profile.segmentHits?.['15'] || 0 },
      { subject: 'Bull', hits: profile.segmentHits?.['25'] || 0 },
    ];

    return { overallAvg, first9Avg, checkoutQuote, last5Avg, last5First9, last5Checkout, chartData, segmentData, radarData };
  }, [profile, matches, profileName]);

  const winRate = profile.matches > 0 ? ((profile.wins / profile.matches) * 100).toFixed(0) : "0";

  return (
    <div className="profile-dashboard-inline">
      <div>
        {/* Header */}
        <div className="dash-header">
          <div>
            <h2>{profile.isBot ? '🤖 ' : ''}{profileName}</h2>
            <span className="dash-subtitle">Statistiken & Analyse</span>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {/* Profile Settings */}
        {onUpdateProfile && (
          <div className="dash-settings">
            {profile.isBot && (
              <div className="dash-bot-level" style={{ marginBottom: '10px' }}>
                <span style={{ marginRight: '10px', fontSize: '0.9em', color: '#999' }}>Bot Level</span>
                <select 
                  value={profile.targetAverage ? Math.max(1, Math.min(10, Math.round((profile.targetAverage - 20) / 10))) : 4}
                  onChange={(e) => onUpdateProfile(profileName, { targetAverage: parseInt(e.target.value) * 10 + 20 })}
                  style={{ background: '#2a2a2c', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px' }}
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(l => (
                    <option key={l} value={l}>Level {l} · Avg {l*10 + 20}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="dash-color-picker" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.9em', color: '#999' }}>Spielerfarbe:</span>
              <input 
                type="color" 
                value={profile.color || '#0a84ff'} 
                onChange={(e) => onUpdateProfile(profileName, { color: e.target.value })}
                style={{ width: '30px', height: '30px', padding: '0', border: 'none', borderRadius: '50%', cursor: 'pointer', background: 'transparent' }}
              />
            </div>
          </div>
        )}

        {/* Head-to-Head Select */}
        {allProfiles && Object.keys(allProfiles).length > 1 && (
          <div className="dash-section" style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Head-to-Head Vergleich</h3>
              <select 
                value={compareWith}
                onChange={(e) => setCompareWith(e.target.value)}
                style={{ background: '#2a2a2c', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px' }}
              >
                <option value="">Wähle Gegner...</option>
                {Object.keys(allProfiles).filter(p => p !== profileName).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            
            {compareWith && allProfiles[compareWith] && (
              <div style={{ marginTop: '15px' }}>
                <HeadToHead 
                  profileA={{ name: profileName, profile }} 
                  profileB={{ name: compareWith, profile: allProfiles[compareWith] }}
                  onClose={() => setCompareWith('')}
                />
              </div>
            )}
          </div>
        )}

        {/* Key Stats */}
        <div className="dash-stats-grid">
          <div className="dash-stat-card">
            <span className="dash-stat-label">Win Rate</span>
            <span className="dash-stat-value">{winRate}%</span>
            <span className="dash-stat-detail">{profile.wins}W / {profile.matches}G</span>
          </div>
          <div className="dash-stat-card">
            <span className="dash-stat-label">Best Leg</span>
            <span className="dash-stat-value">{profile.bestLegDarts || '–'}</span>
            <span className="dash-stat-detail">Darts</span>
          </div>
          <div className="dash-stat-card">
            <span className="dash-stat-label">Best Finish</span>
            <span className="dash-stat-value">{profile.highestCheckout || '–'}</span>
            <span className="dash-stat-detail">Checkout</span>
          </div>
          <div className="dash-stat-card">
            <span className="dash-stat-label">Best Throw</span>
            <span className="dash-stat-value">{profile.highestThrow || '–'}</span>
            <span className="dash-stat-detail">3 Darts</span>
          </div>
        </div>

        {/* Highlights */}
        <div className="dash-section" style={{ marginTop: '20px' }}>
          <h3>Highlights</h3>
          <div className="dash-stats-grid">
            <div className="dash-stat-card">
              <span className="dash-stat-label">180s</span>
              <span className="dash-stat-value accent-orange">{profile.oneEighty || 0}</span>
            </div>
            <div className="dash-stat-card">
              <span className="dash-stat-label">140+</span>
              <span className="dash-stat-value">{profile.oneFortyPlus || 0}</span>
            </div>
            <div className="dash-stat-card">
              <span className="dash-stat-label">100+</span>
              <span className="dash-stat-value">{profile.hundredPlus || 0}</span>
            </div>
          </div>
        </div>

        {/* Segment Radar */}
        <div className="dash-section" style={{ marginTop: '20px' }}>
          <h3>Segment-Präzision</h3>
          <div className="card" style={{ height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="var(--card-border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-dim)', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={false} axisLine={false} />
                <Radar name={profileName} dataKey="hits" stroke={profile.color || 'var(--blue)'} fill={profile.color || 'var(--blue)'} fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mini-Games Stats */}
        <div className="dash-section" style={{ marginTop: '20px' }}>
          <h3>Mini-Games</h3>
          <div className="dash-stats-grid">
            <div className="dash-stat-card">
              <span className="dash-stat-label">Power Scoring</span>
              <span className="dash-stat-value">{profile.powerScoring?.bestScore || '–'}</span>
              <span className="dash-stat-detail">
                {profile.powerScoring?.totalScore && profile.powerScoring?.matchesPlayed ? 
                 `Ø ${Math.round(profile.powerScoring.totalScore / profile.powerScoring.matchesPlayed)} | ` : ''}
                {profile.powerScoring?.wins || 0}W
              </span>
            </div>
            <div className="dash-stat-card">
              <span className="dash-stat-label">Split Score</span>
              <span className="dash-stat-value">{profile.splitScore?.bestScore || '–'}</span>
              <span className="dash-stat-detail">
                {profile.splitScore?.totalScore && profile.splitScore?.matchesPlayed ? 
                 `Ø ${Math.round(profile.splitScore.totalScore / profile.splitScore.matchesPlayed)} | ` : ''}
                {profile.splitScore?.wins || 0}W
              </span>
            </div>
            <div className="dash-stat-card">
              <span className="dash-stat-label">Checkout Training</span>
              <span className="dash-stat-value">{profile.checkoutTraining?.bestCheckout || '–'}</span>
              <span className="dash-stat-detail">
                {profile.checkoutTraining?.totalAttempts && profile.checkoutTraining.totalAttempts > 0 ? 
                 `${Math.round((profile.checkoutTraining.roundsCompleted / profile.checkoutTraining.totalAttempts) * 100)}% Quote` 
                 : 'Best Out'}
              </span>
            </div>
          </div>
        </div>

        {/* Form Curve */}
        <div className="dash-section">
          <h3>Formkurve</h3>
          <div className="form-curve-grid">
            <div className="form-curve-item">
              <span className="curve-label">Average</span>
              <span className="curve-value">{overallAvg}</span>
              <span className="curve-recent">L5: {last5Avg}</span>
            </div>
            <div className="form-curve-item">
              <span className="curve-label">First 9</span>
              <span className="curve-value">{first9Avg}</span>
              <span className="curve-recent">L5: {last5First9}</span>
            </div>
            <div className="form-curve-item">
              <span className="curve-label">Checkout</span>
              <span className="curve-value">{checkoutQuote}</span>
              <span className="curve-recent">L5: {last5Checkout}</span>
            </div>
          </div>
        </div>

        {/* Average Chart */}
        {chartData.length > 0 && (
          <div className="dash-section">
            <h3>Average-Verlauf</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" stroke="#555" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#555" tick={{ fontSize: 11 }} domain={['dataMin - 5', 'dataMax + 5']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    labelStyle={{ color: '#999' }}
                  />
                  <Line type="monotone" dataKey="avg" stroke="#0a84ff" strokeWidth={2.5} dot={{ fill: '#0a84ff', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#0a84ff' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Segment Distribution */}
        {segmentData.length > 0 && (
          <div className="dash-section">
            <h3>Segment-Verteilung</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={segmentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" stroke="#555" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#555" tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    formatter={(val: any) => [`${val}×`, 'Treffer']}
                  />
                  <Bar dataKey="hits" fill="#00d26a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Delete */}
        {onDeleteProfile && (
          <button 
            className="btn-delete-profile"
            onClick={() => {
              if (window.confirm(`„${profileName}" unwiderruflich löschen?`)) {
                onDeleteProfile(profileName);
                onClose();
              }
            }}
          >
            Profil löschen
          </button>
        )}
        
        
      </div>
    </div>
  );
};
