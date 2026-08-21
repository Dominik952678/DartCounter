import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BottomNav } from '../BottomNav';

describe('BottomNav Component', () => {
  it('renders all 5 main navigation items', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <BottomNav />
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
        <BottomNav />
      </MemoryRouter>
    );

    const offlineBtn = screen.getByRole('button', { name: /offline match/i });
    expect(offlineBtn).toHaveClass('active');
  });
});
