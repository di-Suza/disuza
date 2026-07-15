import { Loader2, TriangleAlert, X } from 'lucide-react';
import { memo, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { useLockBodyScroll } from '@/shared/hooks/useLockBodyScroll';
import Button from '@/shared/ui/Button';

type ConfirmDialogProps = {
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  isBusy?: boolean;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
};

const ConfirmDialog = ({
  cancelLabel = 'Cancel',
  confirmLabel = 'Delete',
  description,
  isBusy = false,
  isOpen,
  onCancel,
  onConfirm,
  title,
}: ConfirmDialogProps) => {
  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBusy) onCancel();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isBusy, isOpen, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop confirm-dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" onMouseDown={isBusy ? undefined : onCancel}>
      <section className="confirm-dialog" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="confirm-dialog__close" onClick={onCancel} disabled={isBusy} aria-label="Close confirmation">
          <X size={18} aria-hidden="true" />
        </button>

        <div className="confirm-dialog__icon">
          <TriangleAlert size={22} aria-hidden="true" />
        </div>

        <div className="confirm-dialog__body">
          <h2 id="confirm-dialog-title">{title}</h2>
          <p>{description}</p>
        </div>

        <footer className="confirm-dialog__actions">
          <Button variant="secondary" onClick={onCancel} disabled={isBusy}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isBusy}>
            {isBusy && <Loader2 className="spin" size={16} aria-hidden="true" />}
            {confirmLabel}
          </Button>
        </footer>
      </section>
    </div>,
    document.body,
  );
};

export default memo(ConfirmDialog);
