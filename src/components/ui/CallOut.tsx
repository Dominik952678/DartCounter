import React, { useEffect, useState } from 'react';

export type CallOutTone = 'good' | 'bad' | 'accent';

interface CallOutProps {
  /** Zählt hoch, wenn die Einblendung (erneut) erscheinen soll. */
  trigger: number;
  text: string;
  /** Steht klein darunter, z. B. der neue Punktestand. */
  detail?: string;
  tone?: CallOutTone;
  /** Wie lange sie stehen bleibt. */
  ms?: number;
}

/**
 * Der große Zuruf über dem Board — „SPLIT", „GAME SHOT", „BUST".
 *
 * Gesteuert über einen hochzählenden `trigger` statt über einen booleschen
 * Zustand: zweimal hintereinander dasselbe Ereignis muss die Einblendung neu
 * auslösen, und ein Boolean, der schon `true` ist, tut das nicht.
 *
 * Rendert nichts, solange nichts anliegt, damit sie keine Klicks abfängt.
 */
export const CallOut: React.FC<CallOutProps> = ({
  trigger,
  text,
  detail,
  tone = 'accent',
  ms = 1400
}) => {
  // Abgeleitet statt gesetzt: der Effekt schreibt nur aus dem Timer heraus,
  // nie synchron in seinem Rumpf. Sichtbar ist die Einblendung, solange der
  // aktuelle Auslöser noch nicht abgelaufen ist.
  const [dismissed, setDismissed] = useState(0);

  useEffect(() => {
    if (trigger === 0) return;
    const timer = setTimeout(() => setDismissed(trigger), ms);
    return () => clearTimeout(timer);
  }, [trigger, ms]);

  if (trigger === 0 || dismissed === trigger) return null;

  return (
    <div className={`callout-flash tone-${tone}`} role="status" aria-live="polite">
      <span className="callout-flash-text">{text}</span>
      {detail && <span className="callout-flash-detail">{detail}</span>}
    </div>
  );
};
