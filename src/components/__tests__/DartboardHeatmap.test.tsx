import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DartboardHeatmap } from '../DartboardHeatmap';
import type { Profile } from '../../types';

describe('DartboardHeatmap Component', () => {
  const dummyProfileWithHits: Profile = {
    wins: 5,
    matches: 10,
    dartsThrown: 300,
    pointsScored: 7500,
    highestThrow: 180,
    segmentHits: {
      'T20': 45,
      'S20': 80,
      'T19': 30,
      'D20': 12,
      'D16': 8,
      'DB': 5
    }
  };

  it('renders title and filter buttons (Alle, Triples, Doppel)', () => {
    render(<DartboardHeatmap profile={dummyProfileWithHits} title="Treffer-Heatmap" />);

    expect(screen.getByText(/Treffer-Heatmap/i)).toBeInTheDocument();
    expect(screen.getByText('Alle')).toBeInTheDocument();
    expect(screen.getByText('Triples')).toBeInTheDocument();
    expect(screen.getByText('Doppel')).toBeInTheDocument();
  });

  it('switches filter modes cleanly when clicking buttons', () => {
    render(<DartboardHeatmap profile={dummyProfileWithHits} />);

    const triplesBtn = screen.getByText('Triples');
    fireEvent.click(triplesBtn);
    expect(triplesBtn).toHaveClass('active');

    const doublesBtn = screen.getByText('Doppel');
    fireEvent.click(doublesBtn);
    expect(doublesBtn).toHaveClass('active');
  });

  it('displays empty state message when no hits are recorded', () => {
    const emptyProfile: Profile = {
      wins: 0,
      matches: 0,
      dartsThrown: 0,
      pointsScored: 0,
      highestThrow: 0,
      segmentHits: {}
    };

    render(<DartboardHeatmap profile={emptyProfile} />);
    expect(screen.getByText(/Noch keine Trefferdaten erfasst/i)).toBeInTheDocument();
  });
});
