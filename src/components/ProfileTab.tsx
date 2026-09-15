import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { MatchHistory, Profile } from '../types';
import { GuestSyncRedeemModal } from './GuestSyncRedeemModal';
import { AppInfoCard } from './profile/AppInfoCard';
import { CreateProfileCard } from './profile/CreateProfileCard';
import { DataExportCard } from './profile/DataExportCard';
import { DefaultGameSheet } from './profile/DefaultGameSheet';
import { GuestSyncCard } from './profile/GuestSyncCard';
import { ProfileList } from './profile/ProfileList';
import { SampleDataCard } from './profile/SampleDataCard';
import { useGuestSync } from './profile/useGuestSync';
import { useAuthStore } from '../store/useAuthStore';
import { isSoundEnabled, setSoundEnabled } from '../utils/audio';
import {
  defaultGameTitle,
  readCheckoutHints,
  readDefaultGame,
  readKeepAwake,
  writeCheckoutHints,
  writeKeepAwake
} from '../utils/deviceSettings';
import { clearDeviceData } from '../utils/storage';
import { playerColorByName } from '../utils/playerColors';
import { Button, Dialog, Icons, Toggle } from './ui';

interface ProfileTabProps {
  profiles: Record<string, Profile>;
  matches: MatchHistory[];
  /** Whether the account has matches beyond the loaded window. */
  hasMoreMatches?: boolean;
  onLoadMoreMatches?: () => void;
  onCreateProfile: (name: string, isBot?: boolean, targetAverage?: number) => void;
  onUpdateProfile: (name: string, updates: Partial<Profile>) => void;
  onDeleteProfile: (name: string) => void;
  /** Writes a whole profile set at once — for restoring a backup. */
  onImportProfiles?: (next: Record<string, Profile>) => Promise<void> | void;
  onMatchesChanged?: () => void;
}

const ToggleText: React.FC<{ title: string; sub: string }> = ({ title, sub }) => (
  <span className="profile-toggle-text">
    <span>{title}</span>
    <span className="profile-toggle-sub">{sub}</span>
  </span>
);

interface RowProps {
  icon?: React.ReactNode;
  title: string;
  value?: string;
  onClick: () => void;
}

const Row: React.FC<RowProps> = ({ icon, title, value, onClick }) => (
  <button type="button" className="profile-row" onClick={onClick}>
    {icon && <span className="profile-row-icon" aria-hidden="true">{icon}</span>}
    <span className="profile-row-title">{title}</span>
    {value && <span className="profile-row-value">{value}</span>}
    <Icons.IconChevronRight size={16} />
  </button>
);

/**
 * Profil (Entwurf H1–H3): Mein Profil mit den Einstellungen, darunter die Wege
 * zu Spieler & Bots und zu Daten & Konto. Die Match-Historie und der
 * Direktvergleich stehen seit v2.0.0 in der Statistik.
 */
