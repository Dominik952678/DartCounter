import React from 'react';
import type { GameConfig } from '../../types';

export interface SavedMatchSummary {
  players: { name: string; score: number; legs: number; sets: number; isBot?: boolean; team?: number }[];
  config: GameConfig;
}

interface SavedGameCardProps {
  match: SavedMatchSummary;
  onResume: () => void;
  onDiscard: () => void;
  onDismiss: () => void;
}

const distanceLabel = (config: GameConfig): string =>
  config.setsToWin > 1 ? `Best of ${config.setsToWin} Sets` : `Best of ${config.legsToWin} Legs`;

/** The unfinished match waiting to be resumed, with its current scores. */
export const SavedGameCard: React.FC<SavedGameCardProps> = ({ match, onResume, onDiscard, onDismiss }) => (
  <div className="card saved-game-card" style={{
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.18) 0%, rgba(15, 23, 42, 0.98) 100%)',
    border: '1.5px solid rgba(59, 130, 246, 0.65)',
    borderRadius: '16px',
    padding: '16px 18px',
    marginBottom: '22px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(59, 130, 246, 0.2)',
    position: 'relative'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '1.6rem' }} aria-hidden="true">🎯</span>
        <div>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '1.05rem', fontWeight: 800 }}>Laufendes Match gefunden</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim, #aaa)' }}>
            {match.config.startScore} {match.config.outMode} {match.config.is2v2 ? '· 2v2 Doppel' : ''} · {distanceLabel(match.config)}
          </span>
        </div>
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: 'rgba(148, 163, 184, 0.12)',
          border: 'none',
          color: 'var(--text-dim, #aaa)',
          fontSize: '1rem',
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: '6px'
        }}
        title="Schließen"
      >
        ✕
      </button>
    </div>

    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${Math.min(match.players.length, 4)}, 1fr)`,
      gap: '8px',
      background: 'rgba(0, 0, 0, 0.35)',
      padding: '10px',
      borderRadius: '10px',
      marginBottom: '14px'
    }}>
      {match.players.map((p, idx) => (
        <div key={idx} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text, #fff)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {p.isBot ? '🤖 ' : ''}{p.name}
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--blue, #3B82F6)' }}>
            {p.score}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim, #888)' }}>
            {p.legs} {p.legs === 1 ? 'Leg' : 'Legs'}
          </div>
        </div>
      ))}
    </div>

    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <button
        className="btn-primary"
        onClick={onResume}
        style={{
          flex: '1 1 160px',
          fontWeight: 800,
          padding: '11px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          fontSize: '0.9rem'
        }}
      >
        ▶️ Spiel fortsetzen
      </button>

      <button
        className="btn-secondary"
        onClick={onDiscard}
        style={{
          flex: '1 1 160px',
          fontWeight: 700,
          padding: '11px 14px',
          borderColor: 'rgba(255, 69, 58, 0.45)',
          color: '#ff453a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          fontSize: '0.9rem'
        }}
      >
        🗑️ Altes Spiel verwerfen
      </button>

      <button
        className="btn-secondary"
        onClick={onDismiss}
        style={{ flex: '0 0 auto', fontWeight: 600, padding: '11px 14px', fontSize: '0.9rem' }}
      >
        Schließen
      </button>
    </div>
  </div>
);

interface OverwriteSavedGameModalProps {
  onResume: () => void;
  onOverwrite: () => void;
  onCancel: () => void;
}

/** Asked when a new match would overwrite a saved one the player never ended. */
export const OverwriteSavedGameModal: React.FC<OverwriteSavedGameModalProps> = ({ onResume, onOverwrite, onCancel }) => (
  <div className="modal-backdrop" style={{
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0, 0, 0, 0.78)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px'
  }}>
    <div className="card" style={{
      maxWidth: '460px',
      width: '100%',
      background: 'rgba(24, 24, 34, 0.98)',
      border: '1.5px solid rgba(10, 132, 255, 0.65)',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7)'
    }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span aria-hidden="true">🎯</span> Laufendes Match gefunden
      </h3>
      <p style={{ color: 'var(--text-dim, #ccc)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '20px' }}>
        Du hast noch ein unvollendetes Spiel gespeichert. Wie möchtest du fortfahren?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          className="btn-primary"
          onClick={onResume}
          style={{ padding: '13px', fontWeight: 800, fontSize: '0.95rem' }}
        >
          ▶️ Aktuelles Spiel fortsetzen
        </button>
        <button
          className="btn-primary"
          onClick={onOverwrite}
          style={{ background: 'linear-gradient(135deg, #ff3b30, #c70000)', borderColor: '#ff3b30', padding: '13px', fontWeight: 800, fontSize: '0.95rem' }}
        >
          🆕 Altes verwerfen & Neues Spiel starten
        </button>
        <button
          className="btn-secondary"
          onClick={onCancel}
          style={{ padding: '11px', fontWeight: 600 }}
        >
          Abbrechen
        </button>
      </div>
    </div>
  </div>
);
