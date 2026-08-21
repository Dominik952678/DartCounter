import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsWidget } from '../StatsWidget';
import type { MatchHistory, Profile } from '../../types';

describe('StatsWidget Component', () => {
  const dummyProfile: Profile = {
    wins: 3,
    matches: 5,
    dartsThrown: 100,
    pointsScored: 2500,
    highestThrow: 180,
    bestLegDarts: 15,
    highestCheckout: 120,
    checkoutAttempts: 10,
    checkoutSuccesses: 4,
    first9Pts: 1500,
    first9Darts: 45
  };

  const dummyMatches: MatchHistory[] = [
    {
      date: '20.08.2026',
      winner: 'Dominik',
      isOnline: false,
      gameType: 'standard',
      config: { startScore: 501, outMode: 'DO', setsToWin: 1, legsToWin: 3 },
      players: [
        {
          name: 'Dominik',
          sets: 1,
          legs: 3,
          avg: '75.0',
          first9: '80.0',
          matchPts: 1503,
          matchDarts: 60,
          checkoutAttempts: 6,
          checkoutSuccesses: 3
        }
      ]
    }
  ];

  it('renders standard offline stats cards accurately', () => {
    render(
      <StatsWidget 
        title="Offline Statistiken"
        mode="Alle (Standard)"
        isOnline={false}
        matches={dummyMatches}
        profileName="Dominik"
        baseProfile={dummyProfile}
        onPlay={vi.fn()}
        playLabel="Neues Spiel starten"
      />
    );

    expect(screen.getByText('Offline Statistiken')).toBeInTheDocument();
    expect(screen.getByText('Win Rate')).toBeInTheDocument();
    expect(screen.getByText('Average')).toBeInTheDocument();
    expect(screen.getByText('First 9')).toBeInTheDocument();
    expect(screen.getByText('Checkout')).toBeInTheDocument();
    expect(screen.getByText('Darts pro Leg')).toBeInTheDocument();
  });

  it('calculates and shows accurate Darts pro Leg based on 501 average', () => {
    render(
      <StatsWidget 
        title="Offline Statistiken"
        mode="Alle (Standard)"
        isOnline={false}
        matches={dummyMatches}
        profileName="Dominik"
        baseProfile={dummyProfile}
        onPlay={vi.fn()}
        playLabel="Neues Spiel starten"
      />
    );

    // With 1503 pts in 60 darts -> avg = 75.15 -> 1503 / 75.15 = 20.0 darts pro leg
    expect(screen.getByText('20.0')).toBeInTheDocument();
    expect(screen.getByText('Ø für 501')).toBeInTheDocument();
  });

  it('renders empty state placeholder when no matches played', () => {
    render(
      <StatsWidget 
        title="Online Statistiken"
        mode="Alle (Standard)"
        isOnline={true}
        matches={[]}
        profileName="Dominik"
        baseProfile={dummyProfile}
        onPlay={vi.fn()}
        playLabel="Online Match suchen"
      />
    );

    expect(screen.getByText(/Noch keine Online-Spiele/i)).toBeInTheDocument();
  });
});
