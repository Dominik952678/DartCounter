import React from 'react';
import type { GameConfig } from '../../types';
import { Button, Dialog } from '../ui';

/** What the Start screen and the setup read from a saved, unfinished match. */
export interface SavedMatchSummary {
  players: { name: string; score: number; legs: number; sets: number; isBot?: boolean; team?: number }[];
  config: GameConfig;
}

interface OverwriteSavedGameModalProps {
  onResume: () => void;
  onOverwrite: () => void;
  onCancel: () => void;
}

/** Asked when a new match would replace a saved one the player never ended. */
export const OverwriteSavedGameModal: React.FC<OverwriteSavedGameModalProps> = ({ onResume, onOverwrite, onCancel }) => (
  <Dialog title="Laufendes Match gefunden" onClose={onCancel}>
    <p className="dialog-text">Ein neues Spiel ersetzt das gespeicherte Match.</p>
    <div className="dialog-actions">
      <Button variant="bone" size="large" onClick={onResume}>
        Weiterspielen
      </Button>
      <Button variant="dangerText" size="large" onClick={onOverwrite}>
        Verwerfen &amp; neu starten
      </Button>
      <Button variant="ghost" onClick={onCancel}>
        Abbrechen
      </Button>
    </div>
  </Dialog>
);
