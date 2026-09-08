import React from 'react';
import { DartboardHeatmap } from './DartboardHeatmap';

/**
 * Ein Eintrag im Runden-Raster des Bildes.
 *
 * Die drei Modi zählen Verschiedenes — Power Scoring Punkte je Runde, Split
 * Score Ziele, Checkout Finishes —, aber alle drei zeigen dasselbe: eine
 * Beschriftung, einen Wert und ob es geklappt hat. Mehr braucht das Raster
 * nicht zu wissen.
 */
export interface StoryEntry {
  /** Steht klein über dem Wert: Rundennummer, Ziel, Restpunktzahl. */
  label: string;
  /** Die Zahl oder das Kürzel im Kasten. */
  value: string;
  state: 'hit' | 'miss' | 'open';
}

export interface StoryStat {
  label: string;
  value: string;
}

interface MiniGameStoryExportProps {
  exportId: string;
  /** Zeile ganz oben, z. B. „🔥 POWER SCORING". */
  mode: string;
  playerName: string;
  isWinner: boolean;
  date: string;
  /** Die große Zahl in der Mitte und ihre Beschriftung. */
  headline: string;
  headlineLabel: string;
  /** Genau drei — mehr passt nicht nebeneinander. */
  stats: [StoryStat, StoryStat, StoryStat];
  segmentHits: Record<string, number>;
  entriesLabel: string;
  entries: StoryEntry[];
  /** Fußzeile rechts, z. B. „27 Darts · 9 Runden". */
  footnote: string;
}

/**
 * Das Ergebnis einer Trainingsrunde als Bild im Story-Format.
 *
 * Liegt außerhalb des Sichtbereichs und wird von `exportElementAsImage` mit
 * html2canvas abgefilmt — deshalb 1080×1920 fest und keine Einheiten, die von
 * der Fenstergröße abhingen.
 *
 * Die Farben sind bewusst Literale statt Tokens: das Bild verlässt die App und
 * soll in jedem Theme gleich aussehen. Wer es in einer Story teilt, teilt nicht
 * seine Theme-Einstellung mit.
 */
const INK = '#0B1120';
const ACCENT = '#F59E0B';
const TEXT = '#F5F5F0';
const MUTED = '#8B93A6';
const GOOD = '#10B981';
const BAD = '#EF4444';

const ENTRY_STYLE: Record<StoryEntry['state'], { bg: string; border: string; value: string }> = {
  hit: { bg: 'rgba(245, 158, 11, 0.14)', border: 'rgba(245, 158, 11, 0.35)', value: TEXT },
  miss: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.35)', value: BAD },
  open: { bg: 'rgba(255, 255, 255, 0.03)', border: 'rgba(255, 255, 255, 0.06)', value: MUTED }
};

const StatTile: React.FC<StoryStat & { accent?: boolean }> = ({ label, value, accent }) => (
  <div
    style={{
      flex: 1,
      background: 'rgba(255, 255, 255, 0.04)',
      border: `1px solid ${accent ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: '20px',
      padding: '28px 20px',
      textAlign: 'center'
    }}
  >
    <div style={{ fontSize: '24px', color: MUTED, marginBottom: '10px' }}>{label}</div>
    <div
      style={{
        fontSize: '52px',
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

export const MiniGameStoryExport: React.FC<MiniGameStoryExportProps> = ({
  exportId,
  mode,
  playerName,
  isWinner,
  date,
  headline,
  headlineLabel,
  stats,
  segmentHits,
  entriesLabel,
  entries,
  footnote
}) => {
  // Ab zwölf Einträgen wird sechsspaltig gesetzt, sonst wachsen die Kästen
  // über die Bildhöhe hinaus — Checkout kann zwanzig Ziele haben.
  const columns = entries.length > 12 ? 6 : 5;

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
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '30px', letterSpacing: '8px', color: ACCENT, marginBottom: '14px' }}>
          {mode}
        </div>
        <div style={{ fontSize: '72px', fontWeight: 600, lineHeight: 1.05 }}>
          {isWinner ? '🏆 ' : ''}{playerName}
        </div>
        <div style={{ fontSize: '26px', color: MUTED, marginTop: '12px' }}>{date}</div>
      </div>

      <div style={{ textAlign: 'center', margin: '40px 0 32px' }}>
        <div
          style={{
            fontSize: '200px',
            fontWeight: 700,
            color: ACCENT,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            textShadow: '0 0 60px rgba(245, 158, 11, 0.35)'
          }}
        >
          {headline}
        </div>
        <div style={{ fontSize: '28px', color: MUTED, letterSpacing: '4px' }}>{headlineLabel}</div>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '36px' }}>
        <StatTile {...stats[0]} accent />
        <StatTile {...stats[1]} />
        <StatTile {...stats[2]} />
      </div>

      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          padding: '24px',
          marginBottom: '32px'
        }}
      >
        <DartboardHeatmap customHits={segmentHits} title="Treffer-Heatmap" staticView />
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <div style={{ fontSize: '26px', color: MUTED, marginBottom: '16px', letterSpacing: '2px' }}>
          {entriesLabel}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '12px' }}>
          {entries.map((entry, i) => {
            const look = ENTRY_STYLE[entry.state];
            return (
              <div
                key={i}
                style={{
                  background: look.bg,
                  border: `1px solid ${look.border}`,
                  borderRadius: '16px',
                  padding: '14px 6px',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '19px', color: MUTED, marginBottom: '6px' }}>{entry.label}</div>
                <div
                  style={{
                    fontSize: columns > 5 ? '32px' : '38px',
                    fontWeight: 600,
                    color: look.value,
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1
                  }}
                >
                  {entry.value}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          marginTop: '32px',
          paddingTop: '26px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '26px',
          color: MUTED
        }}
      >
        <span>🎯 Dartcounter</span>
        <span>{footnote}</span>
      </div>
    </div>
  );
};

export { GOOD as STORY_GOOD, BAD as STORY_BAD };
