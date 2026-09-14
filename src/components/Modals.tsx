import React, { useId, useState } from 'react';
import { useModalA11y } from '../hooks/useModalA11y';
import type { Player, MatchHistory, PlayerStats, Profile } from '../types';
import { DartboardHeatmap } from './DartboardHeatmap';
import { checkoutQuote } from '../utils/stats';
import { matchPlayerColor } from '../utils/playerColors';
import { matchSides } from '../utils/matchProgress';
import { Button, Icons, Slider } from './ui';
import { MiniGameStoryExport } from './MiniGameStoryExport';
import { MatchImageExport } from './MatchImageExport';
import { CompareTable, type CompareRow } from './charts/CompareTable';
import { distanceLabel, outModeLabel } from './matchSetup/configSummary';
import { buildStoryData, hasStoryData, type MiniGameType } from '../utils/storyExport';

const STORY_EXPORT_ID = 'power-scoring-story';
const MATCH_EXPORT_ID = 'result-match-image';

const TRAINING_TITLES: Record<MiniGameType, string> = {
  powerScoring: 'Power Scoring',
  splitScore: 'Split Score',
  checkoutTraining: 'Checkout-Training'
};

const quote = (hits: number | undefined, darts: number | undefined): string =>
  hits !== undefined && darts ? `${((hits / darts) * 100).toFixed(1)} %` : '–';

/** Alle Kennzahlen, die das Ergebnis eines X01-Matches bis v1.17 zeigte (Entwurf D3). */
const x01Rows = (rows: PlayerStats[]): CompareRow[] => [
  { label: 'Average', values: rows.map(p => p.avg), better: 'high' },
  { label: 'Erste 9', values: rows.map(p => p.first9), better: 'high' },
  { label: 'Bestes Leg (Darts)', values: rows.map(p => p.bestMatchLeg || '–'), better: 'low' },
  { label: 'Checkout-Quote', values: rows.map(p => checkoutQuote(p.checkoutSuccesses || 0, p.checkoutAttempts || 0)), better: 'high' },
  { label: 'Checkouts', values: rows.map(p => `${p.checkoutSuccesses || 0}/${p.checkoutAttempts || 0}`) },
  { label: 'Triple-Quote', values: rows.map(p => quote(p.triplesHit, p.matchDarts)), better: 'high' },
  { label: '180', values: rows.map(p => p.oneEighty || 0), better: 'high' },
  { label: '140+', values: rows.map(p => p.oneFortyPlus || 0), better: 'high' },
  { label: '100+', values: rows.map(p => p.hundredPlus || 0), better: 'high' },
  { label: 'Höchstes Finish', values: rows.map(p => p.highestCheckout || '–'), better: 'high' },
  { label: 'Darts', values: rows.map(p => p.matchDarts || 0) }
];

/** Das Ergebnis einer Trainingsrunde (Entwurf E6). */
const trainingRows = (type: MiniGameType, rows: PlayerStats[]): CompareRow[] =>
  type === 'checkoutTraining'
    ? [
        { label: 'Bestes Checkout', values: rows.map(p => p.score || '–'), better: 'high' },
        { label: 'Versuche', values: rows.map(p => p.attempts || 0) },
        { label: 'Darts', values: rows.map(p => p.dartsUsed || 0) }
      ]
    : [
        { label: 'Punkte', values: rows.map(p => p.score || 0), better: 'high' },
        { label: 'Darts', values: rows.map(p => p.dartsThrown || '–') },
        { label: 'Triple-Quote', values: rows.map(p => quote(p.triplesHit, p.dartsThrown)), better: 'high' }
      ];

