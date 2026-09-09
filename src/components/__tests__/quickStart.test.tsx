import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomeContainer } from '../HomeContainer';
import { MatchSetup } from '../MatchSetup';
import { useAuthStore } from '../../store/useAuthStore';
import type { Profile } from '../../types';

/* Der angemeldete Pfad fragt vor dem Start den Sync-Zustand ab. Das ist ein
   Netzwerkaufruf, und geprüft wird hier der Übergang und nicht die Cloud —
   also die zwei Aufrufe stillgelegt, mit dem Ergebnis „nichts gekoppelt". */
vi.mock('../../db', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('../../db');
  return {
    ...actual,
    getActiveUserSyncInfo: vi.fn().mockResolvedValue(null),
    validateGuestSyncTokens: vi.fn().mockResolvedValue({ valid: true, revokedGuests: [] }),
    saveProfiles: vi.fn().mockResolvedValue(undefined)
  };
});

/**
 * Der „Ein Tap"-Weg von der Weiter-Karte: `/offline?start=1`.
 *
 * Er führt bewusst DURCH den Setup-Screen und nicht um ihn herum, weil dort die
 * Vorprüfungen liegen — gekoppelte Cloud-Profile, gültige Gast-Tokens, ein noch
 * laufendes Match, das Anlegen von Gastprofilen. Was hier geprüft wird, ist der
 * Übergang: dass der Parameter das Match auslöst, dass er es genau einmal tut,
 * und dass er ohne ihn nichts auslöst.
 */

const profiles: Record<string, Profile> = {
  Dominik: { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 }
};

const renderOffline = (search: string, onStartGame = vi.fn()) => {
  render(
    <MemoryRouter initialEntries={[`/offline${search}`]}>
      <HomeContainer
        profiles={profiles}
        setProfiles={vi.fn()}
        onStartGame={onStartGame}
        onStartMiniGame={vi.fn()}
      />
    </MemoryRouter>
  );
  return onStartGame;
};

beforeEach(() => { localStorage.clear(); });

describe('Direktstart über ?start=1', () => {
  it('starts the match without a further tap', async () => {
    const onStartGame = renderOffline('?start=1');

    await waitFor(() => expect(onStartGame).toHaveBeenCalledTimes(1));

    const [players, config] = onStartGame.mock.calls[0];
    expect(players.length).toBeGreaterThan(0);
    expect(players.every((p: string) => p && p.trim())).toBe(true);
    expect(config.startScore).toBe(501);
  });

  it('starts nothing without the parameter', async () => {
    const onStartGame = renderOffline('');

    await waitFor(() => expect(screen.getByText('Neues Spiel')).toBeInTheDocument());
    await new Promise(resolve => setTimeout(resolve, 60));
    expect(onStartGame).not.toHaveBeenCalled();
  });

  /** Ein Direktstart gilt immer dem X01-Match, egal welcher Bereich zuletzt offen war. */
  it('opens the X01 area even when training was the last one used', async () => {
    localStorage.setItem('dart_offline_subtab', 'training');
    const onStartGame = renderOffline('?start=1');

    await waitFor(() => expect(onStartGame).toHaveBeenCalledTimes(1));
  });
});

/**
 * Angemeldet leitet `useLineup` die Sitzplätze aus den Profilen ab, und die
 * laden asynchron: lokaler Cache zuerst, Cloud danach. Genau hier liegen die
 * zwei Fehler, gegen die die Bereitschaftsprüfung und der Ref gebaut sind.
 */
describe('Direktstart, während die Profile noch laden', () => {
  /* Zwei Profile, weil die Vorgabe zwei Sitzplätze besetzt und derselbe Spieler
     nicht zweimal antreten darf — mit nur einem Profil scheiterte der Start an
     dieser Prüfung und nicht an dem, was hier geprüft wird. */
  const twoPlayers: Record<string, Profile> = {
    Dominik: { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 },
    Mara: { wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0 }
  };

  const asUser = () => {
    // Der Store hält einen Supabase-`User`; für diesen Test zählen nur `id` und
    // der Name, deshalb der schmale Platzhalter statt eines vollen Objekts.
    useAuthStore.setState({
      user: { id: 'u1', user_metadata: { username: 'Dominik' } } as never
    });
  };

  beforeEach(() => { localStorage.clear(); asUser(); });
  afterEach(() => { useAuthStore.setState({ user: null }); });

  const renderSetup = (initial: Record<string, Profile>) => {
    const onStartGame = vi.fn();
    const view = render(
      <MemoryRouter>
        <MatchSetup profiles={initial} setProfiles={vi.fn()} onStartGame={onStartGame} autoStart />
      </MemoryRouter>
    );
    const show = (next: Record<string, Profile>) =>
      view.rerender(
        <MemoryRouter>
          <MatchSetup profiles={next} setProfiles={vi.fn()} onStartGame={onStartGame} autoStart />
        </MemoryRouter>
      );
    return { onStartGame, show };
  };

  /**
   * Ein Start im ersten Render träfe eine Aufstellung aus leeren Namen und
   * scheiterte an genau der Prüfung, die dafür da ist — der Nutzer bekäme
   * „Bitte gib für jeden Spielerplatz einen Namen ein" zu sehen, obwohl er nur
   * einen Tap auf „Weiter wie zuletzt" gemacht hat.
   */
  it('waits for the profiles instead of starting on empty seats', async () => {
    const { onStartGame, show } = renderSetup({});

    await new Promise(resolve => setTimeout(resolve, 40));
    expect(onStartGame).not.toHaveBeenCalled();
    expect(screen.queryByText(/für jeden Spielerplatz/)).not.toBeInTheDocument();

    show(twoPlayers);
    await waitFor(() => expect(onStartGame).toHaveBeenCalledTimes(1));
  });

  /**
   * Und dann nur einmal. Der Cloud-Satz muss das Profil aus dem lokalen Cache
   * nicht enthalten; fällt der Sitzplatz dabei kurz leer und füllt sich wieder,
   * kippt die Bereitschaft von wahr auf falsch auf wahr — ohne den Ref stünde
   * am Ende ein zweites gestartetes Match.
   */
  it('fires once even when the line-up drops out and comes back', async () => {
    const { onStartGame, show } = renderSetup(twoPlayers);

    await waitFor(() => expect(onStartGame).toHaveBeenCalledTimes(1));

    show({});
    await new Promise(resolve => setTimeout(resolve, 20));
    show(twoPlayers);
    await new Promise(resolve => setTimeout(resolve, 40));

    expect(onStartGame).toHaveBeenCalledTimes(1);
  });
});
