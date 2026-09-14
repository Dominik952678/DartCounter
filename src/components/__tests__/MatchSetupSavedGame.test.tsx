import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatchSetup } from '../MatchSetup';

/**
 * Ein unterbrochenes Match bietet seit v2.0.0 der Start-Screen an. Im Setup
 * bleibt die Frage, bevor ein neues Match es ersetzt.
 */
describe('MatchSetup mit einem gespeicherten Match', () => {
  const dummyProfiles = {
    'Dominik': { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 },
    'Bot 1': { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, isBot: true }
  };

  const savedGamePayload = {
    players: [
      { name: 'Dominik', score: 140, legs: 1, sets: 0, isBot: false },
      { name: 'Bot 1', score: 200, legs: 0, sets: 0, isBot: true }
    ],
    config: { startScore: 501, outMode: 'DO', setsToWin: 1, legsToWin: 3, is2v2: false }
  };

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('dartcounter_saved_game', JSON.stringify(savedGamePayload));
  });

  const renderSetup = () => {
    const handlers = { onResume: vi.fn(), onDiscard: vi.fn(), onStart: vi.fn() };
    render(
      <MatchSetup
        profiles={dummyProfiles}
        onStartGame={handlers.onStart}
        hasSavedGame={true}
        onResumeGame={handlers.onResume}
        onDiscardSavedGame={handlers.onDiscard}
      />
    );
    return handlers;
  };

  it('no longer shows the saved match above the setup', () => {
    renderSetup();

    expect(screen.queryByText('Laufendes Match gefunden')).not.toBeInTheDocument();
    expect(screen.queryByText('140')).not.toBeInTheDocument();
  });

  it('asks before a new match replaces the saved one', async () => {
    const { onStart } = renderSetup();

    fireEvent.click(screen.getByRole('button', { name: /Spiel starten/ }));

    expect(await screen.findByText('Laufendes Match gefunden')).toBeInTheDocument();
    expect(onStart).not.toHaveBeenCalled();
  });

  it('resumes the saved match from the question', async () => {
    const { onResume } = renderSetup();

    fireEvent.click(screen.getByRole('button', { name: /Spiel starten/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Weiterspielen' }));

    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('discards the saved match and starts the new one', async () => {
    const { onDiscard, onStart } = renderSetup();

    fireEvent.click(screen.getByRole('button', { name: /Spiel starten/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Verwerfen/ }));

    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
