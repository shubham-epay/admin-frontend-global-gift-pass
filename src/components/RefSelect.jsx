import { useEffect, useMemo, useRef, useState } from 'react';
import { resourceApi } from '../api/resource';
import { get } from '../utils/format';

/**
 * Searchable reference picker backed by an admin list endpoint.
 * value: id (single) or id[] (multiple). Labels for existing values are fetched via ?ids=.
 */
export default function RefSelect({ endpoint, labelKey = 'name', optionLabel, multiple, value, onChange, disabled, placeholder, params, id }) {
  const apiRef = useMemo(() => resourceApi(endpoint), [endpoint]);
  const [known, setKnown] = useState({}); // id -> label
  const [q, setQ] = useState('');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const box = useRef(null);
  const label = (o) => (optionLabel ? optionLabel(o) : get(o, labelKey)) || o._id;

  const selected = multiple ? (value || []) : (value ? [value] : []);

  useEffect(() => {
    const missing = selected.filter((sid) => !known[sid]);
    if (!missing.length) return;
    apiRef.list({ ids: missing.join(','), limit: 100 }).then((res) => {
      setKnown((k) => ({ ...k, ...Object.fromEntries(res.data.map((o) => [o._id, label(o)])) }));
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.join(',')]);

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => {
      setLoading(true);
      apiRef.list({ q, limit: 20, ...params }).then((res) => {
        setOptions(res.data);
        setKnown((k) => ({ ...k, ...Object.fromEntries(res.data.map((o) => [o._id, label(o)])) }));
      }).catch(() => setOptions([])).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, open]);

  useEffect(() => {
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const choose = (o) => {
    if (multiple) {
      if (!selected.includes(o._id)) onChange([...selected, o._id]);
    } else {
      onChange(o._id);
      setOpen(false);
    }
    setQ('');
  };
  const removeId = (rid) => onChange(multiple ? selected.filter((s) => s !== rid) : null);

  return (
    <div className="refselect" ref={box}>
      {selected.length > 0 && (
        <div className="chips">
          {selected.map((sid) => (
            <span key={sid} className="chip">
              {known[sid] || 'Loading…'}
              {!disabled && <button type="button" aria-label="Remove" onClick={() => removeId(sid)}>×</button>}
            </span>
          ))}
        </div>
      )}
      {!disabled && (multiple || selected.length === 0) && (
        <input
          id={id}
          className="input"
          value={q}
          placeholder={placeholder || 'Search…'}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          autoComplete="off"
        />
      )}
      {!disabled && !multiple && selected.length > 0 && (
        <button type="button" className="linkbtn" onClick={() => { removeId(selected[0]); setOpen(true); }}>Change</button>
      )}
      {open && !disabled && (
        <ul className="refselect-menu" role="listbox">
          {loading && <li className="muted">Searching…</li>}
          {!loading && options.length === 0 && <li className="muted">No matches</li>}
          {!loading && options.map((o) => (
            <li key={o._id}>
              <button type="button" className={selected.includes(o._id) ? 'is-selected' : ''} onClick={() => choose(o)}>{label(o)}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
