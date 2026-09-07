import React from 'react';

/**
 * Der einheitliche Selected-State aus DESIGN.md §5.
 *
 * Vorher gab es zwei gemischte Muster — mal ein Border-Glow („Einzel", „X01
 * Match"), mal eine Vollfläche („Double", „501"). Ab jetzt für alle drei Fälle
 * dasselbe: nicht ausgewählt --surface-card auf --text-secondary, ausgewählt
 * 2px --accent-primary plus --bg-accent-muted und --text-primary.
 *
 * §5 nennt drei Einsatzorte: Tabs, Auswahl-Chips (Sets/Legs, Out-Modus,
 * Startpunktzahl) und Trainings-Modus-Karten. `ChoiceGroup` deckt die ersten
 * beiden ab, `Choice` den Rest — einzelne Umschalter, die zu keiner
 * Radio-Gruppe gehören.
 */

export interface ChoiceOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  /** Nur für Screenreader, wenn `label` bloß ein Icon oder eine Zahl ist. */
  ariaLabel?: string;
  disabled?: boolean;
}

export interface ChoiceGroupProps<T extends string | number> {
  /** Muss innerhalb eines Screens eindeutig sein — gruppiert die Radios. */
  name: string;
  value: T;
  options: readonly ChoiceOption<T>[];
  onChange: (value: T) => void;
  /** Beschriftet die Gruppe für Screenreader, wenn keine sichtbare Überschrift daneben steht. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Segmentierte Auswahl auf Basis echter Radio-Inputs.
 *
 * Die Inputs bleiben im DOM und in der Tab-Reihenfolge — `display: none` nimmt
 * ein Control auch aus dem Accessibility-Tree, und genau das hatte hier einmal
 * jede dieser Gruppen für Tastaturnutzer unerreichbar gemacht.
 */
export function ChoiceGroup<T extends string | number>({
  name,
  value,
  options,
  onChange,
  ariaLabel,
  className
}: ChoiceGroupProps<T>) {
  return (
    <div
      className={['segment-control', className].filter(Boolean).join(' ')}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map(option => (
        <label
          key={option.value}
          className={option.value === value ? 'active' : ''}
          aria-label={option.ariaLabel}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            disabled={option.disabled}
            onChange={() => onChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}

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
