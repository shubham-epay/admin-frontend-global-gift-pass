import { useEffect, useId, useState } from 'react';
import { api } from '../api/client';

/**
 * Text input with suggestions from an admin endpoint (native <datalist>).
 * field: { suggestEndpoint, suggestLabel(item) => string, placeholder, max }
 */
const cache = new Map();

export default function SuggestInput({ field, value, onChange, ...rest }) {
  const listId = useId();
  const [items, setItems] = useState(() => cache.get(field.suggestEndpoint) || []);
  useEffect(() => {
    if (cache.has(field.suggestEndpoint)) return;
    api.get(field.suggestEndpoint).then((r) => { cache.set(field.suggestEndpoint, r.data.data); setItems(r.data.data); }).catch(() => {});
  }, [field.suggestEndpoint]);
  return (
    <>
      <input {...rest} className="input" list={listId} autoComplete="off" placeholder={field.placeholder} maxLength={field.max} value={value} onChange={(e) => onChange(e.target.value)} />
      <datalist id={listId}>{items.map((it) => { const label = field.suggestLabel ? field.suggestLabel(it) : String(it); return <option key={label} value={label} />; })}</datalist>
    </>
  );
}
