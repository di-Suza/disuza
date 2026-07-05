import { createContext } from 'react';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export type ToastItem = {
  id: number;
  message: string;
  type: ToastKind;
};

export type ToastContextValue = {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);
