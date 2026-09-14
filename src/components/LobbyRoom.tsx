import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LoadingScreen } from './LoadingScreen';
import { useOnlineStore } from '../store/useOnlineStore';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { Button, Icons } from './ui';
import { playerColorBySeat } from '../utils/playerColors';
import { ConnectionStatus } from './online/ConnectionStatus';
import { RoomSettingsForm } from './online/RoomSettingsForm';
import { modeTitle, roomRuleParts, roomRulesLine } from './online/rules';

const MAX_ONLINE_PLAYERS = 4;

/** Der Warteraum (Entwurf F3): Code teilen, wer da ist, die Regeln. */
export const LobbyRoom: React.FC = () => {
  const navigate = useNavigate();
  const { code } = useParams();
  const {
    roomCode,
    isHost,
    myPlayerId,
    players,
    roomSettings,
    leaveRoom,
    startGame,
    updateSettings,
    onRoomEvent,
    sendRoomEvent
  } = useOnlineStore();
  const isOnline = useNetworkStatus();

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!roomCode || roomCode !== code) {
      navigate('/online', { replace: true });
    }
  }, [roomCode, code, navigate]);

  // Guests follow the host into the match. `onRoomEvent` detaches only this
  // handler — it must never tear down the shared room channel, which the game
  // screen keeps using.
  useEffect(() => {
    return onRoomEvent('game_start', () => navigate('/online-game'));
  }, [onRoomEvent, navigate]);

  // Whenever the roster changes, the host re-publishes the settings so players
  // who joined late see the real configuration instead of a blank card.
  useEffect(() => {
    if (!isHost || !roomSettings) return;
    sendRoomEvent('settings_update', { settings: roomSettings });
  }, [isHost, roomSettings, players.length, sendRoomEvent]);

  const handleCopyCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard is unavailable (insecure context / permission denied):
      // the code stays readable on screen, so this is not worth an error.
    }
  };

  const handleShare = async () => {
    if (!roomCode) return;
    const shareData = {
      title: 'Dartcounter',
      text: `Tritt meinem Dart-Raum bei! Code: ${roomCode}`,
      url: `${window.location.origin}/online`
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled the share sheet — fall back to copying.
      }
    }
    handleCopyCode();
  };

  const handleLeave = () => {
    leaveRoom();
    navigate('/online');
  };

  const handleStartGame = () => {
    startGame();
    navigate('/online-game');
  };

  if (!roomCode) {
    return <LoadingScreen message="Verbinde…" />;
  }

  const settings = roomSettings;

  return (
    <div className="screen active-screen online-screen lobby-room">
      <div className="online-head">
        <h1 className="setup-title">{isHost ? 'Dein Raum' : 'Warteraum'}</h1>
        <ConnectionStatus tone={isOnline ? 'online' : 'offline'} />
      </div>

      <section className="online-card room-code-card">
        <span className="label-caps">Diesen Code teilen</span>
        <div className="room-code-value" aria-label={`Raumcode ${roomCode.split('').join(' ')}`}>
          {roomCode.split('').map((char, i) => (
            <span key={i} className="room-code-char">{char}</span>
          ))}
        </div>
        <div className="room-code-actions">
          <Button variant="secondary" onClick={handleCopyCode}>
            {copied ? <><Icons.IconCheck size={17} /> Kopiert</> : <><Icons.IconCopy size={17} /> Kopieren</>}
          </Button>
          <Button variant="secondary" onClick={handleShare}>
            <Icons.IconExternal size={17} /> Teilen
          </Button>
        </div>
      </section>

      <section className="online-card">
        <div className="setup-section-head">
          <h2 className="setup-section-title">Spieler · {players.length} / {MAX_ONLINE_PLAYERS}</h2>
          {settings && <span className="label-caps online-card-meta">{roomRulesLine(settings)}</span>}
        </div>
        <ul className="lobby-player-list">
          {players.map((p, i) => (
            <li key={p.id} className="lobby-player">
              <span className="seat-avatar" style={{ '--player-color': playerColorBySeat(i) } as React.CSSProperties} aria-hidden="true">
                {p.username.charAt(0).toUpperCase() || '?'}
              </span>
              <span className="lobby-player-name">
                {p.username}{p.id === myPlayerId ? ' (du)' : ''}
              </span>
              {p.isHost && <span className="label-caps lobby-player-tag">Gastgeber</span>}
            </li>
          ))}
          {players.length < MAX_ONLINE_PLAYERS && (
            <li className="lobby-player is-empty">
              <span className="lobby-player-slot" aria-hidden="true" />
              <span className="lobby-player-name">Warte auf Mitspieler …</span>
            </li>
          )}
        </ul>
      </section>

      <section className="online-card">
        <div className="setup-section-head">
          <h2 className="setup-section-title">Regeln</h2>
          <span className="label-caps online-card-meta">{modeTitle(settings?.mode)}</span>
        </div>

        {!settings && <p className="online-hint">Einstellungen werden vom Gastgeber geladen …</p>}

        {settings && isHost && <RoomSettingsForm settings={settings} onChange={updateSettings} />}

        {settings && !isHost && (
          <ul className="room-rules" aria-label="Regeln des Raums">
            {roomRuleParts(settings).map((part, i) => (
              <li key={part} className={i === 0 ? 'is-lead' : ''}>{part}</li>
            ))}
          </ul>
        )}
      </section>

      <div className="lobby-actions">
        {isHost ? (
          <Button variant="primary" size="large" fullWidth onClick={handleStartGame}>
            <Icons.IconPlayFilled size={20} /> Match starten
          </Button>
        ) : (
          <div className="waiting-banner" role="status">
            <span className="waiting-dot" aria-hidden="true" />
            Warte auf den Start
          </div>
        )}
        <Button variant="secondary" size="large" fullWidth onClick={handleLeave}>
          Verlassen
        </Button>
      </div>
    </div>
  );
};
