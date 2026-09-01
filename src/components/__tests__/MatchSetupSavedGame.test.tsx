import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatchSetup } from '../MatchSetup';

describe('MatchSetup Dedicated Saved Game UI & Modal', () => {
  const dummyProfiles = {
    'Dominik': { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 },
    'Bot 1': { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, isBot: true }
  };

  const savedGamePayload = {
    players: [
      { name: 'Dominik', score: 140, legs: 1, sets: 0, isBot: false },
      { name: 'Bot 1', score: 200, legs: 0, sets: 0, isBot: true }
    ],
    config: {
      startScore: 501,
      outMode: 'DO',
      setsToWin: 1,
      legsToWin: 3,
      is2v2: false
    }
  };

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('dartcounter_saved_game', JSON.stringify(savedGamePayload));
  });

  it('renders dedicated saved game card with players, scores, and 3 action buttons', () => {
    const onResume = vi.fn();
    const onDiscard = vi.fn();
    const onStart = vi.fn();

    render(
      <MatchSetup 
        profiles={dummyProfiles}
        onStartGame={onStart}
        hasSavedGame={true}
        onResumeGame={onResume}
        onDiscardSavedGame={onDiscard}
      />
    );

    // Shows custom title and match details
    expect(screen.getByText('Laufendes Match gefunden')).toBeInTheDocument();
    expect(screen.getByText('140')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();

    // Shows 3 buttons
    expect(screen.getByText(/Spiel fortsetzen/i)).toBeInTheDocument();
    expect(screen.getByText(/Altes Spiel verwerfen/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Schließen/i).length).toBeGreaterThanOrEqual(1);
  });

  it('calls onResumeGame when clicking Spiel fortsetzen', () => {
    const onResume = vi.fn();
    const onDiscard = vi.fn();
    const onStart = vi.fn();

    render(
      <MatchSetup 
        profiles={dummyProfiles}
        onStartGame={onStart}
        hasSavedGame={true}
        onResumeGame={onResume}
        onDiscardSavedGame={onDiscard}
      />
    );

    fireEvent.click(screen.getByText(/Spiel fortsetzen/i));
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('calls onDiscardSavedGame when clicking Altes Spiel verwerfen', () => {
    const onResume = vi.fn();
    const onDiscard = vi.fn();
    const onStart = vi.fn();

    render(
      <MatchSetup 
        profiles={dummyProfiles}
        onStartGame={onStart}
        hasSavedGame={true}
        onResumeGame={onResume}
        onDiscardSavedGame={onDiscard}
      />
    );

    fireEvent.click(screen.getByText(/Altes Spiel verwerfen/i));
    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Spiel fortsetzen/i)).not.toBeInTheDocument();
  });
});
