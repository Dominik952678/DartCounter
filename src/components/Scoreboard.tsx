import { readCheckoutHints } from '../utils/deviceSettings';
import React, { useState, useEffect, useRef } from 'react';
import type { Player, GameConfig, Celebration, Dart } from '../types';
import { getCheckoutSuggestion, checkoutRange, isBogey, isSetupShot } from '../utils/checkouts';
import { cardCelebrationClass, legPopClass } from '../utils/celebration';
import { matchPlayerColor } from '../utils/playerColors';
import { CardCelebration } from './celebration/CardCelebration';
import { StatusBar, type MatchStatus } from './match/StatusBar';
import { Icons } from './ui';

interface ScoreboardProps {
  players: Player[];
  activePlayer: number;
  startingPlayerOfLeg: number;
  config: GameConfig;
  currentRoundDarts: Dart[];
  celebration?: Celebration | null;
  /** Die laufende Aufnahme ist überworfen. */
  roundBust?: boolean;
  /** Checkout-Wege und Bogey anzeigen. */
  showCheckoutHints?: boolean;
}

/** Dauer der „Frei"-Anzeige, nachdem ein Team entsperrt wurde. */
const UNLOCK_NOTICE_MS = 2200;

/**
 * True für einen Moment, nachdem `isBlocked` von true auf false gewechselt ist.
 *
 * Abgeleitet statt im Effekt zurückgesetzt: wird das Team innerhalb der Anzeige
 * wieder gesperrt, räumt React den Timer ab — und eine hängende Anzeige darf die
 * Sperre nicht verdecken, weil die Engine das Auschecken weiter verweigert.
 */
