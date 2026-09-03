import { describe, it, expect } from 'vitest';
import { translateAuthError } from '../authErrors';

describe('translateAuthError', () => {
  /** Supabase's English went straight into the German UI. */
  it('answers in the language of the app', () => {
    expect(translateAuthError('Invalid login credentials')).toBe('E-Mail oder Passwort stimmt nicht.');
    expect(translateAuthError('Email not confirmed')).toMatch(/bestätige/i);
    expect(translateAuthError('User already registered')).toMatch(/bereits ein Konto/);
    expect(translateAuthError('Password should be at least 6 characters')).toMatch(/6 Zeichen/);
  });

  it('recognises a message whatever its casing or wrapping', () => {
    expect(translateAuthError('AuthApiError: invalid login credentials'))
      .toBe('E-Mail oder Passwort stimmt nicht.');
  });

  /** An unmapped message is still better than a shrug, and it reaches reports. */
  it('passes an unknown message through untouched', () => {
    expect(translateAuthError('Something entirely new')).toBe('Something entirely new');
  });
});
