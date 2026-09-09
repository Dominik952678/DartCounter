import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BullOffModal } from '../BullOffModal';
import type { Profile } from '../../../types';

const human = (): Profile => ({
  wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0
});

const profiles: Record<string, Profile> = {
  Anna: human(), Ben: human(), Cem: human(), Dana: human()
};

const FOUR = ['Anna', 'Ben', 'Cem', 'Dana'];

const renderModal = (props: Partial<React.ComponentProps<typeof BullOffModal>> = {}) => {
  const onResolved = vi.fn();
  render(
    <BullOffModal
      players={FOUR}
      profiles={profiles}
      onResolved={onResolved}
      onCancel={vi.fn()}
      {...props}
    />
  );
  return onResolved;
};

describe('BullOffModal', () => {
  it('lets everyone throw in a singles match', () => {
    renderModal();
    FOUR.forEach(name => expect(screen.getByText(name)).toBeInTheDocument());
  });

  // Die Sitze 0 und 1 führen die beiden Teams an — `startGame` vergibt die
  // Teams über die Sitzparität, also sind das Team 1 und Team 2.
  it('lets only one player per team throw in 2v2', () => {
    renderModal({ contenders: [0, 1] });

    expect(screen.getByText('Anna')).toBeInTheDocument();
    expect(screen.getByText('Ben')).toBeInTheDocument();
    expect(screen.queryByText('Cem')).not.toBeInTheDocument();
    expect(screen.queryByText('Dana')).not.toBeInTheDocument();
    expect(screen.getByText(/Ein Wurf pro Team/i)).toBeInTheDocument();
  });

  it('starts the leg with the winner, so their team goes first', async () => {
    const onResolved = renderModal({ contenders: [0, 1] });

    // Anna (Sitz 0, Team 1) trifft daneben, Ben (Sitz 1, Team 2) den Bullseye.
    fireEvent.click(screen.getByRole('button', { name: /Daneben/i }));
    fireEvent.click(screen.getByRole('button', { name: /Bullseye/i }));

    await waitFor(() => expect(onResolved).toHaveBeenCalledWith(1));
  });

  it('re-throws only between the tied players', async () => {
    renderModal({ contenders: [0, 1] });

    // Exakter Name, sonst trifft der Ausdruck auch „Bullseye".
    fireEvent.click(screen.getByRole('button', { name: 'Bull' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bull' }));

    await waitFor(() =>
      expect(screen.getByText(/Stechen zwischen Anna und Ben/i)).toBeInTheDocument()
    );
  });

  it('does not resolve while a contender still has to throw', () => {
    const onResolved = renderModal({ contenders: [0, 1] });
    fireEvent.click(screen.getByRole('button', { name: /Bullseye/i }));
    expect(onResolved).not.toHaveBeenCalled();
  });
});
