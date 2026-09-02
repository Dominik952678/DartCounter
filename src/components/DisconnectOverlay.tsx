import React, { useEffect, useState } from 'react';

export const DisconnectOverlay: React.FC<{ isHostDisconnected: boolean, onTimeout: () => void }> = ({ isHostDisconnected, onTimeout }) => {
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    if (!isHostDisconnected) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isHostDisconnected, onTimeout]);

  if (!isHostDisconnected) return null;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999, color: 'white' }}>
       <h2>Verbindung zum Host verloren</h2>
       <p style={{ marginTop: '20px', fontSize: '1.2em' }}>Warte auf Reconnect...</p>
       <div style={{ fontSize: '3em', marginTop: '20px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{timeLeft}s</div>
       <p style={{ marginTop: '20px' }}>Wenn der Host nicht rechtzeitig zurückkehrt, wird das Spiel abgebrochen.</p>
    </div>
  );
};
