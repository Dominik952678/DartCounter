import React from 'react';
import { Scoreboard } from './Scoreboard';
import { Keypad } from './Keypad';
import type { Player, GameConfig, Dart } from '../types';

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
}

export const GameScreen: React.FC<GameScreenProps> = (props) => {
  return (
    <div className="screen active-screen">
      <Scoreboard 
        players={props.players} 
        activePlayer={props.activePlayer} 
        startingPlayerOfLeg={props.startingPlayerOfLeg} 
        config={props.config} 
        currentRoundDarts={props.currentRoundDarts}
        celebration={props.celebration}
      />
      
      <Keypad 
        currentRoundDarts={props.currentRoundDarts}
        currentMultiplier={props.currentMultiplier}
        isProcessing={props.isProcessing}
        roundBust={props.roundBust}
        addDart={props.addDart}
        toggleMultiplier={props.toggleMultiplier}
        undoSingleDart={props.undoSingleDart}
        abortGame={props.abortGame}
      />

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
