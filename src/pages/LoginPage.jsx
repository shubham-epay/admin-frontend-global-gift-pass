import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { errorMessage } from '../api/client';
import { useTheme } from '../theme/ThemeContext';
import Icon from '../components/Icon';
import BrandLogo from '../components/BrandLogo';
import PasswordInput from '../components/PasswordInput';

export default function LoginPage() {
  const { login, status } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '', rememberMe: false });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (status === 'authenticated') return <Navigate to={location.state?.from?.pathname || '/'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await login(form);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <div className="login">
      <div className="login-art" aria-hidden>
        <div className="login-brand">
          <BrandLogo surface="dark" className="login-logo" />
          <p>Admin console</p>
        </div>
      </div>
      <button type="button" className="icon-btn login-theme" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
      </button>
      <form className="login-form" onSubmit={submit}>
        <BrandLogo className="login-form-logo" />
        <h1>Sign in</h1>
        <p className="muted">Use your Global Gift Pass admin account.</p>
        {error && <div className="notice notice-error" role="alert">{error}</div>}
        <div className="field">
          <label className="field-label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" autoComplete="username" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="password">Password</label>
          <PasswordInput id="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <label className="check">
          <input type="checkbox" checked={form.rememberMe} onChange={(e) => setForm({ ...form, rememberMe: e.target.checked })} />
          Keep me signed in on this device for 30 days
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
