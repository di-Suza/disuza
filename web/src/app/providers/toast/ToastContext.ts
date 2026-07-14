import { createContext } from 'react';

export type ToastKind = 'success' | 'error' | 'warning' | 'info' | 'notify';

export type ToastItem = {
  id: number;
  message: string;
  type: ToastKind;
  image?: string;
  senderName?: string;
};

export type ToastContextValue = {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
  showNotify: (message: string, image?: string, senderName?: string, duration?: number) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);
