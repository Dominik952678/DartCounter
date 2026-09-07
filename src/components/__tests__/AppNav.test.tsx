import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppNav } from '../AppNav';

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
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });
});
