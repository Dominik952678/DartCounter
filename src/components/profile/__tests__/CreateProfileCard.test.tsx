import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Profile } from '../../../types';
import { CreateProfileCard } from '../CreateProfileCard';

const profile = (): Profile => ({ wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 });

describe('CreateProfileCard', () => {
  const type = (name: string) => {
    fireEvent.change(screen.getByPlaceholderText('Spielername'), { target: { value: name } });
  };

  it('creates a human profile and clears the field', () => {
    const onCreateProfile = vi.fn();
    render(<CreateProfileCard profiles={{}} onCreateProfile={onCreateProfile} />);

    type('  Dominik  ');
    fireEvent.click(screen.getByText('+'));

    expect(onCreateProfile).toHaveBeenCalledWith('Dominik', false, undefined);
    expect(screen.getByPlaceholderText('Spielername')).toHaveValue('');
  });

  it('refuses a name that is already taken', () => {
    const onCreateProfile = vi.fn();
    render(<CreateProfileCard profiles={{ Dominik: profile() }} onCreateProfile={onCreateProfile} />);

    type('Dominik');
    fireEvent.click(screen.getByText('+'));

    expect(onCreateProfile).not.toHaveBeenCalled();
    expect(screen.getByText(/existiert bereits/)).toBeInTheDocument();
  });

  it('refuses an empty name', () => {
    const onCreateProfile = vi.fn();
    render(<CreateProfileCard profiles={{}} onCreateProfile={onCreateProfile} />);

    type('   ');
    fireEvent.click(screen.getByText('+'));

    expect(onCreateProfile).not.toHaveBeenCalled();
    expect(screen.getByText(/Bitte gib einen Namen ein/)).toBeInTheDocument();
  });

  /**
   * Hier stand ein „Bot Level 1–10", das über `level * 10 + 20` in einen
   * Average umgerechnet wurde. Gespeichert war ohnehin nur der Average, und die
   * Stufe war eine Erfindung, die an drei Stellen verschieden gerundet wurde.
   */
  it('creates a bot with the target average that was picked', () => {
    const onCreateProfile = vi.fn();
    render(<CreateProfileCard profiles={{}} onCreateProfile={onCreateProfile} />);

    fireEvent.click(screen.getByLabelText(/Als Bot/));
    fireEvent.change(screen.getByLabelText('Spielstärke des Bots'), { target: { value: '90' } });

    type('Bot 7');
    fireEvent.click(screen.getByText('+'));

    expect(onCreateProfile).toHaveBeenCalledWith('Bot 7', true, 90);
  });

  /** Ein Mensch hat keinen Zielschnitt — das Feld bleibt bei ihm leer. */
  it('offers the strength only for a bot', () => {
    render(<CreateProfileCard profiles={{}} onCreateProfile={vi.fn()} />);

    expect(screen.queryByLabelText('Spielstärke des Bots')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Als Bot/));
    expect(screen.getByLabelText('Spielstärke des Bots')).toBeInTheDocument();
  });
});
