import { createContext, useCallback, useContext, useState } from 'react';
import Icon from './Icon';

const ToastContext = createContext(() => {});
const ICONS = { success: 'check', error: 'alert', info: 'info' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => {
    setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 220);
  }, []);
  const push = useCallback((message, tone = 'success') => {
    const id = Math.random().toString(36).slice(2);
    const ttl = tone === 'error' ? 6000 : 3500;
    setToasts((t) => [...t, { id, message, tone, ttl }]);
    setTimeout(() => dismiss(id), ttl);
  }, [dismiss]);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone} ${t.leaving ? 'is-leaving' : ''}`} style={{ '--ttl': `${t.ttl}ms` }}>
            <span className="toast-icon"><Icon name={ICONS[t.tone] || 'info'} size={16} strokeWidth={2.4} /></span>
            <span className="toast-msg">{t.message}</span>
            <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => dismiss(t.id)}><Icon name="close" size={14} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
