import { useState } from 'react';
import { api, errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useToast } from './Toast';

/** "Show on website" switch for a country row; saves immediately. */
export default function CountryVisibilityToggle({ country }) {
  const { can } = useAuth();
  const toast = useToast();
  const [shown, setShown] = useState(country.status === 'ACTIVE');
  const [busy, setBusy] = useState(false);

  const toggle = async (e) => {
    e.stopPropagation();
    const next = !shown;
    setShown(next); setBusy(true);
    try {
      await api.patch(`/admin/countries/${country._id}`, { status: next ? 'ACTIVE' : 'INACTIVE' });
      toast(`${country.name} is now ${next ? 'shown on' : 'hidden from'} the website`);
    } catch (err) {
      setShown(!next);
      toast(errorMessage(err), 'error');
    } finally { setBusy(false); }
  };

  return (
    <button type="button" role="switch" aria-checked={shown} aria-label={`Show ${country.name} on the website`}
      className={`switch ${shown ? 'is-on' : ''}`} onClick={toggle} disabled={busy || !can('countries.manage')}>
      <span className="switch-knob" />
      <span className="switch-label">{shown ? 'Shown' : 'Hidden'}</span>
    </button>
  );
}
