import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfirmModal } from '../ConfirmModal';

const renderModal = (overrides: Partial<React.ComponentProps<typeof ConfirmModal>> = {}) => {
  const props = {
    title: 'Spiel beenden?',
    message: 'Möchtest du das aktuelle Match wirklich abbrechen?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides
  };
  const view = render(<ConfirmModal {...props} />);
  return { ...view, props };
};

describe('ConfirmModal', () => {
  it('names itself to the screen reader', () => {
    renderModal();

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Spiel beenden?');
    expect(dialog).toHaveAccessibleDescription(/wirklich abbrechen/);
  });

  it('reports the answer it was given', () => {
    const { props } = renderModal({ confirmLabel: 'Beenden', cancelLabel: 'Weiterspielen' });

    fireEvent.click(screen.getByText('Weiterspielen'));
    expect(props.onCancel).toHaveBeenCalled();
    expect(props.onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Beenden'));
    expect(props.onConfirm).toHaveBeenCalled();
  });

  /** The Escape handler used to sit on a div nothing ever focused. */
  it('cancels on Escape', () => {
    const { props } = renderModal();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

    expect(props.onCancel).toHaveBeenCalled();
  });

  it('cancels on a click outside, but not inside', () => {
    const { props } = renderModal();

    fireEvent.click(screen.getByRole('dialog'));
    expect(props.onCancel).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(props.onCancel).toHaveBeenCalled();
  });

  it('moves focus into the dialog and hands it back afterwards', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    const { unmount } = renderModal();
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);

    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('keeps Tab inside the dialog', () => {
    renderModal({ confirmLabel: 'Beenden', cancelLabel: 'Weiterspielen' });
    const cancel = screen.getByText('Weiterspielen');
    const confirm = screen.getByText('Beenden');

    confirm.focus();
    fireEvent.keyDown(confirm, { key: 'Tab' });
    expect(document.activeElement).toBe(cancel);

    fireEvent.keyDown(cancel, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(confirm);
  });

  it('blocks a second answer while an async confirm is running', async () => {
    let release: () => void = () => {};
    const onConfirm = vi.fn(() => new Promise<void>(resolve => { release = resolve; }));
    renderModal({ onConfirm, confirmLabel: 'Löschen' });

    fireEvent.click(screen.getByText('Löschen'));
    expect(screen.getByText('Einen Moment…')).toBeDisabled();

    release();
    await waitFor(() => expect(screen.getByText('Löschen')).toBeEnabled());
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
