import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useOnlineStore } from '../store/useOnlineStore';
import type { GameConfig } from '../types';
import { readString, write } from '../utils/storage';
import { Button, Card, CardHeader, Choice, ChoiceGroup, Icons } from './ui';
import type { IconProps } from './ui';

type Mode = 'standard' | 'powerscoring' | 'splitscore' | 'checkout';

const MODES: { id: Mode; icon: React.FC<IconProps>; title: string; desc: string }[] = [
  { id: 'standard', icon: Icons.IconTarget, title: 'Standard X01', desc: '501 / 301 · Sets & Legs' },
  { id: 'powerscoring', icon: Icons.IconBars, title: 'Power Scoring', desc: 'Maximale Punkte pro Runde' },
  { id: 'splitscore', icon: Icons.IconSplit, title: 'Split Score', desc: 'Ziel treffen oder halbieren' },
  { id: 'checkout', icon: Icons.IconTarget, title: 'Checkout Training', desc: 'Finishes unter Druck' }
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
  const [setsToWin, setSetsToWin] = useState<number | ''>(1);
  const [legsToWin, setLegsToWin] = useState<number | ''>(3);
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
    const config: GameConfig = {
      mode, startScore, outMode,
      setsToWin: setsToWin || 1,
      legsToWin: legsToWin || 3,
      rounds, checkoutTargets, checkoutRounds
    };
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
    <div className="screen active-screen">
      <div className="ambient-glow" aria-hidden="true" />

      <header className="page-header">
        <Button variant="ghost" className="btn-back" onClick={() => navigate('/')}><Icons.IconArrowLeft size={17} /> Menü</Button>
        <h2 className="page-title"><Icons.IconGlobe size={22} /> Multiplayer</h2>
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
          <Button variant="secondary" size="compact" onClick={() => navigate('/auth')}>Login</Button>
        )}
      </div>

      {localError && (
        <div className="alert alert-error" role="alert">
          <Icons.IconAlert size={18} />
          <span>{localError}</span>
        </div>
      )}

      {!showCreateForm ? (
        <>
          <Card as="section">
            <CardHeader heading={"Raum beitreten"} />
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
              <Button
                variant="primary"
                onClick={() => handleJoin(joinCode)}
                disabled={joinCode.length !== 4 || busy !== null}
              >
                {busy === 'join' ? 'Verbinde…' : 'Beitreten'}
              </Button>
            </div>
          </Card>

          <Card as="section">
            <CardHeader
              heading="Öffentliche Räume"
              action={
                <Button variant="primary" size="compact" onClick={() => setShowCreateForm(true)}>
                  + Raum erstellen
                </Button>
              }
            />

            {publicLobbies.length === 0 ? (
              <div className="empty-state">
                <Icons.IconGlobe size={38} className="empty-state-icon" />
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
                        {lobby.settings?.mode === 'powerscoring' ? 'Power Scoring'
                          : lobby.settings?.mode === 'splitscore' ? 'Split Score'
                            : lobby.settings?.mode === 'checkout' ? 'Checkout Training'
                              : `${lobby.settings?.startScore} · ${lobby.settings?.outMode} · Bis ${lobby.settings?.legsToWin} Legs`}
                      </span>
                    </div>
                    <div className="lobby-list-actions">
                      <span className="pill pill-muted">{lobby.code}</span>
                      <Button variant="secondary" size="compact" onClick={() => handleJoin(lobby.code)} disabled={busy !== null}>
                        Beitreten
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : (
        <Card as="section">
          <CardHeader
            heading="Raum erstellen"
            action={
              <Button variant="ghost" className="btn-close" onClick={() => setShowCreateForm(false)} aria-label="Schließen"><Icons.IconClose size={18} /></Button>
            }
          />

          <label className="section-label">Sichtbarkeit</label>
          <ChoiceGroup
            name="visibility"
            value={isPublic ? 'public' : 'code'}
            options={[
              { value: 'public', label: 'Öffentlich' },
              { value: 'code', label: 'Nur per Code' }
            ]}
            onChange={value => setIsPublic(value === 'public')}
            ariaLabel="Sichtbarkeit"
          />

          <label className="section-label">Spielmodus</label>
          <div className="mode-grid">
            {MODES.map(m => (
              <Choice
                key={m.id}
                className="mode-tile"
                selected={mode === m.id}
                onClick={() => setMode(m.id)}
              >
                <span className="mode-tile-icon" aria-hidden="true"><m.icon size={22} /></span>
                <span className="mode-tile-body">
                  <span className="mode-tile-title">{m.title}</span>
                  <span className="mode-tile-desc">{m.desc}</span>
                </span>
              </Choice>
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
                  onChange={e => setSetsToWin(e.target.value === '' ? '' : parseInt(e.target.value) || 1)}
                  onBlur={() => setSetsToWin(Math.min(10, Math.max(1, setsToWin || 1)))} />
              </div>
              <div className="config-item">
                <label className="section-label" htmlFor="create-legs">Legs</label>
                <input id="create-legs" type="number" inputMode="numeric" min={1} max={15} value={legsToWin}
                  onChange={e => setLegsToWin(e.target.value === '' ? '' : parseInt(e.target.value) || 1)}
                  onBlur={() => setLegsToWin(Math.min(15, Math.max(1, legsToWin || 1)))} />
              </div>
            </div>
          )}

          {mode === 'powerscoring' && (
            <>
              <label className="section-label">Rundenlimit</label>
              <ChoiceGroup
                name="rounds"
                value={rounds}
                options={[5, 10, 15, 20].map(r => ({ value: r, label: r, ariaLabel: `${r} Runden` }))}
                onChange={setRounds}
                ariaLabel="Rundenlimit"
              />
            </>
          )}

          {mode === 'checkout' && (
            <>
              <label className="section-label">Anzahl Targets</label>
              <ChoiceGroup
                name="targets"
                value={checkoutTargets}
                options={[5, 10, 15, 20].map(r => ({ value: r, label: r, ariaLabel: `${r} Targets` }))}
                onChange={setCheckoutTargets}
                ariaLabel="Anzahl Targets"
              />
              <label className="section-label">Versuche pro Finish</label>
              <ChoiceGroup
                name="attempts"
                value={checkoutRounds}
                options={[1, 2, 3, 5].map(r => ({ value: r, label: r, ariaLabel: `${r} Versuche` }))}
                onChange={setCheckoutRounds}
                ariaLabel="Versuche pro Finish"
              />
            </>
          )}

          <Button
            variant="primary"
            size="large"
            fullWidth
            onClick={handleCreate}
            disabled={busy !== null}
            style={{ marginTop: 'var(--space-5)' }}
          >
            {busy === 'create' || connectionState === 'connecting' ? 'Erstelle Raum…' : 'Raum eröffnen'}
          </Button>
        </Card>
      )}
    </div>
  );
};
