import { useCallback, useMemo, useState, type ReactNode } from 'react';

import ToastContainer from '@/shared/components/Toast/ToastContainer';
import notificationAudio from '@/shared/assets/audio/notification.mpeg?url';
import { ToastContext, type ToastContextValue, type ToastItem, type ToastKind } from './ToastContext';

type ToastProviderProps = {
  children: ReactNode;
};

const TOAST_DURATION_MS = 3200;

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  const playNotificationSound = useCallback(() => {
    const audio = new Audio(notificationAudio);
    audio.volume = 0.35;
    audio.play().catch(() => {
      // Browser autoplay policy may block sound until the user interacts once.
    });
  }, []);

  const addToast = useCallback(
    (type: ToastKind, message: string, duration = TOAST_DURATION_MS, meta?: Pick<ToastItem, 'image' | 'senderName'>) => {
      const id = Date.now() + Math.random();
      if (type === 'notify') playNotificationSound();
      setToasts((currentToasts) => [...currentToasts, { id, message, type, ...meta }]);
      if (duration > 0) window.setTimeout(() => removeToast(id), duration);
    },
    [playNotificationSound, removeToast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showSuccess: (message) => addToast('success', message),
      showError: (message) => addToast('error', message),
      showWarning: (message) => addToast('warning', message),
      showInfo: (message) => addToast('info', message),
      showNotify: (message, image, senderName, duration = 4000) => addToast('notify', message, duration, { image, senderName }),
    }),
    [addToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
};
