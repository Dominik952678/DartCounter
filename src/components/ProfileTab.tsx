import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MatchHistory, Profile } from '../types';
import { ProfileDashboard } from './ProfileDashboard';
import { GuestSyncRedeemModal } from './GuestSyncRedeemModal';
import { AppInfoCard } from './profile/AppInfoCard';
import { CreateProfileCard } from './profile/CreateProfileCard';
import { DataExportCard } from './profile/DataExportCard';
import { GuestSyncCard } from './profile/GuestSyncCard';
import { HeatmapPreview } from './profile/HeatmapPreview';
import { MatchHistoryView } from './profile/MatchHistoryView';
import { ProfileList } from './profile/ProfileList';
import { SampleDataCard } from './profile/SampleDataCard';
import { ThemeSettingsCard } from './profile/ThemeSettingsCard';
import { useGuestSync } from './profile/useGuestSync';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from './ui';

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

/**
 * The profile screen: three views in one route — the list of players, one
 * player's dashboard, and the match history — plus the settings cards below.
 */
export const ProfileTab: React.FC<ProfileTabProps> = ({
  profiles,
  matches,
  hasMoreMatches = false,
  onLoadMoreMatches,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile,
  onImportProfiles,
  onMatchesChanged
}) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const guestSync = useGuestSync(user, profiles, matches);

  const [viewProfile, setViewProfile] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  if (showHistory) {
    return (
      <MatchHistoryView
        matches={matches}
        profiles={profiles}
        hasMoreMatches={hasMoreMatches}
        onLoadMoreMatches={onLoadMoreMatches}
        onBack={() => setShowHistory(false)}
      />
    );
  }

  if (viewProfile && profiles[viewProfile]) {
    return (
      <div className="screen active-screen" style={{ position: 'relative', overflowX: 'hidden' }}>
        <div className="hero-glow-bg-profile" />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <ProfileDashboard
            profileName={viewProfile}
            profile={profiles[viewProfile]}
            allProfiles={profiles}
            matches={matches}
            onClose={() => setViewProfile(null)}
            onUpdateProfile={onUpdateProfile}
            onDeleteProfile={name => {
              onDeleteProfile(name);
              setViewProfile(null);
            }}
          />
        </div>
      </div>
    );
  }

  const ownProfileName = user?.user_metadata?.username && profiles[user.user_metadata.username]
    ? user.user_metadata.username
    : undefined;

  return (
    <div className="screen active-screen" style={{ position: 'relative', overflowX: 'hidden' }}>
      <div className="hero-glow-bg-profile" />

      {!user && (
        <div className="callout callout-action">
          <span>
            <span aria-hidden="true">💡</span> <strong>Gast-Modus:</strong> Profile &amp; Statistiken werden lokal auf diesem Gerät gespeichert.
          </span>
          <Button
            variant="primary"
            onClick={() => navigate('/auth')}
          >
            🔑 Cloud-Login
          </Button>
        </div>
      )}

      <div className="app-header">
        <h1>👤 Profile & Historie</h1>
        <p className="subtitle">Verwalte deine Spieler und Statistiken</p>
      </div>

      <div className="profile-tab-grid">
        <CreateProfileCard profiles={profiles} onCreateProfile={onCreateProfile} />

        <ProfileList
          profiles={profiles}
          onOpenProfile={setViewProfile}
          onDeleteProfile={onDeleteProfile}
          onImportGuest={() => setShowImportModal(true)}
          onShowHistory={() => setShowHistory(true)}
        />
      </div>

      {user && <GuestSyncCard sync={guestSync} />}

      {showImportModal && (
        <GuestSyncRedeemModal
          title="☁️ Gast via Sync-Code importieren"
          confirmLabel="➕ Profil zur Spielerliste hinzufügen"
          onImported={(username, profile) => onUpdateProfile(username, profile)}
          onClose={() => setShowImportModal(false)}
        />
      )}

      <HeatmapPreview profiles={profiles} initialProfile={ownProfileName} />

      <ThemeSettingsCard />

      <SampleDataCard
        profiles={profiles}
        onUpdateProfile={onUpdateProfile}
        onDeleteProfile={onDeleteProfile}
      />

      {onImportProfiles && (
        <DataExportCard
          profiles={profiles}
          matches={matches}
          onImportProfiles={onImportProfiles}
          onMatchesChanged={onMatchesChanged}
        />
      )}

      <AppInfoCard />

      {/* spacer for bottom nav */}
    </div>
  );
};
