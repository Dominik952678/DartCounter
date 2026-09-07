import React from 'react';

/**
 * Die Button-Varianten aus DESIGN.md §5.
 *
 * `primary`, `secondary` und `ghost` stehen dort wörtlich. Zwei Ergänzungen,
 * beide innerhalb der Farbrollen aus §1:
 *
 * · `danger` — gefüllt in --text-danger, für die Bestätigung im Dialog.
 *   §5 kennt für Destruktives nur Text auf transparent, aber in einem
 *   Bestätigungsdialog ist das die primäre Aktion; ein Textlink neben
 *   „Abbrechen" macht die gefährlichere Option zur optisch leichteren.
 *
 * · `dangerText` — transparent, --text-danger. Das ist §5s „Ghost/Destructive-
 *   Text" im Wortsinn, für „Abmelden"-artige Aktionen inline in einer Karte.
 *   `ghost` bleibt davon getrennt und neutral, weil alle heutigen Ghost-Buttons
 *   (Zurück, Schließen, Mehr laden) harmlos sind und nicht rot werden dürfen.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerText';

/**
 * `large` ist für primäre Spielaktionen gedacht und erfüllt die 64pt aus §4.
 * `compact` unterschreitet die 44pt aus §4 NICHT — es reduziert nur das
 * horizontale Padding, für Buttons die inline in einer Zeile sitzen.
 */
export type ButtonSize = 'compact' | 'default' | 'large';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  dangerText: 'btn-danger-text'
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  compact: 'btn-compact',
  default: '',
  large: 'btn-large'
};

/**
 * Der Button der App. Farbe, Höhe und Typografie kommen ausschließlich aus den
 * Klassen unten — wer hier ein `style` mit Farbe oder Höhe durchreicht, umgeht
 * das Design-System und bricht die Regeln aus §1 und §4.
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'default',
  fullWidth = false,
  className,
  type = 'button',
  ...rest
}) => (
  <button
    type={type}
    className={[
      'btn',
      VARIANT_CLASS[variant],
      SIZE_CLASS[size],
      fullWidth ? 'btn-full' : '',
      className
    ].filter(Boolean).join(' ')}
    {...rest}
  />
);
