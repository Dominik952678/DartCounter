import React, { useEffect, useRef } from 'react';
import type { Profile } from '../../types';
import type { Lineup } from './useLineup';
import { Button, Card, CardHeader, ChoiceGroup, Icons } from '../ui';
import { playerColorByName, teamColor } from '../../utils/playerColors';

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
            { value: 'single', label: 'Einzel' },
            { value: 'team', label: '2v2 Doppel' }
          ]}
          onChange={value => onModeChange(value === 'team')}
          ariaLabel="Spielmodus"
        />

        {is2v2 ? (
          <p className="callout">
            <Icons.IconFrozen size={17} /> <strong>Freeze-Regel:</strong> Geworfen wird alternierend (T1 → T2 → T1 → T2). Ein Team gewinnt bei 0 Rest nur, wenn die eigenen Teampunkte ≤ den Gegnerpunkten sind!
          </p>
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
          const slotColor = teamColor(slotTeam as 1 | 2);

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
                  border: is2v2 ? `1px solid ${slotColor}` : '1px solid var(--card-border)',
                  borderLeft: is2v2 ? `4px solid ${slotColor}` : undefined
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div className="player-drag-handle" title="Zum Verschieben ziehen">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                      <path d="M2 4h12v2H2V4zm0 6h12v2H2v-2z" />
                    </svg>
                  </div>
                  <div className="seat-order">
                    <button
                      type="button"
                      className="seat-move-btn"
                      onClick={() => lineup.movePlayer(i, 'up')}
                      disabled={i === 0}
                      aria-label="Spieler nach oben"
                      title="Nach oben"
                    >
                      <Icons.IconChevronUp size={15} />
                    </button>
                    <button
                      type="button"
                      className="seat-move-btn"
                      onClick={() => lineup.movePlayer(i, 'down')}
                      disabled={i >= playerCount - 1}
                      aria-label="Spieler nach unten"
                      title="Nach unten"
                    >
                      <Icons.IconChevronDown size={15} />
                    </button>
                  </div>
                </div>

                {is2v2 && (
                  <span className="team-badge" style={{ color: slotColor }}>
                    T{slotTeam}
                  </span>
                )}

                <div className="avatar-circle" style={{ backgroundColor: is2v2 ? slotColor : playerColorByName(playerName || `Gast ${i + 1}`) }}>
                  {isBot ? <Icons.IconBot size={17} /> : (playerName.charAt(0).toUpperCase() || '?')}
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
                          {name}{isCloudGuest ? ' (Cloud-Gast)' : (isProfileBot ? ' (Bot)' : '')}
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
            <Icons.IconCloud size={17} /> Cloud-Gast via Sync-Code hinzufügen
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
            fontWeight: 'var(--weight-medium)'
          }}
        >
          <Icons.IconAlert size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Mutually exclusive with "random order": both decide who starts leg 1,
            so letting a user turn on both at once doesn't make sense. */}
        <label className="option-toggle">
          <input
            type="checkbox"
            checked={lineup.bullOffEnabled}
            onChange={e => {
              lineup.setBullOffEnabled(e.target.checked);
              if (e.target.checked) lineup.setRandomOrderOnStart(false);
            }}
          />
          <span className="option-toggle-body">
            <span className="option-toggle-title">
              <Icons.IconBull size={16} /> Ausbullen
            </span>
            <span className="option-toggle-desc">
              {lineup.bullOffEnabled
                ? 'Aktiv: Wer den Bull am nächsten trifft, beginnt Leg 1'
                : 'Inaktiv: Erster Spieler in der Reihenfolge beginnt'}
            </span>
          </span>
        </label>

        <label className="option-toggle">
          <input
            type="checkbox"
            checked={lineup.randomOrderOnStart}
            onChange={e => {
              lineup.setRandomOrderOnStart(e.target.checked);
              if (e.target.checked) lineup.setBullOffEnabled(false);
            }}
          />
          <span className="option-toggle-body">
            <span className="option-toggle-title">
              <Icons.IconShuffle size={16} /> Zufällige Reihenfolge beim Start
            </span>
            <span className="option-toggle-desc">
              {lineup.randomOrderOnStart
                ? 'Aktiv: Reihenfolge wird beim Klick auf „Spiel starten“ ausgelost'
                : 'Inaktiv: Ausgewählte Reihenfolge wird übernommen'}
            </span>
          </span>
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
              <Icons.IconShuffle size={16} /> Jetzt einmalig mischen
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
