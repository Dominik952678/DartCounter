import React, { useMemo, useState } from 'react';
import type { Profile, MatchHistory } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell } from 'recharts';
import { HeadToHead } from './HeadToHead';
import { DartboardHeatmap } from './DartboardHeatmap';

interface ProfileDashboardProps {
  profileName: string;
  profile: Profile;
  matches: MatchHistory[];
  allProfiles?: Record<string, Profile>;
  onUpdateProfile?: (name: string, updates: Partial<Profile>) => void;
  onDeleteProfile?: (name: string) => void;
  onClose: () => void;
}

export const ProfileDashboard: React.FC<ProfileDashboardProps> = ({ 
  profileName, 
  profile = { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 }, 
  matches = [], 
  allProfiles, 
  onUpdateProfile, 
  onDeleteProfile, 
  onClose 
}) => {
  const [compareWith, setCompareWith] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<string>('Alle (Standard)');

  const { 
    availableModes, overallAvg, first9Avg, checkoutQuote, last5Avg, last5First9, last5Checkout, 
    chartData, checkoutChartData, radarData, maxRadarHits, pieData,
    isMinigame, minigameAvgScore, minigameBestScore
  } = useMemo(() => {
    const safeMatches = Array.isArray(matches) ? matches : [];
    const playerMatchesTotal = safeMatches.filter(m => m && Array.isArray(m.players) && m.players.some(p => p && p.name === profileName));
    
    const modes = new Set<string>();
    modes.add('Alle (Standard)');
    playerMatchesTotal.forEach(m => {
        if (!m.gameType || m.gameType === 'standard') {
            if (m.config) modes.add(`Standard: ${m.config.startScore} ${m.config.outMode}`);
        } else {
            const map: Record<string, string> = {
              'powerScoring': 'Power Scoring',
              'splitScore': 'Split Score',
              'checkoutTraining': 'Checkout Training'
            };
            if (map[m.gameType]) modes.add(map[m.gameType]);
        }
    });
    const availableModes = Array.from(modes);

    const playerMatches = playerMatchesTotal
      .filter(m => {
         if (selectedMode === 'Alle (Standard)') return !m.gameType || m.gameType === 'standard';
         if (selectedMode === 'Power Scoring') return m.gameType === 'powerScoring';
         if (selectedMode === 'Split Score') return m.gameType === 'splitScore';
         if (selectedMode === 'Checkout Training') return m.gameType === 'checkoutTraining';
         if (selectedMode.startsWith('Standard:') && (!m.gameType || m.gameType === 'standard') && m.config) {
             return `Standard: ${m.config.startScore} ${m.config.outMode}` === selectedMode;
         }
         return false;
      })
      .reverse();

    const isMinigame = selectedMode !== 'Alle (Standard)' && !selectedMode.startsWith('Standard:');
    const checkoutQuote = (profile && profile.checkoutAttempts && profile.checkoutAttempts > 0)
      ? (((profile.checkoutSuccesses || 0) / profile.checkoutAttempts) * 100).toFixed(1) + "%" 
      : "–";

    let totalDarts = 0, totalPts = 0;
    let totalFirst9Darts = 0, totalFirst9Pts = 0;
    playerMatches.forEach(m => {
        const pStat = m.players?.find(p => p && p.name === profileName);
        if (!pStat) return;
        if (pStat.matchDarts) totalDarts += pStat.matchDarts;
        if (pStat.matchPts) totalPts += pStat.matchPts;
        if (pStat.first9Darts) totalFirst9Darts += pStat.first9Darts;
        if (pStat.first9Pts) totalFirst9Pts += pStat.first9Pts;
    });

    const overallAvg = totalDarts > 0 
      ? ((totalPts / totalDarts) * 3).toFixed(2) 
      : (profile?.dartsThrown && profile.dartsThrown > 0 ? (((profile.pointsScored || 0) / profile.dartsThrown) * 3).toFixed(2) : "0.00");
    const first9Avg = totalFirst9Darts > 0 
      ? ((totalFirst9Pts / totalFirst9Darts) * 3).toFixed(2) 
      : (profile?.first9Darts && profile.first9Darts > 0 ? (((profile.first9Pts || 0) / profile.first9Darts) * 3).toFixed(2) : "0.00");

    const last5 = playerMatches.slice(0, 5);
    let last5Darts = 0, last5Pts = 0;
    let last5First9Darts = 0, last5First9Pts = 0;
    let last5CheckAtt = 0, last5CheckSucc = 0;
    
    last5.forEach(m => {
        const pStat = m.players?.find(p => p && p.name === profileName);
        if (!pStat) return;
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

    const chartData = playerMatches.slice(0, 20).reverse().map((m, i) => {
        const pStat = m.players?.find(p => p && p.name === profileName);
        let val = 0;
        if (pStat) {
          if (isMinigame) {
              val = pStat.score || 0;
          } else {
              val = pStat.matchDarts ? (pStat.matchPts! / pStat.matchDarts) * 3 : parseFloat(pStat.avg || "0");
          }
        }
        return { name: `${i+1}`, val: parseFloat((val || 0).toFixed(2)) };
    });

    const checkoutChartData = isMinigame ? [] : playerMatches.slice(0, 20).reverse().map((m, i) => {
        const pStat = m.players?.find(p => p && p.name === profileName);
        const quote = (pStat && pStat.checkoutAttempts && pStat.checkoutAttempts > 0)
          ? ((pStat.checkoutSuccesses || 0) / pStat.checkoutAttempts) * 100 
          : 0;
        return { name: `${i+1}`, quote: parseFloat(quote.toFixed(1)) };
    });

    let minigameBestScore = 0;
    let minigameTotalScore = 0;
    if (isMinigame) {
        playerMatches.forEach(m => {
           const pStat = m.players?.find(p => p && p.name === profileName);
           if (pStat && pStat.score) {
               minigameTotalScore += pStat.score;
               if (pStat.score > minigameBestScore) minigameBestScore = pStat.score;
           }
        });
    }
    const minigameAvgScore = playerMatches.length > 0 ? Math.round(minigameTotalScore / playerMatches.length) : 0;

    const segmentHitsObj = profile?.segmentHits || {};
    const totalHits = Object.values(segmentHitsObj).reduce((sum, val) => sum + (val || 0), 0);

    const pieData: { name: string; value: number }[] = [];
    let restHits = 0;
    if (totalHits > 0) {
      Object.entries(segmentHitsObj).forEach(([seg, hits]) => {
        if (!hits || hits === 0) return;
        const percent = (hits / totalHits) * 100;
        if (percent >= 5) {
          const name = seg === "0" ? "Miss" : (seg === "25" ? "Bull" : seg);
          pieData.push({ name, value: hits });
        } else {
          restHits += hits;
        }
      });
      if (restHits > 0) {
        pieData.push({ name: "Rest", value: restHits });
      }
      pieData.sort((a, b) => b.value - a.value);
    }

    const radarData = [
      { subject: '20', hits: segmentHitsObj['20'] || 0 },
      { subject: '19', hits: segmentHitsObj['19'] || 0 },
      { subject: '18', hits: segmentHitsObj['18'] || 0 },
      { subject: '17', hits: segmentHitsObj['17'] || 0 },
      { subject: '16', hits: segmentHitsObj['16'] || 0 },
      { subject: '15', hits: segmentHitsObj['15'] || 0 },
      { subject: 'Bull', hits: segmentHitsObj['25'] || 0 },
    ];

    const maxRadarHits = Math.max(
      5,
      ...radarData.map(d => d.hits)
    );

    return { 
      availableModes, overallAvg, first9Avg, checkoutQuote, last5Avg, last5First9, last5Checkout, 
      chartData, checkoutChartData, radarData, maxRadarHits, pieData,
      isMinigame, minigameAvgScore, minigameBestScore
    };
  }, [profile, matches, profileName, selectedMode]);

  const winRate = (profile && profile.matches && profile.matches > 0) 
    ? (((profile.wins || 0) / profile.matches) * 100).toFixed(0) 
    : "0";

  return (
    <div className="profile-dashboard-inline">
      <div>
        {/* Header */}
        <div className="dash-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2>{profile?.isBot ? '🤖 ' : '👤 '}{profileName}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
              <select 
                value={selectedMode} 
                onChange={(e) => setSelectedMode(e.target.value)}
                style={{ background: '#2a2a2c', color: '#fff', border: '1px solid var(--card-border)', padding: '6px 10px', borderRadius: '8px', fontSize: '0.9em' }}
              >
                {availableModes.map((m: string) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} title="Schließen" style={{ fontSize: '1.2em', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Profile Settings */}
        {onUpdateProfile && profile && (
          <div className="dash-settings" style={{ marginBottom: '20px' }}>
            {profile.isBot && (
              <div className="dash-bot-level" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--surface)', padding: '10px', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.9em', color: 'var(--text-dim)' }}>Bot Level:</span>
                <select 
                  value={profile.targetAverage ? Math.max(1, Math.min(10, Math.round((profile.targetAverage - 20) / 10))) : 4}
                  onChange={(e) => onUpdateProfile(profileName, { targetAverage: parseInt(e.target.value) * 10 + 20 })}
                  style={{ background: '#2a2a2c', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', flex: 1 }}
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(l => (
                    <option key={l} value={l}>Level {l} · Avg ~{l*10 + 20}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="dash-color-picker" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--surface)', padding: '10px', borderRadius: '10px' }}>
              <span style={{ fontSize: '0.9em', color: 'var(--text-dim)' }}>Spielerfarbe:</span>
              <input 
                type="color" 
                value={profile.color || '#0a84ff'} 
                onChange={(e) => onUpdateProfile(profileName, { color: e.target.value })}
                style={{ width: '32px', height: '32px', padding: '0', border: 'none', borderRadius: '50%', cursor: 'pointer', background: 'transparent' }}
              />
              <span style={{ fontSize: '0.85em', color: profile.color || '#0a84ff', fontWeight: 'bold' }}>●</span>
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
        {!isMinigame ? (
          <>
            <div className="dash-stats-grid dash-stats-grid-4">
              <div className="dash-stat-card">
                <span className="dash-stat-label">Win Rate</span>
                <span className="dash-stat-value">{winRate}%</span>
                <span className="dash-stat-detail">{profile?.wins || 0}W / {profile?.matches || 0}G</span>
              </div>
              <div className="dash-stat-card">
                <span className="dash-stat-label">Best Leg</span>
                <span className="dash-stat-value">{profile?.bestLegDarts || '–'}</span>
                <span className="dash-stat-detail">Darts</span>
              </div>
              <div className="dash-stat-card">
                <span className="dash-stat-label">Best Finish</span>
                <span className="dash-stat-value">{profile?.highestCheckout || '–'}</span>
                <span className="dash-stat-detail">Checkout</span>
              </div>
              <div className="dash-stat-card">
                <span className="dash-stat-label">Best Throw</span>
                <span className="dash-stat-value">{profile?.highestThrow || '–'}</span>
                <span className="dash-stat-detail">3 Darts</span>
              </div>
            </div>

            {/* Highlights */}
            <div className="dash-section" style={{ marginTop: '20px' }}>
              <h3>Highlights</h3>
              <div className="dash-stats-grid dash-stats-grid-4">
                <div className="dash-stat-card">
                  <span className="dash-stat-label">180s</span>
                  <span className="dash-stat-value accent-orange">{profile?.oneEighty || 0}</span>
                </div>
                <div className="dash-stat-card">
                  <span className="dash-stat-label">Triple Quote</span>
                  <span className="dash-stat-value">
                    {profile?.triplesHit && profile?.dartsThrown ? ((profile.triplesHit / profile.dartsThrown) * 100).toFixed(1) + '%' : '–'}
                  </span>
                </div>
                <div className="dash-stat-card">
                  <span className="dash-stat-label">140+</span>
                  <span className="dash-stat-value">{profile?.oneFortyPlus || 0}</span>
                </div>
                <div className="dash-stat-card">
                  <span className="dash-stat-label">100+</span>
                  <span className="dash-stat-value">{profile?.hundredPlus || 0}</span>
                </div>
              </div>
            </div>

            {/* Segment-Verteilung: Kuchenstatistik & Radar nebeneinander */}
            <div className="dash-section" style={{ marginTop: '20px' }}>
              <h3>Segment-Verteilung</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                {pieData.length > 0 && (
                  <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                    <div style={{ position: 'relative', width: '100%', height: '180px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            paddingAngle={3}
                            stroke="none"
                          >
                            {pieData.map((entry: { name: string; value: number }, index: number) => {
                               const colors = ['#00d26a', '#0a84ff', '#ff9f0a', '#ff375f', '#bf5af2', '#5e5ce6', '#32ade6', '#ffd60a', '#ff453a', '#8e8e93'];
                               const fill = entry.name === 'Rest' ? '#636366' : colors[index % colors.length];
                               return <Cell key={`cell-${index}`} fill={fill} />;
                            })}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1a1a1c', border: '1px solid var(--card-border)', borderRadius: '8px' }} 
                            itemStyle={{ color: '#fff' }}
                            formatter={(value: any, name: any) => {
                              const total = pieData.reduce((s: number, e: { value: number }) => s + e.value, 0);
                              const pct = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : '0';
                              return [`${value} Treffer (${pct}%)`, name];
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                        <div style={{ fontSize: '1.2em', fontWeight: 800, color: 'var(--text)' }}>
                          {pieData.reduce((s: number, e: { value: number }) => s + e.value, 0)}
                        </div>
                        <div style={{ fontSize: '0.7em', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Hits
                        </div>
                      </div>
                    </div>

                    {/* Clean readable Legend Badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginTop: '12px', width: '100%' }}>
                      {pieData.map((entry: { name: string; value: number }, idx: number) => {
                        const total = pieData.reduce((s: number, e: { value: number }) => s + e.value, 0);
                        const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
                        const colors = ['#00d26a', '#0a84ff', '#ff9f0a', '#ff375f', '#bf5af2', '#5e5ce6', '#32ade6', '#ffd60a', '#ff453a', '#8e8e93'];
                        const color = entry.name === 'Rest' ? '#636366' : colors[idx % colors.length];
                        return (
                          <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.82em' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, display: 'inline-block' }} />
                            <span style={{ fontWeight: 600 }}>{entry.name}:</span>
                            <span style={{ color: 'var(--text-dim)' }}>{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                  <div style={{ height: '220px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="var(--card-border)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-dim)', fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, maxRadarHits]} tick={false} axisLine={false} />
                        <Radar name={profileName} dataKey="hits" stroke={profile?.color || 'var(--blue)'} fill={profile?.color || 'var(--blue)'} fillOpacity={0.4} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* 2D Dartboard Heatmap */}
            <div style={{ marginTop: '20px' }}>
              <DartboardHeatmap profile={profile} />
            </div>

            {/* Mini-Games Stats */}
            <div className="dash-section" style={{ marginTop: '20px' }}>
              <h3>Mini-Games</h3>
              <div className="dash-stats-grid dash-stats-grid-3">
                <div className="dash-stat-card">
                  <span className="dash-stat-label">Power Scoring</span>
                  <span className="dash-stat-value">{profile?.powerScoring?.bestScore || '–'}</span>
                  <span className="dash-stat-detail">
                    {profile?.powerScoring?.totalScore && profile?.powerScoring?.matchesPlayed ? 
                    `Ø ${Math.round(profile.powerScoring.totalScore / profile.powerScoring.matchesPlayed)} | ` : ''}
                    {profile?.powerScoring?.wins || 0}W
                  </span>
                </div>
                <div className="dash-stat-card">
                  <span className="dash-stat-label">Split Score</span>
                  <span className="dash-stat-value">{profile?.splitScore?.bestScore || '–'}</span>
                  <span className="dash-stat-detail">
                    {profile?.splitScore?.totalScore && profile?.splitScore?.matchesPlayed ? 
                    `Ø ${Math.round(profile.splitScore.totalScore / profile.splitScore.matchesPlayed)} | ` : ''}
                    {profile?.splitScore?.wins || 0}W
                  </span>
                </div>
                <div className="dash-stat-card">
                  <span className="dash-stat-label">Checkout Training</span>
                  <span className="dash-stat-value">{profile?.checkoutTraining?.bestCheckout || '–'}</span>
                  <span className="dash-stat-detail">
                    {profile?.checkoutTraining?.totalAttempts && profile?.checkoutTraining.totalAttempts > 0 ? 
                    `${Math.round(((profile.checkoutTraining.roundsCompleted || 0) / profile.checkoutTraining.totalAttempts) * 100)}% Quote` 
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
          </>
        ) : (
          <div className="dash-stats-grid dash-stats-grid-2">
            <div className="dash-stat-card">
              <span className="dash-stat-label">Best Score</span>
              <span className="dash-stat-value">{minigameBestScore}</span>
              <span className="dash-stat-detail">{selectedMode}</span>
            </div>
            <div className="dash-stat-card">
                <span className="dash-stat-label">Average Score</span>
              <span className="dash-stat-value">{minigameAvgScore}</span>
              <span className="dash-stat-detail">Ø pro Spiel</span>
            </div>
          </div>
        )}

        {/* Average / Score Chart */}
        {chartData.length > 0 ? (
          <div className="dash-section">
            <h3>{isMinigame ? 'Punkte-Verlauf' : 'Average-Verlauf'}</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" stroke="#555" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#555" tick={{ fontSize: 11 }} domain={isMinigame ? ['auto', 'auto'] : ['dataMin - 5', 'dataMax + 5']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    labelStyle={{ color: '#999' }}
                    formatter={(val: any) => [val, isMinigame ? 'Punkte (Score)' : '3-Dart Average']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="val" 
                    name={isMinigame ? "Punkte (Score)" : "3-Dart Average"} 
                    stroke="#0a84ff" 
                    strokeWidth={2.5} 
                    dot={{ fill: '#0a84ff', r: 3, strokeWidth: 0 }} 
                    activeDot={{ r: 5, fill: '#0a84ff' }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--card-border)', color: 'var(--text-dim)', margin: '15px 0' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>🎯</div>
            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem' }}>Noch keine Matches in diesem Modus</div>
            <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>Starte dein erstes Spiel, um deine Formkurve und Treffer aufzuzeichnen!</div>
          </div>
        )}

        {/* Checkout-Quote Chart */}
        {checkoutChartData.length > 0 && (
          <div className="dash-section">
            <h3>Checkout-Verlauf (%)</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={checkoutChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" stroke="#555" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#555" tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    labelStyle={{ color: '#999' }}
                    formatter={(val: any) => [`${val}%`, 'Quote']}
                  />
                  <Line type="monotone" dataKey="quote" stroke="#ff3b30" strokeWidth={2.5} dot={{ fill: '#ff3b30', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#ff3b30' }} />
                </LineChart>
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

