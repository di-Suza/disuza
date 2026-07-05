import { memo } from 'react';

import type { ToastItem } from '@/app/providers/toast/ToastContext';
import Toast from './Toast';

type ToastContainerProps = {
  toasts: ToastItem[];
  onClose: (id: number) => void;
};

const ToastContainer = ({ toasts, onClose }: ToastContainerProps) => (
  <div className="toast-stack" aria-live="polite" aria-relevant="additions removals">
    {toasts.map((toast) => (
      <Toast key={toast.id} toast={toast} onClose={onClose} />
    ))}
  </div>
);

export default memo(ToastContainer);
