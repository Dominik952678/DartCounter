import React, { useEffect, useRef } from 'react';
import type { Profile } from '../../types';
import type { Lineup } from './useLineup';
import { Button, Icons, Slider, Toggle } from '../ui';
import { botRosterLabel } from '../../utils/botProfiles';
import { playerColorBySeat, teamColor } from '../../utils/playerColors';

interface PlayerSelectionProps {
  profiles: Record<string, Profile>;
  isGuest: boolean;
  playerCount: number;
  is2v2: boolean;
  lineup: Lineup;
  errorMsg: string | null;
  onPlayerCountChange: (count: number) => void;
  onAddCloudGuest: () => void;
}

/** Wer spielt, in welcher Reihenfolge, und wie Leg 1 beginnt (Entwurf B1, B2). */
export const PlayerSelection: React.FC<PlayerSelectionProps> = ({
  profiles,
  isGuest,
  playerCount,
  is2v2,
  lineup,
  errorMsg,
  onPlayerCountChange,
  onAddCloudGuest
}) => {
  const profileNames = Object.keys(profiles);
  const { selectedPlayers, guestBots } = lineup;
  const errorRef = useRef<HTMLDivElement>(null);
  // „beginnt" steht nur da, wenn die Reihenfolge schon feststeht.
  const starterKnown = !lineup.bullOffEnabled && !lineup.randomOrderOnStart;

  // Der Start-Button sitzt unten; die Meldung würde am Telefon sonst außerhalb
  // des Sichtfelds erscheinen.
  useEffect(() => {
    if (errorMsg) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [errorMsg]);

  return (
    <>
      <section className="setup-section">
        <div className="setup-section-head">
          <h2 className="setup-section-title">{is2v2 ? 'Teams' : `Spieler · ${playerCount}`}</h2>
          {!isGuest && (
            <button type="button" className="setup-link" onClick={onAddCloudGuest}>
              <Icons.IconCloud size={15} /> Cloud-Gast
            </button>
          )}
        </div>

        {!is2v2 && (
          <Slider
            name="playerCount"
            variant="tiles"
            value={playerCount}
            options={[1, 2, 3, 4].map(count => ({ value: count, label: count, ariaLabel: `${count} Spieler` }))}
            onChange={onPlayerCountChange}
            ariaLabel="Anzahl Spieler"
          />
        )}

        <div className="seat-list">
          {Array.from({ length: playerCount }, (_, i) => {
            const playerName = selectedPlayers[i] || '';
            const isBot = isGuest ? guestBots[playerName] : profiles[playerName]?.isBot;
            const team: 1 | 2 = i % 2 === 0 ? 1 : 2;

            return (
              <div
                key={i}
                className="seat-row"
                style={{ '--player-color': is2v2 ? teamColor(team) : playerColorBySeat(i) } as React.CSSProperties}
                draggable
                onDragStart={e => lineup.onDragStart(e, i)}
                onDragEnd={lineup.onDragEnd}
                onDragOver={lineup.onDragOver}
                onDrop={e => lineup.onDrop(e, i)}
              >
                <span className="seat-handle" title="Zum Verschieben ziehen" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2 4h12v2H2V4zm0 6h12v2H2v-2z" />
                  </svg>
                </span>
                <div className="seat-order">
                  <button
                    type="button"
                    className="seat-move-btn"
                    onClick={() => lineup.movePlayer(i, 'up')}
                    disabled={i === 0}
                    aria-label="Spieler nach oben"
                  >
                    <Icons.IconChevronUp size={15} />
                  </button>
                  <button
                    type="button"
                    className="seat-move-btn"
                    onClick={() => lineup.movePlayer(i, 'down')}
                    disabled={i >= playerCount - 1}
                    aria-label="Spieler nach unten"
                  >
                    <Icons.IconChevronDown size={15} />
                  </button>
                </div>

                <span className="seat-avatar" aria-hidden="true">
                  {isBot ? <Icons.IconBot size={17} /> : playerName.charAt(0).toUpperCase() || '?'}
                </span>

                <div className="seat-main">
                  {isGuest ? (
                    <input
                      type="text"
                      className="seat-input"
                      value={playerName}
                      onChange={e => lineup.choosePlayer(i, e.target.value)}
                      placeholder={is2v2 ? `Team ${team} · Spieler ${i < 2 ? 1 : 2}` : `Spieler ${i + 1}`}
                      aria-label={`Name für Platz ${i + 1}`}
                    />
                  ) : (
                    <select
                      className="seat-input"
                      value={playerName}
                      onChange={e => lineup.choosePlayer(i, e.target.value)}
                      aria-label={`Spieler für Platz ${i + 1}`}
                    >
                      {profileNames.map(name => (
                        <option key={name} value={name}>
                          {/* Beim Bot steht der Zielschnitt dabei: mit „Bot leicht" und
                              „Bot stark" in derselben Liste ist die Stärke das, wonach
                              man auswählt. */}
                          {profiles[name]?.isBot ? botRosterLabel(name, profiles[name]) : name}
                          {profiles[name]?.isLinkedCloudGuest ? ' (Cloud-Gast)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {is2v2 ? (
                  <span className="seat-tag">{`Team ${team}`}</span>
                ) : i === 0 && starterKnown && playerCount > 1 ? (
                  <span className="seat-tag is-starter">beginnt</span>
                ) : null}

                {isGuest && (
                  <label className="seat-bot">
                    <input
                      type="checkbox"
                      checked={guestBots[playerName] || false}
                      onChange={e => lineup.toggleGuestBot(i, e.target.checked)}
                    />
                    Bot
                  </label>
                )}
              </div>
            );
          })}
        </div>

        {errorMsg && (
          <div ref={errorRef} role="alert" className="setup-error">
            <Icons.IconAlert size={18} />
            <span>{errorMsg}</span>
          </div>
        )}
      </section>

      <section className="setup-section">
        <h2 className="setup-section-title">Optionen</h2>
        {/* Beide entscheiden, wer Leg 1 beginnt — deshalb schließen sie sich aus. */}
        <div className="toggle-list">
          <Toggle
            icon={<Icons.IconBull size={18} />}
            label="Ausbullen"
            checked={lineup.bullOffEnabled}
            onChange={on => {
              lineup.setBullOffEnabled(on);
              if (on) lineup.setRandomOrderOnStart(false);
            }}
          />
          <Toggle
            icon={<Icons.IconShuffle size={18} />}
            label="Zufällige Reihenfolge"
            checked={lineup.randomOrderOnStart}
            onChange={on => {
              lineup.setRandomOrderOnStart(on);
              if (on) lineup.setBullOffEnabled(false);
            }}
          />
        </div>
        {!lineup.randomOrderOnStart && playerCount > 1 && (
          <Button
            variant="ghost"
            size="compact"
            className="setup-shuffle"
            onClick={lineup.randomizeOrder}
            disabled={lineup.isShuffling}
          >
            <Icons.IconOneTimeShuffle size={16} /> Einmal mischen
          </Button>
        )}
      </section>
    </>
  );
};
