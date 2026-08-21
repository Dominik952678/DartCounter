import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Keypad } from '../Keypad';
import type { Dart } from '../../types';

describe('Keypad Component', () => {
  const defaultProps = {
    currentRoundDarts: [] as Dart[],
    currentMultiplier: 1,
    isProcessing: false,
    roundBust: false,
    addDart: vi.fn(),
    toggleMultiplier: vi.fn(),
    undoSingleDart: vi.fn(),
    abortGame: vi.fn(),
    canUndo: false
  };

  it('renders numpad buttons 1 to 20, Bull, and Miss', () => {
    render(<Keypad {...defaultProps} />);

    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('19')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Bull')).toBeInTheDocument();
    expect(screen.getByText('Miss')).toBeInTheDocument();
    expect(screen.getByText('Double')).toBeInTheDocument();
    expect(screen.getByText('Triple')).toBeInTheDocument();
    expect(screen.getByText('⟲ Zurück')).toBeInTheDocument();
    expect(screen.getByText('Abbrechen')).toBeInTheDocument();
  });

  it('calls addDart when a number button is clicked', () => {
    const addDartMock = vi.fn();
    render(<Keypad {...defaultProps} addDart={addDartMock} />);

    fireEvent.click(screen.getByText('20'));
    expect(addDartMock).toHaveBeenCalledWith(20);

    fireEvent.click(screen.getByText('Bull'));
    expect(addDartMock).toHaveBeenCalledWith(25);

    fireEvent.click(screen.getByText('Miss'));
    expect(addDartMock).toHaveBeenCalledWith(0);
  });

  it('calls toggleMultiplier when Double or Triple is clicked', () => {
    const toggleMultMock = vi.fn();
    render(<Keypad {...defaultProps} toggleMultiplier={toggleMultMock} />);

    fireEvent.click(screen.getByText('Double'));
    expect(toggleMultMock).toHaveBeenCalledWith(2);

    fireEvent.click(screen.getByText('Triple'));
    expect(toggleMultMock).toHaveBeenCalledWith(3);
  });

  it('calls undoSingleDart when undo button is clicked and enabled', () => {
    const undoMock = vi.fn();
    render(<Keypad {...defaultProps} canUndo={true} undoSingleDart={undoMock} />);

    const undoButton = screen.getByText('⟲ Zurück');
    expect(undoButton).toBeEnabled();
    fireEvent.click(undoButton);
    expect(undoMock).toHaveBeenCalled();
  });

  it('disables undo button when canUndo is false and no darts in round', () => {
    render(<Keypad {...defaultProps} canUndo={false} currentRoundDarts={[]} />);
    expect(screen.getByText('⟲ Zurück')).toBeDisabled();
  });

  it('calls abortGame when abort button is clicked', () => {
    const abortMock = vi.fn();
    render(<Keypad {...defaultProps} abortGame={abortMock} />);

    fireEvent.click(screen.getByText('Abbrechen'));
    expect(abortMock).toHaveBeenCalled();
  });
});
