import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Celebration, Dart, GameConfig, Player } from '../../types';
import { CelebrationStage } from '../celebration/CelebrationStage';
import { CelebrationBoard } from '../celebration/CelebrationBoard';
import { CardCelebration } from '../celebration/CardCelebration';

const dart = (label: string): Dart => {
  if (label === 'Miss') return { base: 0, mult: 1, value: 0, label: '0' };
  if (label === 'DB') return { base: 25, mult: 2, value: 50, label: 'DB' };
  const mult = label.startsWith('T') ? 3 : label.startsWith('D') ? 2 : 1;
  const base = Number(label.replace(/^[TD]/, ''));
  return { base, mult, value: base * mult, label };
};

const player = (name: string): Player => ({
  name, score: 501, legs: 0, sets: 0, legPts: 0, legDarts: 0, matchPts: 0, matchDarts: 0,
  legHistory: [], matchFirst9Pts: 0, matchFirst9Darts: 0, sixtyPlus: 0, hundredPlus: 0,
  oneFortyPlus: 0, oneEighty: 0, highestCheckout: 0, checkoutAttempts: 0, checkoutSuccesses: 0,
  segmentHits: {}
});

const players = [player('Dominik'), player('Gegner')];
const config: GameConfig = { startScore: 501, outMode: 'DO', setsToWin: 1, legsToWin: 3 };

const celebration = (over: Partial<Celebration>): Celebration => ({
  id: 1, type: 'highScore', playerIndex: 0, total: 180, darts: [], matchWin: false, ...over
});

describe('CelebrationStage', () => {
  it('slams the number in for a high score and names a 180 a maximum', () => {
    render(<CelebrationStage celebration={celebration({ total: 180, darts: ['T20', 'T20', 'T20'].map(dart) })} players={players} config={config} />);
    expect(screen.getByText('Maximum')).toBeInTheDocument();
    expect(screen.getByText('180')).toBeInTheDocument();
    expect(screen.getByText('T20 T20 T20')).toBeInTheDocument();
  });

  it('calls a visit from 170 to 179 a high score', () => {
    render(<CelebrationStage celebration={celebration({ total: 174, darts: ['T20', 'T19', 'T19'].map(dart) })} players={players} config={config} />);
    expect(screen.getByText('High Score')).toBeInTheDocument();
    expect(screen.getByText('174')).toBeInTheDocument();
  });

  it('rolls the finish up on an odometer', () => {
    render(<CelebrationStage celebration={celebration({ type: 'highFinish', total: 121, darts: ['T20', 'T11', 'D14'].map(dart) })} players={players} config={config} />);
    expect(screen.getByText('High Finish')).toBeInTheDocument();
    expect(screen.getByLabelText('121')).toBeInTheDocument();
  });

  it('shows the quiet panel with the finishing dart for a check', () => {
    render(<CelebrationStage celebration={celebration({ type: 'check', total: 40, darts: [dart('D20')] })} players={players} config={config} />);
    expect(screen.getByText('Check')).toBeInTheDocument();
    expect(screen.getByText('D20')).toBeInTheDocument();
  });

  it('shows the scoreline on the match win', () => {
    render(<CelebrationStage celebration={celebration({ type: 'check', total: 32, darts: ['8', 'D12'].map(dart), matchWin: true, matchScore: [3, 1] })} players={players} config={config} />);
    expect(screen.getByText('Match')).toBeInTheDocument();
    expect(screen.getByText('gewinnt')).toBeInTheDocument();
    expect(screen.getByText('3 : 1')).toBeInTheDocument();
  });

  it('draws nothing for a bust', () => {
    const { container } = render(<CelebrationStage celebration={celebration({ type: 'bust', total: 0 })} players={players} config={config} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('CelebrationBoard', () => {
  it('lights every dart and lets a repeated wedge flash first', () => {
    const { container } = render(<CelebrationBoard celebration={celebration({ darts: ['T20', 'T20', 'T20'].map(dart) })} />);
    expect(container.querySelectorAll('.cel-hit')).toHaveLength(3);
    expect(container.querySelectorAll('.cel-hit.is-flash')).toHaveLength(2);
    expect(container.querySelector('.cel-halo')).not.toBeNull();
  });

  it('skips a miss and marks the finishing dart for a check', () => {
    const { container } = render(<CelebrationBoard celebration={celebration({ type: 'check', total: 40, darts: ['Miss', 'D20'].map(dart) })} />);
    const layer = container.querySelector('.cel-board-layer');
    expect(layer).toHaveClass('is-quiet');
    expect(layer).toHaveAttribute('data-finish', '1');
    expect(container.querySelectorAll('.cel-hit')).toHaveLength(1);
    expect(container.querySelector('.cel-hit.is-success')).not.toBeNull();
    // The quiet board has no ring and no sweep.
    expect(container.querySelector('.cel-halo, .cel-double-sweep')).toBeNull();
  });

  it('sweeps the double ring after a high finish', () => {
    const { container } = render(<CelebrationBoard celebration={celebration({ type: 'highFinish', total: 121, darts: ['T20', 'T11', 'D14'].map(dart) })} />);
    expect(container.querySelector('.cel-board-layer')).toHaveClass('is-big');
    expect(container.querySelector('.cel-double-sweep')).not.toBeNull();
  });
});

describe('CardCelebration', () => {
  it('stamps the scoreline into the card on the match win', () => {
    render(<CardCelebration celebration={celebration({ type: 'check', total: 32, matchWin: true, matchScore: [3, 1] })} />);
    expect(screen.getByText('Match')).toBeInTheDocument();
    expect(screen.getByText('3 : 1')).toBeInTheDocument();
  });

  it('adds nothing to the card for a high score', () => {
    const { container } = render(<CardCelebration celebration={celebration({ total: 180 })} />);
    expect(container).toBeEmptyDOMElement();
  });
});
