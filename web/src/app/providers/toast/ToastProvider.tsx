import { useCallback, useMemo, useState, type ReactNode } from 'react';

import ToastContainer from '@/shared/components/Toast/ToastContainer';
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

  const addToast = useCallback(
    (type: ToastKind, message: string) => {
      const id = Date.now() + Math.random();
      setToasts((currentToasts) => [...currentToasts, { id, message, type }]);
      window.setTimeout(() => removeToast(id), TOAST_DURATION_MS);
    },
    [removeToast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showSuccess: (message) => addToast('success', message),
      showError: (message) => addToast('error', message),
      showWarning: (message) => addToast('warning', message),
      showInfo: (message) => addToast('info', message),
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
