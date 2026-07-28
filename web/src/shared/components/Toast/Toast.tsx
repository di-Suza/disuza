import { AlertCircle, Bell, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { memo } from 'react';

import type { ToastItem } from '@/app/providers/toast/ToastContext';
import AvatarImage from '@/shared/components/Avatar/AvatarImage';

type ToastProps = {
  toast: ToastItem;
  onClose: (id: number) => void;
};

const toastIcon = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
  notify: Bell,
};

const Toast = ({ toast, onClose }: ToastProps) => {
  const Icon = toastIcon[toast.type];

  return (
    <div className={`toast toast--${toast.type}`} role="status">
      {toast.type === 'notify' && toast.image ? (
        <AvatarImage className="toast__avatar" src={toast.image} fallback={<Icon className="toast__icon" aria-hidden="true" />} />
      ) : (
        <Icon className="toast__icon" aria-hidden="true" />
      )}
      <div className="toast__body">
        {toast.senderName && <strong>{toast.senderName}</strong>}
        <p>{toast.message}</p>
      </div>
      <button type="button" aria-label="Close toast" onClick={() => onClose(toast.id)}>
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
};

export default memo(Toast);
