import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthScreen } from '../AuthScreen';
import { useAuthStore } from '../../store/useAuthStore';

/** Anmelden (Entwurf H5): drei Wege in einem Screen, dieselben Abläufe wie bis v1.17. */

let signIn: ReturnType<typeof vi.fn>;
let signUp: ReturnType<typeof vi.fn>;
let requestPasswordReset: ReturnType<typeof vi.fn>;

const renderAuth = () =>
  render(
    <MemoryRouter initialEntries={['/auth']}>
      <Routes>
        <Route path="/auth" element={<AuthScreen />} />
        <Route path="/online" element={<p>Online-Screen</p>} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  signIn = vi.fn().mockResolvedValue({});
  signUp = vi.fn().mockResolvedValue({ needsConfirmation: true });
  requestPasswordReset = vi.fn().mockResolvedValue({});
  useAuthStore.setState({
    user: null,
    loading: false,
    error: null,
    clearError: vi.fn(),
    signIn,
    signUp,
    requestPasswordReset
  } as never);
});

describe('AuthScreen', () => {
  it('signs in and moves on', async () => {
    renderAuth();

    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'marcus@beispiel.de' } });
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'geheim123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));

    await waitFor(() => expect(signIn).toHaveBeenCalledWith('marcus@beispiel.de', 'geheim123'));
    expect(await screen.findByText('Online-Screen')).toBeInTheDocument();
  });

  it('asks for a username before creating an account', async () => {
    renderAuth();
    fireEvent.click(screen.getByRole('button', { name: 'Konto erstellen' }));

    expect(screen.getByRole('heading', { name: 'Konto erstellen' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'marcus@beispiel.de' } });
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'geheim123' } });
    fireEvent.change(screen.getByLabelText('Benutzername'), { target: { value: '   ' } });
    fireEvent.submit(screen.getByLabelText('E-Mail').closest('form')!);

    expect(await screen.findByRole('alert')).toHaveTextContent('Bitte gib einen Benutzernamen ein.');
    expect(signUp).not.toHaveBeenCalled();
  });

  it('confirms a sign-up that still needs the e-mail link', async () => {
    renderAuth();
    fireEvent.click(screen.getByRole('button', { name: 'Konto erstellen' }));

    fireEvent.change(screen.getByLabelText('Benutzername'), { target: { value: 'Marcus' } });
    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'marcus@beispiel.de' } });
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'geheim123' } });
    fireEvent.submit(screen.getByLabelText('E-Mail').closest('form')!);

    expect(await screen.findByRole('status')).toHaveTextContent('Bestätige den Link');
    expect(signUp).toHaveBeenCalledWith('marcus@beispiel.de', 'geheim123', 'Marcus');
    expect(screen.getByRole('heading', { name: 'Anmelden' })).toBeInTheDocument();
  });

  it('sends the reset link without a password field', async () => {
    renderAuth();
    fireEvent.click(screen.getByRole('button', { name: 'Passwort vergessen?' }));

    expect(screen.queryByLabelText('Passwort')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'marcus@beispiel.de' } });
    fireEvent.click(screen.getByRole('button', { name: 'Link anfordern' }));

    expect(await screen.findByRole('status')).toHaveTextContent('mit dem Link unterwegs');
    expect(requestPasswordReset).toHaveBeenCalledWith('marcus@beispiel.de');
  });
});
