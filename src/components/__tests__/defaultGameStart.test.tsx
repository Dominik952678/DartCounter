import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MainMenu } from '../MainMenu';
import { saveDefaultGame } from '../../utils/deviceSettings';
import { useAuthStore } from '../../store/useAuthStore';

/**
 * Das Standardspiel aus „Mein Profil" steht auf Start vor „Weiter wie zuletzt"
 * und läuft über denselben Direktstart durch den Setup-Screen.
 */

const renderStart = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<MainMenu matches={[]} />} />
        <Route path="/play" element={<p>Setup</p>} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ user: null, initialize: async () => {} } as never);
});

describe('Standardspiel auf Start', () => {
  it('takes the orange card and starts with its values', () => {
    localStorage.setItem('dart_x01_startScore', '301');
    saveDefaultGame({ startScore: 701, outMode: 'SO', setsToWin: 1, legsToWin: 5 });
    renderStart();

    expect(screen.getByText('Standardspiel · ein Tap')).toBeInTheDocument();
    expect(screen.getByText('701 · Single Out')).toBeInTheDocument();

    fireEvent.click(screen.getByText('701 · Single Out'));

    expect(localStorage.getItem('dart_x01_startScore')).toBe('701');
    expect(localStorage.getItem('dart_x01_legs')).toBe('5');
    expect(screen.getByText('Setup')).toBeInTheDocument();
  });

  it('keeps the first-start card when nothing is set', () => {
    renderStart();

    expect(screen.queryByText('Standardspiel · ein Tap')).not.toBeInTheDocument();
    expect(screen.getByText('Hier anfangen')).toBeInTheDocument();
  });
});
