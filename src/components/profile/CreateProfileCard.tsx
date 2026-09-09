import React, { useId, useState } from 'react';
import type { Profile } from '../../types';
import { Button, Card, CardHeader, Icons } from '../ui';
import { BOT_AVERAGES, NEW_BOT_AVERAGE } from '../../utils/botProfiles';

interface CreateProfileCardProps {
  profiles: Record<string, Profile>;
  onCreateProfile: (name: string, isBot?: boolean, targetAverage?: number) => void;
}

export const CreateProfileCard: React.FC<CreateProfileCardProps> = ({ profiles, onCreateProfile }) => {
  const nameInputId = useId();
  const botAvgId = useId();
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
          <Icons.IconAlert size={18} />
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

      {/* Hier stand ein „Bot Level 1–10" mit `level * 10 + 20` dahinter. Die
          Stufe war eine Erfindung: gespeichert wurde ohnehin der Average, und
          der ist auch die Zahl, die nach dem Spiel im Profil steht. */}
      {isBot && (
        <div style={{ marginTop: '10px' }}>
          <label className="section-label" htmlFor={botAvgId}>Spielstärke des Bots</label>
          <select
            id={botAvgId}
            value={botAvg}
            onChange={e => setBotAvg(parseInt(e.target.value, 10))}
            style={{ width: '100%', marginTop: '5px' }}
          >
            {BOT_AVERAGES.map(avg => (
              <option key={avg} value={avg}>Ø {avg} pro Aufnahme</option>
            ))}
          </select>
        </div>
      )}
    </Card>
  );
};
