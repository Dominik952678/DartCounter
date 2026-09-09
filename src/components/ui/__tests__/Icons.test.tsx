import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import * as Icons from '../Icons';

/**
 * Das Icon-Set hat einen Vertrag, und der ist der einzige Grund, warum die
 * Icons wie eine Familie aussehen: 24er Koordinatensystem, keine Füllung,
 * `currentColor`, eine Strichstärke. Ein Icon, das davon abweicht, fällt im
 * Screen sofort auf — aber niemandem, der nur den Diff liest.
 *
 * Seit die Icons aus Hugeicons kommen, prüft diese Datei einen Vertrag über eine
 * fremde Bibliothek. Das ist ihr eigentlicher Wert: ein Katalog-Update, das eine
 * Glyphe auf ein anderes Raster oder auf eine gefüllte Fassung umstellt, fällt
 * hier auf und nicht erst im Screen.
 */

const ALL = Object.entries(Icons).filter(
  (entry): entry is [string, React.FC<Icons.IconProps>] =>
    typeof entry[1] === 'function' && entry[0].startsWith('Icon')
);

/** Was in einem Icon tatsächlich zeichnet — Wurzel-SVG ausgenommen. */
const shapesOf = (container: HTMLElement): Element[] =>
  Array.from(container.querySelectorAll('path, circle, rect, ellipse, line, polyline, polygon'));

describe('Icon-Set: der gemeinsame Vertrag', () => {
  it('exports every icon under an Icon* name', () => {
    // Wenn das leer wäre, liefe der Rest dieser Datei grün durch, ohne je ein
    // Icon gesehen zu haben.
    expect(ALL.length).toBeGreaterThan(30);
  });

  it.each(ALL)('%s draws in currentColor on a 24 grid', (_name, Icon) => {
    const { container } = render(<Icon />);
    const svg = container.querySelector('svg')!;

    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.getAttribute('fill')).toBe('none');
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    // Dekoration neben einem Label — der Name gehört auf das Element darum.
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
  });

  /**
   * Runde Enden gehören zum Stil des Sets, aber Hugeicons setzt sie am Pfad und
   * nicht am Wurzel-SVG — geprüft wird deshalb dort, wo sie wirken. Ein
   * gefüllter Punkt (der Bull im Dartboard) hat keine Enden und ist ausgenommen.
   */
  it.each(ALL)('%s draws with round ends', (_name, Icon) => {
    const { container } = render(<Icon />);
    const stroked = shapesOf(container).filter(el => el.getAttribute('stroke') !== 'none');

    expect(stroked.length).toBeGreaterThan(0);
    stroked.forEach(el => {
      // Am Pfad selbst oder vom Wurzel-SVG geerbt — beides gilt.
      const own = el.getAttribute('stroke-linecap');
      expect(own === null || own === 'round').toBe(true);
    });
  });

  /**
   * Wo ein Pfad doch gefüllt ist, muss die Füllung `currentColor` sein. Ein
   * Hex-Wert an dieser Stelle wäre der eine Punkt, an dem ein Icon dem Theme
   * nicht mehr folgt — und genau der fällt beim Themewechsel auf, nicht davor.
   */
  it.each(ALL)('%s never fills with a fixed colour', (_name, Icon) => {
    const { container } = render(<Icon />);
    shapesOf(container).forEach(el => {
      const fill = el.getAttribute('fill');
      if (fill === null || fill === 'none') return;
      expect(fill).toBe('currentColor');
    });
  });

  /**
   * Die Strichstärke muss unten ankommen. Hugeicons backt `1.5` in jeden Pfad —
   * käme die Prop nicht durch, stünde am Wurzel-SVG 2.75 und gezeichnet würde
   * trotzdem 1.5.
   */
  it.each(ALL)('%s carries the app stroke width down to the shapes', (_name, Icon) => {
    const { container } = render(<Icon size={22} />);
    shapesOf(container)
      .filter(el => el.getAttribute('stroke') !== 'none')
      .forEach(el => {
        const own = el.getAttribute('stroke-width');
        expect(own === null || Number(own) >= 2.75).toBe(true);
      });
  });

  it('thickens the stroke below 18px so small icons stay legible', () => {
    const big = render(<Icons.IconCheck size={22} />).container.querySelector('svg');
    const small = render(<Icons.IconCheck size={15} />).container.querySelector('svg');

    expect(big?.getAttribute('stroke-width')).toBe('2.75');
    expect(small?.getAttribute('stroke-width')).toBe('3');
  });

  it('takes its size from the prop, in both dimensions', () => {
    const svg = render(<Icons.IconTarget size={31} />).container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('31');
    expect(svg?.getAttribute('height')).toBe('31');
  });
});

/**
 * Der Grund, warum es das Set überhaupt gibt: vorher stand in jedem Screen ein
 * Emoji, das dem Betriebssystem gehörte — eigene Farben, eigene Grundlinie,
 * je nach Gerät ein anderes Bild.
 *
 * Diese Prüfung liest die Quellen, weil ein einzelnes gerendertes Bauteil den
 * Rückfall nicht bemerken würde: ein Emoji schleicht sich in genau der Datei
 * wieder ein, für die niemand einen Test geschrieben hat.
 *
 * ALLOWED listet die bewussten Ausnahmen — jede mit einem Grund, der nicht
 * „vergessen" ist.
 */
const ALLOWED = [
  // Verlassen die App als Bild und werden von html2canvas abgefilmt; dort ist
  // ein Emoji die verlässlichere Wahl als ein inline gezeichnetes SVG.
  '/MatchImageExport.tsx',
  '/MiniGameStoryExport.tsx',
  '/utils/storyExport.ts',
  // Konsolenausgaben, keine Oberfläche.
  '/db/guestSync.ts',
  '/utils/bot.ts',
  '/profile/useGuestSync.ts',
  // Erklärt im Kommentar, warum es das Set gibt.
  '/Icons.tsx'
];

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

/* Die Quellen kommen über Vites `?raw`-Glob statt über `node:fs`: der Test
   liegt in `src` und wird damit auch vom App-Typecheck erfasst, der bewusst
   keine Node-Typen kennt — eine Browser-App soll `fs` nicht importieren
   können. Der Glob wird beim Bündeln aufgelöst und braucht davon nichts. */
const SOURCES = import.meta.glob('../../../**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

describe('Kein Emoji mehr in der Oberfläche', () => {
  it('scans the whole source tree', () => {
    // Ein leerer Glob wäre ein grüner Test, der nichts geprüft hat.
    expect(Object.keys(SOURCES).length).toBeGreaterThan(50);
  });

  it('leaves no emoji in a component that renders UI', () => {
    const offenders = Object.entries(SOURCES)
      .filter(([path]) => !path.includes('__tests__'))
      .filter(([path]) => !ALLOWED.some(allowed => path.endsWith(allowed)))
      .flatMap(([path, source]) =>
        source
          .split('\n')
          .flatMap((text, i) => (EMOJI.test(text) ? [`${path}:${i + 1}  ${text.trim().slice(0, 80)}`] : []))
      );

    expect(offenders).toEqual([]);
  });
});
