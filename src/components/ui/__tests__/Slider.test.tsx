import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Slider } from '../Slider';

/**
 * Der Slider rechnet seine Geometrie im Stylesheet aus zwei Custom Properties.
 * Layout lässt sich hier nicht messen (happy-dom rechnet keins), die zwei
 * Zahlen und die Radio-Semantik aber schon — und die sind alles, was die
 * Komponente beiträgt.
 */

const SCORES = [301, 501, 701, 1001] as const;

const renderScores = (value: number, onChange = vi.fn()) => {
  const { container } = render(
    <Slider
      name="startScore"
      value={value}
      options={SCORES.map(score => ({ value: score, label: score, ariaLabel: `${score} Punkte` }))}
      onChange={onChange}
      ariaLabel="Startpunktzahl"
    />
  );
  return { track: container.querySelector<HTMLElement>('.slider')!, onChange };
};

describe('Slider: der gleitende Thumb', () => {
  it('hands the stylesheet the option count and the active index', () => {
    const { track } = renderScores(701);
    expect(track.style.getPropertyValue('--slider-count')).toBe('4');
    expect(track.style.getPropertyValue('--slider-active')).toBe('2');
  });

  it('counts from zero on the first option', () => {
    expect(renderScores(301).track.style.getPropertyValue('--slider-active')).toBe('0');
  });

  it('renders the thumb once, hidden from screen readers', () => {
    const { track } = renderScores(501);
    const thumb = track.querySelectorAll('.slider-thumb');
    expect(thumb).toHaveLength(1);
    expect(thumb[0].getAttribute('aria-hidden')).toBe('true');
  });

  /**
   * Ein Wert, den keine Option trägt — etwa ein Startscore aus einem alten
   * gespeicherten Spiel. Der Thumb parkt auf Position 0 und wird ausgeblendet
   * statt entfernt: aus `display: none` heraus gibt es keine Bewegung.
   */
  it('parks the thumb and hides it when no option carries the value', () => {
    const { track } = renderScores(170);
    expect(track.style.getPropertyValue('--slider-active')).toBe('0');
    expect(track.querySelector('.slider-thumb')).toHaveClass('is-hidden');
    expect(track.querySelectorAll('label.active')).toHaveLength(0);
  });

  /** Die Bauform soll von zwei bis fünf Optionen tragen, nicht nur genau zwei. */
  it.each([2, 3, 5])('generalises to %i options', count => {
    const options = Array.from({ length: count }, (_, i) => ({ value: i, label: i }));
    const { container } = render(
      <Slider name="n" value={count - 1} options={options} onChange={vi.fn()} ariaLabel="n" />
    );
    const track = container.querySelector<HTMLElement>('.slider')!;
    expect(track.style.getPropertyValue('--slider-count')).toBe(String(count));
    expect(track.style.getPropertyValue('--slider-active')).toBe(String(count - 1));
  });
});

describe('Slider: Bedienung', () => {
  /**
   * Auf echten Radio-Inputs gebaut, nicht auf Buttons — dafür gibt es
   * Pfeiltasten-Navigation und Gruppen-Semantik geschenkt. Die Inputs sind
   * versteckt, aber NICHT `display: none`: das nähme sie aus dem
   * Accessibility-Tree und damit aus der Tastaturbedienung.
   */
  it('is a radio group of real radios, with the current one checked', () => {
    renderScores(501);

    expect(screen.getByRole('radiogroup', { name: 'Startpunktzahl' })).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
    expect(radios.filter(r => (r as HTMLInputElement).checked)).toHaveLength(1);
    expect(screen.getByRole('radio', { name: '501 Punkte' })).toBeChecked();
  });

  it('reports the option value with its own type, not as a string', () => {
    const { onChange } = renderScores(301);
    fireEvent.click(screen.getByRole('radio', { name: '1001 Punkte' }));
    expect(onChange).toHaveBeenCalledWith(1001);
  });

  it('marks exactly the active option', () => {
    const { track } = renderScores(1001);
    const active = track.querySelectorAll('label.active');
    expect(active).toHaveLength(1);
    expect(active[0].textContent).toBe('1001');
  });

  it('does not report a disabled option', () => {
    const onChange = vi.fn();
    render(
      <Slider
        name="mode"
        value="a"
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B', disabled: true }
        ]}
        onChange={onChange}
        ariaLabel="Modus"
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: 'B' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
