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

  it('renders distance section with sets and legs stepper controls', () => {
    render(<MatchSetup {...defaultProps} />);

    expect(screen.getByText('Distanz')).toBeInTheDocument();
    expect(screen.getByText('Sets')).toBeInTheDocument();
    expect(screen.getByText('Gewinnsätze')).toBeInTheDocument();
    expect(screen.getByText('Legs')).toBeInTheDocument();
    expect(screen.getByText('pro Satz')).toBeInTheDocument();
  });

  it('increments and decrements sets and legs via stepper buttons with default 1', () => {
    render(<MatchSetup {...defaultProps} />);

    const increaseLegsBtn = screen.getByRole('button', { name: /Legs erhöhen/i });
    const decreaseLegsBtn = screen.getByRole('button', { name: /Legs verringern/i });

    // Starts at default 1 for both sets and legs
    expect(screen.getAllByText('First to 1')).toHaveLength(2);

    // Click to increase legs from default (1) to 2
    fireEvent.click(increaseLegsBtn);
    expect(screen.getByText('First to 2')).toBeInTheDocument();

    // Click to decrease back to 1
    fireEvent.click(decreaseLegsBtn);
    expect(screen.getAllByText('First to 1')).toHaveLength(2);
  });

  it('loads previously saved sets and legs from localStorage', () => {
    localStorage.setItem('dart_x01_sets', '3');
    localStorage.setItem('dart_x01_legs', '5');

    render(<MatchSetup {...defaultProps} />);

    expect(screen.getByText('First to 3')).toBeInTheDocument();
    expect(screen.getByText('First to 5')).toBeInTheDocument();
  });

  it('allows changing start score (301, 501, 701, 1001)', () => {
    render(<MatchSetup {...defaultProps} />);

    const score301 = screen.getByText('301');
    fireEvent.click(score301);
    expect(score301.closest('label')).toHaveClass('active');
  });

  it('allows changing out mode (Single, Double, Master)', () => {
    render(<MatchSetup {...defaultProps} />);

    const doubleOut = screen.getByText('Double');
    expect(doubleOut.closest('label')).toHaveClass('active');

    const masterOut = screen.getByText('Master');
    fireEvent.click(masterOut);
    expect(masterOut.closest('label')).toHaveClass('active');
  });

  it('allows toggling between Einzel and 2v2 Doppel mode', () => {
    render(<MatchSetup {...defaultProps} />);

    const doppelToggle = screen.getByText(/2v2 Doppel/i);
    fireEvent.click(doppelToggle);

    expect(doppelToggle.closest('label')).toHaveClass('active');
    expect(screen.getByText(/Freeze-Regel/i)).toBeInTheDocument();
    expect(screen.getAllByText(/T1/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/T2/i).length).toBeGreaterThanOrEqual(1);
  });
});
