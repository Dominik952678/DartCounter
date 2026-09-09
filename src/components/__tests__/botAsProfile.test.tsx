import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlayerSelection } from '../matchSetup/PlayerSelection';
import { useLineup } from '../matchSetup/useLineup';
import { ProfileTab } from '../ProfileTab';
import { getGuestDefaultProfiles } from '../../db/profiles';
import { BOT_AVERAGES } from '../../utils/botProfiles';
import type { Profile } from '../../types';

/**
 * Ein Bot ist ein gespeichertes Profil mit eigenem Zielschnitt.
 *
 * Das Entscheidende daran ist, dass eine Aufstellung mehrere Bots
 * unterschiedlicher Stärke tragen kann. Vorher hing die Stärke faktisch am
 * Code: fünf Stellen setzten `|| 40`, zwei rechneten „Level × 10 + 20", und
 * verstellen ließ sie sich nur zwei Klicks tief im Dashboard.
 */

const profile = (over: Partial<Profile> = {}): Profile => ({
  wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0, ...over
});

const roster: Record<string, Profile> = {
  Dominik: profile({ wins: 4, matches: 9 }),
  'Bot leicht': profile({ isBot: true, targetAverage: 40 }),
  'Bot stark': profile({ isBot: true, targetAverage: 80 })
};

beforeEach(() => { localStorage.clear(); });

describe('Mitgelieferte Gastprofile', () => {
  it('ships two bots of different strength, both on an offered step', () => {
    const bots = Object.entries(getGuestDefaultProfiles()).filter(([, p]) => p.isBot);

    expect(bots).toHaveLength(2);
    const averages = bots.map(([, p]) => p.targetAverage);
    expect(new Set(averages).size).toBe(2);
    averages.forEach(avg => {
      expect(BOT_AVERAGES).toContain(avg as typeof BOT_AVERAGES[number]);
    });
  });
});

/**
 * `PlayerSelection` direkt, nicht über `MatchSetup`: die Auswahlliste erscheint
 * nur für angemeldete Nutzer, im Gastmodus tippt man Namen frei ein. Der
 * Umweg über einen gefälschten Auth-Store würde hier nichts prüfen, was diese
 * Komponente nicht selbst entscheidet.
 */
const Seats: React.FC = () => {
  const lineup = useLineup(roster, false, 2);
  return (
    <PlayerSelection
      profiles={roster}
      isGuest={false}
      playerCount={2}
      is2v2={false}
      lineup={lineup}
      errorMsg={null}
      onModeChange={vi.fn()}
      onPlayerCountChange={vi.fn()}
      onAddCloudGuest={vi.fn()}
    />
  );
};

describe('Aufstellung', () => {
  /**
   * Mit „Bot leicht" und „Bot stark" in derselben Liste ist die Stärke das,
   * wonach man auswählt. Sie erst im Profil-Screen zu zeigen hieße, beim
   * Aufstellen blind zu greifen.
   */
  it('names each bot with its target average in the seat picker', () => {
    render(<Seats />);

    const options = screen.getAllByRole('option').map(o => o.textContent);
    expect(options).toContain('Bot leicht · Ø 40');
    expect(options).toContain('Bot stark · Ø 80');
    // Ein Mensch bekommt keinen angehängten Schnitt.
    expect(options).toContain('Dominik');
  });
});

describe('Profilliste', () => {
  const renderTab = (onUpdateProfile = vi.fn()) => {
    render(
      <MemoryRouter>
        <ProfileTab
          profiles={roster}
          matches={[]}
          onCreateProfile={vi.fn()}
          onUpdateProfile={onUpdateProfile}
          onDeleteProfile={vi.fn()}
        />
      </MemoryRouter>
    );
    return onUpdateProfile;
  };

  it('puts the strength on the bot rows and nowhere else', () => {
    renderTab();

    expect(screen.getByLabelText('Spielstärke von Bot leicht')).toHaveValue('40');
    expect(screen.getByLabelText('Spielstärke von Bot stark')).toHaveValue('80');
    expect(screen.queryByLabelText('Spielstärke von Dominik')).not.toBeInTheDocument();
  });

  it('changes one bot without opening its dashboard', () => {
    const onUpdateProfile = renderTab();

    fireEvent.change(screen.getByLabelText('Spielstärke von Bot leicht'), {
      target: { value: '70' }
    });

    expect(onUpdateProfile).toHaveBeenCalledWith('Bot leicht', { targetAverage: 70 });
  });

  /** Ein Zwischenwert wird eingereiht, nicht gerundet — sonst stünde er leer da. */
  it('keeps an off-step value selectable', () => {
    render(
      <MemoryRouter>
        <ProfileTab
          profiles={{ Bot: profile({ isBot: true, targetAverage: 45 }) }}
          matches={[]}
          onCreateProfile={vi.fn()}
          onUpdateProfile={vi.fn()}
          onDeleteProfile={vi.fn()}
        />
      </MemoryRouter>
    );

    const select = screen.getByLabelText('Spielstärke von Bot');
    expect(select).toHaveValue('45');
    expect(select.querySelectorAll('option')).toHaveLength(BOT_AVERAGES.length + 1);
  });
});
