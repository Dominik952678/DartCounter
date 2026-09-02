import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOnlineStore } from '../store/useOnlineStore';

const modeLabel = (mode?: string) => {
  if (mode === 'powerscoring') return '🔥 Power Scoring';
  if (mode === 'splitscore') return '➗ Split Score';
  if (mode === 'checkout') return '🎯 Checkout Training';
  return '🎯 Standard X01';
};

export const LobbyRoom: React.FC = () => {
  const navigate = useNavigate();
  const { code } = useParams();
  const {
    roomCode,
    isHost,
    players,
    roomSettings,
    leaveRoom,
    startGame,
    updateSettings,
    onRoomEvent,
    sendRoomEvent
  } = useOnlineStore();

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

  const handleStartGame = () => {
    startGame();
    navigate('/online-game');
  };

  if (!roomCode) {
    return (
      <div className="screen active-screen app-container center-stage">
        <div className="loading-orb">🎯</div>
        <p className="text-dim">Verbinde…</p>
      </div>
    );
  }

  const settings = roomSettings;

  return (
    <div className="screen active-screen app-container lobby-room">
      <div className="ambient-glow" aria-hidden="true" />

      <header className="page-header">
        <button className="btn-ghost btn-back" onClick={() => { leaveRoom(); navigate('/online'); }}>
          ← Verlassen
        </button>
        <h2 className="page-title">Warteraum</h2>
        <div className="page-header-spacer" />
      </header>

      <section className="card room-code-card">
        <span className="section-label" style={{ marginTop: 0 }}>Raumcode</span>
        <div className="room-code-value" aria-label={`Raumcode ${roomCode.split('').join(' ')}`}>
          {roomCode.split('').map((char, i) => (
            <span key={i} className="room-code-char">{char}</span>
          ))}
        </div>
        <p className="room-code-hint">
          Deine Freunde geben diesen Code unter „Raum beitreten“ ein.
        </p>
        <div className="room-code-actions">
          <button className="btn-secondary" onClick={handleCopyCode}>
            {copied ? '✓ Kopiert' : '⧉ Code kopieren'}
          </button>
          <button className="btn-secondary" onClick={handleShare}>
            ↗ Teilen
          </button>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <h3>Spieler am Board</h3>
          <span className="card-badge">{players.length}</span>
        </div>
        <ul className="lobby-player-list">
          {players.map(p => (
            <li key={p.id} className="lobby-player">
              <span className="lobby-player-avatar" aria-hidden="true">
                {p.username.charAt(0).toUpperCase() || '?'}
              </span>
              <span className="lobby-player-name">{p.username}</span>
              {p.isHost && <span className="pill pill-success">Host</span>}
            </li>
          ))}
          {players.length === 0 && (
            <li className="lobby-player lobby-player-empty">Warte auf Spieler…</li>
          )}
        </ul>
        {players.length < 2 && (
          <p className="hint-text">
            Es kann auch allein gestartet werden — weitere Spieler können bis zum Start beitreten.
          </p>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h3>Einstellungen</h3>
          <span className="card-badge">{modeLabel(settings?.mode)}</span>
        </div>

        {!settings && <p className="text-dim">Einstellungen werden vom Host geladen…</p>}

        {settings && isHost && (!settings.mode || settings.mode === 'standard') && (
          <div className="config-grid">
            <div className="config-item">
              <label className="section-label" htmlFor="lobby-start-score">Punkte</label>
              <select
                id="lobby-start-score"
                value={settings.startScore}
                onChange={e => updateSettings({ ...settings, startScore: parseInt(e.target.value) })}
              >
                <option value={301}>301</option>
                <option value={501}>501</option>
                <option value={701}>701</option>
              </select>
            </div>
            <div className="config-item">
              <label className="section-label" htmlFor="lobby-out-mode">Out-Modus</label>
              <select
                id="lobby-out-mode"
                value={settings.outMode}
                onChange={e => updateSettings({ ...settings, outMode: e.target.value as 'SO' | 'DO' | 'MO' })}
              >
                <option value="SO">Single Out</option>
                <option value="DO">Double Out</option>
                <option value="MO">Master Out</option>
              </select>
            </div>
            <div className="config-item">
              <label className="section-label" htmlFor="lobby-sets">Sets</label>
              <input
                id="lobby-sets"
                type="number"
                inputMode="numeric"
                value={settings.setsToWin}
                min={1}
                max={10}
                onChange={e => updateSettings({ ...settings, setsToWin: Math.min(10, Math.max(1, parseInt(e.target.value) || 1)) })}
              />
            </div>
            <div className="config-item">
              <label className="section-label" htmlFor="lobby-legs">Legs</label>
              <input
                id="lobby-legs"
                type="number"
                inputMode="numeric"
                value={settings.legsToWin}
                min={1}
                max={15}
                onChange={e => updateSettings({ ...settings, legsToWin: Math.min(15, Math.max(1, parseInt(e.target.value) || 1)) })}
              />
            </div>
          </div>
        )}

        {settings && isHost && settings.mode === 'powerscoring' && (
          <div className="config-item">
            <label className="section-label" htmlFor="lobby-rounds">Rundenlimit</label>
            <select
              id="lobby-rounds"
              value={settings.rounds || 10}
              onChange={e => updateSettings({ ...settings, rounds: parseInt(e.target.value) })}
            >
              {[5, 10, 15, 20].map(r => <option key={r} value={r}>{r} Runden</option>)}
            </select>
          </div>
        )}

        {settings && isHost && settings.mode === 'checkout' && (
          <div className="config-grid">
            <div className="config-item">
              <label className="section-label" htmlFor="lobby-targets">Targets</label>
              <select
                id="lobby-targets"
                value={settings.checkoutTargets || 10}
                onChange={e => updateSettings({ ...settings, checkoutTargets: parseInt(e.target.value) })}
              >
                {[5, 10, 15, 20].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="config-item">
              <label className="section-label" htmlFor="lobby-attempts">Versuche</label>
              <select
                id="lobby-attempts"
                value={settings.checkoutRounds || 1}
                onChange={e => updateSettings({ ...settings, checkoutRounds: parseInt(e.target.value) })}
              >
                {[1, 2, 3, 5].map(r => <option key={r} value={r}>{r} {r === 1 ? 'Runde' : 'Runden'}</option>)}
              </select>
            </div>
          </div>
        )}

        {settings && !isHost && (
          <>
            <p className="settings-summary">
              {(!settings.mode || settings.mode === 'standard') && `${settings.startScore} · ${settings.outMode} · First to ${settings.legsToWin} Legs${settings.setsToWin > 1 ? ` · ${settings.setsToWin} Sets` : ''}`}
              {settings.mode === 'powerscoring' && `${settings.rounds || 10} Runden`}
              {settings.mode === 'splitscore' && 'Standard Runden'}
              {settings.mode === 'checkout' && `${settings.checkoutTargets || 10} Targets · ${settings.checkoutRounds || 1} Versuche`}
            </p>
            <p className="hint-text">Nur der Host kann die Einstellungen ändern.</p>
          </>
        )}
      </section>

      <div className="lobby-actions">
        {isHost ? (
          <button className="btn-success btn-large" onClick={handleStartGame}>
            🎯 Spiel starten
          </button>
        ) : (
          <div className="waiting-banner">
            <span className="waiting-dot" aria-hidden="true" />
            Warte auf den Start durch den Host…
          </div>
        )}
        <button className="btn-secondary" onClick={() => { leaveRoom(); navigate('/online'); }}>
          Raum verlassen
        </button>
      </div>
    </div>
  );
};
