import React from 'react';

export type ConnectionTone = 'online' | 'connecting' | 'offline';

const LABELS: Record<ConnectionTone, string> = {
  online: 'Verbunden',
  connecting: 'Verbinde …',
  offline: 'Offline'
};

/** Punkt und Label oben rechts auf den Online-Screens (Entwurf F1–F3). */
export const ConnectionStatus: React.FC<{ tone: ConnectionTone }> = ({ tone }) => (
  <span className={`connection-status is-${tone}`} role="status">
    <span className="connection-dot" aria-hidden="true" />
    <span className="label-caps">{LABELS[tone]}</span>
  </span>
);
