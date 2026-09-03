import React, { useId, useState } from 'react';
import { useModalA11y } from '../hooks/useModalA11y';

interface ConfirmModalProps {
  title: string;
  /** Line breaks are kept, for the dialogs that list details under a question. */
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button, for anything that throws work or data away. */
  destructive?: boolean;
  icon?: string;
  /** May be async; the buttons stay disabled until it settles. */
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/**
 * The app's one confirmation dialog.
 *
 * There were eleven before: seven native `window.confirm` calls, which cannot
 * be styled, cannot show a theme, and block the whole tab, and four
 * hand-written dialogs with the same markup copied between the game screen and
 * the three training modes.
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  confirmLabel = 'Bestätigen',
  cancelLabel = 'Abbrechen',
  destructive = false,
  icon = '⚠️',
  onConfirm,
  onCancel
}) => {
  const [busy, setBusy] = useState(false);
  const titleId = useId();
  const messageId = useId();
  const dialogRef = useModalA11y<HTMLDivElement>({ onClose: onCancel });

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        ref={dialogRef}
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '380px', textAlign: 'center', padding: '28px 20px' }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '10px' }} aria-hidden="true">{icon}</div>
        <h3 id={titleId} style={{ marginBottom: '8px', fontSize: '1.3em' }}>{title}</h3>
        <p
          id={messageId}
          style={{
            color: 'var(--text-dim)',
            fontSize: '0.9em',
            lineHeight: '1.4',
            marginBottom: '22px',
            whiteSpace: 'pre-line'
          }}
        >
          {message}
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={onCancel} disabled={busy} style={{ flex: 1 }}>
            {cancelLabel}
          </button>
          <button
            className={destructive ? 'btn-danger' : 'btn-primary'}
            onClick={handleConfirm}
            disabled={busy}
            style={{ flex: 1 }}
          >
            {busy ? 'Einen Moment…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
