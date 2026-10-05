import Icon from './Icon';

/**
 * Editor for a product's custom fields: [{ key, label, value, public }].
 * Public fields appear on the website as product details; internal ones stay in the admin.
 */
export default function CustomFieldsEditor({ value = [], onChange, disabled }) {
  const rows = value || [];
  const set = (i, patch) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const remove = (i) => onChange(rows.filter((_, j) => j !== i));
  const add = () => onChange([...rows, { label: '', value: '', public: false }]);

  return (
    <div className="cf-editor">
      {rows.length === 0 && <p className="muted small">No custom fields. They are added automatically from extra CSV columns, or add your own.</p>}
      {rows.length > 0 && (
        <div className="cf-head" aria-hidden><span>Field</span><span>Value</span><span>Shown on website</span><span /></div>
      )}
      {rows.map((r, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={i} className="cf-row">
          <input className="input" placeholder="e.g. Delivery type" maxLength={80} value={r.label} disabled={disabled} aria-label="Field name" onChange={(e) => set(i, { label: e.target.value })} />
          <input className="input" placeholder="e.g. Code" maxLength={500} value={r.value} disabled={disabled} aria-label="Value" onChange={(e) => set(i, { value: e.target.value })} />
          <label className="cf-public" title={r.public ? 'Customers can see this' : 'Admin only'}>
            <input type="checkbox" checked={Boolean(r.public)} disabled={disabled} onChange={(e) => set(i, { public: e.target.checked })} />
            <span className={`badge ${r.public ? 'badge-info' : 'badge-neutral'}`}>{r.public ? 'Public' : 'Internal'}</span>
          </label>
          <button type="button" className="icon-btn danger" aria-label="Remove field" disabled={disabled} onClick={() => remove(i)}><Icon name="trash" size={16} /></button>
        </div>
      ))}
      {!disabled && <button type="button" className="btn btn-sm" onClick={add}><Icon name="plus" size={14} />Add field</button>}
    </div>
  );
}
