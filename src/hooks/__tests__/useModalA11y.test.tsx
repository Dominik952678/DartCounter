import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ConfirmModal } from '../../components/ConfirmModal';

/**
 * Both guarantees here were missing: the page scrolled behind every dialog on
 * a touch screen, and because `onClose` was an effect dependency while every
 * caller passes an inline arrow, any re-render of the parent tore the dialog's
 * focus handling down and set it up again.
 */

const props = {
  title: 'Wirklich löschen?',
  message: 'Das lässt sich nicht rückgängig machen.',
  onConfirm: vi.fn(),
  onCancel: vi.fn()
};

describe('useModalA11y', () => {
  it('locks the page behind the dialog and restores it on close', () => {
    const { unmount } = render(<ConfirmModal {...props} />);
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('keeps focus where the user put it across a re-render of the parent', () => {
    // A parent that re-renders while the dialog is open, passing a fresh
    // `onCancel` arrow each time — which is what every call site does.
    const Host = () => {
      const [tick, setTick] = useState(0);
      return (
        <>
          <button onClick={() => setTick(t => t + 1)}>Neu rendern</button>
          <span data-testid="tick">{tick}</span>
          <ConfirmModal
            title={props.title}
            message={props.message}
            onConfirm={() => {}}
            onCancel={() => {}}
          />
        </>
      );
    };

    render(<Host />);

    const confirm = screen.getByRole('button', { name: 'Bestätigen' });
    act(() => { confirm.focus(); });
    expect(document.activeElement).toBe(confirm);

    fireEvent.click(screen.getByText('Neu rendern'));

    expect(screen.getByTestId('tick').textContent).toBe('1');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Bestätigen' }));
  });

  it('still answers Escape after the parent has re-rendered', () => {
    const onCancel = vi.fn();
    const Host = () => {
      const [tick, setTick] = useState(0);
      return (
        <>
          <button onClick={() => setTick(t => t + 1)}>Neu rendern</button>
          <span data-testid="tick">{tick}</span>
          <ConfirmModal {...props} onCancel={onCancel} />
        </>
      );
    };

    render(<Host />);
    fireEvent.click(screen.getByText('Neu rendern'));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onCancel).toHaveBeenCalled();
  });
});
