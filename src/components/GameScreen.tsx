import React, { useState } from 'react';
import { Scoreboard } from './Scoreboard';
import { Keypad } from './Keypad';
import type { Player, GameConfig, Dart } from '../types';
import { isSoundEnabled, setSoundEnabled } from '../utils/audio';
import { ConfirmModal } from './ConfirmModal';

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
  checkoutPrompt: { maxDarts: number; autoDarts: number; isWin: boolean } | null;
  submitCheckoutPrompt: (darts: number) => void;
  celebration?: { type: string, playerIndex: number } | null;
  canUndo?: boolean;
}

export const GameScreen: React.FC<GameScreenProps> = (props) => {
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

  return (
    <div className="screen active-screen game-screen-layout" style={{ position: 'relative' }}>
      {/* Top Match Header */}
      <div className="match-top-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', minWidth: 0 }}>
          <span style={{ fontWeight: 800, fontSize: '1.05em', color: 'var(--text)', whiteSpace: 'nowrap' }}>
            🎯 {props.config.startScore} {props.config.outMode}
          </span>
          <span style={{ fontSize: '0.78em', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
            First to {props.config.legsToWin} Legs {props.config.setsToWin > 1 ? `· ${props.config.setsToWin} Sets` : ''}
          </span>
        </div>

        <div className="match-header-actions">
          <button 
            onClick={() => {
              const next = !soundOn;
              setSoundEnabled(next);
              setSoundOn(next);
            }}
            className={`btn-sound-toggle ${soundOn ? 'btn-sound-on' : 'btn-sound-off'}`}
            title={soundOn ? 'Caller An (klicken zum Stummschalten)' : 'Caller Aus (klicken zum Einschalten)'}
            aria-label={soundOn ? 'Caller stummschalten' : 'Caller aktivieren'}
          >
            {soundOn ? '🔊' : '🔇'}
          </button>

          <button 
            className="btn-ghost" 
            onClick={() => setShowAbortConfirm(true)}
            style={{ 
              fontSize: '0.85em', 
              color: 'var(--red)', 
              padding: '6px 12px', 
              borderRadius: '8px', 
              border: '1px solid rgba(255, 69, 58, 0.25)',
              background: 'rgba(255, 69, 58, 0.08)',
              minHeight: '36px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
          >
            ✕ <span className="btn-abort-text">Beenden</span>
          </button>
        </div>
      </div>

      <div className="game-screen-body">
        <div className="game-screen-left">
          <Scoreboard 
            players={props.players} 
            activePlayer={props.activePlayer} 
            startingPlayerOfLeg={props.startingPlayerOfLeg} 
            config={props.config} 
            currentRoundDarts={props.currentRoundDarts}
            celebration={props.celebration}
          />
        </div>
        
        <div className="game-screen-right">
          <Keypad 
            currentRoundDarts={props.currentRoundDarts}
            currentMultiplier={props.currentMultiplier}
            isProcessing={props.isProcessing}
            roundBust={props.roundBust}
            addDart={props.addDart}
            toggleMultiplier={props.toggleMultiplier}
            undoSingleDart={props.undoSingleDart}
            abortGame={() => setShowAbortConfirm(true)}
            canUndo={props.canUndo}
          />
        </div>
      </div>

      {showAbortConfirm && (
        <ConfirmModal
          title="Spiel beenden?"
          message="Möchtest du das aktuelle Match wirklich abbrechen?"
          confirmLabel="Beenden"
          cancelLabel="Weiterspielen"
          destructive
          onConfirm={() => {
            setShowAbortConfirm(false);
            props.abortGame();
          }}
          onCancel={() => setShowAbortConfirm(false)}
        />
      )}

      {props.checkoutPrompt && (
        <div className="modal-overlay">
          <div className="modal-content checkout-prompt" style={{ textAlign: 'center' }}>
            <div className="checkout-icon">
              {props.checkoutPrompt.isWin ? '🎉' : '🎯'}
            </div>
            <h2>{props.checkoutPrompt.isWin ? 'Check!' : 'Verpasst'}</h2>
            <p style={{ color: '#999', marginBottom: '15px' }}>
              Erkannte Darts auf Doppel: <strong style={{ color: '#fff' }}>{props.checkoutPrompt.autoDarts}</strong>
            </p>
            
            <button 
              className="btn-success" 
              onClick={() => props.submitCheckoutPrompt(props.checkoutPrompt!.autoDarts)}
              style={{ width: '100%', fontSize: '1.1em', padding: '16px', marginBottom: '20px' }}
            >
              ✓ {props.checkoutPrompt.autoDarts} Dart(s) bestätigen
            </button>

            <p style={{ fontSize: '0.75em', color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Manuell korrigieren</p>
            <div className="checkout-darts-select" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {[0, 1, 2, 3].slice(0, props.checkoutPrompt.maxDarts + 1).map(num => (
                <button 
                  key={num} 
                  className={`btn ${num === props.checkoutPrompt!.autoDarts ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => props.submitCheckoutPrompt(num)}
                  style={{ flex: 1, padding: '12px', fontSize: '1em' }}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
