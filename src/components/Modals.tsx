import React, { useRef } from 'react';
import type { Player, MatchHistory } from '../types';

export const StatsModal: React.FC<{
  isOpen: boolean;
  winnerIndex: number | null;
  players: Player[];
  matchData: MatchHistory | null;
  onClose: () => void;
}> = ({ isOpen, winnerIndex, players, matchData, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  if (!isOpen || winnerIndex === null || !matchData) return null;
  
  const winnerName = players[winnerIndex].name;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ textAlign: 'center' }} ref={modalRef}>
        <div className="match-result-header">
          <span className="trophy-icon">🏆</span>
          <h2>{winnerName} gewinnt!</h2>
        </div>
        
        <div className="match-result-grid">
          {players.map((p, i) => {
            const isWinner = i === winnerIndex;
            return (
              <div key={i} className={`match-result-player ${isWinner ? 'winner' : ''}`}>
                <div className="result-name">{p.isBot ? '🤖 ' : ''}{p.name}</div>
                <div className="result-score">{p.sets} : {matchData.players[i].legs}</div>
                <div className="result-stats">
                  <div className="result-stat">
                    <span className="result-stat-label">Average</span>
                    <span className="result-stat-value accent-green">{matchData.players[i].avg}</span>
                  </div>
                  <div className="result-stat">
                    <span className="result-stat-label">First 9</span>
                    <span className="result-stat-value accent-orange">{matchData.players[i].first9}</span>
                  </div>
                  {matchData.players[i].bestMatchLeg !== undefined && (
                    <div className="result-stat" style={{ gridColumn: 'span 2' }}>
                      <span className="result-stat-label">Best Leg</span>
                      <span className="result-stat-value accent-blue">{matchData.players[i].bestMatchLeg} Darts</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="leg-averages-section">
          <h3>Averages pro Leg</h3>
          {players.map((p, i) => {
            if (p.legHistory.length > 0) {
              return (
                <div key={i} className="leg-avg-row">
                  <span className="leg-avg-name">{p.name}</span>
                  <span className="leg-avg-values">{p.legHistory.join(' · ')}</span>
                </div>
              );
            }
            return null;
          })}
        </div>
        
        <div style={{ marginTop: '20px' }}>
          <button className="btn-success" onClick={onClose} style={{ width: '100%' }}>
            Weiter zum Menü
          </button>
        </div>
      </div>
    </div>
  );
};

export const HistoryModal: React.FC<{
  isOpen: boolean;
  history: MatchHistory[];
  onClose: () => void;
}> = ({ isOpen, history, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Match Historie</h2>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '8px 16px', fontSize: '0.9em' }}>Schließen</button>
        </div>
        <div>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#666' }}>
              <div style={{ fontSize: '2em', marginBottom: '10px' }}>🎯</div>
              <p>Noch keine Matches gespeichert.</p>
            </div>
          ) : (
            [...history].reverse().map((m, i) => (
              <div key={i} className="history-item">
                <div className="history-header">
                  <span className="history-winner">🏆 {m.winner}</span>
                  <span className="history-date">{m.date}</span>
                </div>
                <div className="history-players">
                  {m.players.map((p, j) => (
                    <div key={j} className="history-player-row">
                      <span className="history-player-name">{p.name}</span>
                      <span className="history-player-score">{p.sets}:{p.legs}</span>
                      <span className="history-player-avg">Ø {p.avg}</span>
                      <span className="history-player-f9">F9: {p.first9}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
