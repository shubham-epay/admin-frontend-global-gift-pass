import { useState } from 'react';
import Icon from './Icon';

/**
 * Editor for product denominations: [{ value, price, oldPrice?, label?, attributes: [{ label, value, public }] }].
 * Per-denomination attributes (e.g. Margin) are shown as extra columns. The highest denomination
 * becomes the product's displayed price when saved.
 */
export default function DenominationsEditor({ value = [], onChange, disabled, currency = '' }) {
  const rows = value || [];
  const [newColumn, setNewColumn] = useState('');
  const columns = [...new Set(rows.flatMap((r) => (r.attributes || []).map((a) => a.label)))];

  const set = (i, patch) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const setAttr = (i, label, v) => {
    const r = rows[i];
    const attrs = [...(r.attributes || [])];
    const k = attrs.findIndex((a) => a.label === label);
    if (k >= 0) attrs[k] = { ...attrs[k], value: v }; else attrs.push({ label, value: v, public: false });
    set(i, { attributes: attrs });
  };
  const remove = (i) => onChange(rows.filter((_, j) => j !== i));
  const add = () => {
    const last = rows[rows.length - 1];
    onChange([...rows, { value: '', price: '', attributes: columns.map((label) => ({ label, value: '', public: false })), ...(last ? {} : {}) }]);
  };
  const addColumn = () => {
    const label = newColumn.trim();
    if (!label || columns.includes(label)) return;
    onChange(rows.map((r) => ({ ...r, attributes: [...(r.attributes || []), { label, value: '', public: false }] })));
    setNewColumn('');
  };
  const removeColumn = (label) => onChange(rows.map((r) => ({ ...r, attributes: (r.attributes || []).filter((a) => a.label !== label) })));

  return (
    <div className="denom-editor">
      {rows.length === 0 ? (
        <p className="muted small">No denominations: the product sells at its single price. Add denominations to let customers choose a value (e.g. 10, 20, 50 {currency}).</p>
      ) : (
        <div className="table-wrap denom-table-wrap">
          <table className="table table-compact denom-table">
            <thead>
              <tr>
                <th>Denomination {currency && <small className="muted">({currency})</small>}</th>
                <th>Selling price</th>
                <th>Old price</th>
                {columns.map((c) => (
                  <th key={c}>
                    <span className="denom-col">{c}{!disabled && <button type="button" className="icon-btn icon-btn-xs" title={`Remove column ${c}`} aria-label={`Remove column ${c}`} onClick={() => removeColumn(c)}><Icon name="close" size={12} /></button>}</span>
                  </th>
                ))}
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <tr key={i}>
                  <td><input className="input" type="number" min="0" step="0.01" value={r.value ?? ''} disabled={disabled} aria-label="Denomination value"
                    onChange={(e) => set(i, { value: e.target.value, ...(r.price === r.value || r.price === '' ? { price: e.target.value } : {}) })} /></td>
                  <td><input className="input" type="number" min="0" step="0.01" value={r.price ?? ''} placeholder={r.value || ''} disabled={disabled} aria-label="Selling price" onChange={(e) => set(i, { price: e.target.value })} /></td>
                  <td><input className="input" type="number" min="0" step="0.01" value={r.oldPrice ?? ''} disabled={disabled} aria-label="Old price" onChange={(e) => set(i, { oldPrice: e.target.value })} /></td>
                  {columns.map((c) => (
                    <td key={c}><input className="input" value={(r.attributes || []).find((a) => a.label === c)?.value ?? ''} disabled={disabled} aria-label={c} onChange={(e) => setAttr(i, c, e.target.value)} /></td>
                  ))}
                  <td className="col-actions">{!disabled && <button type="button" className="icon-btn danger" aria-label="Remove denomination" onClick={() => remove(i)}><Icon name="trash" size={15} /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!disabled && (
        <div className="denom-actions">
          <button type="button" className="btn btn-sm" onClick={add}><Icon name="plus" size={14} />Add denomination</button>
          {rows.length > 0 && (
            <span className="denom-newcol">
              <input className="input" placeholder="New column, e.g. Margin" value={newColumn} maxLength={80} onChange={(e) => setNewColumn(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addColumn(); } }} />
              <button type="button" className="btn btn-sm" onClick={addColumn} disabled={!newColumn.trim()}>Add column</button>
            </span>
          )}
        </div>
      )}
      <p className="field-help">Per-denomination columns (like Margin) stay in the admin. The highest denomination is shown as the price on the website.</p>
    </div>
  );
}
