import React from 'react';
import { useModalA11y } from '../hooks/useModalA11y';
import type { Player, MatchHistory } from '../types';
import { DartboardHeatmap } from './DartboardHeatmap';
import { checkoutQuote } from '../utils/stats';

export const StatsModal: React.FC<{
  isOpen: boolean;
  winnerIndex: number | null;
  players: Player[];
  matchData: MatchHistory | null;
  onClose: () => void;
  onRematch?: () => void;
  onUndoLastDart?: () => void;
}> = ({ isOpen, winnerIndex, players, matchData, onClose, onRematch, onUndoLastDart }) => {
  const isReady = isOpen && winnerIndex !== null && !!matchData;
  // Escape is deliberately not wired: closing this dialog books the match and
  // navigates away, which is not what a stray key press should do.
  const dialogRef = useModalA11y<HTMLDivElement>({ isOpen: isReady });

  if (!isReady || winnerIndex === null || !matchData) return null;

  const winnerName = players[winnerIndex]?.name || matchData.winner;

  return (
    <>
      {/* No backdrop-click close either: it commits the match and leaves the board. */}
      <div className="bottom-sheet-overlay">
        <div
          ref={dialogRef}
          className="bottom-sheet-content"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stats-modal-title"
          tabIndex={-1}
          style={{ maxWidth: '540px' }}
        >
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
              const coQuote = checkoutQuote(pData.checkoutSuccesses || 0, pData.checkoutAttempts || 0);
              const tripleQuote = (pData.triplesHit && pData.matchDarts && pData.matchDarts > 0)
                ? (((pData.triplesHit || 0) / pData.matchDarts) * 100).toFixed(1) + '%'
                : '–';

              return (
                <div key={i} style={{
                  background: isWinner ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'var(--bg-surface)',
                  border: `1.5px solid ${isWinner ? 'var(--green)' : 'var(--card-border)'}`,
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
                    <span className="result-stat-card" style={{ fontSize: '1.1em', fontWeight: 800, padding: '4px 12px' }}>
                      {matchData.gameType && matchData.gameType !== 'standard'
                        ? (pData.score !== undefined ? `${pData.score} Pkt` : '')
                        : (pData.sets !== undefined ? `${pData.sets}S : ${pData.legs}L` : `${pData.legs} Legs`)}
                    </span>
                  </div>
                  
                  {matchData.gameType && matchData.gameType !== 'standard' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: matchData.gameType === 'checkoutTraining' ? '1fr 1fr 1fr' : '1fr', gap: '8px', marginBottom: '6px' }}>
                      <div className="result-stat-card" style={{ padding: '12px 8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75em', color: 'var(--text-dim)', marginBottom: '2px' }}>
                          {matchData.gameType === 'checkoutTraining' ? 'Bestes Checkout' : 'Punkte'}
                        </div>
                        <div style={{ color: 'var(--green)', fontWeight: 800, fontSize: '1.4em' }}>{pData.score || 0}</div>
                      </div>
                      {matchData.gameType === 'checkoutTraining' && (
                        <>
                          <div className="result-stat-card" style={{ padding: '12px 8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75em', color: 'var(--text-dim)', marginBottom: '2px' }}>Versuche</div>
                            <div style={{ color: 'var(--orange)', fontWeight: 800, fontSize: '1.4em' }}>{pData.attempts || 0}</div>
                          </div>
                          <div className="result-stat-card" style={{ padding: '12px 8px', textAlign: 'center' }}>
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
                        <div className="result-stat-card" style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75em', color: 'var(--text-dim)', marginBottom: '2px' }}>Average</div>
                          <div style={{ color: 'var(--green)', fontWeight: 800, fontSize: '1.1em' }}>{pData.avg}</div>
                        </div>
                        <div className="result-stat-card" style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75em', color: 'var(--text-dim)', marginBottom: '2px' }}>Erste 9</div>
                          <div style={{ color: 'var(--orange)', fontWeight: 800, fontSize: '1.1em' }}>{pData.first9}</div>
                        </div>
                        <div className="result-stat-card" style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75em', color: 'var(--text-dim)', marginBottom: '2px' }}>Bestes Leg</div>
                          <div style={{ color: 'var(--blue)', fontWeight: 800, fontSize: '1.1em' }}>
                            {pData.bestMatchLeg ? `${pData.bestMatchLeg} Darts` : '–'}
                          </div>
                        </div>
                      </div>

                      {/* Secondary Quotas */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                        <div className="result-stat-card" style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8em', color: 'var(--text-dim)' }}>Checkout-Quote:</span>
                          <strong style={{ color: 'var(--text)' }}>{coQuote}</strong>
                        </div>
                        <div className="result-stat-card" style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8em', color: 'var(--text-dim)' }}>Triple-Quote:</span>
                          <strong style={{ color: 'var(--text)' }}>{tripleQuote}</strong>
                        </div>
                      </div>

                      {/* Highlights Grid */}
                      <div className="result-stat-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', padding: '10px 6px', fontSize: '0.82em', textAlign: 'center' }}>
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
                            <span key={li} className="result-stat-card" style={{ fontSize: '0.75em', padding: '2px 6px', borderRadius: '4px' }}>
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
                className="btn-success result-btn-rematch"
                onClick={onRematch}
              >
                <span>🔄</span> <span>Nochmal spielen</span>
              </button>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: onUndoLastDart ? '1fr 1fr' : '1fr', gap: '10px' }}>
              {onUndoLastDart && (
                <button
                  className="result-btn-undo"
                  onClick={onUndoLastDart}
                  title="Letzten Wurf rückgängig machen (falls verklickt)"
                >
                  <span>↩</span> <span>Wurf zurücknehmen</span>
                </button>
              )}

              <button
                className="btn-ghost result-btn-home"
                onClick={onClose}
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
