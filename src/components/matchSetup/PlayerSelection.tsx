import React, { useEffect, useRef } from 'react';
import type { Profile } from '../../types';
import type { Lineup } from './useLineup';
import { Button, Card, CardHeader, ChoiceGroup } from '../ui';

interface PlayerSelectionProps {
  profiles: Record<string, Profile>;
  isGuest: boolean;
  playerCount: number;
  is2v2: boolean;
  lineup: Lineup;
  errorMsg: string | null;
  onModeChange: (is2v2: boolean) => void;
  onPlayerCountChange: (count: number) => void;
  onAddCloudGuest: () => void;
}

/** A stable colour per name, so the same player keeps the same avatar. */
const avatarColor = (name: string): string => {
  const colors = ['var(--blue)', 'var(--green)', 'var(--orange)', 'var(--purple)', 'var(--red)'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

/** Mode, seat count, and the four seats themselves with their ordering controls. */
export const PlayerSelection: React.FC<PlayerSelectionProps> = ({
  profiles,
  isGuest,
  playerCount,
  is2v2,
  lineup,
  errorMsg,
  onModeChange,
  onPlayerCountChange,
  onAddCloudGuest
}) => {
  const profileNames = Object.keys(profiles);
  const { selectedPlayers, guestBots } = lineup;
  const errorRef = useRef<HTMLDivElement>(null);

  // The trigger for this error sits below the settings panel, off-screen from
  // this card on a phone — nothing moved the error into view before.
  useEffect(() => {
    if (errorMsg) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [errorMsg]);

  return (
    <Card>
      <CardHeader heading="Modus & Spieler" />

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <ChoiceGroup
          name="matchMode2v2"
          value={is2v2 ? 'team' : 'single'}
          options={[
            { value: 'single', label: '👤 Einzel' },
            { value: 'team', label: '👥 2v2 Doppel' }
          ]}
          onChange={value => onModeChange(value === 'team')}
          ariaLabel="Spielmodus"
        />

        {is2v2 ? (
          <div style={{
            background: 'linear-gradient(135deg, rgba(10, 132, 255, 0.12), rgba(90, 200, 250, 0.06))',
            border: '1px solid rgba(10, 132, 255, 0.3)',
            borderRadius: '10px',
            padding: '10px 12px',
            fontSize: '0.82rem',
            lineHeight: 1.4,
            color: 'var(--text)',
            marginBottom: '12px'
          }}>
            ❄️ <strong>Freeze-Regel:</strong> Geworfen wird alternierend (T1 ➔ T2 ➔ T1 ➔ T2). Ein Team gewinnt bei 0 Rest nur, wenn die eigenen Teampunkte ≤ den Gegnerpunkten sind!
          </div>
        ) : (
          <ChoiceGroup
            name="playerCount"
            value={playerCount}
            options={[1, 2, 3, 4].map(count => ({ value: count, label: `${count} Spieler` }))}
            onChange={onPlayerCountChange}
            ariaLabel="Anzahl Spieler"
          />
        )}
      </div>

      <div className="player-selects" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {Array.from({ length: 4 }).map((_, i) => {
          const isVisible = i < playerCount;
          const playerName = selectedPlayers[i] || '';
          const isBot = isGuest ? guestBots[playerName] : profiles[playerName]?.isBot;
          const slotTeam = i % 2 === 0 ? 1 : 2;
          const teamColor = slotTeam === 1 ? 'var(--blue, #3B82F6)' : 'var(--orange, #F97316)';

          return (
            <div
              key={i}
              className="player-slot"
              style={{
                display: isVisible ? 'block' : 'none',
                opacity: isVisible ? 1 : 0,
                height: isVisible ? 'auto' : 0
              }}
              draggable={isVisible}
              onDragStart={e => lineup.onDragStart(e, i)}
              onDragEnd={lineup.onDragEnd}
              onDragOver={lineup.onDragOver}
              onDrop={e => lineup.onDrop(e, i)}
            >
              <div
                className="player-select-wrapper"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'var(--surface)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius)',
                  border: is2v2 ? `1px solid ${teamColor}` : '1px solid var(--card-border)',
                  borderLeft: is2v2 ? `4px solid ${teamColor}` : undefined
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div className="player-drag-handle" title="Zum Verschieben ziehen">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                      <path d="M2 4h12v2H2V4zm0 6h12v2H2v-2z" />
                    </svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button
                      type="button"
                      onClick={() => lineup.movePlayer(i, 'up')}
                      disabled={i === 0}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: i === 0 ? 'rgba(255,255,255,0.15)' : 'var(--text-dim)',
                        padding: '2px 4px',
                        cursor: i === 0 ? 'default' : 'pointer',
                        fontSize: '0.75rem',
                        lineHeight: 1,
                        minHeight: 'auto'
                      }}
                      aria-label="Spieler nach oben"
                      title="Nach oben"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => lineup.movePlayer(i, 'down')}
                      disabled={i >= playerCount - 1}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: i >= playerCount - 1 ? 'rgba(255,255,255,0.15)' : 'var(--text-dim)',
                        padding: '2px 4px',
                        cursor: i >= playerCount - 1 ? 'default' : 'pointer',
                        fontSize: '0.75rem',
                        lineHeight: 1,
                        minHeight: 'auto'
                      }}
                      aria-label="Spieler nach unten"
                      title="Nach unten"
                    >
                      ▼
                    </button>
                  </div>
                </div>

                {is2v2 && (
                  <span style={{
                    background: slotTeam === 1 ? 'rgba(10, 132, 255, 0.2)' : 'rgba(255, 159, 10, 0.2)',
                    color: teamColor,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    flexShrink: 0
                  }}>
                    T{slotTeam}
                  </span>
                )}

                <div className="avatar-circle" style={{ backgroundColor: is2v2 ? teamColor : avatarColor(playerName || `Gast ${i + 1}`) }}>
                  {isBot ? '🤖' : (playerName.charAt(0).toUpperCase() || '?')}
                </div>

                {isGuest ? (
                  <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={playerName}
                      onChange={e => lineup.choosePlayer(i, e.target.value)}
                      placeholder={is2v2 ? `Team ${slotTeam} Spieler ${i < 2 ? 1 : 2}` : `Spieler ${i + 1}`}
                      style={{ flex: 1, padding: '12px', border: 'none', background: 'transparent', color: 'var(--text)', fontSize: '16px' }}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85em', color: 'var(--text-dim)', cursor: 'pointer', minWidth: '48px', minHeight: '48px', justifyContent: 'center' }}>
                      <input
                        type="checkbox"
                        checked={guestBots[playerName] || false}
                        onChange={e => lineup.toggleGuestBot(i, e.target.checked)}
                        style={{ transform: 'scale(1.2)' }}
                      />
                      Bot
                    </label>
                  </div>
                ) : (
                  <select
                    value={playerName}
                    onChange={e => lineup.choosePlayer(i, e.target.value)}
                    style={{ flex: 1, padding: '12px', border: 'none', background: 'transparent', color: 'var(--text)', fontSize: '16px', outline: 'none' }}
                  >
                    {profileNames.map(name => {
                      const isCloudGuest = profiles[name]?.isLinkedCloudGuest;
                      const isProfileBot = profiles[name]?.isBot;
                      return (
                        <option key={name} value={name} style={{ color: '#000', background: '#fff' }}>
                          {isCloudGuest ? '🔗 ' : (isProfileBot ? '🤖 ' : '👤 ')}{name}{isCloudGuest ? ' (Cloud-Gast)' : (isProfileBot ? ' (Bot)' : '')}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!isGuest && (
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={onAddCloudGuest}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            ☁️ Cloud-Gast via Sync-Code hinzufügen
          </Button>
        </div>
      )}

      {errorMsg && (
        <div
          ref={errorRef}
          role="alert"
          style={{
            background: 'var(--red)',
            color: 'white',
            padding: '12px',
            borderRadius: 'var(--radius)',
            marginTop: '15px',
            animation: 'slide-down 0.3s ease-out',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 'bold'
          }}
        >
          <span aria-hidden="true">⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Mutually exclusive with "random order": both decide who starts leg 1,
            so letting a user turn on both at once doesn't make sense. */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 16px',
          background: lineup.bullOffEnabled ? 'rgba(10, 132, 255, 0.12)' : 'var(--surface)',
          border: lineup.bullOffEnabled ? '1px solid var(--blue)' : '1px solid var(--card-border)',
          borderRadius: 'var(--radius)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          userSelect: 'none'
        }}>
          <input
            type="checkbox"
            checked={lineup.bullOffEnabled}
            onChange={e => {
              lineup.setBullOffEnabled(e.target.checked);
              if (e.target.checked) lineup.setRandomOrderOnStart(false);
            }}
            style={{ width: '20px', height: '20px', accentColor: 'var(--blue)', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.95em' }}>
              🎯 Ausbullen
            </span>
            <span style={{ fontSize: '0.8em', color: 'var(--text-dim)' }}>
              {lineup.bullOffEnabled
                ? 'Aktiv: Wer den Bull am nächsten trifft, beginnt Leg 1'
                : 'Inaktiv: Erster Spieler in der Reihenfolge beginnt'}
            </span>
          </div>
        </label>

        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 16px',
          background: lineup.randomOrderOnStart ? 'rgba(10, 132, 255, 0.12)' : 'var(--surface)',
          border: lineup.randomOrderOnStart ? '1px solid var(--blue)' : '1px solid var(--card-border)',
          borderRadius: 'var(--radius)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          userSelect: 'none'
        }}>
          <input
            type="checkbox"
            checked={lineup.randomOrderOnStart}
            onChange={e => {
              lineup.setRandomOrderOnStart(e.target.checked);
              if (e.target.checked) lineup.setBullOffEnabled(false);
            }}
            style={{ width: '20px', height: '20px', accentColor: 'var(--blue)', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.95em' }}>
              🎲 Zufällige Reihenfolge beim Start
            </span>
            <span style={{ fontSize: '0.8em', color: 'var(--text-dim)' }}>
              {lineup.randomOrderOnStart
                ? 'Aktiv: Reihenfolge wird beim Klick auf „Spiel starten“ ausgelost'
                : 'Inaktiv: Ausgewählte Reihenfolge wird übernommen'}
            </span>
          </div>
        </label>

        {!lineup.randomOrderOnStart && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="secondary"
              size="compact"
              onClick={lineup.randomizeOrder}
              style={{
              transform: lineup.isShuffling ? 'scale(0.95)' : 'scale(1)',
              transition: 'transform 0.1s'
              }}
            >
              🔀 Jetzt einmalig mischen
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
