import React, { useState } from 'react';
import { useModalA11y } from '../hooks/useModalA11y';
import type { Player, MatchHistory } from '../types';
import { DartboardHeatmap } from './DartboardHeatmap';
import { checkoutQuote } from '../utils/stats';
import { Button, ChoiceGroup, Icons } from './ui';
import { MiniGameStoryExport } from './MiniGameStoryExport';
import { buildStoryData, hasStoryData, type MiniGameType } from '../utils/storyExport';

const STORY_EXPORT_ID = 'power-scoring-story';

export const StatsModal: React.FC<{
  isOpen: boolean;
  winnerIndex: number | null;
  players: Player[];
  matchData: MatchHistory | null;
  onClose: () => void;
  onRematch?: () => void;
  onUndoLastDart?: () => void;
}> = ({ isOpen, winnerIndex, players, matchData, onClose, onRematch, onUndoLastDart }) => {
  const [exportName, setExportName] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const isReady = isOpen && winnerIndex !== null && !!matchData;
  // Escape is deliberately not wired: closing this dialog books the match and
  // navigates away, which is not what a stray key press should do.
  const dialogRef = useModalA11y<HTMLDivElement>({ isOpen: isReady });

  if (!isReady || winnerIndex === null || !matchData) return null;

  const winnerName = players[winnerIndex]?.name || matchData.winner;

  // Alle drei Trainingsmodi liefern inzwischen einen Rundenverlauf. Fehlt er —
  // ein X01-Match oder ein Ergebnis von vor dieser Aufzeichnung —, erscheint
  // der Block gar nicht erst, statt ein leeres Bild anzubieten.
  const storyType = (['powerScoring', 'splitScore', 'checkoutTraining'] as const)
    .find(t => t === matchData.gameType) as MiniGameType | undefined;
  const exportablePlayers = storyType
    ? matchData.players.filter(p => hasStoryData(p, matchData.gameType))
    : [];
  const canExportStory = exportablePlayers.length > 0;
  const exportTarget = canExportStory
    ? exportablePlayers.find(p => p.name === exportName) ?? exportablePlayers[0]
    : null;

  const handleStoryExport = async () => {
    if (!exportTarget) return;
    setIsExporting(true);
    try {
      const { exportElementAsImage } = await import('../utils/exportImage');
      await exportElementAsImage(STORY_EXPORT_ID, `Dartcounter-${storyType}-${exportTarget.name}.png`);
    } finally {
      setIsExporting(false);
    }
  };

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
            <div className="confetti" aria-hidden="true"><Icons.IconTrophy size={44} /></div>
            <h2 id="stats-modal-title" className="result-winner">{winnerName} gewinnt!</h2>
            <p className="result-subtitle">Match-Statistik &amp; Analyse</p>
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
                  border: `1.5px solid ${isWinner ? 'var(--text-success)' : 'var(--card-border)'}`,
                  borderRadius: 'var(--radius, 12px)',
                  padding: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {playerObj?.isBot ? <Icons.IconBot size={19} /> : <Icons.IconUser size={19} />}
                      <strong className={`result-player ${isWinner ? 'is-winner' : ''}`}>
                        {pData.name} {isWinner && <Icons.IconTrophy size={17} />}
                      </strong>
                    </div>
                    <span className="result-stat-card result-rank">
                      {matchData.gameType && matchData.gameType !== 'standard'
                        ? (pData.score !== undefined ? `${pData.score} Pkt` : '')
                        : (pData.sets !== undefined ? `${pData.sets}S : ${pData.legs}L` : `${pData.legs} Legs`)}
                    </span>
                  </div>
                  
                  {matchData.gameType && matchData.gameType !== 'standard' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: matchData.gameType === 'checkoutTraining' ? '1fr 1fr 1fr' : '1fr', gap: '8px', marginBottom: '6px' }}>
                      <div className="result-stat-card" style={{ padding: '12px 8px', textAlign: 'center' }}>
                        <div className="stat-label">
                          {matchData.gameType === 'checkoutTraining' ? 'Bestes Checkout' : 'Punkte'}
                        </div>
                        <div className="stat-value">{pData.score || 0}</div>
                      </div>
                      {matchData.gameType === 'checkoutTraining' && (
                        <>
                          <div className="result-stat-card" style={{ padding: '12px 8px', textAlign: 'center' }}>
                            <div className="stat-label">Versuche</div>
                            <div className="stat-value">{pData.attempts || 0}</div>
                          </div>
                          <div className="result-stat-card" style={{ padding: '12px 8px', textAlign: 'center' }}>
                            <div className="stat-label">Darts</div>
                            <div className="stat-value">{pData.dartsUsed || 0}</div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Primary Stats Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
                        <div className="result-stat-card" style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <div className="stat-label">Average</div>
                          <div className="stat-value stat-value-sm">{pData.avg}</div>
                        </div>
                        <div className="result-stat-card" style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <div className="stat-label">Erste 9</div>
                          <div className="stat-value stat-value-sm">{pData.first9}</div>
                        </div>
                        <div className="result-stat-card" style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <div className="stat-label">Bestes Leg</div>
                          <div className="stat-value stat-value-sm">
                            {pData.bestMatchLeg ? `${pData.bestMatchLeg} Darts` : '–'}
                          </div>
                        </div>
                      </div>

                      {/* Secondary Quotas */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                        <div className="result-stat-card" style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="stat-label">Checkout-Quote:</span>
                          <strong style={{ color: 'var(--text)' }}>{coQuote}</strong>
                        </div>
                        <div className="result-stat-card" style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="stat-label">Triple-Quote:</span>
                          <strong style={{ color: 'var(--text)' }}>{tripleQuote}</strong>
                        </div>
                      </div>

                      {/* Highlights Grid */}
                      <div className="result-stat-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', padding: '10px 6px', fontSize: '0.82em', textAlign: 'center' }}>
                        <div><span className="stat-label">180:</span> <strong>{pData.oneEighty || 0}</strong></div>
                        <div><span style={{ color: 'var(--text-dim)' }}>140+:</span> <strong>{pData.oneFortyPlus || 0}</strong></div>
                        <div><span style={{ color: 'var(--text-dim)' }}>100+:</span> <strong>{pData.hundredPlus || 0}</strong></div>
                        <div><span className="stat-label">Finish:</span> <strong>{pData.highestCheckout || '–'}</strong></div>
                      </div>

                      {/* Leg Averages progression if available */}
                      {pData.legHistory && pData.legHistory.length > 0 && (
                        <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span className="stat-label">Legs:</span>
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
          
          {canExportStory && (
            <div className="story-export">
              <span className="section-label">Als Bild teilen</span>
              {exportablePlayers.length > 1 && (
                <ChoiceGroup
                  name="storyExportPlayer"
                  value={exportTarget?.name ?? ''}
                  options={exportablePlayers.map(p => ({ value: p.name, label: p.name }))}
                  onChange={setExportName}
                  ariaLabel="Wessen Statistik exportiert wird"
                />
              )}
              <Button
                variant="secondary"
                fullWidth
                disabled={isExporting}
                onClick={handleStoryExport}
              >
                {isExporting ? 'Bild wird erstellt…' : <><Icons.IconCamera size={18} /> Story-Bild erstellen</>}
              </Button>
            </div>
          )}

          {/* Action Buttons: Start Again, Undo last throw, Back to Menu */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            {onRematch && (
              <Button
                variant="primary" className="result-btn-rematch"
                onClick={onRematch}
              >
                <Icons.IconRefresh size={18} /> <span>Nochmal spielen</span>
              </Button>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: onUndoLastDart ? '1fr 1fr' : '1fr', gap: '10px' }}>
              {onUndoLastDart && (
                <button
                  className="result-btn-undo"
                  onClick={onUndoLastDart}
                  title="Letzten Wurf rückgängig machen (falls verklickt)"
                >
                  <Icons.IconUndo size={18} /> <span>Wurf zurücknehmen</span>
                </button>
              )}

              <Button
                variant="ghost" className="result-btn-home"
                onClick={onClose}
              >
                <Icons.IconHome size={18} /> <span>Zurück zum Menü</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Liegt außerhalb des Sichtbereichs; html2canvas filmt genau diesen
          Knoten ab. Nur der gewählte Spieler wird gerendert, sonst stünden bis
          zu vier 1080×1920-Bäume im DOM. */}
      {exportTarget && storyType && (
        <MiniGameStoryExport
          exportId={STORY_EXPORT_ID}
          playerName={exportTarget.name}
          isWinner={exportTarget.name === matchData.winner}
          date={matchData.date}
          segmentHits={exportTarget.segmentHits ?? {}}
          {...buildStoryData(exportTarget, storyType)}
        />
      )}
    </>
  );
};
