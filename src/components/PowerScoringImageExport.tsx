import React from 'react';
import { DartboardHeatmap } from './DartboardHeatmap';
import type { PlayerStats } from '../types';

interface PowerScoringImageExportProps {
  player: PlayerStats;
  /** Für die Kopfzeile — wann gespielt wurde. */
  date: string;
  /** Ob dieser Spieler die Runde gewonnen hat. */
  isWinner: boolean;
  exportId: string;
}

/**
 * Die Statistik einer Power-Scoring-Runde als Bild im Story-Format.
 *
 * Steht außerhalb des sichtbaren Bereichs und wird von `exportElementAsImage`
 * mit html2canvas abgefilmt — deshalb 1080×1920 fest und keine relativen
 * Einheiten, die von der Fenstergröße abhingen.
 *
 * Die Farben sind bewusst Literale statt Tokens: das Bild verlässt die App und
 * soll in jedem Theme gleich aussehen. Wer es in einer Story teilt, teilt nicht
 * seine Theme-Einstellung mit.
 */
const INK = '#0B1120';
const ACCENT = '#F59E0B';
const TEXT = '#F5F5F0';
const MUTED = '#8B93A6';
const LINE = 'rgba(245, 158, 11, 0.25)';

const StatTile: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <div
    style={{
      flex: 1,
      background: 'rgba(255, 255, 255, 0.04)',
      border: `1px solid ${accent ? LINE : 'rgba(255,255,255,0.08)'}`,
      borderRadius: '20px',
      padding: '28px 20px',
      textAlign: 'center'
    }}
  >
    <div style={{ fontSize: '24px', color: MUTED, marginBottom: '10px' }}>{label}</div>
    <div
      style={{
        fontSize: '54px',
        fontWeight: 600,
        color: accent ? ACCENT : TEXT,
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1
      }}
    >
      {value}
    </div>
  </div>
);

export const PowerScoringImageExport: React.FC<PowerScoringImageExportProps> = ({
  player,
  date,
  isWinner,
  exportId
}) => {
  const rounds = player.roundScores ?? [];
  const thrown = rounds.filter((r): r is number => r !== null);
  const darts = player.dartsThrown ?? thrown.length * 3;
  const total = player.score ?? 0;

  const average = darts > 0 ? ((total / darts) * 3).toFixed(1) : '–';
  const tripleQuote = darts > 0 ? `${Math.round(((player.triplesHit ?? 0) / darts) * 100)} %` : '–';
  const best = thrown.length > 0 ? Math.max(...thrown) : 0;

  return (
    <div
      id={exportId}
      style={{
        position: 'absolute',
        left: '-9999px',
        top: 0,
        width: '1080px',
        height: '1920px',
        background: `radial-gradient(circle at 50% 0%, #1B2233 0%, ${INK} 60%)`,
        color: TEXT,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        padding: '70px 60px',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {/* ── Kopf ── */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '30px', letterSpacing: '8px', color: ACCENT, marginBottom: '14px' }}>
          🔥 POWER SCORING
        </div>
        <div style={{ fontSize: '72px', fontWeight: 600, lineHeight: 1.05 }}>
          {isWinner ? '🏆 ' : ''}{player.name}
        </div>
        <div style={{ fontSize: '26px', color: MUTED, marginTop: '12px' }}>{date}</div>
      </div>

      {/* ── Gesamtpunktzahl ── */}
      <div style={{ textAlign: 'center', margin: '44px 0 36px' }}>
        <div
          style={{
            fontSize: '210px',
            fontWeight: 700,
            color: ACCENT,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            textShadow: '0 0 60px rgba(245, 158, 11, 0.35)'
          }}
        >
          {total}
        </div>
        <div style={{ fontSize: '28px', color: MUTED, letterSpacing: '4px' }}>PUNKTE</div>
      </div>

      {/* ── Kennzahlen ── */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
        <StatTile label="Average" value={average} accent />
        <StatTile label="Triple-Quote" value={tripleQuote} />
        <StatTile label="Beste Runde" value={String(best)} />
      </div>

      {/* ── Heatmap ── */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          padding: '24px',
          marginBottom: '36px'
        }}
      >
        <DartboardHeatmap customHits={player.segmentHits ?? {}} title="Treffer-Heatmap" staticView />
      </div>

      {/* ── Jede einzelne Runde ── */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <div style={{ fontSize: '26px', color: MUTED, marginBottom: '16px', letterSpacing: '2px' }}>
          Runden
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
          {rounds.map((value, i) => (
            <div
              key={i}
              style={{
                background: value === null ? 'rgba(255,255,255,0.03)' : 'rgba(245, 158, 11, 0.12)',
                border: `1px solid ${value === null ? 'rgba(255,255,255,0.06)' : LINE}`,
                borderRadius: '16px',
                padding: '16px 8px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '20px', color: MUTED, marginBottom: '6px' }}>{i + 1}</div>
              <div
                style={{
                  fontSize: '40px',
                  fontWeight: 600,
                  color: value === null ? MUTED : TEXT,
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1
                }}
              >
                {value ?? '–'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Fuß ── */}
      <div
        style={{
          marginTop: '36px',
          paddingTop: '28px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '26px',
          color: MUTED
        }}
      >
        <span>🎯 Dartcounter</span>
        <span>{darts} Darts · {thrown.length} Runden</span>
      </div>
    </div>
  );
};
