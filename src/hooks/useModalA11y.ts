import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

interface ModalA11yOptions {
  /** Called when Escape is pressed. Omit for a dialog that must be answered. */
  onClose?: () => void;
  /** Whether the dialog is on screen; the hook does nothing while it is not. */
  isOpen?: boolean;
}

/**
 * Makes a dialog behave like one for the keyboard.
 *
 * The result modal declared `role="dialog"` and handled Escape — on a `div`
 * that never had focus, so the key did nothing. Nothing moved focus into a
 * dialog either, so Tab kept walking the page behind it, and closing left focus
 * nowhere. This hook moves focus in on open, keeps Tab inside, sends Escape to
 * `onClose`, and gives focus back to whatever had it before.
 *
 * Returns the ref to put on the dialog's own element.
 */
export const useModalA11y = <T extends HTMLElement>({ onClose, isOpen = true }: ModalA11yOptions = {}) => {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusable = () => Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
    // The first control, or the dialog itself when it holds none.
    (focusable()[0] ?? container).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = focusable();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || active === container)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  return containerRef;
};
