import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { memo } from 'react';

import type { ToastItem } from '@/app/providers/toast/ToastContext';

type ToastProps = {
  toast: ToastItem;
  onClose: (id: number) => void;
};

const toastIcon = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const Toast = ({ toast, onClose }: ToastProps) => {
  const Icon = toastIcon[toast.type];

  return (
    <div className={`toast toast--${toast.type}`} role="status">
      <Icon className="toast__icon" aria-hidden="true" />
      <p>{toast.message}</p>
      <button type="button" aria-label="Close toast" onClick={() => onClose(toast.id)}>
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
};

export default memo(Toast);
