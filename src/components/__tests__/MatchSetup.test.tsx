import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatchSetup } from '../MatchSetup';
import type { Profile } from '../../types';

describe('MatchSetup Component', () => {
  const dummyProfiles: Record<string, Profile> = {
    'Dominik': { wins: 5, matches: 10, dartsThrown: 300, pointsScored: 7500, highestThrow: 180 },
    'Gast 1': { wins: 2, matches: 4, dartsThrown: 120, pointsScored: 3000, highestThrow: 140 }
  };

  const defaultProps = {
    profiles: dummyProfiles,
    onStartGame: vi.fn()
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('shows sets and legs as steppers, both starting at 1', () => {
    render(<MatchSetup {...defaultProps} />);

    expect(screen.getByLabelText('Sätze')).toHaveValue(1);
    expect(screen.getByLabelText('Legs')).toHaveValue(1);
  });

  it('counts legs up and down with the stepper buttons', () => {
    render(<MatchSetup {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Legs erhöhen' }));
    expect(screen.getByLabelText('Legs')).toHaveValue(2);

    fireEvent.click(screen.getByRole('button', { name: 'Legs verringern' }));
    expect(screen.getByLabelText('Legs')).toHaveValue(1);
  });

  it('loads previously saved sets and legs from localStorage', () => {
    localStorage.setItem('dart_x01_sets', '3');
    localStorage.setItem('dart_x01_legs', '5');

    render(<MatchSetup {...defaultProps} />);

    expect(screen.getByLabelText('Sätze')).toHaveValue(3);
    expect(screen.getByLabelText('Legs')).toHaveValue(5);
  });

  it('allows changing start score (301, 501, 701, 1001)', () => {
    render(<MatchSetup {...defaultProps} />);

    const score301 = screen.getByText('301');
    fireEvent.click(score301);
    expect(score301.closest('label')).toHaveClass('active');
  });

  /** Entwurf B3: eine eigene Startpunktzahl, und ein Wert, mit dem kein Match starten kann. */
  it('takes a custom start score and holds the start while it is impossible', () => {
    render(<MatchSetup {...defaultProps} />);

    fireEvent.click(screen.getByText('Custom'));
    const field = screen.getByLabelText('Eigene Punktzahl');

    fireEvent.change(field, { target: { value: '1' } });
    expect(screen.getByText('Die Startpunktzahl muss zwischen 2 und 9999 liegen.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Spiel starten/ })).toBeDisabled();

    fireEvent.change(field, { target: { value: '170' } });
    expect(screen.queryByText(/muss zwischen/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Spiel starten/ })).toBeEnabled();
  });

  it('allows changing the finish (Double, Single, Master Out)', () => {
    render(<MatchSetup {...defaultProps} />);

    const doubleOut = screen.getByText('Double Out');
    expect(doubleOut.closest('label')).toHaveClass('active');

    const masterOut = screen.getByText('Master Out');
    fireEvent.click(masterOut);
    expect(masterOut.closest('label')).toHaveClass('active');
  });

  /** Keine Regel-Erklärung mehr — der Freeze steht erst im Match als Zustand da. */
  it('switches to 2v2 Doppel and names the teams on the seats', () => {
    render(<MatchSetup {...defaultProps} />);

    const doppelToggle = screen.getByText('2v2 Doppel');
    fireEvent.click(doppelToggle);

    expect(doppelToggle.closest('label')).toHaveClass('active');
    expect(screen.getAllByText('Team 1')).toHaveLength(2);
    expect(screen.getAllByText('Team 2')).toHaveLength(2);
    expect(screen.queryByText(/Freeze-Regel/i)).not.toBeInTheDocument();
  });
});
