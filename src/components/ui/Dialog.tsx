import React, { useId } from 'react';
import { useModalA11y } from '../../hooks/useModalA11y';

export interface DialogProps {
  title: string;
  /** Kurzes Label über der Frage, z. B. „Check". */
  label?: string;
  labelTone?: 'success' | 'danger';
  /** Ohne `onClose` muss der Dialog beantwortet werden: Escape und Hintergrund tun nichts. */
  onClose?: () => void;
  children: React.ReactNode;
}

/** Eine Frage in der Mitte des Screens, mit Knöpfen darunter. */
export const Dialog: React.FC<DialogProps> = ({ title, label, labelTone, onClose, children }) => {
  const titleId = useId();
  const dialogRef = useModalA11y<HTMLDivElement>({ onClose });

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
      >
        {label && (
          <span className={`label-caps dialog-label ${labelTone ? `is-${labelTone}` : ''}`}>{label}</span>
        )}
        <h2 id={titleId} className="dialog-title">{title}</h2>
        {children}
      </div>
    </div>
  );
};
