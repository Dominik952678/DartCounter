import React from 'react';

interface LoadingScreenProps {
  /** Headline; omitted for the bare "connecting" case. */
  title?: string;
  message?: string;
  children?: React.ReactNode;
}

/**
 * The full-screen waiting state, built from the existing `center-stage` and
 * `loading-orb` styling that the lobby and the online board each had their own
 * copy of. It is also the Suspense fallback for the lazily loaded routes, so a
 * route that is still downloading looks like every other wait in the app.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ title, message, children }) => (
  <div className="screen active-screen app-container center-stage">
    <div className="loading-orb" aria-hidden="true">🎯</div>
    {title && <h3 className="center-stage-title">{title}</h3>}
    {message && <p className="center-stage-text">{message}</p>}
    {children}
  </div>
);
