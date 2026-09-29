import { useState } from 'react';
import { api, errorMessage, fieldErrors } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

export default function UserSecurityPanel({ user }) {
  const { user: me } = useAuth();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const isSelf = me?._id === user._id;

  const reset = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await api.post(`/admin/users/${user._id}/reset-password`, { newPassword: password });
      setPassword('');
      toast('Password reset. The user has been signed out everywhere.');
    } catch (err) {
      setError(fieldErrors(err).newPassword || errorMessage(err));
    } finally { setBusy(false); }
  };

  const revoke = async () => {
    setBusy(true);
    try {
      await api.post(`/admin/users/${user._id}/revoke-sessions`);
      toast('Signed out of all devices');
      setConfirmRevoke(false);
    } catch (err) { toast(errorMessage(err), 'error'); } finally { setBusy(false); }
  };

  if (isSelf) return <section className="panel form-section"><h2>Security</h2><p className="muted">Change your own password from your account page.</p></section>;

  return (
    <section className="panel form-section">
      <h2>Security</h2>
      <form className="inline-form" onSubmit={reset}>
        <div className="field">
          <label className="field-label" htmlFor="reset-pw">Set a new password</label>
          <input id="reset-pw" className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error ? <p className="field-error">{error}</p> : <p className="field-help">Signs the user out of every device.</p>}
        </div>
        <button type="submit" className="btn" disabled={busy || password.length < 12}>Reset password</button>
      </form>
      <div className="divider" />
      <div className="row-between">
        <p className="muted">Force sign-out on every browser and device this user is using.</p>
        <button type="button" className="btn btn-ghost-danger" onClick={() => setConfirmRevoke(true)}>Sign out everywhere</button>
      </div>
      <ConfirmDialog open={confirmRevoke} title={`Sign ${user.name} out everywhere?`} body="They will need to sign in again on every device."
        confirmLabel="Sign out everywhere" busy={busy} onConfirm={revoke} onCancel={() => setConfirmRevoke(false)} />
    </section>
  );
}