const useJustUnlocked = (isBlocked: boolean): boolean => {
  const [justUnlocked, setJustUnlocked] = useState(false);
  const wasBlocked = useRef(isBlocked);

  useEffect(() => {
    const previously = wasBlocked.current;
    wasBlocked.current = isBlocked;
    if (isBlocked || !previously) return;

    setJustUnlocked(true);
    const timer = setTimeout(() => setJustUnlocked(false), UNLOCK_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [isBlocked]);

  return justUnlocked && !isBlocked;
};

/** „T20 T11 D14" → „T20 · T11 · D14". */
const routeLabel = (route: string): string => route.split(' ').join(' · ');

/**
 * Die werfende Karte bekommt mehr Platz (Entwurf C1/C2). Hochformat verteilt die
 * Spalten, Querformat die Zeilen; bei vier Spielern teilt das Stylesheet gleich
 * auf.
 */
const gridFor = (count: number, active: number): React.CSSProperties => {
  const weights = Array.from({ length: count }, (_, i) =>
    i === active ? (count === 2 ? '1.55fr' : '1.4fr') : '1fr'
  );
  if (count > 3) return {};
  return {
    '--sb-cols': weights.join(' '),
    '--sb-rows': count === 2 ? (active === 0 ? '1.2fr 1fr' : '1fr 1.2fr') : weights.join(' ')
  } as React.CSSProperties;
};

export const Scoreboard: React.FC<ScoreboardProps> = ({
  players,
  activePlayer,
  startingPlayerOfLeg,
  config,
  currentRoundDarts,
  celebration,
  roundBust = false,
  showCheckoutHints = readCheckoutHints()
}) => {
  const is2v2 = Boolean(config?.is2v2 || (players.length === 4 && players.some(p => p.team !== undefined)));

  // Punktestand inklusive der Darts, die der Werfer in dieser Aufnahme schon geworfen hat.
  const liveScores = players.map((p, idx) => {
    const roundTotal = idx === activePlayer ? currentRoundDarts.reduce((sum, d) => sum + d.value, 0) : 0;
    return Math.max(0, p.score - roundTotal);
  });

  // ── 2v2-Freeze ──
  // Ein Team darf erst auschecken, wenn keiner seiner Spieler mehr Punkte hat
  // als das gegnerische Team zusammen.
  const t1Total = is2v2 ? liveScores[0] + liveScores[2] : 0;
  const t2Total = is2v2 ? liveScores[1] + liveScores[3] : 0;
  const t1Diff = is2v2 ? Math.max(liveScores[2] - t2Total, liveScores[0] - t2Total) : 0;
  const t2Diff = is2v2 ? Math.max(liveScores[3] - t1Total, liveScores[1] - t1Total) : 0;
  const isT1Blocked = is2v2 && t1Diff > 0;
  const isT2Blocked = is2v2 && t2Diff > 0;
  const isBothBlocked = isT1Blocked && isT2Blocked;

  // Wer zu viele Punkte hat und sie herunterwerfen muss. Nur wenn es genau einer
  // ist, gibt es eine eindeutige Zahl zu nennen.
  const throwerIndices = is2v2
    ? [0, 1, 2, 3].filter(idx => (idx % 2 === 0 ? liveScores[idx] > t2Total : liveScores[idx] > t1Total))
    : [];
  const singleThrowerIndex = throwerIndices.length === 1 ? throwerIndices[0] : -1;

  const t1JustUnlocked = useJustUnlocked(isT1Blocked);
  const t2JustUnlocked = useJustUnlocked(isT2Blocked);

  // ── Die Leiste ──
  const activeScore = liveScores[activePlayer] ?? 0;
  const range = checkoutRange(config.outMode);
  const suggestion = showCheckoutHints && activeScore >= range.min && activeScore <= range.max
    ? getCheckoutSuggestion(activeScore, config.outMode, currentRoundDarts.length)
    : null;
  // Ein Setup-Wurf („Setup: T20") ist kein Finish — der Zustand dazu heißt BOGEY.
  const activeRoute = suggestion && !isSetupShot(suggestion) ? suggestion : null;

  const status: MatchStatus = (() => {
    if (roundBust) return { kind: 'bust' };
    if (is2v2) {
      const team: 1 | 2 = activePlayer % 2 === 0 ? 1 : 2;
      if (team === 1 ? isT1Blocked : isT2Blocked) {
        const throwerTeam = singleThrowerIndex % 2 === 0 ? 1 : 2;
        return {
          kind: 'freeze',
          team: isBothBlocked ? 'both' : team,
          route: activeRoute ? routeLabel(activeRoute) : undefined,
          needed: singleThrowerIndex !== -1 && throwerTeam === team ? (team === 1 ? t1Diff : t2Diff) : undefined
        };
      }
      if (t1JustUnlocked || t2JustUnlocked) return { kind: 'unlocked', team: t1JustUnlocked ? 1 : 2 };
    }
    if (activeRoute) return { kind: 'checkout', route: routeLabel(activeRoute) };
    if (showCheckoutHints && currentRoundDarts.length === 0 && isBogey(activeScore, config.outMode)) {
      return { kind: 'bogey' };
    }
    return { kind: 'empty' };
  })();

  return (
    <div className="scoreboard-wrap">
      <div className="scoreboard" data-players={players.length} style={gridFor(players.length, activePlayer)}>
        {players.map((p, i) => {
          const isActive = i === activePlayer;
          const isStarter = i === startingPlayerOfLeg;
          const liveScore = liveScores[i];
          const currentRoundTotal = isActive ? currentRoundDarts.reduce((sum, d) => sum + d.value, 0) : 0;

          const ownCelebration = celebration?.playerIndex === i ? celebration : null;
          const celebrationClass = cardCelebrationClass(celebration, i, players, is2v2);
          const matchAvg = p.matchDarts > 0 ? ((p.matchPts / p.matchDarts) * 3).toFixed(1) : '–';
          const legDarts = p.legDarts + (isActive ? currentRoundDarts.length : 0);

          const teamNumber = p.team || (i % 2 === 0 ? 1 : 2);
          const partnerIdx = (i + 2) % 4;
          const oppTeamTotal = is2v2
            ? liveScores[i % 2 === 0 ? 1 : 0] + liveScores[i % 2 === 0 ? 3 : 2]
            : 0;
          const blockedFromFinishing = is2v2 && liveScores[partnerIdx] - oppTeamTotal > 0;
          const pointsToThrowDown = is2v2 ? liveScores[i] - oppTeamTotal : 0;
          const involvedInLock = blockedFromFinishing || (is2v2 && pointsToThrowDown > 0);
          const teamJustUnlocked = is2v2 && (teamNumber === 1 ? t1JustUnlocked : t2JustUnlocked);
          const mustThrowDown = i === singleThrowerIndex && !teamJustUnlocked;

          const tag = mustThrowDown
            ? `noch ${pointsToThrowDown}`
            : isActive
              ? 'wirft'
              : is2v2
                ? `Team ${teamNumber}`
                : isStarter ? 'Anwurf' : '';

          return (
            <div
              key={i}
              data-player-card={i}
              className={`player-card ${isActive ? 'is-active' : 'is-inactive'} ${isStarter ? 'is-starter' : ''} ${celebrationClass}`}
              style={{ '--player-color': matchPlayerColor(p, i, is2v2) } as React.CSSProperties}
            >
              {ownCelebration && <CardCelebration key={ownCelebration.id} celebration={ownCelebration} />}

              <div className="player-card-head">
                <span className="player-card-ident">
                  <span className="player-dot" aria-hidden="true" />
                  <h3 className="player-name">
                    {p.isBot && <Icons.IconBot size={13} className="icon-inline" />}{p.name}
                  </h3>
                  {teamJustUnlocked ? (
                    <span className="card-lock is-open" aria-label="Frei"><Icons.IconUnlock size={13} /></span>
                  ) : involvedInLock ? (
                    <span className="card-lock" aria-label="Freeze"><Icons.IconLock size={13} /></span>
                  ) : null}
                </span>
                {tag && <span className={`player-card-tag ${mustThrowDown ? 'is-warning' : ''}`}>{tag}</span>}
              </div>

              <div className="score-display">
                <span className="score-anim-pulse" key={liveScore}>{liveScore}</span>
                {isActive && currentRoundTotal > 0 && (
                  <span className="live-preview-darts">-{currentRoundTotal}</span>
                )}
              </div>

              <div className="player-card-foot">
                {ownCelebration?.type === 'check' && !ownCelebration.matchWin ? (
                  <span className="cel-check-pill">
                    <Icons.IconCheck size={14} /> Check · {ownCelebration.total}
                  </span>
                ) : (
                  <dl className="player-card-stats">
                    <div><dt>Ø</dt><dd>{matchAvg}</dd></div>
                    {isActive && <div><dt>Darts</dt><dd>{legDarts}</dd></div>}
                    {config.setsToWin > 1 && <div><dt>Sets</dt><dd>{p.sets}</dd></div>}
                    <div className={`badge-count ${legPopClass(celebration, i)}`}><dt>Legs</dt><dd>{p.legs}</dd></div>
                  </dl>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <StatusBar status={status} />
    </div>
  );
};
