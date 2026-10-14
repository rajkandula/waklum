"use client"

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />,
  error: <XCircle className="h-5 w-5 text-red-400 shrink-0" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0" />,
  info: <Info className="h-5 w-5 text-blue-400 shrink-0" />,
};

const BG_COLORS = {
  success: 'border-green-500/20 bg-green-500/5',
  error: 'border-red-500/20 bg-red-500/5',
  warning: 'border-yellow-500/20 bg-yellow-500/5',
  info: 'border-blue-500/20 bg-blue-500/5',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, title, message, duration, entering: true }]);

    // Remove entering state after animation
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, entering: false } : t));
    }, 10);

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => dismissToast(id), duration);
    }

    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }, []);

  const toast = {
    success: (title, message) => addToast({ type: 'success', title, message }),
    error: (title, message) => addToast({ type: 'error', title, message }),
    warning: (title, message) => addToast({ type: 'warning', title, message }),
    info: (title, message) => addToast({ type: 'info', title, message }),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: '420px' }}>
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-300 ${BG_COLORS[t.type] || BG_COLORS.info} ${
              t.exiting ? 'opacity-0 translate-x-8' : t.entering ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
            }`}
            style={{ background: 'rgba(15, 20, 35, 0.95)' }}
          >
            {ICONS[t.type]}
            <div className="flex-1 min-w-0">
              {t.title && <p className="text-sm font-semibold text-surface-100">{t.title}</p>}
              {t.message && <p className="text-xs text-surface-400 mt-0.5 leading-relaxed">{t.message}</p>}
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              className="p-0.5 text-surface-500 hover:text-surface-300 transition-colors shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Return a fallback that uses alert() if ToastProvider is missing
    return {
      success: (title, message) => console.log(`✅ ${title}: ${message}`),
      error: (title, message) => console.error(`❌ ${title}: ${message}`),
      warning: (title, message) => console.warn(`⚠️ ${title}: ${message}`),
      info: (title, message) => console.log(`ℹ️ ${title}: ${message}`),
    };
  }
  return context;
}
