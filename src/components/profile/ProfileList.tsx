import React, { useState } from 'react';
import type { Profile } from '../../types';
import { ConfirmModal } from '../ConfirmModal';
import { Icons } from '../ui';
import { botAverage, botAverageOptions } from '../../utils/botProfiles';
import { DEFAULT_PLAYER_COLOR_HEX, isHexColor, playerColorByName } from '../../utils/playerColors';

interface ProfileListProps {
  profiles: Record<string, Profile>;
  /** Das eigene Profil bekommt „Du" statt des Löschknopfs nicht — nur die Kennzeichnung. */
  ownName?: string;
  /** Öffnet die Statistik dieses Spielers. */
  onOpenProfile: (name: string) => void;
  /** Spielstärke der Bots und Farbe — beides direkt auf der Zeile. */
  onUpdateProfile: (name: string, updates: Partial<Profile>) => void;
  /** Löscht ein Profil, bei einem Cloud-Gast trennt es die Verknüpfung. */
  onDeleteProfile: (name: string) => void;
  onImportGuest: () => void;
}

const subline = (name: string, p: Profile, ownName?: string) => {
  if (p.isLinkedCloudGuest) return 'Cloud-Gast · synchronisiert';
  if (p.isBot) return 'Bot';
  const average = p.dartsThrown ? ` · Ø ${((p.pointsScored / p.dartsThrown) * 3).toFixed(1)}` : '';
  return `${name === ownName ? 'Eigenes Profil' : 'Lokal'} · ${p.matches} Matches${average}`;
};

/** Spieler & Bots (Entwurf H2): jede Person eine Zeile, Farbe, Stärke und Löschen direkt daran. */
export const ProfileList: React.FC<ProfileListProps> = ({
  profiles,
  ownName,
  onOpenProfile,
  onUpdateProfile,
  onDeleteProfile,
  onImportGuest
}) => {
  const names = Object.keys(profiles);
  const [pending, setPending] = useState<string | null>(null);
  const pendingIsGuest = pending ? !!profiles[pending]?.isLinkedCloudGuest : false;

  return (
    <section className="setup-section">
      <div className="setup-section-head">
        <h2 className="setup-section-title">Profile · {names.length}</h2>
        <button type="button" className="setup-link" onClick={onImportGuest}>
          <Icons.IconCloud size={16} /> Gast importieren
        </button>
      </div>

      {names.length === 0 ? (
        <p className="online-hint">Noch keine Profile vorhanden.</p>
      ) : (
        <ul className="person-list">
          {names.map(name => {
            const p = profiles[name];
            const color = p.color || playerColorByName(name);
            return (
              <li key={name} className="person-row">
                <label className="person-color" title={`Farbe von ${name}`}>
                  <span className="seat-avatar" style={{ '--player-color': color } as React.CSSProperties} aria-hidden="true">
                    {p.isBot ? <Icons.IconBot size={18} /> : name.charAt(0).toUpperCase()}
                  </span>
                  <input
                    type="color"
                    className="person-color-input"
                    value={isHexColor(p.color) ? p.color : DEFAULT_PLAYER_COLOR_HEX}
                    onChange={e => onUpdateProfile(name, { color: e.target.value })}
                    aria-label={`Farbe von ${name}`}
                  />
                </label>

                <button type="button" className="person-main" onClick={() => onOpenProfile(name)}>
                  <span className="person-name">{name}</span>
                  <span className="person-sub">{subline(name, p, ownName)}</span>
                </button>

                {/* Bei mehreren Bots ist die Stärke das Einzige, was sie unterscheidet. */}
                {p.isBot && (
                  <select
                    className="person-avg"
                    value={botAverage(p)}
                    onChange={e => onUpdateProfile(name, { targetAverage: parseInt(e.target.value, 10) })}
                    aria-label={`Spielstärke von ${name}`}
                  >
                    {botAverageOptions(botAverage(p)).map(avg => (
                      <option key={avg} value={avg}>Ø {avg}</option>
                    ))}
                  </select>
                )}

                {name === ownName && <span className="label-caps person-you">Du</span>}

                {p.isLinkedCloudGuest ? (
                  <button
                    type="button"
                    className="person-action"
                    onClick={() => setPending(name)}
                    title={`Verknüpfung zu „${name}“ trennen`}
                    aria-label={`Verknüpfung zu „${name}“ trennen`}
                  >
                    <Icons.IconLink size={17} />
                  </button>
                ) : name !== ownName && (
                  <button
                    type="button"
                    className="person-action"
                    onClick={() => setPending(name)}
                    title={`Profil „${name}“ löschen`}
                    aria-label={`Profil „${name}“ löschen`}
                  >
                    <Icons.IconClose size={16} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {pending && (
        <ConfirmModal
          title={pendingIsGuest ? 'Verknüpfung trennen?' : 'Profil löschen?'}
          message={pendingIsGuest
            ? `„${pending}“ verschwindet von diesem Gerät. Das Cloud-Profil selbst bleibt bestehen.`
            : `„${pending}“ wird mit allen Statistiken entfernt.\nDie gespielten Matches bleiben in der Historie.`}
          confirmLabel={pendingIsGuest ? 'Trennen' : 'Löschen'}
          destructive
          icon={pendingIsGuest ? <Icons.IconLink size={40} /> : <Icons.IconTrash size={40} />}
          onConfirm={() => {
            onDeleteProfile(pending);
            setPending(null);
          }}
          onCancel={() => setPending(null)}
        />
      )}
    </section>
  );
};