export const StatsModal: React.FC<{
  isOpen: boolean;
  winnerIndex: number | null;
  players: Player[];
  matchData: MatchHistory | null;
  /** Für „Match-Bild teilen"; ohne Profile gibt es das Bild nicht. */
  profiles?: Record<string, Profile>;
  onClose: () => void;
  onRematch?: () => void;
  onUndoLastDart?: () => void;
}> = ({ isOpen, winnerIndex, players, matchData, profiles, onClose, onRematch, onUndoLastDart }) => {
  const [exportName, setExportName] = useState<string | null>(null);
  const [heatName, setHeatName] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const titleId = useId();

  const isReady = isOpen && winnerIndex !== null && !!matchData;
  // Escape is deliberately not wired: closing books the match and navigates away.
  const dialogRef = useModalA11y<HTMLDivElement>({ isOpen: isReady });

  if (!isReady || winnerIndex === null || !matchData) return null;

  const rows = matchData.players;
  const winnerName = players[winnerIndex]?.name || matchData.winner;
  const is2v2 = Boolean(matchData.config?.is2v2 || matchData.is2v2);
  const colorOf = (name: string, i: number) =>
    matchPlayerColor(players.find(p => p.name === name) ?? players[i] ?? {}, i, is2v2);
  const tablePlayers = rows.map((p, i) => ({ name: p.name, color: colorOf(p.name, i) }));

  const storyType = (['powerScoring', 'splitScore', 'checkoutTraining'] as const)
    .find(t => t === matchData.gameType) as MiniGameType | undefined;
  const exportablePlayers = storyType ? rows.filter(p => hasStoryData(p, matchData.gameType)) : [];
  const exportTarget = exportablePlayers.length > 0
    ? exportablePlayers.find(p => p.name === exportName) ?? exportablePlayers[0]
    : null;

  const heatPlayers = rows.filter(p => p.segmentHits && Object.keys(p.segmentHits).length > 0);
  const heatShown = heatPlayers.find(p => p.name === heatName) ?? heatPlayers[0];

  const exportImage = async (id: string, filename: string) => {
    setIsExporting(true);
    try {
      const { exportElementAsImage } = await import('../utils/exportImage');
      await exportElementAsImage(id, filename);
    } finally {
      setIsExporting(false);
    }
  };

  const renderHead = () => {
    if (storyType) {
      const winnerRow = rows.find(p => p.name === matchData.winner) ?? rows[0];
      return (
        <div className="result-hero">
          <span className="label-caps">{TRAINING_TITLES[storyType]}</span>
          <div className="result-hero-value">
            <span id={titleId} className="num-lg">{winnerRow?.score ?? 0}</span>
            <span className="result-hero-unit">{storyType === 'checkoutTraining' ? 'bestes Checkout' : 'Punkte'}</span>
          </div>
          <div className="result-hero-sub">
            {rows.length > 1 ? `${winnerName} gewinnt` : winnerName}
          </div>
        </div>
      );
    }

    const sides = matchSides(rows.map(p => ({ ...p, score: p.score ?? 0 })), { is2v2 });
    const bySets = (matchData.config?.setsToWin ?? 1) > 1;
    const scoreline = sides.length === 2
      ? `${bySets ? sides[0].sets : sides[0].legs} – ${bySets ? sides[1].sets : sides[1].legs}`
      : `${rows.find(p => p.name === matchData.winner)?.legs ?? 0} Legs`;
    const meta = matchData.config
      ? `${matchData.config.startScore} · ${outModeLabel(matchData.config.outMode)} · ${distanceLabel(matchData.config)}`
      : matchData.date;

    return (
      <div className="result-head">
        <span id={titleId} className="label-caps">{`${winnerName} gewinnt das Match`}</span>
        <p className="result-score">{scoreline}</p>
        <span className="result-meta">{meta}</span>
      </div>
    );
  };

  const legCount = Math.max(0, ...rows.map(p => p.legHistory?.length ?? 0));

  return (
    <>
      {/* Kein Schließen über den Hintergrund: das bucht das Match und verlässt das Board. */}
      <div className="result-overlay">
        <div
          ref={dialogRef}
          className="result-screen"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
        >
          {renderHead()}

          <div className="result-grid">
            <div className="result-column">
              <section className="result-card">
                <span className="label-caps">{storyType ? 'Ergebnis' : 'Match-Statistik'}</span>
                <CompareTable
                  players={tablePlayers}
                  rows={storyType ? trainingRows(storyType, rows) : x01Rows(rows)}
                />
              </section>

              {!storyType && legCount > 0 && (
                <section className="result-card">
                  <span className="label-caps">Legs</span>
                  <div className="compare-scroll">
                    <table className="compare-table">
                      <thead>
                        <tr>
                          <th scope="col">Leg</th>
                          {tablePlayers.map(p => (
                            <th key={p.name} scope="col"><span className="compare-player">{`Ø ${p.name}`}</span></th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: legCount }, (_, leg) => (
                          <tr key={leg}>
                            <th scope="row">{leg + 1}</th>
                            {rows.map((p, i) => <td key={i}>{p.legHistory?.[leg] ?? '–'}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>

            <div className="result-column">
              {heatShown && (
                <section className="result-card">
                  {heatPlayers.length > 1 && (
                    <Slider
                      name="resultHeatPlayer"
                      variant="chips"
                      value={heatShown.name}
                      options={heatPlayers.map(p => ({ value: p.name, label: p.name, ariaLabel: `Heatmap von ${p.name}` }))}
                      onChange={setHeatName}
                      ariaLabel="Heatmap von"
                    />
                  )}
                  <DartboardHeatmap
                    key={heatShown.name}
                    customHits={heatShown.segmentHits}
                    title={storyType ? 'Treffer der Sitzung' : 'Treffer-Board'}
                  />
                </section>
              )}

              {exportTarget && storyType && (
                <section className="result-card">
                  <span className="label-caps">Als Bild teilen</span>
                  {exportablePlayers.length > 1 && (
                    <Slider
                      name="storyExportPlayer"
                      variant="chips"
                      value={exportTarget.name}
                      options={exportablePlayers.map(p => ({ value: p.name, label: p.name, ariaLabel: p.name }))}
                      onChange={setExportName}
                      ariaLabel="Wessen Statistik exportiert wird"
                    />
                  )}
                  <Button
                    variant="secondary"
                    fullWidth
                    disabled={isExporting}
                    onClick={() => exportImage(STORY_EXPORT_ID, `Dartcounter-${storyType}-${exportTarget.name}.png`)}
                  >
                    {isExporting ? 'Bild wird erstellt…' : <><Icons.IconCamera size={18} /> Story-Bild erstellen</>}
                  </Button>
                </section>
              )}
            </div>
          </div>

          <div className="result-actions">
            {storyType ? (
              <div className="result-actions-row">
                {onRematch && <Button variant="bone" size="large" onClick={onRematch}>Nochmal</Button>}
                <Button variant="secondary" size="large" onClick={onClose}>Fertig</Button>
              </div>
            ) : (
              <>
                {onRematch && (
                  <Button variant="primary" size="large" fullWidth onClick={onRematch}>
                    <Icons.IconRefresh size={20} /> Revanche
                  </Button>
                )}
                <div className="result-actions-row">
                  {onUndoLastDart && (
                    <Button variant="secondary" onClick={onUndoLastDart} title="Letzten Wurf zurücknehmen">
                      <Icons.IconUndo size={18} /> Wurf zurück
                    </Button>
                  )}
                  <Button variant="secondary" onClick={onClose}>
                    <Icons.IconHome size={18} /> Start
                  </Button>
                </div>
                {profiles && (
                  <Button
                    variant="ghost"
                    size="compact"
                    className="result-share"
                    disabled={isExporting}
                    onClick={() => exportImage(MATCH_EXPORT_ID, `Dartcounter-Match-${matchData.date}.png`)}
                  >
                    <Icons.IconCamera size={16} /> {isExporting ? 'Bild wird erstellt…' : 'Match-Bild teilen'}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Liegen außerhalb des Sichtbereichs; html2canvas filmt genau diese Knoten ab.
          Nur der gewählte Spieler wird gerendert, sonst stünden bis zu vier
          1080×1920-Bäume im DOM. */}
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
      {!storyType && profiles && (
        <MatchImageExport matchData={matchData} profiles={profiles} exportId={MATCH_EXPORT_ID} />
      )}
    </>
  );
};
