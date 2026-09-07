import React, { useId } from 'react';
import type { GameConfig } from '../../types';
import { useModalA11y } from '../../hooks/useModalA11y';
import { Button, Card } from '../ui';
import { playerColorBySeat } from '../../utils/playerColors';

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

// The engine plays "first to N", not "best of N" — at legsToWin=3 the match
// ends after two legs won, one leg short of what "Best of 3" would promise.
const distanceLabel = (config: GameConfig): string =>
  config.setsToWin > 1 ? `Bis ${config.setsToWin} Sätze` : `Bis ${config.legsToWin} Legs`;

/** The unfinished match waiting to be resumed, with its current scores. */
export const SavedGameCard: React.FC<SavedGameCardProps> = ({ match, onResume, onDiscard, onDismiss }) => (
  <Card className="saved-game-card">
    <div className="saved-game-header">
      <div className="saved-game-heading">
        <span className="saved-game-icon" aria-hidden="true">🎯</span>
        <div>
          <h3>Laufendes Match gefunden</h3>
          <span className="saved-game-meta">
            {match.config.startScore} {match.config.outMode} {match.config.is2v2 ? '· 2v2 Doppel' : ''} · {distanceLabel(match.config)}
          </span>
        </div>
      </div>
      <Button variant="ghost" className="btn-close" onClick={onDismiss} aria-label="Hinweis schließen" title="Schließen">
        ✕
      </Button>
    </div>

    {/* Label über Kennzahl, große Zahl darunter — das Stats-Karten-Muster aus
        §7, das ausdrücklich beibehalten wird. Die Zahl trägt die Farbe des
        Spielers, nicht ein pauschales Blau. */}
    <div
      className="saved-game-scores"
      style={{ gridTemplateColumns: `repeat(${Math.min(match.players.length, 4)}, 1fr)` }}
    >
      {match.players.map((p, idx) => (
        <div key={idx} className="saved-game-score">
          <span className="saved-game-player">{p.isBot ? '🤖 ' : ''}{p.name}</span>
          <span className="saved-game-value" style={{ color: playerColorBySeat(idx) }}>{p.score}</span>
          <span className="saved-game-legs">{p.legs} {p.legs === 1 ? 'Leg' : 'Legs'}</span>
        </div>
      ))}
    </div>

    {/* Solange diese Karte steht, ist Fortsetzen die dringlichere Aktion und
        bekommt die eine Akzentfläche, die §1 pro Screen zulässt — der
        Start-Button unten schaltet dafür auf sekundär. */}
    <div className="saved-game-actions">
      <Button variant="primary" onClick={onResume} style={{ flex: '1 1 160px' }}>
        ▶️ Spiel fortsetzen
      </Button>
      <Button variant="secondary" onClick={onDiscard} style={{ flex: '1 1 160px' }}>
        🗑️ Altes Spiel verwerfen
      </Button>
      {/* Tut dasselbe wie das ✕ oben. Bleibt trotzdem: die beschriftete
          Variante ist die auffindbarere von beiden. */}
      <Button variant="ghost" onClick={onDismiss} style={{ flex: '0 0 auto' }}>
        Schließen
      </Button>
    </div>
  </Card>
);

interface OverwriteSavedGameModalProps {
  onResume: () => void;
  onOverwrite: () => void;
  onCancel: () => void;
}

/** Asked when a new match would overwrite a saved one the player never ended. */
export const OverwriteSavedGameModal: React.FC<OverwriteSavedGameModalProps> = ({ onResume, onOverwrite, onCancel }) => {
  const titleId = useId();
  const messageId = useId();
  const dialogRef = useModalA11y<HTMLDivElement>({ onClose: onCancel });

  return (
  /* Nutzt die gemeinsamen Modal-Klassen statt eines eigenen Overlays. Vorher
     baute dieser Dialog Hintergrund, Rahmen, Radius und Schatten selbst nach —
     mit blauem Rand und #fff-Überschrift, also weder Rolle noch Skala. */
  <div className="modal-overlay" onClick={onCancel}>
    <div
      ref={dialogRef}
      className="modal-content"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      tabIndex={-1}
      onClick={e => e.stopPropagation()}
      style={{ maxWidth: '460px' }}
    >
      <h3 id={titleId} className="modal-title">
        <span aria-hidden="true">🎯</span> Laufendes Match gefunden
      </h3>
      <p id={messageId} className="modal-text">
        Du hast noch ein unvollendetes Spiel gespeichert. Wie möchtest du fortfahren?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <Button
          variant="primary"
          onClick={onResume}
        >
          ▶️ Aktuelles Spiel fortsetzen
        </Button>
        <Button
          variant="danger"
          onClick={onOverwrite}
        >
          🆕 Altes verwerfen & Neues Spiel starten
        </Button>
        <Button
          variant="secondary"
          onClick={onCancel}
        >
          Abbrechen
        </Button>
      </div>
    </div>
  </div>
  );
};
