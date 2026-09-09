import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Das gerenderte Element. Karten, die einen eigenständigen Abschnitt des
   * Screens bilden, sollen `section` bleiben — das Design-System darf die
   * Dokumentstruktur nicht einebnen.
   */
  as?: 'div' | 'section' | 'article';
  /** Reagiert auf Tap mit Skalierung — nur für Karten, die selbst anklickbar sind. */
  interactive?: boolean;
  /**
   * Nimmt der Karte ihr Padding, für Inhalte die bis an die Kante laufen
   * (Diagramme, Listen mit eigenen Trennlinien).
   */
  flush?: boolean;
}

/**
 * Die Karte aus DESIGN.md §3: 12px Radius, --surface-card auf --bg-base,
 * 16px Padding mobil und 20px ab Tablet (kommt aus --card-padding).
 *
 * Karten in einer Reihe sollen gleich hoch sein (§3). Das ist hier bewusst
 * nicht eingebaut, weil es eine Eigenschaft des Grids ist, nicht der Karte —
 * der Container setzt `align-items: stretch`, die Karte füllt per Flex-Column.
 */
export const Card: React.FC<CardProps> = ({
  as: Element = 'div',
  interactive = false,
  flush = false,
  className,
  ...rest
}) => (
  <Element
    className={[
      'card',
      interactive ? 'card-interactive' : '',
      flush ? 'card-flush' : '',
      className
    ].filter(Boolean).join(' ')}
    {...rest}
  />
);

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Sentence case, siehe §2 — keine ALL-CAPS-Headlines. Heißt `heading` und
   * nicht `title`, weil `title` auf einem div schon das Tooltip-Attribut ist.
   */
  heading?: React.ReactNode;
  /** Icon vor der Überschrift. Dekorativ, wird für Screenreader versteckt. */
  icon?: React.ReactNode;
  /** Steht rechts in der Kopfzeile, z. B. ein Badge oder ein Ghost-Button. */
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  heading,
  icon,
  action,
  className,
  children,
  ...rest
}) => (
  <div className={['card-header', className].filter(Boolean).join(' ')} {...rest}>
    {heading !== undefined ? (
      <div className="card-header-heading">
        {icon !== undefined && <span className="card-header-icon" aria-hidden="true">{icon}</span>}
        <h2>{heading}</h2>
      </div>
    ) : children}
    {action}
  </div>
);
