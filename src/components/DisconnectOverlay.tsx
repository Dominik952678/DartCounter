import React, { useEffect, useId, useState } from 'react';
import { useModalA11y } from '../hooks/useModalA11y';

/**
 * Der Host ist weg (Entwurf F4). Zeigt den bestehenden 60-s-Countdown; ein
 * echtes Wiederverbinden nach einem Reload steht in der ROADMAP.
 */
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
    <div className="dialog-overlay disconnect-overlay">
      <div
        ref={overlayRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="dialog disconnect-dialog"
      >
        <span className="label-caps dialog-label disconnect-label">
          <span className="disconnect-ring" aria-hidden="true" />
          Wiederverbinden
        </span>
        <h2 id={titleId} className="dialog-title">Verbindung zum Host verloren</h2>
        <div aria-live="assertive" className="disconnect-countdown">{timeLeft}<span>s</span></div>
        <p className="dialog-text">Kommt der Host nicht zurück, endet das Match.</p>
      </div>
    </div>
  );
};
