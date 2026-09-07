import React, { useId, useState } from 'react';
import type { Profile } from '../../types';
import { Button, Card, CardHeader } from '../ui';

interface CreateProfileCardProps {
  profiles: Record<string, Profile>;
  onCreateProfile: (name: string, isBot?: boolean, targetAverage?: number) => void;
}

/** A bot's level maps onto the average it plays: level 3 aims at 50. */
const targetAverageForLevel = (level: number): number => level * 10 + 20;

export const CreateProfileCard: React.FC<CreateProfileCardProps> = ({ profiles, onCreateProfile }) => {
  const nameInputId = useId();
  const [name, setName] = useState('');
  const [isBot, setIsBot] = useState(false);
  const [botLevel, setBotLevel] = useState(3);
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
    onCreateProfile(trimmed, isBot, isBot ? targetAverageForLevel(botLevel) : undefined);
    setName('');
    setIsBot(false);
    setBotLevel(3);
  };

  return (
    <Card>
      <CardHeader heading={"Neues Profil erstellen"} />
      <div style={{ display: 'flex', gap: '8px', marginBottom: error ? '6px' : '12px' }}>
        <label htmlFor={nameInputId} className="sr-only">Spielername</label>
        <input
          id={nameInputId}
          type="text"
          placeholder="Spielername"
          value={name}
          onChange={e => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />
        <Button variant="primary" onClick={handleCreate} aria-label="Profil erstellen">+</Button>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          <span aria-hidden="true">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '0.9em', color: 'var(--text-dim)' }}>
        <input
          type="checkbox"
          checked={isBot}
          onChange={e => setIsBot(e.target.checked)}
          style={{ width: 'auto', accentColor: 'var(--accent-primary)' }}
        />
        Als Bot (Computergegner) erstellen
      </label>

      {isBot && (
        <div style={{ marginTop: '10px' }}>
          <label className="section-label">Bot Level: {botLevel} (Avg: ~{targetAverageForLevel(botLevel)})</label>
          <input
            type="range"
            min="1" max="10"
            value={botLevel}
            onChange={e => setBotLevel(parseInt(e.target.value))}
            style={{ width: '100%', marginTop: '5px' }}
          />
        </div>
      )}
    </Card>
  );
};