export const ProfileTab: React.FC<ProfileTabProps> = ({
  profiles,
  matches,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile,
  onImportProfiles,
  onMatchesChanged
}) => {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const guestSync = useGuestSync(user, profiles, matches);

  const [showImportModal, setShowImportModal] = useState(false);
  const [showDefaultGame, setShowDefaultGame] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [defaultGame, setDefaultGame] = useState(readDefaultGame);
  const [checkoutHints, setCheckoutHints] = useState(readCheckoutHints);
  const [soundOn, setSoundOn] = useState(isSoundEnabled);
  const [keepAwake, setKeepAwake] = useState(readKeepAwake);

  const view = params.get('view');
  const open = (next: 'players' | 'data' | null) => {
    const search = new URLSearchParams(params);
    if (next) search.set('view', next);
    else search.delete('view');
    setParams(search);
  };

  const ownName: string | undefined = user?.user_metadata?.username;
  const own = ownName ? profiles[ownName] : undefined;
  const profileCount = Object.keys(profiles).length;

  const back = (
    <button type="button" className="stats-back" onClick={() => open(null)}>
      <Icons.IconArrowLeft size={16} />
      <span className="label-caps">Profil</span>
    </button>
  );

  if (view === 'players') {
    return (
      <div className="screen active-screen profile-screen">
        {back}
        <h1 className="setup-title">Spieler &amp; Bots</h1>

        <CreateProfileCard profiles={profiles} onCreateProfile={onCreateProfile} />

        <ProfileList
          profiles={profiles}
          ownName={ownName}
          onOpenProfile={name => navigate(`/stats?player=${encodeURIComponent(name)}`)}
          onUpdateProfile={onUpdateProfile}
          onDeleteProfile={onDeleteProfile}
          onImportGuest={() => setShowImportModal(true)}
        />

        {showImportModal && (
          <GuestSyncRedeemModal
            title="Gast via Sync-Code importieren"
            confirmLabel="Profil zur Spielerliste hinzufügen"
            onImported={(username, profile) => onUpdateProfile(username, profile)}
            onClose={() => setShowImportModal(false)}
          />
        )}
      </div>
    );
  }

  if (view === 'data') {
    return (
      <div className="screen active-screen profile-screen">
        {back}
        <h1 className="setup-title">Daten &amp; Konto</h1>

        <section className="profile-card">
          <h2 className="label-caps">Konto</h2>
          {user ? (
            <>
              <span className="profile-card-title">{ownName || user.email}</span>
              <p className="online-hint">Angemeldet · Profile und Matches werden in der Cloud gesichert.</p>
              <Button variant="secondary" onClick={() => { signOut(); navigate('/'); }}>Abmelden</Button>
            </>
          ) : (
            <>
              <span className="profile-card-title">Gast-Modus</span>
              <p className="online-hint">
                Profile und Matches liegen nur in diesem Browser. Mit einem Konto werden sie gesichert und sind auf anderen Geräten da.
              </p>
              <Button variant="primary" onClick={() => navigate('/auth')}>Anmelden</Button>
            </>
          )}
        </section>

        {user && <GuestSyncCard sync={guestSync} />}

        {onImportProfiles && (
          <DataExportCard
            profiles={profiles}
            matches={matches}
            onImportProfiles={onImportProfiles}
            onMatchesChanged={onMatchesChanged}
          />
        )}

        <SampleDataCard profiles={profiles} onUpdateProfile={onUpdateProfile} onDeleteProfile={onDeleteProfile} />

        <section className="setup-section">
          <h2 className="setup-section-title profile-danger-title">Gefahrenzone</h2>
          <Button variant="dangerText" fullWidth onClick={() => setConfirmWipe(true)}>
            Alle Daten auf diesem Gerät löschen
          </Button>
        </section>

        <AppInfoCard />

        {confirmWipe && (
          <Dialog title="Alle Daten löschen?" label="Gefahrenzone" labelTone="danger" onClose={() => setConfirmWipe(false)}>
            <p className="dialog-text">
              {`${matches.length} Matches, ${profileCount} Profile und alle Einstellungen verschwinden von diesem Gerät. Das lässt sich nicht rückgängig machen — exportiere vorher eine Sicherung.`}
            </p>
            <div className="dialog-actions">
              <Button variant="danger" size="large" fullWidth onClick={clearDeviceData}>Endgültig löschen</Button>
              <Button variant="ghost" fullWidth onClick={() => setConfirmWipe(false)}>Abbrechen</Button>
            </div>
          </Dialog>
        )}
      </div>
    );
  }

  const winRate = own?.matches ? Math.round((own.wins / own.matches) * 100) : null;

  return (
    <div className="screen active-screen profile-screen">
      <header className="profile-head">
        <span
          className="profile-avatar"
          style={{ '--player-color': own?.color || playerColorByName(ownName ?? 'Gast') } as React.CSSProperties}
          aria-hidden="true"
        >
          {(ownName ?? 'G').charAt(0).toUpperCase()}
        </span>
        <div className="profile-head-text">
          <h1 className="setup-title">{ownName ?? 'Gast'}</h1>
          <span className="profile-sub">{user ? 'Eigenes Profil · angemeldet' : 'Gast-Modus · Daten nur auf diesem Gerät'}</span>
        </div>
      </header>

      {own && (
        <div className="profile-kpis">
          <div className="stats-record">
            <span className="label-caps">Matches</span>
            <span className="num">{own.matches}</span>
          </div>
          <div className="stats-record">
            <span className="label-caps">Siegquote</span>
            <span className="num">{winRate === null ? '–' : `${winRate}%`}</span>
          </div>
          <div className="stats-record">
            <span className="label-caps">High Finish</span>
            <span className="num is-accent">{own.highestCheckout || '–'}</span>
          </div>
        </div>
      )}

      <section className="setup-section">
        <h2 className="setup-section-title">Einstellungen</h2>
        <div className="profile-rows">
          <Row
            title="Standardspiel"
            value={defaultGame ? defaultGameTitle(defaultGame) : 'Nicht festgelegt'}
            onClick={() => setShowDefaultGame(true)}
          />
          <Toggle
            checked={checkoutHints}
            onChange={on => { writeCheckoutHints(on); setCheckoutHints(on); }}
            label={<ToggleText title="Checkout-Hinweise" sub="Weg zeigen, sobald ein Finish geht" />}
          />
          <Toggle
            checked={soundOn}
            onChange={on => { setSoundEnabled(on); setSoundOn(on); }}
            label={<ToggleText title="Caller" sub="Sagt Punkte und Game Shot an" />}
          />
          <Toggle
            checked={keepAwake}
            onChange={on => { writeKeepAwake(on); setKeepAwake(on); }}
            label={<ToggleText title="Bildschirm wach halten" sub="Während Matches und Training" />}
          />
        </div>
      </section>

      <section className="setup-section">
        <h2 className="setup-section-title">Verwalten</h2>
        <div className="profile-rows">
          <Row icon={<Icons.IconUsers size={20} />} title="Spieler & Bots" value={String(profileCount)} onClick={() => open('players')} />
          <Row icon={<Icons.IconCloud size={20} />} title="Daten & Konto" value={user ? 'Angemeldet' : 'Gast-Modus'} onClick={() => open('data')} />
        </div>
      </section>

      <AppInfoCard />

      {showDefaultGame && (
        <DefaultGameSheet
          initial={defaultGame}
          onSaved={game => { setDefaultGame(game); setShowDefaultGame(false); }}
          onClose={() => setShowDefaultGame(false)}
        />
      )}
    </div>
  );
};
