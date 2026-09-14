import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { GameConfig, Profile } from '../types';
import { MatchSetup } from './MatchSetup';
import { Icons } from './ui';

interface PlayScreenProps {
  profiles: Record<string, Profile>;
  setProfiles: (profiles: Record<string, Profile>) => void;
  onStartGame: (players: string[], config: GameConfig) => void;
  hasSavedGame?: boolean;
  onResumeGame?: () => void;
  onDiscardSavedGame?: () => void;
}

/**
 * „Spielen": ein neues X01-Match einrichten, und darüber der Weg zu Online.
 *
 * Bis v1.17 lagen Match und Training als zwei Reiter unter `/offline`. Training
 * hat jetzt einen eigenen Tab, deshalb bleibt hier nur das Match.
 */
export const PlayScreen: React.FC<PlayScreenProps> = ({
  profiles,
  setProfiles,
  onStartGame,
  hasSavedGame,
  onResumeGame,
  onDiscardSavedGame
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  /* `?start=1` kommt von der orangen Karte des Start-Screens. Beim Mounten
     gelesen und festgehalten: der Parameter darf den Start genau einmal
     auslösen. Dass es auch bei wiederholtem Rendern nur einer bleibt, sichert
     `MatchSetup` selbst ab. */
  const [autoStart] = useState(() => searchParams.get('start') === '1');

  return (
    <div className="play-screen">
      <button type="button" className="play-online" onClick={() => navigate('/online')}>
        <span className="start-mark start-mark-ring is-success" aria-hidden="true" />
        <span className="play-online-text">
          <span className="play-online-title">Online spielen</span>
          <span className="play-online-sub">Mit Code beitreten oder Raum öffnen</span>
        </span>
        <Icons.IconChevronRight size={18} />
      </button>

      <MatchSetup
        profiles={profiles}
        setProfiles={setProfiles}
        onStartGame={onStartGame}
        hasSavedGame={hasSavedGame}
        onResumeGame={onResumeGame}
        onDiscardSavedGame={onDiscardSavedGame}
        autoStart={autoStart}
      />
    </div>
  );
};
