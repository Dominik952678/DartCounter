import React, { useId, useState } from 'react';
import type { Profile } from '../../types';
import { Icons, Toggle } from '../ui';
import { BOT_AVERAGES, NEW_BOT_AVERAGE } from '../../utils/botProfiles';

interface CreateProfileCardProps {
  profiles: Record<string, Profile>;
  onCreateProfile: (name: string, isBot?: boolean, targetAverage?: number) => void;
}

/** „Neuer Spieler" (Entwurf H2): Name, Plus, als Bot mit Zielschnitt. */
export const CreateProfileCard: React.FC<CreateProfileCardProps> = ({ profiles, onCreateProfile }) => {
  const nameInputId = useId();
  const [name, setName] = useState('');
  const [isBot, setIsBot] = useState(false);
  const [botAvg, setBotAvg] = useState<number>(NEW_BOT_AVERAGE);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Bitte gib einen Namen ein.');
      return;
    }
    if (profiles[trimmed]) {
      setError(`Ein Profil mit dem Namen "${trimmed}" existiert bereits.`);
      return;
    }
    setError(null);
    onCreateProfile(trimmed, isBot, isBot ? botAvg : undefined);
    setName('');
    setIsBot(false);
    setBotAvg(NEW_BOT_AVERAGE);
  };

  return (
    <section className="profile-card">
      <h2 className="label-caps">Neuer Spieler</h2>
      <div className="profile-create-row">
        <label htmlFor={nameInputId} className="sr-only">Spielername</label>
        <input
          id={nameInputId}
          type="text"
          className="profile-create-input"
          placeholder="Spielername"
          value={name}
          onChange={e => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />
        <button type="button" className="profile-create-btn" onClick={handleCreate} aria-label="Profil erstellen">
          <Icons.IconPlus size={22} />
        </button>
      </div>

      {error && <p className="setup-error-text" role="alert">{error}</p>}

      <Toggle checked={isBot} onChange={setIsBot} label="Als Bot anlegen" />

      {/* Gespeichert wird der Average, und der steht nach dem Spiel auch im Profil —
          eine erfundene „Stufe 1–10" davor gibt es nicht mehr. */}
      {isBot && (
        <label className="profile-select">
          <span className="label-caps">Spielstärke</span>
          <select value={botAvg} onChange={e => setBotAvg(parseInt(e.target.value, 10))} aria-label="Spielstärke des Bots">
            {BOT_AVERAGES.map(avg => (
              <option key={avg} value={avg}>Ø {avg} pro Aufnahme</option>
            ))}
          </select>
          <Icons.IconChevronDown size={16} />
        </label>
      )}
    </section>
  );
};
