import React from 'react';

/**
 * Segmentierte Auswahl mit gleitendem Thumb.
 *
 * Der Unterschied zu `ChoiceGroup` ist nicht bloß Zierde. Dort trägt jede
 * Option ihren eigenen Rahmen, und beim Wechsel erscheint an einer Stelle ein
 * Rahmen, während an einer anderen einer verschwindet — man sieht das Ergebnis,
 * nicht den Weg. Hier gibt es genau eine gefüllte Fläche, die von der alten zur
 * neuen Option fährt: die Bewegung selbst sagt, dass es eine Auswahl AUS EINER
 * REIHE ist und welche Stelle sie gerade verlassen hat.
 *
 * Deshalb ist das kein Ersatz für `ChoiceGroup`, sondern eine zweite Bauform
 * mit einem engeren Anwendungsbereich. Ein Slider ist richtig, wo die Optionen
 * eine geordnete, vollständige und kurze Reihe bilden: Startpunktzahl,
 * Out-Modus, Spieleranzahl, Trainings-Parameter. Er ist falsch für
 * Statistik-Filter — dort sind es Chips, deren Menge sich mit den Daten ändert,
 * und ein gleitender Thumb würde eine Ordnung behaupten, die es nicht gibt. Und
 * er ist falsch für Sets/Legs: das sind Zahlenfelder mit offenem Bereich, die
 * bleiben ein Plus/Minus-Stepper.
 *
 * Die Geometrie kommt ohne Messung aus, genau wie beim Navigations-Indikator:
 * `--slider-count` und `--slider-active` gehen als Custom Properties an die
 * Schiene, das Stylesheet rechnet die Breite daraus. Die Bedingung dafür sind
 * gleich breite Optionen — `flex: 1 1 0` ohne `gap` und ohne Obergrenze.
 *
 * Auf echten Radio-Inputs gebaut, nicht auf Buttons: damit gibt es
 * Pfeiltasten-Navigation, `checked` und Gruppen-Semantik geschenkt. Die Inputs
 * bleiben im DOM und in der Tab-Reihenfolge — `display: none` nimmt ein Control
 * auch aus dem Accessibility-Tree.
 */

export interface SliderOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  /**
   * Nur für Screenreader. Bei einem Slider ist das die Regel und nicht die
   * Ausnahme: die Optionen stehen aus Platzgründen als nackte Zahl da („4"),
   * und die Einheit gehört trotzdem ausgesprochen („4 Spieler").
   */
  ariaLabel?: string;
  disabled?: boolean;
}

export interface SliderProps<T extends string | number> {
  /** Muss innerhalb eines Screens eindeutig sein — gruppiert die Radios. */
  name: string;
  value: T;
  /**
   * Beliebig viele. Zwei bis fünf ist der Bereich, für den die Bauform gedacht
   * ist: darüber wird jede Option so schmal, dass die Beschriftung nicht mehr
   * lesbar ist, und dann ist eine Chip-Liste die ehrlichere Wahl.
   */
  options: readonly SliderOption<T>[];
  onChange: (value: T) => void;
  /** Beschriftet die Gruppe, wenn keine sichtbare Überschrift daneben steht. */
  ariaLabel?: string;
  className?: string;
}

export function Slider<T extends string | number>({
  name,
  value,
  options,
  onChange,
  ariaLabel,
  className
}: SliderProps<T>) {
  const activeIndex = options.findIndex(option => option.value === value);

  return (
    <div
      className={['slider', className].filter(Boolean).join(' ')}
      role="radiogroup"
      aria-label={ariaLabel}
      style={{
        '--slider-count': options.length,
        // Passt der Wert auf keine Option — ein Startscore aus einem alten
        // gespeicherten Spiel etwa —, parkt der Thumb auf Position 0 und wird
        // ausgeblendet. Aus `display: none` heraus gäbe es keine Bewegung.
        '--slider-active': activeIndex < 0 ? 0 : activeIndex
      } as React.CSSProperties}
    >
      <span
        className={`slider-thumb ${activeIndex < 0 ? 'is-hidden' : ''}`}
        aria-hidden="true"
      />
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
