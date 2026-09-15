import React, { useState } from 'react';
import { APP_VERSION, BUILD_TIME } from '../../version';
import { AppReloadPrompt } from '../AppReloadPrompt';

/** Version und Build; ein Tipp bietet Neuladen mit geleertem Service-Worker-Cache an. */
export const AppInfoCard: React.FC = () => {
  const [showReloadPrompt, setShowReloadPrompt] = useState(false);

  return (
    <footer className="profile-footer">
      <button
        type="button"
        className="profile-version"
        onClick={() => setShowReloadPrompt(true)}
        title="Klicken zum Neuladen / Cache leeren"
      >
        <span>Dartcounter <span className="num">{APP_VERSION}</span></span>
        <span aria-hidden="true">·</span>
        <span>Build {BUILD_TIME}</span>
      </button>

      {showReloadPrompt && <AppReloadPrompt onCancel={() => setShowReloadPrompt(false)} />}
    </footer>
  );
};
