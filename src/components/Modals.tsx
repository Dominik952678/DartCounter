import React from 'react';
import type { Player, MatchHistory } from '../types';
import { DartboardHeatmap } from './DartboardHeatmap';

export const Toast: React.FC<{
  message: string;
  type: 'success' | 'error' | 'info';
  visible: boolean;
}> = ({ message, type, visible }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: visible ? '20px' : '-100px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: type === 'error' ? 'var(--red, #ff4444)' : type === 'success' ? 'var(--green, #00C851)' : 'var(--blue, #33b5e5)',
        color: '#fff',
        padding: '12px 24px',
        borderRadius: 'var(--radius, 8px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        transition: 'top 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        zIndex: 9999,
        fontWeight: 'bold',
        pointerEvents: 'none',
      }}
    >
      {message}
    </div>
  );
};

const bottomSheetStyles = `
  .bottom-sheet-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.88);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    z-index: 1000;
    display: flex;
    justify-content: center;
    align-items: center;
    animation: fadeIn 0.3s ease-out;
  }
  
  .bottom-sheet-content {
    background-color: #141418;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: var(--radius, 16px);
    width: 92%;
    max-width: 520px;
    max-height: 90vh;
    overflow-y: auto;
    padding: 26px 22px;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.95);
    position: relative;
    animation: scaleUp 0.3s ease-out;
    color: #ffffff;
  }

  @media (max-width: 767px) {
    .bottom-sheet-overlay {
      align-items: flex-end;
    }
    .bottom-sheet-content {
      width: 100%;
      max-width: 100%;
      border-radius: 24px 24px 0 0;
      padding: 32px 20px 24px;
      animation: slideUp 0.3s ease-out forwards;
      transform: translateY(100%);
    }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
  
  @keyframes scaleUp {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  .drag-handle {
    display: none;
    width: 40px;
    height: 4px;
    background-color: rgba(255, 255, 255, 0.3);
    border-radius: 2px;
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
  }

  @media (max-width: 767px) {
    .drag-handle {
      display: block;
    }
  }

  .confetti {
    font-size: 2.5rem;
    animation: bounce 1s infinite alternate;
    display: inline-block;
  }

  @keyframes bounce {
    from { transform: translateY(0); }
    to { transform: translateY(-10px); }
  }
`;

