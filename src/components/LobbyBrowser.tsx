import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useOnlineStore } from '../store/useOnlineStore';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import type { GameConfig } from '../types';
import { readString, write } from '../utils/storage';
import { playerColorBySeat } from '../utils/playerColors';
import { Button, Icons, Sheet, Slider } from './ui';
import { CodeInput, ROOM_CODE_LENGTH } from './online/CodeInput';
import { ConnectionStatus } from './online/ConnectionStatus';
import { RoomSettingsForm } from './online/RoomSettingsForm';
import { roomRulesLine } from './online/rules';

const DEFAULT_ROOM: GameConfig = {
  mode: 'standard',
  startScore: 501,
  outMode: 'DO',
  setsToWin: 1,
  legsToWin: 3,
  rounds: 10,
  checkoutTargets: 10,
  checkoutRounds: 1
};

/** Online unter „Spielen": beitreten, Raum öffnen, offene Räume (Entwurf F1, F2). */
export const LobbyBrowser: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { initGlobalLobby, publicLobbies, joinRoom, createRoom, connectionState } = useOnlineStore();
  const isOnline = useNetworkStatus();

  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState<'join' | 'create' | null>(null);
  const [joinError, setJoinError] = useState('');
  const [createError, setCreateError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [roomConfig, setRoomConfig] = useState<GameConfig>(DEFAULT_ROOM);

  const [guestName, setGuestName] = useState<string>(
    () => readString('guestOnlineName', '') || `Gast ${Math.floor(100 + Math.random() * 900)}`
  );

  useEffect(() => {
    initGlobalLobby();
  }, [initGlobalLobby]);

  const username = (user ? (user.user_metadata?.username || user.email) : guestName)?.trim() || 'Gast';

  const handleGuestNameChange = (val: string) => {
    setGuestName(val);
    write('guestOnlineName', val);
  };

  const handleJoin = async (code: string) => {
    if (code.length !== ROOM_CODE_LENGTH || busy || !isOnline) return;
    setJoinError('');
    setBusy('join');
    try {
      const res = await joinRoom(code, username);
      if (res.error) setJoinError(res.error);
      else navigate('/lobby/' + code.toUpperCase());
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Beitritt fehlgeschlagen.');
    } finally {
      setBusy(null);
    }
  };

  const handleCreate = async () => {
    if (busy) return;
    setCreateError('');
    setBusy('create');
    try {
      const res = await createRoom(username, isPublic, roomConfig);
      if (res.error || !res.code) setCreateError(res.error || 'Raum konnte nicht erstellt werden.');
      else navigate('/lobby/' + res.code);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Raum konnte nicht erstellt werden.');
    } finally {
      setBusy(null);
    }
  };

  const tone = !isOnline || connectionState === 'error' ? 'offline' : connectionState === 'connecting' ? 'connecting' : 'online';

  return (
    <div className="screen active-screen online-screen">
      {!isOnline && (
        <div className="online-offline-bar" role="status">
          <Icons.IconAlert size={16} />
          <span className="label-caps">Keine Verbindung · lokale Spiele gehen weiter</span>
        </div>
      )}

      <div className="online-head">
        <h1 className="setup-title">Online</h1>
        <ConnectionStatus tone={tone} />
      </div>

      <section className="online-identity">
        <span className="seat-avatar" style={{ '--player-color': playerColorBySeat(0) } as React.CSSProperties} aria-hidden="true">
          {username.charAt(0).toUpperCase()}
        </span>
        <div className="online-identity-body">
          {user ? (
            <>
              <span className="label-caps">Angemeldet</span>
              <span className="online-identity-name">{username}</span>
            </>
          ) : (
            <>
              <label className="label-caps" htmlFor="guest-name">Anzeigename</label>
              <input
                id="guest-name"
                type="text"
                value={guestName}
                onChange={e => handleGuestNameChange(e.target.value)}
                maxLength={15}
                className="online-identity-input"
                placeholder="Name eingeben"
              />
            </>
          )}
        </div>
        {!user && (
          <button type="button" className="setup-link" onClick={() => navigate('/auth')}>Anmelden</button>
        )}
      </section>

      <section className="setup-section">
        <h2 className="setup-section-title">Raumcode</h2>
        <CodeInput
          value={joinCode}
          onChange={code => { setJoinCode(code); setJoinError(''); }}
          onSubmit={() => handleJoin(joinCode)}
          invalid={!!joinError}
        />
        {joinError
          ? <p className="setup-error-text" role="alert">{joinError}</p>
          : <p className="online-hint">Den 4-stelligen Code bekommst du vom Gastgeber.</p>}
      </section>

      <div className="online-actions">
        <Button
          variant="primary"
          size="large"
          fullWidth
          className="setup-start-btn"
          onClick={() => handleJoin(joinCode)}
          disabled={joinCode.length !== ROOM_CODE_LENGTH || busy !== null || !isOnline}
        >
          <span>{busy === 'join' ? 'Verbinde …' : 'Beitreten'}</span>
          {joinCode && <span className="setup-start-summary">{joinCode}</span>}
        </Button>
        <Button variant="secondary" size="large" fullWidth onClick={() => setShowCreate(true)} disabled={!isOnline}>
          <Icons.IconPlus size={18} /> Raum erstellen
        </Button>
      </div>

      {isOnline ? (
        <section className="setup-section">
          <div className="setup-section-head">
            <h2 className="setup-section-title">Öffentliche Räume · {publicLobbies.length}</h2>
          </div>
          {publicLobbies.length === 0 ? (
            <p className="online-hint">Gerade ist kein offener Raum aktiv.</p>
          ) : (
            <ul className="room-list">
              {publicLobbies.map((lobby, i) => (
                <li key={lobby.code}>
                  <button
                    type="button"
                    className="room-row"
                    onClick={() => handleJoin(lobby.code)}
                    disabled={busy !== null}
                    aria-label={`Raum ${lobby.code} von ${lobby.hostName} beitreten`}
                  >
                    <span className="seat-avatar" style={{ '--player-color': playerColorBySeat(i + 1) } as React.CSSProperties} aria-hidden="true">
                      {lobby.hostName.charAt(0).toUpperCase()}
                    </span>
                    <span className="room-row-text">
                      <span className="room-row-host">{lobby.hostName}</span>
                      <span className="room-row-rules">{roomRulesLine(lobby.settings)}</span>
                    </span>
                    <span className="label-caps room-row-code">{lobby.code}</span>
                    <Icons.IconChevronRight size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <button type="button" className="online-local" onClick={() => navigate('/play')}>
          <span className="online-local-text">
            <span className="label-caps">Solange</span>
            <span className="online-local-title">Lokales Match spielen</span>
          </span>
          <span className="online-local-go" aria-hidden="true"><Icons.IconChevronRight size={18} /></span>
        </button>
      )}

      {showCreate && (
        <Sheet title="Raum erstellen" onClose={() => setShowCreate(false)}>
          <div className="online-create">
            <section className="setup-section">
              <h3 className="setup-section-title">Sichtbarkeit</h3>
              <Slider
                name="visibility"
                value={isPublic ? 'public' : 'code'}
                options={[
                  { value: 'public', label: 'Öffentlich' },
                  { value: 'code', label: 'Nur per Code' }
                ]}
                onChange={value => setIsPublic(value === 'public')}
                ariaLabel="Sichtbarkeit"
              />
            </section>

            <RoomSettingsForm settings={roomConfig} onChange={setRoomConfig} withMode />

            {createError && <p className="setup-error-text" role="alert">{createError}</p>}

            <Button variant="primary" size="large" fullWidth onClick={handleCreate} disabled={busy !== null || !isOnline}>
              {busy === 'create' ? 'Erstelle Raum …' : 'Raum eröffnen'}
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
};
