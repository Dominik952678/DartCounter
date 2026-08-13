import React from 'react';
import type { MatchHistory, Profile } from '../types';

interface MatchImageExportProps {
  matchData: MatchHistory;
  profiles: Record<string, Profile>;
  exportId: string;
}

export const MatchImageExport: React.FC<MatchImageExportProps> = ({ matchData, profiles, exportId }) => {
  // Determine overall max average for the chart scaling
  let maxLegAvg = 0;
  matchData.players.forEach(p => {
    if (p.legHistory) {
      p.legHistory.forEach(avg => {
        const val = parseFloat(avg as unknown as string);
        if (!isNaN(val) && val > maxLegAvg) maxLegAvg = val;
      });
    }
  });
  
  // Add some padding to the max value for the chart
  const chartMax = maxLegAvg < 60 ? 60 : maxLegAvg < 100 ? 100 : Math.ceil(maxLegAvg / 20) * 20;

  return (
    <div 
      id={exportId}
      style={{
        position: 'absolute',
        left: '-9999px',
        top: 0,
        width: '1080px',
        minHeight: '1920px',
        backgroundColor: '#0f172a', // Deep slate dark
        backgroundImage: 'radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 100%)',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        padding: '60px',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ color: '#38bdf8', fontSize: '28px', fontWeight: 'bold', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '10px' }}>
          OFFICIAL MATCH REPORT
        </div>
        <div style={{ fontSize: '60px', fontWeight: '900', margin: '0', textTransform: 'uppercase', background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Dartcounter
        </div>
        <div style={{ fontSize: '24px', color: '#94a3b8', marginTop: '15px' }}>
          {matchData.date}
        </div>
      </div>

      {/* Players Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {matchData.players.map((p, i) => {
          const isWinner = p.name === matchData.winner;
          const playerColor = profiles[p.name]?.color || (i === 0 ? '#38bdf8' : '#f43f5e'); // Fallback PDC blue/red
          const checkoutQuote = p.checkoutAttempts && p.checkoutAttempts > 0 
            ? Math.round(((p.checkoutSuccesses || 0) / p.checkoutAttempts) * 100) 
            : 0;

          return (
            <div 
              key={i} 
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.7)',
                borderRadius: '24px',
                border: `2px solid ${isWinner ? '#fbbf24' : 'rgba(255,255,255,0.1)'}`,
                boxShadow: isWinner ? '0 0 40px rgba(251, 191, 36, 0.15)' : 'none',
                padding: '40px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Decorative side accent */}
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '12px', backgroundColor: playerColor }} />
              
              {/* Player Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <h2 style={{ fontSize: '50px', margin: 0, fontWeight: '900', color: '#fff' }}>
                    {p.name}
                  </h2>
                  {isWinner && <span style={{ fontSize: '45px' }}>👑</span>}
                </div>
                <div style={{ fontSize: '65px', fontWeight: '900', color: playerColor, textShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                  {p.sets} <span style={{ color: '#64748b', fontSize: '45px' }}>SET</span> <span style={{ margin: '0 10px' }}>-</span> {p.legs} <span style={{ color: '#64748b', fontSize: '45px' }}>LEG</span>
                </div>
              </div>

              {/* Big TV Stats Panels */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '25px', textAlign: 'center', borderBottom: `4px solid ${playerColor}` }}>
                  <div style={{ color: '#94a3b8', fontSize: '20px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Average</div>
                  <div style={{ fontSize: '55px', fontWeight: '900', color: '#fff' }}>{p.avg}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '25px', textAlign: 'center', borderBottom: `4px solid ${playerColor}` }}>
                  <div style={{ color: '#94a3b8', fontSize: '20px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>First 9 Avg</div>
                  <div style={{ fontSize: '55px', fontWeight: '900', color: '#fff' }}>{p.first9 || p.avg}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '25px', textAlign: 'center', borderBottom: `4px solid ${playerColor}` }}>
                  <div style={{ color: '#94a3b8', fontSize: '20px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Checkout %</div>
                  <div style={{ fontSize: '55px', fontWeight: '900', color: '#fff' }}>{checkoutQuote}%</div>
                  <div style={{ color: '#64748b', fontSize: '18px', marginTop: '5px' }}>{p.checkoutSuccesses || 0}/{p.checkoutAttempts || 0}</div>
                </div>
              </div>

              {/* Detail Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px', marginBottom: '30px' }}>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ color: '#94a3b8', fontSize: '18px', marginBottom: '8px' }}>100+</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{p.hundredPlus || 0}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ color: '#94a3b8', fontSize: '18px', marginBottom: '8px' }}>140+</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{p.oneFortyPlus || 0}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <div style={{ color: '#fbbf24', fontSize: '18px', marginBottom: '8px', fontWeight: 'bold' }}>180s</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fbbf24' }}>{p.oneEighty || 0}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ color: '#94a3b8', fontSize: '18px', marginBottom: '8px' }}>Best Leg</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{p.bestMatchLeg ? `${p.bestMatchLeg} D` : '-'}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ color: '#94a3b8', fontSize: '18px', marginBottom: '8px' }}>High Finish</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{p.highestCheckout || '-'}</div>
                </div>
              </div>

              {/* Leg-by-Leg Chart (CSS Bar Chart) */}
              {p.legHistory && p.legHistory.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '18px', textTransform: 'uppercase', marginBottom: '15px' }}>Leg Averages Trend</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '120px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '20px 20px 0 20px', borderRadius: '12px' }}>
                    {p.legHistory.map((avgStr, idx) => {
                      const avg = parseFloat(avgStr as unknown as string);
                      const heightPercent = (avg / chartMax) * 100;
                      return (
                        <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                          <span style={{ fontSize: '16px', color: '#fff', marginBottom: '8px', fontWeight: 'bold' }}>{avg.toFixed(1)}</span>
                          <div 
                            style={{ 
                              width: '100%', 
                              height: `${heightPercent}%`, 
                              backgroundColor: playerColor,
                              borderTopLeftRadius: '6px',
                              borderTopRightRadius: '6px',
                              opacity: 0.8
                            }} 
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '40px', color: '#64748b', fontSize: '20px' }}>
        Created with <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>Dartcounter</span>
      </div>
    </div>
  );
};