export const StatsModal: React.FC<{
  isOpen: boolean;
  winnerIndex: number | null;
  players: Player[];
  matchData: MatchHistory | null;
  onClose: () => void;
  onRematch?: () => void;
  onUndoLastDart?: () => void;
}> = ({ isOpen, winnerIndex, players, matchData, onClose, onRematch, onUndoLastDart }) => {
  if (!isOpen || winnerIndex === null || !matchData) return null;
  
  const winnerName = players[winnerIndex]?.name || matchData.winner;

  return (
    <>
      <style>{bottomSheetStyles}</style>
      <div className="bottom-sheet-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="stats-modal-title" onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} tabIndex={-1}>
        <div className="bottom-sheet-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
          <div className="drag-handle" />
          
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div className="confetti">🏆</div>
            <h2 id="stats-modal-title" style={{ color: 'var(--green)', margin: '8px 0', fontSize: '1.8em' }}>{winnerName} gewinnt!</h2>
            <p style={{ color: 'var(--text-dim)', margin: 0, fontSize: '0.95em' }}>Match-Statistik & Analyse</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
            {matchData.players.map((pData, i) => {
              const isWinner = pData.name === matchData.winner;
              const playerObj = players[i];
              const coQuote = (pData.checkoutAttempts && pData.checkoutAttempts > 0)
                ? (((pData.checkoutSuccesses || 0) / pData.checkoutAttempts) * 100).toFixed(1) + '%'
                : '–';
              const tripleQuote = (pData.triplesHit && pData.matchDarts && pData.matchDarts > 0)
                ? (((pData.triplesHit || 0) / pData.matchDarts) * 100).toFixed(1) + '%'
                : '–';

              return (
                <div key={i} style={{ 
                  background: isWinner ? 'rgba(245, 158, 11, 0.12)' : '#111827',
                  border: `1.5px solid ${isWinner ? 'var(--green)' : 'rgba(255, 255, 255, 0.1)'}`,
                  borderRadius: 'var(--radius, 12px)',
                  padding: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2em' }}>{playerObj?.isBot ? '🤖' : '👤'}</span>
                      <strong style={{ fontSize: '1.2em', color: isWinner ? 'var(--green)' : 'var(--text)' }}>
                        {pData.name} {isWinner ? '👑' : ''}
                      </strong>
                    </div>
                    <span style={{ fontSize: '1.1em', fontWeight: 800, background: '#111827', border: '1px solid rgba(148, 163, 184, 0.12)', padding: '4px 12px', borderRadius: '8px' }}>
                      {matchData.gameType && matchData.gameType !== 'standard'
                        ? (pData.score !== undefined ? `${pData.score} Pkt` : '')
                        : (pData.sets !== undefined ? `${pData.sets}S : ${pData.legs}L` : `${pData.legs} Legs`)}
                    </span>
                  </div>
                  
                  {matchData.gameType && matchData.gameType !== 'standard' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: matchData.gameType === 'checkoutTraining' ? '1fr 1fr 1fr' : '1fr', gap: '8px', marginBottom: '6px' }}>
                      <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(148, 163, 184, 0.12)', padding: '12px 8px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75em', color: 'var(--text-dim)', marginBottom: '2px' }}>
                          {matchData.gameType === 'checkoutTraining' ? 'Bestes Checkout' : 'Punkte (Score)'}
                        </div>
                        <div style={{ color: 'var(--green)', fontWeight: 800, fontSize: '1.4em' }}>{pData.score || 0}</div>
                      </div>
                      {matchData.gameType === 'checkoutTraining' && (
                        <>
                          <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(148, 163, 184, 0.12)', padding: '12px 8px', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75em', color: 'var(--text-dim)', marginBottom: '2px' }}>Versuche</div>
                            <div style={{ color: 'var(--orange)', fontWeight: 800, fontSize: '1.4em' }}>{pData.attempts || 0}</div>
                          </div>
                          <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(148, 163, 184, 0.12)', padding: '12px 8px', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75em', color: 'var(--text-dim)', marginBottom: '2px' }}>Darts</div>
                            <div style={{ color: 'var(--blue)', fontWeight: 800, fontSize: '1.4em' }}>{pData.dartsUsed || 0}</div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Primary Stats Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
                        <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(148, 163, 184, 0.12)', padding: '10px 8px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75em', color: 'var(--text-dim)', marginBottom: '2px' }}>Average</div>
                          <div style={{ color: 'var(--green)', fontWeight: 800, fontSize: '1.1em' }}>{pData.avg}</div>
                        </div>
                        <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(148, 163, 184, 0.12)', padding: '10px 8px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75em', color: 'var(--text-dim)', marginBottom: '2px' }}>First 9</div>
                          <div style={{ color: 'var(--orange)', fontWeight: 800, fontSize: '1.1em' }}>{pData.first9}</div>
                        </div>
                        <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(148, 163, 184, 0.12)', padding: '10px 8px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75em', color: 'var(--text-dim)', marginBottom: '2px' }}>Best Leg</div>
                          <div style={{ color: 'var(--blue)', fontWeight: 800, fontSize: '1.1em' }}>
                            {pData.bestMatchLeg ? `${pData.bestMatchLeg} Darts` : '–'}
                          </div>
                        </div>
                      </div>

                      {/* Secondary Quotas */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                        <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(148, 163, 184, 0.12)', padding: '8px 10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8em', color: 'var(--text-dim)' }}>Checkout-Quote:</span>
                          <strong style={{ color: 'var(--text)' }}>{coQuote}</strong>
                        </div>
                        <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(148, 163, 184, 0.12)', padding: '8px 10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8em', color: 'var(--text-dim)' }}>Triple-Quote:</span>
                          <strong style={{ color: 'var(--text)' }}>{tripleQuote}</strong>
                        </div>
                      </div>

                      {/* Highlights Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(148, 163, 184, 0.12)', padding: '10px 6px', borderRadius: '8px', fontSize: '0.82em', textAlign: 'center' }}>
                        <div><span style={{ color: 'var(--text-dim)' }}>180:</span> <strong style={{ color: 'var(--orange)' }}>{pData.oneEighty || 0}</strong></div>
                        <div><span style={{ color: 'var(--text-dim)' }}>140+:</span> <strong>{pData.oneFortyPlus || 0}</strong></div>
                        <div><span style={{ color: 'var(--text-dim)' }}>100+:</span> <strong>{pData.hundredPlus || 0}</strong></div>
                        <div><span style={{ color: 'var(--text-dim)' }}>Finish:</span> <strong style={{ color: 'var(--green)' }}>{pData.highestCheckout || '–'}</strong></div>
                      </div>

                      {/* Leg Averages progression if available */}
                      {pData.legHistory && pData.legHistory.length > 0 && (
                        <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75em', color: 'var(--text-dim)' }}>Legs:</span>
                          {pData.legHistory.map((avg, li) => (
                            <span key={li} style={{ fontSize: '0.75em', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(148, 163, 184, 0.12)', padding: '2px 6px', borderRadius: '4px' }}>
                              L{li + 1}: Ø{avg}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* 2D Treffer-Heatmap for this match */}
                      {pData.segmentHits && Object.keys(pData.segmentHits).length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                          <DartboardHeatmap customHits={pData.segmentHits} title={`Treffer-Board: ${pData.name}`} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Action Buttons: Start Again, Undo last throw, Back to Menu */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            {onRematch && (
              <button 
                className="btn-success" 
                onClick={onRematch} 
                style={{ 
                  width: '100%', 
                  padding: '15px 20px', 
                  fontSize: '1.08em', 
                  borderRadius: 'var(--radius, 12px)', 
                  border: 'none', 
                  background: 'linear-gradient(135deg, var(--green, #00C851), #007E33)', 
                  color: '#fff', 
                  fontWeight: 800, 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(0, 200, 81, 0.35)',
                  transition: 'transform 0.1s ease'
                }}
              >
                <span>🔄</span> <span>Nochmal spielen (Start again)</span>
              </button>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: onUndoLastDart ? '1fr 1fr' : '1fr', gap: '10px' }}>
              {onUndoLastDart && (
                <button 
                  className="btn-secondary" 
                  onClick={onUndoLastDart} 
                  style={{ 
                    padding: '13px 12px', 
                    fontSize: '0.95em', 
                    borderRadius: 'var(--radius, 10px)', 
                    border: '1px solid rgba(249, 115, 22, 0.4)', 
                    background: 'rgba(249, 115, 22, 0.14)', 
                    color: 'var(--orange, #F97316)', 
                    fontWeight: 700, 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                  title="Letzten Wurf rückgängig machen (falls verklickt)"
                >
                  <span>↩</span> <span>Wurf revidieren</span>
                </button>
              )}

              <button 
                className="btn-ghost" 
                onClick={onClose} 
                style={{ 
                  padding: '13px 12px', 
                  fontSize: '0.95em', 
                  borderRadius: 'var(--radius, 10px)', 
                  border: '1px solid rgba(255, 255, 255, 0.14)', 
                  background: 'rgba(255, 255, 255, 0.06)', 
                  color: 'var(--text, #fff)', 
                  fontWeight: 700, 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>🏠</span> <span>Zurück zum Menü</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
