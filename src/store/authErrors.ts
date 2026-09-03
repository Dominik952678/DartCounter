/**
 * Supabase answers in English, the app speaks German.
 *
 * Its messages went straight into the UI, so a mistyped password read "Invalid
 * login credentials" in the middle of a German screen. Anything unmapped is
 * passed through rather than swallowed — an unknown message is still better
 * than a shrug, and it shows up in bug reports verbatim.
 */
const MESSAGES: readonly (readonly [RegExp, string])[] = [
  [/invalid login credentials/i, 'E-Mail oder Passwort stimmt nicht.'],
  [/email not confirmed/i, 'Bitte bestätige zuerst den Link in deiner E-Mail.'],
  [/user already registered|already been registered/i, 'Für diese E-Mail gibt es bereits ein Konto. Melde dich stattdessen an.'],
  [/password should be at least/i, 'Das Passwort braucht mindestens 6 Zeichen.'],
  [/unable to validate email|invalid email/i, 'Diese E-Mail-Adresse sieht nicht gültig aus.'],
  [/email rate limit exceeded|over_email_send_rate_limit/i, 'Zu viele E-Mails in kurzer Zeit. Bitte versuche es in ein paar Minuten erneut.'],
  [/for security purposes|rate limit/i, 'Zu viele Versuche. Bitte warte einen Moment.'],
  [/failed to fetch|network|load failed/i, 'Keine Verbindung zum Server. Prüfe deine Internetverbindung.'],
  [/same_password|should be different from the old password/i, 'Das neue Passwort muss sich vom alten unterscheiden.'],
  [/token has expired|invalid token|otp_expired/i, 'Dieser Link ist abgelaufen. Fordere einen neuen an.']
];

export const translateAuthError = (message: string): string => {
  const match = MESSAGES.find(([pattern]) => pattern.test(message));
  return match ? match[1] : message;
};
