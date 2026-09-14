import React from 'react';
import { Icons } from '../ui';

export type MatchStatus =
  | { kind: 'empty' }
  | { kind: 'checkout'; route: string }
  | { kind: 'bust' }
  | { kind: 'bogey' }
  | { kind: 'freeze'; team: 1 | 2 | 'both'; route?: string; needed?: number }
  | { kind: 'unlocked'; team: 1 | 2 };

/**
 * Die eine Leiste unter den Score-Karten (Entwurf C1–C4): Checkout-Weg, Bust,
 * Bogey oder der 2v2-Freeze — als Wort oder Weg, nie als erklärender Satz.
 *
 * Ohne Zustand bleibt ihr Platz frei, damit die Tastatur nicht springt, sobald
 * ein Finish in Reichweite kommt.
 */
export const StatusBar: React.FC<{ status: MatchStatus }> = ({ status }) => {
  switch (status.kind) {
    case 'checkout':
      return (
        <div className="status-bar is-checkout" role="status">
          <span className="label-caps">Checkout</span>
          <span className="status-route">{status.route}</span>
        </div>
      );
    case 'bust':
      return (
        <div className="status-bar is-bust" role="status">
          <span className="status-word">Bust</span>
        </div>
      );
    case 'bogey':
      return (
        <div className="status-bar is-bogey" role="status">
          <span className="status-word">Bogey</span>
        </div>
      );
    case 'freeze':
      return (
        <div className="status-bar is-freeze" role="status">
          <Icons.IconLock size={18} />
          <span className="label-caps">
            {status.team === 'both' ? 'Freeze · beide Teams' : `Freeze · Team ${status.team}`}
          </span>
          {status.route && <span className="status-route">{status.route}</span>}
          {status.needed !== undefined && <span className="status-needed num">{`noch ${status.needed}`}</span>}
        </div>
      );
    case 'unlocked':
      return (
        <div className="status-bar is-unlocked" role="status">
          <Icons.IconUnlock size={18} />
          <span className="label-caps">{`Frei · Team ${status.team}`}</span>
        </div>
      );
    default:
      return <div className="status-bar is-empty" aria-hidden="true" />;
  }
};
