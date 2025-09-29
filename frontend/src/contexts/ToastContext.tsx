import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/Toast';
import type { ToastProps } from '../components/Toast';

interface ToastContextType {
  showToast: (message: string, type: ToastProps['type']) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  console.log('useToast called, context:', context);
  if (context === undefined) {
    console.error('useToast called outside of ToastProvider!');
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

interface ToastItem {
  id: string;
  message: string;
  type: ToastProps['type'];
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastProps['type']) => {
    console.log('showToast called with:', message, type);
    const id = Math.random().toString(36).substr(2, 9);
    console.log('Adding toast with id:', id);
    setToasts(prev => {
      console.log('Previous toasts:', prev);
      const newToasts = [...prev, { id, message, type }];
      console.log('New toasts:', newToasts);
      return newToasts;
    });
  }, []);

  const showSuccess = useCallback((message: string) => {
    showToast(message, 'success');
  }, [showToast]);

  const showError = useCallback((message: string) => {
    showToast(message, 'error');
  }, [showToast]);

  const showWarning = useCallback((message: string) => {
    showToast(message, 'warning');
  }, [showToast]);

  const showInfo = useCallback((message: string) => {
    showToast(message, 'info');
  }, [showToast]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const value = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  console.log('ToastProvider rendering with toasts:', toasts);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {console.log('Rendering toasts:', toasts)}
        {toasts.map((toast) => {
          console.log('Rendering individual toast:', toast);
          return (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
