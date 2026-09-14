import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import type { GameConfig } from '../../types';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LobbyRoom } from '../LobbyRoom';
import { useOnlineStore } from '../../store/useOnlineStore';

/** Der Warteraum (Entwurf F3): Gastgeber stellt live ein, Gäste lesen nur. */

const radioFor = (text: string) =>
  screen.getByText(text).closest('label')!.querySelector('input') as HTMLInputElement;

let updateSettings: Mock<(settings: GameConfig) => void>;

const seat = (isHost: boolean) => {
  updateSettings = vi.fn<(settings: GameConfig) => void>();
  useOnlineStore.setState({
    roomCode: 'A7K2',
    isHost,
    myPlayerId: isHost ? 'seat_1' : 'seat_2',
    players: [
      { id: 'seat_1', username: 'Marcus', isHost: true },
      { id: 'seat_2', username: 'Lena', isHost: false }
    ],
    roomSettings: { mode: 'standard', startScore: 501, outMode: 'DO', setsToWin: 1, legsToWin: 3 },
    updateSettings,
    onRoomEvent: () => () => {},
    sendRoomEvent: vi.fn(),
    leaveRoom: vi.fn(),
    startGame: vi.fn()
  });
};

const renderRoom = () =>
  render(
    <MemoryRouter initialEntries={['/lobby/A7K2']}>
      <Routes>
        <Route path="/lobby/:code" element={<LobbyRoom />} />
      </Routes>
    </MemoryRouter>
  );

describe('Warteraum', () => {
  beforeEach(() => seat(true));

  it('shows the code and who is in the room', () => {
    renderRoom();

    expect(screen.getByLabelText('Raumcode A 7 K 2')).toBeInTheDocument();
    expect(screen.getByText('Marcus (du)')).toBeInTheDocument();
    expect(screen.getByText('Gastgeber')).toBeInTheDocument();
    expect(screen.getByText('Spieler · 2 / 4')).toBeInTheDocument();
  });

  it('lets the host change the rules live', () => {
    renderRoom();

    fireEvent.click(radioFor('701'));
    expect(updateSettings).toHaveBeenLastCalledWith(expect.objectContaining({ startScore: 701 }));

    fireEvent.click(screen.getByRole('button', { name: 'Legs erhöhen' }));
    expect(updateSettings).toHaveBeenLastCalledWith(expect.objectContaining({ legsToWin: 4 }));
    expect(screen.getByRole('button', { name: /Match starten/ })).toBeInTheDocument();
  });

  it('shows guests the rules without controls', () => {
    seat(false);
    renderRoom();

    const rules = screen.getByRole('list', { name: 'Regeln des Raums' });
    expect(rules).toHaveTextContent('501Bis 3 LegsDouble Out');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByText('Lena (du)')).toBeInTheDocument();
    expect(screen.getByText('Warte auf den Start')).toBeInTheDocument();
  });
});
