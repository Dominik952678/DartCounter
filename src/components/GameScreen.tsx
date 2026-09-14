import React, { useState } from 'react';
import { Scoreboard } from './Scoreboard';
import { Keypad } from './Keypad';
import type { Player, GameConfig, Dart, Celebration } from '../types';
import { CelebrationStage } from './celebration/CelebrationStage';
import { CelebrationBoard } from './celebration/CelebrationBoard';
import { celebrationPlayer } from '../utils/celebration';
import { matchProgressLabel, matchTitle } from '../utils/matchProgress';
import { useMediaQuery } from '../hooks/useBreakpoint';
import { MatchShell } from './match/MatchShell';
import { LiveStats } from './match/LiveStats';
import { Button, Dialog, Sheet, Slider } from './ui';

/**
 * Ab hier steht die Live-Statistik als Spalte neben dem Board statt hinter
 * einem Knopf (DESIGN.md §6): iPad quer und große Fenster. Ein Telefon quer hat
 * dafür keine Höhe.
 */
const STATS_BESIDE_QUERY =
  '(orientation: landscape) and (min-width: 900px) and (min-height: 521px), (min-width: 1200px) and (min-height: 800px)';

interface CheckoutPrompt {
  maxDarts: number;
  autoDarts: number;
  isWin: boolean;
}

interface GameScreenProps {
  players: Player[];
  activePlayer: number;
  startingPlayerOfLeg: number;
  config: GameConfig;
  currentRoundDarts: Dart[];
  currentMultiplier: number;
  isProcessing: boolean;
  roundBust: boolean;
  addDart: (baseValue: number) => void;
  toggleMultiplier: (mult: number) => void;
  undoSingleDart: () => void;
  abortGame: () => void;
  /** Verlässt das Match, ohne es zu beenden. Fehlt online — dort gibt es nichts zu speichern. */
  onSuspend?: () => void;
  checkoutPrompt: CheckoutPrompt | null;
  submitCheckoutPrompt: (darts: number) => void;
  celebration?: Celebration | null;
  canUndo?: boolean;
}

/** Wie viele Darts aufs Doppel gingen — die Engine fragt, wenn sie es nicht sicher weiß (Entwurf C7). */
const CheckoutDartsDialog: React.FC<{ prompt: CheckoutPrompt; onSubmit: (darts: number) => void }> = ({ prompt, onSubmit }) => {
  const [darts, setDarts] = useState(prompt.autoDarts);

  return (
    <Dialog
      label={prompt.isWin ? 'Check' : 'Verpasst'}
      labelTone={prompt.isWin ? 'success' : 'danger'}
      title="Wie viele Darts gingen aufs Doppel?"
    >
      <Slider
        name="checkoutDarts"
        variant="tiles"
        value={darts}
        options={Array.from({ length: prompt.maxDarts + 1 }, (_, n) => ({
          value: n,
          label: String(n),
          ariaLabel: n === 1 ? '1 Dart' : `${n} Darts`
        }))}
        onChange={setDarts}
        ariaLabel="Darts aufs Doppel"
      />
      <Button variant="primary" size="large" fullWidth onClick={() => onSubmit(darts)}>
        Bestätigen
      </Button>
    </Dialog>
  );
};

export const GameScreen: React.FC<GameScreenProps> = (props) => {
  const [showLeave, setShowLeave] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const statsBeside = useMediaQuery(STATS_BESIDE_QUERY);

  const celebrant = props.celebration
    ? celebrationPlayer(props.players, props.config, props.celebration.playerIndex)
    : null;
  const prompt = props.checkoutPrompt;
  const liveStats = <LiveStats players={props.players} activePlayer={props.activePlayer} config={props.config} />;

  return (
    <MatchShell
      title={matchTitle(props.config)}
      meta={matchProgressLabel(props.players, props.config)}
      onMenu={() => setShowLeave(true)}
      onStats={statsBeside ? undefined : () => setShowStats(true)}
      aside={statsBeside ? liveStats : undefined}
      left={
        <>
          <Scoreboard
            players={props.players}
            activePlayer={props.activePlayer}
            startingPlayerOfLeg={props.startingPlayerOfLeg}
            config={props.config}
            currentRoundDarts={props.currentRoundDarts}
            celebration={props.celebration}
            roundBust={props.roundBust}
          />
          {props.celebration && celebrant && (
            <CelebrationStage
              key={props.celebration.id}
              celebration={props.celebration}
              playerName={celebrant.name}
              playerColor={celebrant.color}
              winnerLabel={celebrant.winnerLabel}
            />
          )}
        </>
      }
      right={
        <Keypad
          currentRoundDarts={props.currentRoundDarts}
          currentMultiplier={props.currentMultiplier}
          isProcessing={props.isProcessing}
          roundBust={props.roundBust}
          addDart={props.addDart}
          toggleMultiplier={props.toggleMultiplier}
          undoSingleDart={props.undoSingleDart}
          canUndo={props.canUndo}
          overlay={props.celebration
            ? <CelebrationBoard key={props.celebration.id} celebration={props.celebration} />
            : null}
        />
      }
    >
      {showStats && !statsBeside && (
        <Sheet title="Live-Statistik · dieses Leg" onClose={() => setShowStats(false)}>
          {liveStats}
        </Sheet>
      )}

      {showLeave && (
        <Dialog title="Match verlassen?" onClose={() => setShowLeave(false)}>
          {props.onSuspend && (
            <p className="dialog-text">Das Match bleibt gespeichert und lässt sich auf der Startseite fortsetzen.</p>
          )}
          <div className="dialog-actions">
            {props.onSuspend && (
              <Button variant="bone" size="large" onClick={() => { setShowLeave(false); props.onSuspend!(); }}>
                Speichern &amp; verlassen
              </Button>
            )}
            <Button variant="dangerText" size="large" onClick={() => { setShowLeave(false); props.abortGame(); }}>
              Match abbrechen
            </Button>
            <Button variant="ghost" onClick={() => setShowLeave(false)}>
              Weiterspielen
            </Button>
          </div>
        </Dialog>
      )}

      {prompt && (
        <CheckoutDartsDialog
          key={`${prompt.maxDarts}-${prompt.autoDarts}-${prompt.isWin}`}
          prompt={prompt}
          onSubmit={props.submitCheckoutPrompt}
        />
      )}
    </MatchShell>
  );
};
