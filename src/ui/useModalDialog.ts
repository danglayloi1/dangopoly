import { useEffect, useRef, type MouseEvent, type SyntheticEvent } from 'react';

/**
 * Shows a <dialog> as a modal while the component is mounted. Closing (button, Esc, or a click
 * on the backdrop) calls `onClose`, and the parent then unmounts the dialog. We don't wait for the
 * browser's own "close" event, which some browsers delay or skip while the page isn't drawing.
 */
export function useModalDialog(onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const dialogProps = {
    ref,
    onCancel: (e: SyntheticEvent) => {
      e.preventDefault(); // Esc: let React remove the dialog instead
      onClose();
    },
    onClose,
    onClick: (e: MouseEvent) => {
      if (e.target === ref.current) onClose(); // click on the backdrop
    },
  };

  return { dialogProps, close: onClose };
}
