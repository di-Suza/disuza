import { AlertCircle, Bell, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { memo } from 'react';

import type { ToastItem } from '@/app/providers/toast/ToastContext';
import { getOptimizedImage } from '@/shared/utils/getOptimizedImage';

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
  const toastImage = toast.image ? getOptimizedImage(toast.image, 'avatarSmall') || toast.image : '';

  return (
    <div className={`toast toast--${toast.type}`} role="status">
      {toast.type === 'notify' && toastImage ? (
        <img className="toast__avatar" src={toastImage} alt="" />
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
