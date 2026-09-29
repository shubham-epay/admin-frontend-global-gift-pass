import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Token storage strategy
 *  - Access token: kept ONLY in memory (this module). Never in localStorage/sessionStorage,
 *    so an XSS payload cannot lift a long-lived credential from storage.
 *  - Refresh token: httpOnly + Secure + SameSite cookie scoped to /api/admin/auth, set by the API.
 *    JavaScript can never read it. A page reload silently restores the session via /auth/refresh.
 */
let accessToken = null;
let onSessionExpired = () => {};

export const tokenStore = {
  get: () => accessToken,
  set: (t) => { accessToken = t; },
  clear: () => { accessToken = null; },
};
export const setSessionExpiredHandler = (fn) => { onSessionExpired = fn; };

export const api = axios.create({ baseURL, withCredentials: true, timeout: 20000 });

api.interceptors.request.use((cfg) => {
  if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`;
  return cfg;
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let refreshPromise = null;

/** Single-flight refresh: concurrent 401s share one refresh call. */
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const { data } = await axios.post(`${baseURL}/admin/auth/refresh`, null, { withCredentials: true, timeout: 15000 });
          accessToken = data.data.accessToken;
          return data.data;
        } catch (err) {
          // Another tab rotated the cookie a moment ago - the browser now has the new one; retry once.
          if (err.response?.data?.error?.code === 'REFRESH_RACE' && attempt === 0) { await sleep(350); continue; }
          accessToken = null;
          throw err;
        }
      }
      throw new Error('Refresh failed');
    })().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

const isAuthCall = (url = '') => url.includes('/admin/auth/login') || url.includes('/admin/auth/refresh') || url.includes('/admin/auth/logout');

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config || {};
    const status = error.response?.status;
    const code = error.response?.data?.error?.code;

    if (status === 401 && !original._retry && !isAuthCall(original.url) && (code === 'TOKEN_EXPIRED' || code === 'TOKEN_MISSING')) {
      original._retry = true;
      try {
        await refreshSession();
        original.headers = { ...original.headers, Authorization: `Bearer ${accessToken}` };
        return api(original);
      } catch (e) {
        onSessionExpired();
        return Promise.reject(e);
      }
    }
    if (status === 401 && !isAuthCall(original.url)) onSessionExpired();
    return Promise.reject(error);
  },
);

export const errorMessage = (err) => err?.response?.data?.error?.message || err?.message || 'Request failed';
export const fieldErrors = (err) =>
  Object.fromEntries((err?.response?.data?.error?.details || []).map((d) => [d.path, d.message]));
