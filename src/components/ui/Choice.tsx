import React from 'react';

/**
 * Ein einzelner Umschalter im Knochen-Zustand (DESIGN.md §5) — für Kacheln, die
 * keine Reihe bilden. Wo genau eine von mehreren Optionen gilt, ist das kein
 * `Choice`, sondern ein `Slider`.
 */

export interface ChoiceProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> {
  selected: boolean;
}

/**
 * Einzelner Umschalter im selben Selected-State — für Filter und Chips, die
 * keine Radio-Gruppe bilden. `aria-pressed` macht den Zustand hörbar; ohne das
 * klingt ein ausgewählter Chip wie ein ganz normaler Button.
 */
export const Choice: React.FC<ChoiceProps> = ({ selected, className, type = 'button', ...rest }) => (
  <button
    type={type}
    aria-pressed={selected}
    className={['choice', selected ? 'active' : '', className].filter(Boolean).join(' ')}
    {...rest}
  />
);
