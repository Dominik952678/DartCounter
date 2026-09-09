import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppNav, type NavOrientation } from '../AppNav';

describe('AppNav Component', () => {
  it('renders all 5 main navigation items', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppNav />
      </MemoryRouter>
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('Stats')).toBeInTheDocument();
    expect(screen.getByText('Profil')).toBeInTheDocument();
  });

  it('marks active navigation item correctly', () => {
    render(
      <MemoryRouter initialEntries={['/offline']}>
        <AppNav />
      </MemoryRouter>
    );

    const offlineBtn = screen.getByRole('button', { name: /offline match/i });
    expect(offlineBtn).toHaveClass('active');
    expect(offlineBtn).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });

  // Die Einträge matchen auf Pfad-Präfixe, nicht auf Gleichheit — sonst
  // verliert die Navigation ihre Markierung, sobald ein Unter-Screen offen ist.
  it.each([
    ['/training/checkout', /offline match/i],
    ['/lobby/AB12', /online multiplayer/i],
    ['/auth', 'Profil']
  ])('keeps the owning tab marked on %s', (path, name) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <AppNav />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name })).toHaveClass('active');
  });

  // Bottom-Dock und Sidebar sind dasselbe Markup, nur anders gesetzt (§6).
  // Wenn hier je zwei Bäume entstünden, wäre das die Stelle, die es merkt.
  it('renders exactly one navigation landmark', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppNav />
      </MemoryRouter>
    );

    expect(screen.getAllByRole('navigation')).toHaveLength(1);
    // Fünf Einträge — die Markierung ist kein sechster Button.
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });
});

/**
 * Die gleitende Markierung rechnet ihre Position im Stylesheet aus zwei
 * Custom Properties, die die Komponente setzt. Geometrie lässt sich hier nicht
 * messen (happy-dom rechnet kein Layout), die zwei Zahlen und die Achse aber
 * schon — und die sind alles, was die Komponente beiträgt.
 */
const nav = (path: string, orientation?: NavOrientation): HTMLElement => {
  const { container } = render(
    <MemoryRouter initialEntries={[path]}>
      <AppNav orientation={orientation} />
    </MemoryRouter>
  );
  return container.querySelector('nav')!;
};

describe('AppNav: die gleitende Markierung', () => {
  it('hands the stylesheet the entry count and the active index', () => {
    // '/stats' ist der vierte Eintrag, also Index 3.
    const el = nav('/stats');
    expect(el.style.getPropertyValue('--nav-count')).toBe('5');
    expect(el.style.getPropertyValue('--nav-active')).toBe('3');
  });

  it('counts from zero on the first entry', () => {
    expect(nav('/').style.getPropertyValue('--nav-active')).toBe('0');
  });

  it('renders the indicator once, hidden from screen readers', () => {
    const el = nav('/');
    const indicator = el.querySelectorAll('.nav-indicator');
    expect(indicator).toHaveLength(1);
    expect(indicator[0].getAttribute('aria-hidden')).toBe('true');
  });

  /**
   * Ein Screen, den die Navigation nicht kennt. Vorher trug einfach kein
   * Eintrag `active`; jetzt gibt es zusätzlich eine Markierung, die irgendwo
   * stehen muss — sie bleibt auf Position 0 und wird ausgeblendet, statt
   * entfernt zu werden: aus `display: none` heraus gibt es keine Bewegung.
   */
  it('parks the indicator and hides it on a route no entry owns', () => {
    const el = nav('/kein-eintrag-dafuer');
    expect(el.style.getPropertyValue('--nav-active')).toBe('0');
    expect(el.querySelector('.nav-indicator')).toHaveClass('is-hidden');
    expect(el.querySelectorAll('.nav-item.active')).toHaveLength(0);
  });

  it('moves along the axis the orientation names', () => {
    expect(nav('/', 'horizontal')).toHaveClass('app-nav-horizontal');
    expect(nav('/', 'vertical')).toHaveClass('app-nav-vertical');
  });
});

/**
 * Ohne `orientation` entscheidet die 900px-Stufe aus §6. Das Mock in
 * test/setup.ts liefert immer `false` und könnte den Unterschied nicht zeigen.
 */
const installMatchMedia = () => {
  const original = window.matchMedia;
  let width = 0;
  const listeners = new Set<() => void>();

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      get matches() {
        const m = /min-width:\s*(\d+)px/.exec(query);
        return m ? width >= Number(m[1]) : false;
      },
      media: query,
      addEventListener: (_: string, cb: () => void) => { listeners.add(cb); },
      removeEventListener: (_: string, cb: () => void) => { listeners.delete(cb); }
    })
  });

  return {
    setWidth: (next: number) => {
      width = next;
      act(() => { listeners.forEach(cb => cb()); });
    },
    restore: () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true, configurable: true, value: original
      });
    }
  };
};

describe('AppNav: Ausrichtung ohne Prop', () => {
  let media: ReturnType<typeof installMatchMedia> | null = null;

  afterEach(() => { media?.restore(); media = null; });

  it.each([
    [402, 'app-nav-horizontal'],   // iPhone 17 Pro Hochformat
    [874, 'app-nav-horizontal'],   // iPhone 17 Pro Querformat
    [820, 'app-nav-horizontal'],   // iPad Air 11" Hochformat — bewusst noch Dock
    [900, 'app-nav-vertical'],     // exakt auf der Kante
    [1180, 'app-nav-vertical']     // iPad Air 11" Querformat
  ])('picks %s at %ipx', (width, expected) => {
    media = installMatchMedia();
    media.setWidth(width);
    expect(nav('/')).toHaveClass(expected as string);
  });

  it('follows a viewport that changes under it', () => {
    media = installMatchMedia();
    media.setWidth(402);
    const el = nav('/');
    expect(el).toHaveClass('app-nav-horizontal');

    media.setWidth(1180);
    expect(el).toHaveClass('app-nav-vertical');
  });
});
