import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsModal } from '../Modals';
import { MiniGameStoryExport } from '../MiniGameStoryExport';
import { buildStoryData } from '../../utils/storyExport';
import type { MatchHistory, Player, PlayerStats } from '../../types';

const playerRow = (name: string, over: Partial<PlayerStats> = {}): PlayerStats => ({
  name, sets: 0, legs: 0, avg: '0.0', first9: '0.0', score: 180,
  roundScores: [60, 45, 75, null, null],
  segmentHits: { T20: 3, S20: 2, '20': 5 },
  dartsThrown: 9,
  triplesHit: 3,
  ...over
});

const modalPlayer = (name: string): Player => ({
  name, score: 180, legs: 0, sets: 0, legPts: 0, legDarts: 0, matchPts: 0, matchDarts: 0,
  legHistory: [], matchFirst9Pts: 0, matchFirst9Darts: 0, sixtyPlus: 0, hundredPlus: 0,
  oneFortyPlus: 0, oneEighty: 0, checkoutAttempts: 0, checkoutSuccesses: 0,
  highestCheckout: 0, segmentHits: {}
});

const matchOf = (gameType: MatchHistory['gameType'], rows: PlayerStats[]): MatchHistory => ({
  createdAt: '2026-09-08T10:00:00.000Z',
  date: '08.09.2026, 10:00',
  winner: rows[0].name,
  gameType,
  players: rows
});

const renderModal = (match: MatchHistory) =>
  render(
    <StatsModal
      isOpen
      winnerIndex={0}
      players={match.players.map(p => modalPlayer(p.name))}
      matchData={match}
      onClose={vi.fn()}
    />
  );

describe('Story-Export im Ergebnis-Dialog', () => {
  it('offers the export after a power scoring session', () => {
    renderModal(matchOf('powerScoring', [playerRow('Anna')]));
    expect(screen.getByRole('button', { name: /Story-Bild erstellen/i })).toBeInTheDocument();
  });

  // Ein einzelner Spieler braucht keine Auswahl.
  it('hides the player picker in a solo session', () => {
    renderModal(matchOf('powerScoring', [playerRow('Anna')]));
    expect(screen.queryByRole('radiogroup', { name: /exportiert/i })).not.toBeInTheDocument();
  });

  it('lets you pick whose stats to export with several players', () => {
    renderModal(matchOf('powerScoring', [playerRow('Anna'), playerRow('Ben')]));
    expect(screen.getByRole('radio', { name: 'Anna' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Ben' })).toBeInTheDocument();
  });

  // Ohne Rundenwerte hätte das Bild nichts zu zeigen — etwa bei einem X01-Match
  // oder einem älteren Ergebnis aus der Zeit vor dieser Aufzeichnung.
  it('stays away from a standard match', () => {
    renderModal(matchOf('standard', [playerRow('Anna')]));
    expect(screen.queryByRole('button', { name: /Story-Bild/i })).not.toBeInTheDocument();
  });

  it('stays away from a power scoring result recorded before rounds were kept', () => {
    renderModal(matchOf('powerScoring', [playerRow('Anna', { roundScores: undefined })]));
    expect(screen.queryByRole('button', { name: /Story-Bild/i })).not.toBeInTheDocument();
  });
});

describe('Story-Bild', () => {
  const renderImage = (over: Partial<PlayerStats> = {}) => {
    const player = playerRow('Anna', over);
    return render(
      <MiniGameStoryExport
        exportId="test-story"
        playerName={player.name}
        isWinner
        date="08.09.2026, 10:00"
        segmentHits={player.segmentHits ?? {}}
        {...buildStoryData(player, 'powerScoring')}
      />
    );
  };

  it('shows every round, thrown and still open', () => {
    const { container } = renderImage();
    const values = Array.from(container.querySelectorAll('div'))
      .map(el => el.textContent?.trim())
      .filter(Boolean);
    // 60, 45 und 75 geworfen; die zwei offenen Runden als Gedankenstrich.
    expect(values).toEqual(expect.arrayContaining(['60', '45', '75']));
    expect(container.textContent).toContain('–');
  });

  it('computes average and triple quote from the darts actually thrown', () => {
    const { container } = renderImage();
    // 180 Punkte aus 9 Darts -> 60.0 im Dreidart-Schnitt.
    expect(container.textContent).toContain('60.0');
    // 3 Triple auf 9 Darts -> 33 %.
    expect(container.textContent).toContain('33 %');
  });

  it('survives a session in which nothing was thrown', () => {
    const { container } = renderImage({ roundScores: [null, null], dartsThrown: 0, score: 0, triplesHit: 0 });
    expect(container.textContent).toContain('–');
  });
});
