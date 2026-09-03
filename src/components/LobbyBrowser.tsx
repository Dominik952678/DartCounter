import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useOnlineStore } from '../store/useOnlineStore';
import type { GameConfig } from '../types';
import { readString, write } from '../utils/storage';

type Mode = 'standard' | 'powerscoring' | 'splitscore' | 'checkout';

const MODES: { id: Mode; icon: string; title: string; desc: string }[] = [
  { id: 'standard', icon: '🎯', title: 'Standard X01', desc: '501 / 301 · Sets & Legs' },
  { id: 'powerscoring', icon: '🔥', title: 'Power Scoring', desc: 'Maximale Punkte pro Runde' },
  { id: 'splitscore', icon: '➗', title: 'Split Score', desc: 'Ziel treffen oder halbieren' },
  { id: 'checkout', icon: '✅', title: 'Checkout Training', desc: 'Finishes unter Druck' }
];

export const LobbyBrowser: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { initGlobalLobby, publicLobbies, joinRoom, createRoom, connectionState } = useOnlineStore();

  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState<'join' | 'create' | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [localError, setLocalError] = useState('');

  const [isPublic, setIsPublic] = useState(true);
  const [mode, setMode] = useState<Mode>('standard');
  const [startScore, setStartScore] = useState(501);
  const [outMode, setOutMode] = useState<'SO' | 'DO' | 'MO'>('DO');
  const [setsToWin, setSetsToWin] = useState(1);
  const [legsToWin, setLegsToWin] = useState(3);
  const [rounds, setRounds] = useState(10);
  const [checkoutTargets, setCheckoutTargets] = useState(10);
  const [checkoutRounds, setCheckoutRounds] = useState(1);

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
    if (!code || busy) return;
    setLocalError('');
    setBusy('join');
    try {
      const res = await joinRoom(code, username);
      if (res.error) setLocalError(res.error);
      else navigate('/lobby/' + code.toUpperCase());
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Beitritt fehlgeschlagen.');
    } finally {
      setBusy(null);
    }
  };

  const handleCreate = async () => {
    if (busy) return;
    setLocalError('');
    setBusy('create');
    const config: GameConfig = { mode, startScore, outMode, setsToWin, legsToWin, rounds, checkoutTargets, checkoutRounds };
    try {
      const res = await createRoom(username, isPublic, config);
      if (res.error || !res.code) setLocalError(res.error || 'Raum konnte nicht erstellt werden.');
      else navigate('/lobby/' + res.code);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Raum konnte nicht erstellt werden.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="screen active-screen app-container">
      <div className="ambient-glow ambient-glow-blue" aria-hidden="true" />

      <header className="page-header">
        <button className="btn-ghost btn-back" onClick={() => navigate('/')}>← Menü</button>
        <h2 className="page-title">🌍 Multiplayer</h2>
        <div className="page-header-spacer" />
      </header>

      <div className="identity-bar">
        <span className="identity-avatar" aria-hidden="true">{username.charAt(0).toUpperCase()}</span>
        {user ? (
          <div className="identity-body">
            <span className="identity-name">{username}</span>
            <span className="identity-sub">Angemeldet · Stats werden in der Cloud gesichert</span>
          </div>
        ) : (
          <div className="identity-body">
            <label className="identity-label" htmlFor="guest-name">Dein Anzeigename</label>
            <input
              id="guest-name"
              type="text"
              value={guestName}
              onChange={e => handleGuestNameChange(e.target.value)}
              maxLength={15}
              className="identity-input"
              placeholder="Name eingeben"
            />
          </div>
        )}
        {!user && (
          <button className="btn-secondary btn-compact" onClick={() => navigate('/auth')}>Login</button>
        )}
      </div>

      {localError && (
        <div className="alert alert-error" role="alert">
          <span aria-hidden="true">⚠️</span>
          <span>{localError}</span>
        </div>
      )}

      {!showCreateForm ? (
        <>
          <section className="card">
            <div className="card-header">
              <h3>Raum beitreten</h3>
            </div>
            <div className="join-row">
              <input
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                placeholder="CODE"
                aria-label="Raumcode"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                onKeyDown={e => { if (e.key === 'Enter') handleJoin(joinCode); }}
                maxLength={4}
                className="join-code-input"
              />
              <button
                className="btn-primary"
                onClick={() => handleJoin(joinCode)}
                disabled={joinCode.length !== 4 || busy !== null}
              >
                {busy === 'join' ? 'Verbinde…' : 'Beitreten'}
              </button>
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <h3>Öffentliche Räume</h3>
              <button className="btn-primary btn-compact" onClick={() => setShowCreateForm(true)}>
                + Raum erstellen
              </button>
            </div>

            {publicLobbies.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon" aria-hidden="true">🛰️</span>
                <p className="empty-state-title">Gerade ist kein offener Raum aktiv</p>
                <p className="empty-state-text">
                  Erstelle selbst einen Raum — der 4-stellige Code lässt sich direkt teilen.
                </p>
              </div>
            ) : (
              <ul className="lobby-list">
                {publicLobbies.map(lobby => (
                  <li key={lobby.code} className="lobby-list-item">
                    <div className="lobby-list-body">
                      <strong className="lobby-list-host">{lobby.hostName}</strong>
                      <span className="lobby-list-meta">
                        {lobby.settings?.mode === 'powerscoring' ? '🔥 Power Scoring'
                          : lobby.settings?.mode === 'splitscore' ? '➗ Split Score'
                            : lobby.settings?.mode === 'checkout' ? '✅ Checkout Training'
                              : `${lobby.settings?.startScore} · ${lobby.settings?.outMode} · Best of ${lobby.settings?.legsToWin}`}
                      </span>
                    </div>
                    <div className="lobby-list-actions">
                      <span className="pill pill-muted">{lobby.code}</span>
                      <button className="btn-secondary btn-compact" onClick={() => handleJoin(lobby.code)} disabled={busy !== null}>
                        Beitreten
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <section className="card">
          <div className="card-header">
            <h3>Raum erstellen</h3>
            <button className="btn-close" onClick={() => setShowCreateForm(false)} aria-label="Schließen">✕</button>
          </div>

          <label className="section-label">Sichtbarkeit</label>
          <div className="segment-control">
            <label className={isPublic ? 'active' : ''}>
              <input type="radio" name="visibility" checked={isPublic} onChange={() => setIsPublic(true)} />
              <span>🌍 Öffentlich</span>
            </label>
            <label className={!isPublic ? 'active' : ''}>
              <input type="radio" name="visibility" checked={!isPublic} onChange={() => setIsPublic(false)} />
              <span>🔒 Nur per Code</span>
            </label>
          </div>

          <label className="section-label">Spielmodus</label>
          <div className="mode-grid">
            {MODES.map(m => (
              <button
                key={m.id}
                type="button"
                className={`mode-tile ${mode === m.id ? 'is-selected' : ''}`}
                onClick={() => setMode(m.id)}
                aria-pressed={mode === m.id}
              >
                <span className="mode-tile-icon" aria-hidden="true">{m.icon}</span>
                <span className="mode-tile-body">
                  <span className="mode-tile-title">{m.title}</span>
                  <span className="mode-tile-desc">{m.desc}</span>
                </span>
              </button>
            ))}
          </div>

          {mode === 'standard' && (
            <div className="config-grid">
              <div className="config-item">
                <label className="section-label" htmlFor="create-score">Punkte</label>
                <select id="create-score" value={startScore} onChange={e => setStartScore(parseInt(e.target.value))}>
                  <option value={301}>301</option>
                  <option value={501}>501</option>
                  <option value={701}>701</option>
                </select>
              </div>
              <div className="config-item">
                <label className="section-label" htmlFor="create-out">Out-Modus</label>
                <select id="create-out" value={outMode} onChange={e => setOutMode(e.target.value as 'SO' | 'DO' | 'MO')}>
                  <option value="SO">Single Out</option>
                  <option value="DO">Double Out</option>
                  <option value="MO">Master Out</option>
                </select>
              </div>
              <div className="config-item">
                <label className="section-label" htmlFor="create-sets">Sets</label>
                <input id="create-sets" type="number" inputMode="numeric" min={1} max={10} value={setsToWin}
                  onChange={e => setSetsToWin(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))} />
              </div>
              <div className="config-item">
                <label className="section-label" htmlFor="create-legs">Legs</label>
                <input id="create-legs" type="number" inputMode="numeric" min={1} max={15} value={legsToWin}
                  onChange={e => setLegsToWin(Math.min(15, Math.max(1, parseInt(e.target.value) || 1)))} />
              </div>
            </div>
          )}

          {mode === 'powerscoring' && (
            <>
              <label className="section-label">Rundenlimit</label>
              <div className="segment-control">
                {[5, 10, 15, 20].map(r => (
                  <label key={r} className={rounds === r ? 'active' : ''}>
                    <input type="radio" name="rounds" checked={rounds === r} onChange={() => setRounds(r)} />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          {mode === 'checkout' && (
            <>
              <label className="section-label">Anzahl Targets</label>
              <div className="segment-control">
                {[5, 10, 15, 20].map(r => (
                  <label key={r} className={checkoutTargets === r ? 'active' : ''}>
                    <input type="radio" name="targets" checked={checkoutTargets === r} onChange={() => setCheckoutTargets(r)} />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
              <label className="section-label">Versuche pro Finish</label>
              <div className="segment-control">
                {[1, 2, 3, 5].map(r => (
                  <label key={r} className={checkoutRounds === r ? 'active' : ''}>
                    <input type="radio" name="attempts" checked={checkoutRounds === r} onChange={() => setCheckoutRounds(r)} />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          <button
            className="btn-success btn-large full-width"
            onClick={handleCreate}
            disabled={busy !== null}
            style={{ marginTop: 20 }}
          >
            {busy === 'create' || connectionState === 'connecting' ? 'Erstelle Raum…' : 'Raum eröffnen'}
          </button>
        </section>
      )}
    </div>
  );
};
