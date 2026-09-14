import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import type { GameConfig } from '../../types';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LobbyBrowser } from '../LobbyBrowser';
import { useOnlineStore } from '../../store/useOnlineStore';
import { useAuthStore } from '../../store/useAuthStore';

/** Online unter „Spielen" (Entwurf F1, F2): Code in vier Kästchen, Raum im Blatt. */

const radioFor = (text: string) =>
  screen.getByText(text).closest('label')!.querySelector('input') as HTMLInputElement;

let joinRoom: Mock<(code: string, username: string) => Promise<{ error?: string }>>;
let createRoom: Mock<(username: string, isPublic: boolean, settings: GameConfig) => Promise<{ code?: string; error?: string }>>;

beforeEach(() => {
  localStorage.clear();
  joinRoom = vi.fn<(code: string, username: string) => Promise<{ error?: string }>>().mockResolvedValue({});
  createRoom = vi.fn<(username: string, isPublic: boolean, settings: GameConfig) => Promise<{ code?: string; error?: string }>>().mockResolvedValue({ code: 'B3X9' });
  useAuthStore.setState({ user: null });
  useOnlineStore.setState({
    initGlobalLobby: vi.fn(),
    joinRoom,
    createRoom,
    connectionState: 'idle',
    publicLobbies: []
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const renderBrowser = () =>
  render(
    <MemoryRouter>
      <LobbyBrowser />
    </MemoryRouter>
  );

describe('Raum beitreten', () => {
  it('fills the four boxes and joins with the code', async () => {
    const { container } = renderBrowser();
    const join = screen.getByRole('button', { name: /Beitreten/ });
    expect(join).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Raumcode'), { target: { value: 'a7-k2' } });

    const boxes = Array.from(container.querySelectorAll('.code-box')).map(b => b.textContent);
    expect(boxes).toEqual(['A', '7', 'K', '2']);
    fireEvent.click(join);

    await waitFor(() => expect(joinRoom).toHaveBeenCalledWith('A7K2', expect.any(String)));
  });

  it('marks the code when the room does not exist', async () => {
    joinRoom.mockResolvedValue({ error: 'Raum nicht gefunden.' });
    const { container } = renderBrowser();

    fireEvent.change(screen.getByLabelText('Raumcode'), { target: { value: 'Q9ZZ' } });
    fireEvent.click(screen.getByRole('button', { name: /Beitreten/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Raum nicht gefunden.');
    expect(container.querySelector('.code-input')).toHaveClass('is-invalid');
  });

  it('joins a public room from the list', async () => {
    useOnlineStore.setState({
      publicLobbies: [{
        isLobby: true, isPublic: true, code: 'L3NA', hostName: 'Lena',
        settings: { mode: 'standard', startScore: 501, outMode: 'DO', setsToWin: 1, legsToWin: 3 }
      }]
    });
    renderBrowser();

    expect(screen.getByText('501 · DO · Bis 3 Legs')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Raum L3NA von Lena beitreten' }));

    await waitFor(() => expect(joinRoom).toHaveBeenCalledWith('L3NA', expect.any(String)));
  });
});

describe('Raum erstellen', () => {
  it('opens a sheet and creates a room with the chosen mode', async () => {
    renderBrowser();
    fireEvent.click(screen.getByRole('button', { name: /Raum erstellen/ }));

    expect(screen.getByRole('dialog', { name: 'Raum erstellen' })).toBeInTheDocument();
    fireEvent.click(radioFor('Nur per Code'));
    fireEvent.click(radioFor('Power'));
    fireEvent.click(radioFor('15'));
    fireEvent.click(screen.getByRole('button', { name: 'Raum eröffnen' }));

    await waitFor(() =>
      expect(createRoom).toHaveBeenCalledWith(expect.any(String), false, expect.objectContaining({ mode: 'powerscoring', rounds: 15 }))
    );
  });

  it('offers X01 score, legs and finish', () => {
    renderBrowser();
    fireEvent.click(screen.getByRole('button', { name: /Raum erstellen/ }));

    fireEvent.click(radioFor('701'));
    fireEvent.click(screen.getByRole('button', { name: 'Legs erhöhen' }));

    expect(radioFor('701')).toBeChecked();
    expect(screen.getByLabelText('Legs')).toHaveValue(4);
    expect(radioFor('Double Out')).toBeChecked();
  });
});

describe('Ohne Verbindung', () => {
  it('locks joining and points to a local match', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderBrowser();

    expect(screen.getByText('Keine Verbindung · lokale Spiele gehen weiter')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Raum erstellen/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Lokales Match spielen/ })).toBeInTheDocument();
  });
});
