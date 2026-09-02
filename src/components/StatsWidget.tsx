import React, { useMemo } from 'react';
import type { MatchHistory, Profile } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { DartboardHeatmap } from './DartboardHeatmap';

interface StatsWidgetProps {
  title: string;
  mode: string;
  isOnline: boolean;
  matches: MatchHistory[];
  profileName: string;
  baseProfile?: Profile;
  onPlay: () => void;
  playLabel: string;
}

export const StatsWidget: React.FC<StatsWidgetProps> = ({ title, mode, isOnline, matches, profileName, baseProfile, onPlay, playLabel }) => {
  const { 
    winRate, matchesPlayed, overallAvg, first9Avg, checkoutQuote, last5Avg, last5First9, last5Checkout, 
    chartData, pieData, radarData, maxRadarHits, isMinigame, minigameAvgScore, minigameBestScore, avgDartsPerLeg,
    tripleQuote, targetScore, displaySegmentHits
  } = useMemo(() => {
    // Filter by online/offline
    let relevantMatches = matches.filter(m => (m.isOnline === true) === isOnline);

    // If Offline, include legacy matches (isOnline undefined)
    if (!isOnline) {
      relevantMatches = matches.filter(m => !m.isOnline);
    }

    // Filter by mode
    const playerMatches = relevantMatches
      .filter(m => m.players.some(p => p.name === profileName))
      .filter(m => {
         if (mode === 'Alle (Standard)') return !m.gameType || m.gameType === 'standard';
         if (mode === 'Power Scoring') return m.gameType === 'powerScoring';
         if (mode === 'Split Score') return m.gameType === 'splitScore';
         if (mode === 'Checkout Training') return m.gameType === 'checkoutTraining';
         if (mode.startsWith('Standard:')) {
             return (!m.gameType || m.gameType === 'standard') && m.config && `Standard: ${m.config.startScore} ${m.config.outMode}` === mode;
         }
         return false;
      });

    const isMinigame = mode !== 'Alle (Standard)' && !mode.startsWith('Standard:');

    let totalWins = 0;
    let totalDarts = 0, totalPts = 0;
    let totalFirst9Darts = 0, totalFirst9Pts = 0;
    let totalCheckAtt = 0, totalCheckSucc = 0;
    let tripleDarts = 0, totalTriples = 0;
    let minigameBestScore = 0, minigameTotalScore = 0;
    
    // For Segment Radar
    const onlineSegmentHits: Record<string, number> = {};

    // First, accumulate all online segment hits (we need this to subtract from total offline)
    matches.filter(m => m.isOnline).forEach(m => {
       const pStat = m.players.find(p => p.name === profileName);
       if (pStat?.segmentHits) {
          Object.entries(pStat.segmentHits).forEach(([seg, hits]) => {
             onlineSegmentHits[seg] = (onlineSegmentHits[seg] || 0) + hits;
          });
       }
    });

    // Determine final segment hits to show based on isOnline
    const displaySegmentHits: Record<string, number> = {};
    const allKeys = new Set([
       ...Object.keys(onlineSegmentHits),
       ...(baseProfile?.segmentHits ? Object.keys(baseProfile.segmentHits) : [])
    ]);

    allKeys.forEach(seg => {
       if (isOnline) {
          displaySegmentHits[seg] = onlineSegmentHits[seg] || 0;
       } else {
          // Offline hits = Total Profile hits - Online hits
          const totalHits = baseProfile?.segmentHits?.[seg] || 0;
          displaySegmentHits[seg] = Math.max(0, totalHits - (onlineSegmentHits[seg] || 0));
       }
    });

    playerMatches.forEach(m => {
        if (m.winner === profileName) totalWins++;
        const pStat = m.players.find(p => p.name === profileName)!;

        if (isMinigame) {
            if (pStat.score) {
                minigameTotalScore += pStat.score;
                if (pStat.score > minigameBestScore) minigameBestScore = pStat.score;
            }
        } else {
            if (pStat.matchDarts) totalDarts += pStat.matchDarts;
            if (pStat.matchPts) totalPts += pStat.matchPts;
            if (pStat.first9Darts) totalFirst9Darts += pStat.first9Darts;
            if (pStat.first9Pts) totalFirst9Pts += pStat.first9Pts;
            if (pStat.checkoutAttempts) totalCheckAtt += pStat.checkoutAttempts;
            if (pStat.checkoutSuccesses) totalCheckSucc += pStat.checkoutSuccesses;
            if (pStat.triplesHit !== undefined && pStat.matchDarts) {
                tripleDarts += pStat.matchDarts;
                totalTriples += pStat.triplesHit;
            }
        }
    });

    const matchesPlayed = playerMatches.length;
    const winRate = matchesPlayed > 0 ? ((totalWins / matchesPlayed) * 100).toFixed(0) : "0";
    const overallAvg = totalDarts > 0 ? ((totalPts / totalDarts) * 3).toFixed(2) : "0.00";
    const first9Avg = totalFirst9Darts > 0 ? ((totalFirst9Pts / totalFirst9Darts) * 3).toFixed(2) : "0.00";
    const checkoutQuote = totalCheckAtt > 0 ? (((totalCheckSucc) / totalCheckAtt) * 100).toFixed(1) + "%" : "–";
    const tripleQuote = tripleDarts > 0 ? ((totalTriples / tripleDarts) * 100).toFixed(1) + "%" : "–";
    const minigameAvgScore = matchesPlayed > 0 ? Math.round(minigameTotalScore / matchesPlayed) : 0;

    let targetScore = 501;
    if (mode.startsWith('Standard:')) {
      const parts = mode.split(' ');
      if (parts[1] && !isNaN(parseInt(parts[1]))) {
        targetScore = parseInt(parts[1]);
      }
    }
    const avgVal = parseFloat(overallAvg);
    const avgDartsPerLeg = avgVal > 0 
      ? ((targetScore * 3) / avgVal).toFixed(1) 
      : "–";

    // Form curve (last 5)
    const last5 = playerMatches.slice(0, 5);
    let l5Darts = 0, l5Pts = 0, l5F9D = 0, l5F9P = 0, l5CA = 0, l5CS = 0;
    last5.forEach(m => {
        const pStat = m.players.find(p => p.name === profileName)!;
        if (pStat.matchDarts) l5Darts += pStat.matchDarts;
        if (pStat.matchPts) l5Pts += pStat.matchPts;
        if (pStat.first9Darts) l5F9D += pStat.first9Darts;
        if (pStat.first9Pts) l5F9P += pStat.first9Pts;
        if (pStat.checkoutAttempts) l5CA += pStat.checkoutAttempts;
        if (pStat.checkoutSuccesses) l5CS += pStat.checkoutSuccesses;
    });
    const last5Avg = l5Darts > 0 ? ((l5Pts / l5Darts) * 3).toFixed(2) : "–";
    const last5First9 = l5F9D > 0 ? ((l5F9P / l5F9D) * 3).toFixed(2) : "–";
    const last5Checkout = l5CA > 0 ? ((l5CS / l5CA) * 100).toFixed(1) + "%" : "–";

    const chartData = playerMatches.slice(0, 20).reverse().map((m, i) => {
        const pStat = m.players.find(p => p.name === profileName)!;
        const val = isMinigame 
            ? (pStat.score || 0) 
            : (pStat.matchDarts ? (pStat.matchPts! / pStat.matchDarts) * 3 : parseFloat(pStat.avg || "0"));
        return { name: `${i+1}`, val: parseFloat(val.toFixed(2)) };
    });

    const pieData: { name: string, value: number }[] = [];
    let restHits = 0;
    
    // Calculate total hits
    const totalHits = Object.values(displaySegmentHits).reduce((sum, val) => sum + val, 0);

    if (totalHits > 0) {
       Object.entries(displaySegmentHits).forEach(([seg, hits]) => {
          if (hits === 0) return;
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

       // Sort by value descending
       pieData.sort((a, b) => b.value - a.value);
    }

    const radarData = [
      { subject: '20', hits: displaySegmentHits['20'] || 0 },
      { subject: '19', hits: displaySegmentHits['19'] || 0 },
      { subject: '18', hits: displaySegmentHits['18'] || 0 },
      { subject: '17', hits: displaySegmentHits['17'] || 0 },
      { subject: '16', hits: displaySegmentHits['16'] || 0 },
      { subject: '15', hits: displaySegmentHits['15'] || 0 },
      { subject: 'Bull', hits: displaySegmentHits['25'] || 0 },
    ];

    const maxRadarHits = Math.max(5, ...radarData.map(d => d.hits || 0));

    return { 
      winRate, matchesPlayed, overallAvg, first9Avg, checkoutQuote, last5Avg, last5First9, last5Checkout, 
      chartData, pieData, radarData, maxRadarHits, isMinigame, minigameAvgScore, minigameBestScore, avgDartsPerLeg,
      tripleQuote, targetScore, displaySegmentHits
    };
  }, [matches, profileName, mode, isOnline, baseProfile]);

  return (
    <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
       <h3 style={{ marginBottom: '15px', color: isOnline ? 'var(--blue)' : 'var(--green)' }}>{title}</h3>
       
       <div style={{ flex: 1 }}>
         {matchesPlayed === 0 ? (
           <div style={{ color: 'var(--text-dim)', padding: '30px 10px', textAlign: 'center', background: 'var(--surface)', borderRadius: '10px' }}>
             <span style={{ fontSize: '2em', display: 'block', marginBottom: '8px' }}>🎯</span>
             Noch keine {isOnline ? 'Online' : 'Offline'}-Spiele in diesem Modus absolviert.
           </div>
         ) : (
           <>
             {isMinigame ? (
                <div className="dash-stats-grid dash-stats-grid-2">
                  <div className="dash-stat-card">
                    <span className="dash-stat-label">Best Score</span>
                    <span className="dash-stat-value">{minigameBestScore}</span>
                    <span className="dash-stat-detail">{mode}</span>
                  </div>
                  <div className="dash-stat-card">
                    <span className="dash-stat-label">Average Score</span>
                    <span className="dash-stat-value">{minigameAvgScore}</span>
                    <span className="dash-stat-detail">Ø pro Spiel</span>
                  </div>
                </div>
             ) : (
                <>
                  <div className="dash-stats-grid dash-stats-grid-6">
                    <div className="dash-stat-card">
                      <span className="dash-stat-label">Win Rate</span>
                      <span className="dash-stat-value">{winRate}%</span>
                      <span className="dash-stat-detail">{matchesPlayed} Spiele</span>
                    </div>
                    <div className="dash-stat-card">
                      <span className="dash-stat-label">Average</span>
                      <span className="dash-stat-value">{overallAvg}</span>
                      <span className="dash-stat-detail">L5: {last5Avg}</span>
                    </div>
                    <div className="dash-stat-card">
                      <span className="dash-stat-label">First 9</span>
                      <span className="dash-stat-value">{first9Avg}</span>
                      <span className="dash-stat-detail">L5: {last5First9}</span>
                    </div>
                    <div className="dash-stat-card">
                      <span className="dash-stat-label">Checkout</span>
                      <span className="dash-stat-value">{checkoutQuote}</span>
                      <span className="dash-stat-detail">L5: {last5Checkout}</span>
                    </div>
                    <div className="dash-stat-card">
                      <span className="dash-stat-label">Darts pro Leg</span>
                      <span className="dash-stat-value">{avgDartsPerLeg}</span>
                      <span className="dash-stat-detail">Ø für {targetScore}</span>
                    </div>
                    <div className="dash-stat-card">
                      <span className="dash-stat-label">Triple Quote</span>
                      <span className="dash-stat-value">{tripleQuote}</span>
                      <span className="dash-stat-detail">Trefferrate</span>
                    </div>
                  </div>
                  
                  {chartData.length > 0 && (
                    <div style={{ marginTop: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.78em', color: 'var(--text-dim)', fontWeight: 600 }}>
                          📈 {isMinigame ? 'Score-Entwicklung' : '3-Dart Average Trend'}
                        </span>
                        <span style={{ fontSize: '0.72em', color: isOnline ? 'var(--blue)' : 'var(--green)' }}>
                          Letzte Spiele
                        </span>
                      </div>
                      <div style={{ height: '120px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <XAxis dataKey="name" hide />
                            <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(148, 163, 184, 0.15)', borderRadius: '10px' }} 
                              itemStyle={{ color: 'var(--text)' }}
                              formatter={(value: unknown) => [value as React.ReactNode, isMinigame ? 'Punkte' : '3-Dart Average']}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="val" 
                              name={isMinigame ? "Punkte" : "3-Dart Average"}
                              stroke={isOnline ? "var(--blue)" : "var(--primary)"} 
                              strokeWidth={2.5} 
                              dot={{ fill: isOnline ? "var(--blue)" : "var(--primary)", r: 2.5, strokeWidth: 0 }} 
                              activeDot={{ r: 5 }} 
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {pieData.length > 0 && (
                    <div style={{ marginTop: '20px', display: 'flex', gap: '16px', flexDirection: 'column' }}>
                      <h4 style={{ fontSize: '0.85em', color: 'var(--text-dim)', marginBottom: '0px', textAlign: 'center' }}>Segment-Verteilung</h4>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--surface)', padding: '12px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                            <div style={{ position: 'relative', width: '100%', height: '160px' }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={pieData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={68}
                                    paddingAngle={3}
                                    stroke="none"
                                  >
                                    {pieData.map((entry, index) => {
                                       const colors = ['#F59E0B', '#3B82F6', '#10B981', '#F97316', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899', '#64748B'];
                                       const fill = entry.name === 'Rest' ? '#475569' : colors[index % colors.length];
                                       return <Cell key={`cell-${index}`} fill={fill} />;
                                    })}
                                  </Pie>
                                  <Tooltip 
                                    contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(148, 163, 184, 0.15)', borderRadius: '10px' }} 
                                    itemStyle={{ color: 'var(--text)' }}
                                    formatter={(value: unknown, name: unknown) => {
                                      const total = pieData.reduce((s, e) => s + e.value, 0);
                                      const pct = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : '0';
                                      return [`${value} Treffer (${pct}%)`, String(name)];
                                    }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                                <div style={{ fontSize: '1.1em', fontWeight: 800, color: 'var(--text)' }}>
                                  {pieData.reduce((s, e) => s + e.value, 0)}
                                </div>
                                <div style={{ fontSize: '0.65em', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  Hits
                                </div>
                              </div>
                            </div>

                            {/* Clean readable Legend Badges */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginTop: '10px', width: '100%' }}>
                              {pieData.map((entry, idx) => {
                                const total = pieData.reduce((s, e) => s + e.value, 0);
                                const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
                                const colors = ['#F59E0B', '#3B82F6', '#10B981', '#F97316', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899', '#64748B'];
                                const color = entry.name === 'Rest' ? '#475569' : colors[idx % colors.length];
                                return (
                                  <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.06)', padding: '3px 7px', borderRadius: '6px', fontSize: '0.78em' }}>
                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: color, display: 'inline-block' }} />
                                    <span style={{ fontWeight: 600 }}>{entry.name}:</span>
                                    <span style={{ color: 'var(--text-dim)' }}>{pct}%</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--surface)', padding: '12px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                            <div style={{ height: '200px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                  <PolarGrid stroke="var(--card-border)" />
                                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} />
                                  <PolarRadiusAxis angle={30} domain={[0, maxRadarHits]} tick={false} axisLine={false} />
                                  <Radar name="Hits" dataKey="hits" stroke={isOnline ? "var(--blue)" : "var(--green)"} fill={isOnline ? "var(--blue)" : "var(--green)"} fillOpacity={0.4} />
                                </RadarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                      </div>

                      {/* 2D Dartboard Heatmap */}
                      <div style={{ marginTop: '16px' }}>
                        <DartboardHeatmap customHits={displaySegmentHits} title="Treffer-Heatmap" />
                      </div>
                    </div>
                  )}
                </>
             )}
           </>
         )}
       </div>

       <button 
         className={isOnline ? "btn-primary btn-large" : "btn-success btn-large"} 
         onClick={onPlay}
         style={{ marginTop: '20px', width: '100%' }}
       >
         {playLabel}
       </button>
    </div>
  );
};
