import { useState } from 'react';
import { api, errorMessage, fieldErrors } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { dateTime } from '../utils/format';
import PasswordInput from '../components/PasswordInput';

export default function AccountPage() {
  const { user, applySession, logout } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) { setErrors({ confirm: 'Passwords don’t match' }); return; }
    setBusy(true); setErrors({});
    try {
      const r = await api.post('/admin/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      applySession(r.data.data);
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      toast('Password changed. Other devices have been signed out.');
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(Object.keys(fe).length ? fe : { form: errorMessage(err) });
    } finally { setBusy(false); }
  };

  const f = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) });

  return (
    <div className="page page-narrow">
      <header className="page-head"><div><h1>Your account</h1><p className="muted">{user.email} · {user.role?.name}{user.lastLoginAt ? ` · last sign-in ${dateTime(user.lastLoginAt)}` : ''}</p></div></header>

      <section className="panel form-section">
        <h2>Change password</h2>
        {errors.form && <div className="notice notice-error">{errors.form}</div>}
        <form onSubmit={submit} className="stack-sm">
          <div className="field"><label className="field-label" htmlFor="cp">Current password</label>
            <PasswordInput id="cp" autoComplete="current-password" {...f('currentPassword')} />
            {errors.currentPassword && <p className="field-error">{errors.currentPassword}</p>}</div>
          <div className="field"><label className="field-label" htmlFor="np">New password</label>
            <PasswordInput id="np" autoComplete="new-password" {...f('newPassword')} />
            {errors.newPassword ? <p className="field-error">{errors.newPassword}</p> : <p className="field-help">At least 8 characters with upper and lower case, a number and a symbol.</p>}</div>
          <div className="field"><label className="field-label" htmlFor="cf">Confirm new password</label>
            <PasswordInput id="cf" autoComplete="new-password" {...f('confirm')} />
            {errors.confirm && <p className="field-error">{errors.confirm}</p>}</div>
          <button type="submit" className="btn btn-primary" disabled={busy || !form.currentPassword || !form.newPassword}>{busy ? 'Saving…' : 'Change password'}</button>
        </form>
      </section>

      <section className="panel form-section">
        <h2>Sessions</h2>
        <div className="row-between">
          <p className="muted">Lost a device or signed in somewhere shared? Sign out of every browser, including this one.</p>
          <button type="button" className="btn btn-ghost-danger" onClick={() => setConfirmAll(true)}>Sign out everywhere</button>
        </div>
      </section>
      <ConfirmDialog open={confirmAll} title="Sign out of every device?" body="You’ll need to sign in again here too." confirmLabel="Sign out everywhere"
        onConfirm={() => logout({ everywhere: true })} onCancel={() => setConfirmAll(false)} />
    </div>
  );
}
