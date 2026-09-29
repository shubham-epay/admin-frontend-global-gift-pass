import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { NAV, resources } from '../config/resources';
import Icon from './Icon';

/** ⌘K / Ctrl+K quick-jump to any section or common action the user is allowed to use. */
export default function CommandPalette({ open, onClose }) {
  const { can, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef(null);
  const list = useRef(null);

  const items = useMemo(() => {
    const out = [];
    for (const g of NAV) {
      for (const i of g.items) if (can(i.perm)) out.push({ id: i.to, label: i.label, group: 'Go to', hint: g.label, icon: i.icon, run: () => navigate(i.to) });
    }
    for (const r of Object.values(resources)) {
      if (r.sections && r.perms.create && can(r.perms.create)) {
        out.push({ id: `${r.path}/new`, label: r.createLabel || `New ${r.singular.toLowerCase()}`, group: 'Create', hint: r.title, icon: 'plus', run: () => navigate(`${r.path}/new`) });
      }
      if (r.importPath && can(r.importPerm)) out.push({ id: r.importPath, label: `Import ${r.title.toLowerCase()} from CSV`, group: 'Create', hint: r.title, icon: 'upload', run: () => navigate(r.importPath) });
    }
    out.push({ id: 'account', label: 'Your account', group: 'Account', icon: 'user', run: () => navigate('/account') });
    out.push({ id: 'theme', label: `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`, group: 'Account', icon: theme === 'dark' ? 'sun' : 'moon', run: toggle });
    out.push({ id: 'logout', label: 'Sign out', group: 'Account', icon: 'logout', run: () => logout() });
    return out;
  }, [can, navigate, theme, toggle, logout]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter((i) => `${i.label} ${i.hint || ''} ${i.group}`.toLowerCase().includes(t));
  }, [items, q]);

  useEffect(() => { if (open) { setQ(''); setActive(0); setTimeout(() => input.current?.focus(), 10); } }, [open]);
  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => { list.current?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' }); }, [active]);

  if (!open) return null;

  const run = (item) => { onClose(); item.run(); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && filtered[active]) { e.preventDefault(); run(filtered[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  let lastGroup = null;
  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Quick navigation" onMouseDown={(e) => e.stopPropagation()} onKeyDown={onKey}>
        <div className="palette-search">
          <Icon name="search" size={18} />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Jump to a page or action…" aria-label="Search pages and actions"
            role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={filtered[active] ? `pal-${active}` : undefined} />
          <kbd>Esc</kbd>
        </div>
        <ul className="palette-list" id="palette-list" role="listbox" ref={list}>
          {filtered.length === 0 && <li className="palette-empty">No matches for “{q}”</li>}
          {filtered.map((item, i) => {
            const heading = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            return (
              <li key={item.id} role="presentation">
                {heading && <p className="palette-group">{heading}</p>}
                <button type="button" id={`pal-${i}`} role="option" aria-selected={i === active} className={`palette-item ${i === active ? 'is-active' : ''}`}
                  onMouseMove={() => setActive(i)} onClick={() => run(item)}>
                  <span className="palette-icon"><Icon name={item.icon || 'arrowRight'} size={16} /></span>
                  <span className="grow">{item.label}</span>
                  {item.hint && <span className="palette-hint">{item.hint}</span>}
                  <Icon name="arrowRight" size={14} className="palette-go" />
                </button>
              </li>
            );
          })}
        </ul>
        <div className="palette-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span></div>
      </div>
    </div>
  );
}
