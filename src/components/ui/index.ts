/**
 * Die Basis-Komponenten des Design-Systems (DESIGN.md §5).
 *
 * Alles, was Button, Karte oder Auswahl ist, kommt von hier — nicht aus
 * handgeschriebenem `className="btn-primary"` und nicht aus einem Inline-Style.
 * Farben und Maße stehen in styles/tokens.css.
 */
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

export { Card, CardHeader } from './Card';
export type { CardProps, CardHeaderProps } from './Card';

export { Choice, ChoiceGroup } from './Choice';
export type { ChoiceProps, ChoiceGroupProps, ChoiceOption } from './Choice';

export { CallOut } from './CallOut';
export type { CallOutTone } from './CallOut';

export { StatStrip } from './StatStrip';
export type { StatStripItem } from './StatStrip';

export { NavItem } from './NavItem';
export type { NavItemProps } from './NavItem';

/* Das Icon-Set. Bewusst als Namensraum re-exportiert und nicht einzeln: es sind
   über vierzig Komponenten, und `import { Icons } from '../ui'` sagt an der
   Fundstelle, dass ein Bild aus dem Set kommt und nicht irgendwoher. */
export * as Icons from './Icons';
export type { IconProps } from './Icons';
