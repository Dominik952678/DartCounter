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
 * How many dialogs currently hold the scroll lock. A counter rather than a
 * boolean so a dialog opened on top of another does not release the lock for
 * both when it closes.
 */
let scrollLocks = 0;
let restoreOverflow = '';

const lockBodyScroll = () => {
  if (typeof document === 'undefined') return;
  if (scrollLocks === 0) {
    restoreOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLocks += 1;
};

const releaseBodyScroll = () => {
  if (typeof document === 'undefined') return;
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) {
    document.body.style.overflow = restoreOverflow;
  }
};

/**
 * Makes a dialog behave like one for the keyboard.
 *
 * The result modal declared `role="dialog"` and handled Escape — on a `div`
 * that never had focus, so the key did nothing. Nothing moved focus into a
 * dialog either, so Tab kept walking the page behind it, and closing left focus
 * nowhere. This hook moves focus in on open, keeps Tab inside, sends Escape to
 * `onClose`, gives focus back to whatever had it before, and stops the page
 * behind the dialog from scrolling under it on a touch screen.
 *
 * `onClose` is held in a ref rather than being a dependency. Every caller
 * passes an inline arrow, so depending on it re-ran the whole effect on each
 * render of the parent: focus jumped to the trigger behind the open dialog and
 * back to its first button, and after the second run the "previously focused"
 * element was the dialog's own button, so closing dropped focus onto `<body>`.
 *
 * Returns the ref to put on the dialog's own element.
 */
export const useModalA11y = <T extends HTMLElement>({ onClose, isOpen = true }: ModalA11yOptions = {}) => {
  const containerRef = useRef<T>(null);
  const onCloseRef = useRef(onClose);

  // Synced after commit, so the handler below always calls the current one
  // without the effect having to depend on its identity.
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusable = () => Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
    // The first control, or the dialog itself when it holds none.
    (focusable()[0] ?? container).focus();

    lockBodyScroll();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onCloseRef.current) {
        e.stopPropagation();
        onCloseRef.current();
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
      releaseBodyScroll();
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  return containerRef;
};
