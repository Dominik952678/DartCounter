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
      className="disconnect-overlay"
    >
      <h2 id={titleId}>Verbindung zum Host verloren</h2>
      <p>Warte auf Wiederverbindung…</p>
      <div aria-live="assertive" className="disconnect-countdown">{timeLeft}s</div>
      <p>Wenn der Host nicht rechtzeitig zurückkehrt, wird das Spiel abgebrochen.</p>
    </div>
  );
};
