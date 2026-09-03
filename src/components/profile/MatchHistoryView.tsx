import React, { useEffect, useState } from 'react';
import type { MatchHistory, Profile } from '../../types';
import { MatchImageExport } from '../MatchImageExport';

interface MatchHistoryViewProps {
  matches: MatchHistory[];
  profiles: Record<string, Profile>;
  hasMoreMatches: boolean;
  onLoadMoreMatches?: () => void;
  onBack: () => void;
}

/** Every stored match, newest first, each one shareable as an image. */
export const MatchHistoryView: React.FC<MatchHistoryViewProps> = ({
  matches,
  profiles,
  hasMoreMatches,
  onLoadMoreMatches,
  onBack
}) => {
  /** Index of the match whose share image is being rendered, if any. */
  const [exportingMatch, setExportingMatch] = useState<number | null>(null);

  /**
   * Renders the share image once its off-screen node is in the DOM.
   *
   * Two things used to be paid for on every visit to the history: html2canvas
   * came down with the screen although most visits never export anything, and
   * an export node was mounted for every match in the list. The library is now
   * fetched on the first share, and only the match being shared gets a node.
   */
  useEffect(() => {
    if (exportingMatch === null) return;

    const label = matches[exportingMatch]?.date.replace(/[^a-zA-Z0-9]/g, '-') ?? 'Export';
    let cancelled = false;
    (async () => {
      try {
        const { exportElementAsImage } = await import('../../utils/exportImage');
        await exportElementAsImage(`export-node-${exportingMatch}`, `Dartcounter-Match-${label}.png`);
      } catch (err) {
        console.error('Bild-Export fehlgeschlagen', err);
      } finally {
        if (!cancelled) setExportingMatch(null);
      }
    })();

    return () => { cancelled = true; };
  }, [exportingMatch, matches]);

  return (
    <div className="screen active-screen app-container" style={{ position: 'relative', overflowX: 'hidden', paddingBottom: '120px' }}>
      <div className="hero-glow-bg-profile" />

      <div className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
        <button className="btn-ghost" onClick={onBack} style={{ padding: '6px 14px', fontSize: '0.9em' }}>
          &larr; Zurück
        </button>
        <h2 style={{ margin: 0, fontSize: '1.5em' }}>📜 Match Historie</h2>
        <div style={{ width: '60px' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {matches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)' }}>
            <div style={{ fontSize: '2em', marginBottom: '10px' }}>🎯</div>
            <p>Noch keine Matches gespeichert.</p>
          </div>
        ) : (
          matches.map((m, i) => (
            <div key={i} id={`history-item-${i}`} className="history-item card" style={{ marginBottom: '10px' }}>
              <div className="history-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="history-winner" style={{ fontWeight: 'bold', color: profiles[m.winner]?.color || 'var(--blue)' }}>🏆 {m.winner}</span>
                <span className="history-date" style={{ color: 'var(--text-dim)', fontSize: '0.85em' }}>{m.date}</span>
              </div>
              <div className="history-players">
                {m.players.map((p, j) => (
                  <div key={j} style={{ borderBottom: j < m.players.length - 1 ? '1px solid var(--card-border)' : 'none', paddingBottom: '8px', marginBottom: '8px' }}>
                    <div className="history-player-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span className="history-player-name" style={{ flex: 2, color: profiles[p.name]?.color }}>{p.name}</span>
                      <span className="history-player-score" style={{ flex: 1, textAlign: 'center', fontWeight: 'bold' }}>{p.sets}:{p.legs}</span>
                      <span className="history-player-avg" style={{ flex: 1, textAlign: 'right', color: 'var(--text-dim)' }}>Ø {p.avg}</span>
                      <span className="history-player-f9" style={{ flex: 1, textAlign: 'right', color: 'var(--text-dim)' }}>F9: {p.first9}</span>
                    </div>
                    {p.legHistory && p.legHistory.length > 0 && (
                      <div style={{ fontSize: '0.75em', color: 'var(--text-dim)', marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {p.legHistory.map((legAvg, li) => (
                          <span key={li} style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                            L{li + 1}: Ø{legAvg}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '10px', textAlign: 'right' }}>
                <button
                  className="btn-ghost"
                  style={{ fontSize: '0.85em', padding: '4px 8px' }}
                  disabled={exportingMatch !== null}
                  onClick={() => setExportingMatch(i)}
                >
                  {exportingMatch === i ? '⏳ Wird erstellt…' : '📸 Als Bild teilen'}
                </button>
                {exportingMatch === i && (
                  <div style={{ position: 'absolute', left: '-15000px', top: 0 }}>
                    <MatchImageExport matchData={m} profiles={profiles} exportId={`export-node-${i}`} />
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {hasMoreMatches && onLoadMoreMatches && (
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button className="btn-ghost" onClick={onLoadMoreMatches}>
              Mehr laden
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
