import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Celebration, Dart } from '../../types';
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

const celebration = (over: Partial<Celebration>): Celebration => ({
  id: 1, type: 'highScore', playerIndex: 0, total: 180, darts: [], matchWin: false, ...over
});

const stage = (over: Partial<Celebration>, extra: { winnerLabel?: string } = {}) =>
  render(<CelebrationStage celebration={celebration(over)} playerName="Dominik" playerColor="#5DA9E9" {...extra} />);

describe('CelebrationStage', () => {
  it('slams the number in for a high score and names a 180 a maximum', () => {
    stage({ total: 180, darts: ['T20', 'T20', 'T20'].map(dart) });
    expect(screen.getByText('Maximum')).toBeInTheDocument();
    expect(screen.getByText('180')).toBeInTheDocument();
    expect(screen.getByText('T20 T20 T20')).toBeInTheDocument();
  });

  it('calls a visit from 170 to 179 a high score', () => {
    stage({ total: 174, darts: ['T20', 'T19', 'T19'].map(dart) });
    expect(screen.getByText('High Score')).toBeInTheDocument();
    expect(screen.getByText('174')).toBeInTheDocument();
  });

  it('rolls the finish up on an odometer', () => {
    stage({ type: 'highFinish', total: 121, darts: ['T20', 'T11', 'D14'].map(dart) });
    expect(screen.getByText('High Finish')).toBeInTheDocument();
    expect(screen.getByLabelText('121')).toBeInTheDocument();
  });

  it('shows the quiet panel with the finishing dart for a check', () => {
    stage({ type: 'check', total: 40, darts: [dart('D20')] });
    expect(screen.getByText('Check')).toBeInTheDocument();
    expect(screen.getByText('D20')).toBeInTheDocument();
  });

  it('shows the scoreline on the match win, naming the team in 2v2', () => {
    stage(
      { type: 'check', total: 32, darts: ['8', 'D12'].map(dart), matchWin: true, matchScore: [3, 1] },
      { winnerLabel: 'Team 1' }
    );
    expect(screen.getByText('Match')).toBeInTheDocument();
    expect(screen.getByText('Team 1')).toBeInTheDocument();
    expect(screen.getByText('3 : 1')).toBeInTheDocument();
  });

  it('turns the panel red for a missed target', () => {
    const { container } = stage({ type: 'missed', total: 96 });
    expect(container.querySelector('.cel-panel')).toHaveClass('is-danger');
    expect(screen.getByText('Verpasst')).toBeInTheDocument();
    expect(screen.getByText('96')).toBeInTheDocument();
  });

  it('says what the score was halved to after a split', () => {
    const { container } = stage({ type: 'split', total: 20, splitTarget: '15' });
    expect(container.querySelector('.cel-panel')).toHaveClass('is-danger');
    expect(screen.getByText('Split')).toBeInTheDocument();
    expect(screen.getByText('Halbiert auf')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('draws nothing for a bust', () => {
    const { container } = stage({ type: 'bust', total: 0 });
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

  it('outlines what a split round asked for: the wedge, or the ring', () => {
    const number = render(<CelebrationBoard celebration={celebration({ type: 'split', total: 20, splitTarget: '15' })} />);
    expect(number.container.querySelector('.cel-outline-area')).not.toBeNull();
    expect(number.container.querySelector('.cel-hit')).toBeNull();
    number.unmount();

    const ring = render(<CelebrationBoard celebration={celebration({ type: 'split', total: 20, splitTarget: 'Double' })} />);
    expect(ring.container.querySelector('.cel-outline-ring')).not.toBeNull();
  });

  it('shows no board for a missed target', () => {
    const { container } = render(<CelebrationBoard celebration={celebration({ type: 'missed', total: 96 })} />);
    expect(container).toBeEmptyDOMElement();
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
