import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, refreshSession, setSessionExpiredHandler, tokenStore } from '../api/client';

const AuthContext = createContext(null);
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ggp-admin-auth') : null;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | anonymous
  const timer = useRef(null);

  const clearLocal = useCallback(() => {
    clearTimeout(timer.current);
    tokenStore.clear();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const applySession = useCallback((session) => {
    tokenStore.set(session.accessToken);
    setUser(session.user);
    setStatus('authenticated');
    // Refresh one minute before the access token expires so users rarely see a 401.
    clearTimeout(timer.current);
    const ms = Math.max((session.expiresIn - 60) * 1000, 10_000);
    timer.current = setTimeout(() => {
      refreshSession().then(applySession).catch(clearLocal);
    }, ms);
  }, [clearLocal]);

  useEffect(() => {
    setSessionExpiredHandler(clearLocal);
    refreshSession().then(applySession).catch(() => setStatus('anonymous'));
    const onMessage = (e) => { if (e.data === 'logout') clearLocal(); };
    channel?.addEventListener('message', onMessage);
    return () => { channel?.removeEventListener('message', onMessage); clearTimeout(timer.current); };
  }, [applySession, clearLocal]);

  const login = useCallback(async ({ email, password, rememberMe }) => {
    const { data } = await api.post('/admin/auth/login', { email, password, rememberMe });
    applySession(data.data);
    return data.data.user;
  }, [applySession]);

  const logout = useCallback(async ({ everywhere = false } = {}) => {
    try {
      await api.post(everywhere ? '/admin/auth/logout-all' : '/admin/auth/logout');
    } finally {
      channel?.postMessage('logout');
      clearLocal();
    }
  }, [clearLocal]);

  const value = useMemo(() => {
    const perms = new Set(user?.role?.permissions || []);
    const can = (p) => {
      if (!p) return true;
      if (perms.has('*')) return true;
      return Array.isArray(p) ? p.some((x) => perms.has(x)) : perms.has(p);
    };
    return { user, status, login, logout, can, applySession, setUser };
  }, [user, status, login, logout, applySession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
