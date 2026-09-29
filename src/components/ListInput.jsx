import { useState } from 'react';

/** Editable list of strings (image URLs, cities, tags). Shows thumbnails for URL lists. */
export default function ListInput({ value = [], onChange, disabled, isUrl, placeholder, id }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const parts = draft.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    onChange([...value, ...parts.filter((p) => !value.includes(p))]);
    setDraft('');
  };
  const move = (i, dir) => {
    const next = [...value];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="listinput">
      {value.length > 0 && (
        <ul className={isUrl ? 'url-list' : 'chips'}>
          {value.map((v, i) => (isUrl ? (
            <li key={v} className="url-item">
              <img src={v} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
              <span className="url-text" title={v}>{v}</span>
              {!disabled && (
                <span className="url-actions">
                  <button type="button" className="linkbtn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">Up</button>
                  <button type="button" className="linkbtn danger" onClick={() => onChange(value.filter((x) => x !== v))}>Remove</button>
                </span>
              )}
            </li>
          ) : (
            <li key={v} className="chip">{v}{!disabled && <button type="button" aria-label="Remove" onClick={() => onChange(value.filter((x) => x !== v))}>×</button>}</li>
          )))}
        </ul>
      )}
      {!disabled && (
        <div className="listinput-add">
          <input
            id={id}
            className="input"
            value={draft}
            placeholder={placeholder || (isUrl ? 'https://…' : 'Type and press Enter')}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          />
          <button type="button" className="btn" onClick={add}>Add</button>
        </div>
      )}
    </div>
  );
}
