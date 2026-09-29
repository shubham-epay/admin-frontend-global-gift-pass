import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export default function PermissionPicker({ value = [], onChange, disabled }) {
  const { can } = useAuth();
  const [groups, setGroups] = useState([]);
  useEffect(() => { api.get('/admin/permissions').then((r) => setGroups(r.data.data)).catch(() => {}); }, []);
  const full = value.includes('*');
  const toggle = (key) => onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value.filter((k) => k !== '*'), key]);

  return (
    <div className="perm-picker">
      {can('*') && (
        <label className="perm-full">
          <input type="checkbox" checked={full} disabled={disabled} onChange={() => onChange(full ? [] : ['*'])} />
          <span><strong>Full access</strong><span className="muted"> — every current and future permission</span></span>
        </label>
      )}
      <div className="perm-groups">
        {groups.map((g) => (
          <fieldset key={g.group} className="perm-group" disabled={disabled || full}>
            <legend>{g.group}</legend>
            {g.permissions.map((p) => (
              <label key={p.key} className="check" title={can(p.key) ? p.key : 'You can only grant permissions you hold'}>
                <input type="checkbox" checked={full || value.includes(p.key)} disabled={!can(p.key)} onChange={() => toggle(p.key)} />
                {p.label}
              </label>
            ))}
          </fieldset>
        ))}
      </div>
    </div>
  );
}
