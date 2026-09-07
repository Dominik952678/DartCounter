import React, { useEffect, useId, useState } from 'react';
import { useModalA11y } from '../hooks/useModalA11y';

export const DisconnectOverlay: React.FC<{ isHostDisconnected: boolean, onTimeout: () => void }> = ({ isHostDisconnected, onTimeout }) => {
  const [timeLeft, setTimeLeft] = useState(60);
  const titleId = useId();
  // No `onClose`: reconnecting is out of the player's hands, so there is
  // nothing Escape could do here.
  const overlayRef = useModalA11y<HTMLDivElement>({ isOpen: isHostDisconnected });

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
    <div
      ref={overlayRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 'var(--z-overlay)', color: 'white' }}
    >
       <h2 id={titleId}>Verbindung zum Host verloren</h2>
       <p style={{ marginTop: '20px', fontSize: '1.2em' }}>Warte auf Reconnect...</p>
       <div aria-live="assertive" style={{ fontSize: '3em', marginTop: '20px', fontWeight: 'bold', color: 'var(--primary)' }}>{timeLeft}s</div>
       <p style={{ marginTop: '20px' }}>Wenn der Host nicht rechtzeitig zurückkehrt, wird das Spiel abgebrochen.</p>
    </div>
  );
};
