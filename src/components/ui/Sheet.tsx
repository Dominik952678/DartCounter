import React, { useId } from 'react';
import { useModalA11y } from '../../hooks/useModalA11y';

export interface SheetProps {
  /** Kurz, steht als Label in Großbuchstaben über dem Inhalt. */
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Ein Blatt, das von unten hereinfährt — für Inhalte, die den Screen darunter
 * nicht verlassen sollen (Live-Statistik, Einstellungen, Ausbullen). Schließt
 * über Escape, den Hintergrund und „Schließen".
 */
export const Sheet: React.FC<SheetProps> = ({ title, onClose, children }) => {
  const titleId = useId();
  const sheetRef = useModalA11y<HTMLDivElement>({ onClose });

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div
        ref={sheetRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
      >
        <span className="sheet-handle" aria-hidden="true" />
        <div className="sheet-head">
          <span id={titleId} className="label-caps sheet-title">{title}</span>
          <button type="button" className="sheet-close" onClick={onClose}>Schließen</button>
        </div>
        {children}
      </div>
    </div>
  );
};
