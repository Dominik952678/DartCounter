import React from 'react';
import { ConfirmModal } from './ConfirmModal';
import { APP_VERSION, BUILD_TIME } from '../version';

interface AppReloadPromptProps {
  onCancel: () => void;
}

/**
 * The version badge's dialog: what is installed, and the offer to fetch a new
 * build. Both badges — the menu's and the profile screen's — asked this through
 * `window.confirm`, which cannot be themed and blocks the tab.
 */
export const AppReloadPrompt: React.FC<AppReloadPromptProps> = ({ onCancel }) => (
  <ConfirmModal
    title={`DartCounter ${APP_VERSION}`}
    message={`Build-Zeit: ${BUILD_TIME}\n\nMöchtest du die App neu laden und den Zwischenspeicher aktualisieren?`}
    confirmLabel="Neu laden"
    cancelLabel="Schließen"
    icon="🔄"
    onConfirm={() => window.location.reload()}
    onCancel={onCancel}
  />
);
