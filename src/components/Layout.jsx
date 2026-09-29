import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { NAV } from '../config/resources';
import Icon from './Icon';
import CommandPalette from './CommandPalette';
import BrandLogo from './BrandLogo';

const SIDEBAR_KEY = 'ggp-admin-sidebar';
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** Finds the nav group + item for the current path, for the breadcrumb. */
function crumbsFor(pathname) {
  for (const g of NAV) {
    const item = g.items.find((i) => pathname === i.to || pathname.startsWith(`${i.to}/`));
    if (item) {
      const rest = pathname.slice(item.to.length).split('/').filter(Boolean)[0];
      const leaf = rest === 'new' ? 'New' : rest === 'import' ? 'Import' : rest ? 'Details' : null;
      return { group: g.label, item, leaf };
    }
  }
  if (pathname.startsWith('/account')) return { group: 'You', item: { label: 'Account', to: '/account', icon: 'user' } };
  return null;
}

function useClickOutside(ref, onOutside, active) {
  useEffect(() => {
    if (!active) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onOutside(); };
    const onKey = (e) => { if (e.key === 'Escape') onOutside(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [ref, onOutside, active]);
}

const THEMES = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'monitor' },
];

function UserMenu() {
  const { user, logout } = useAuth();
  const { preference, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useClickOutside(box, () => setOpen(false), open);
  const initial = (user?.name || '?').slice(0, 1);

  return (
    <div className="usermenu" ref={box}>
      <button type="button" className={`usermenu-trigger ${open ? 'is-open' : ''}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="avatar avatar-sm" aria-hidden>{initial}</span>
        <span className="usermenu-name"><strong>{user?.name}</strong><small>{user?.role?.name}</small></span>
        <Icon name="chevronDown" size={15} className="usermenu-caret" />
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="menu-head">
            <span className="avatar" aria-hidden>{initial}</span>
            <span className="grow"><strong>{user?.name}</strong><small className="block muted">{user?.email}</small></span>
          </div>
          <div className="menu-section">
            <p className="menu-label">Theme</p>
            <div className="segmented" role="radiogroup" aria-label="Theme">
              {THEMES.map((t) => (
                <button key={t.value} type="button" role="radio" aria-checked={preference === t.value} className={preference === t.value ? 'is-on' : ''} onClick={() => setTheme(t.value)}>
                  <Icon name={t.icon} size={15} />{t.label}
                </button>
              ))}
            </div>
          </div>
          <Link to="/account" role="menuitem" className="menu-item" onClick={() => setOpen(false)}><Icon name="user" size={16} />Account & security</Link>
          <button type="button" role="menuitem" className="menu-item is-danger" onClick={() => logout()}><Icon name="logout" size={16} />Sign out</button>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { can } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const crumbs = crumbsFor(location.pathname);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => document.documentElement.dataset.sidebar === 'collapsed');

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.documentElement.dataset.sidebar = collapsed ? 'collapsed' : 'expanded';
    try { localStorage.setItem(SIDEBAR_KEY, collapsed ? 'collapsed' : 'expanded'); } catch { /* storage unavailable */ }
  }, [collapsed]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen((o) => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={`shell ${drawerOpen ? 'drawer-open' : ''}`}>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand">
          <Link to="/" className="brand-link" aria-label="Global Gift Pass admin home">
            <BrandLogo />
            <span className="brand-tag">Admin</span>
          </Link>
          <button type="button" className="icon-btn on-dark drawer-close" aria-label="Close menu" onClick={() => setDrawerOpen(false)}><Icon name="close" size={18} /></button>
        </div>
        <nav id="nav">
          {NAV.map((group) => {
            const items = group.items.filter((i) => can(i.perm));
            if (!items.length) return null;
            return (
              <div key={group.label} className="nav-group">
                <p className="nav-heading"><span>{group.label}</span></p>
                {items.map((i) => {
                  const active = location.pathname === i.to || location.pathname.startsWith(`${i.to}/`);
                  return (
                    <NavLink key={i.to} to={i.to} className={`nav-link ${active ? 'is-active' : ''}`} data-tip={i.label} aria-current={active ? 'page' : undefined}>
                      {i.icon && <Icon name={i.icon} size={18} className="nav-icon" />}
                      <span className="nav-text">{i.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <button type="button" className="collapse-btn" onClick={() => setCollapsed((c) => !c)} aria-pressed={collapsed} data-tip={collapsed ? 'Expand sidebar' : undefined}>
            <Icon name="sidebar" size={18} />
            <span className="nav-text">Collapse sidebar</span>
          </button>
        </div>
      </aside>
      <button type="button" className="scrim" aria-label="Close menu" tabIndex={drawerOpen ? 0 : -1} onClick={() => setDrawerOpen(false)} />

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" className="icon-btn menu-btn" aria-label="Open menu" aria-expanded={drawerOpen} aria-controls="nav" onClick={() => setDrawerOpen(true)}><Icon name="menu" size={20} /></button>
            <nav className="crumbs" aria-label="Breadcrumb">
              {crumbs ? (
                <>
                  <span className="crumb-muted">{crumbs.group}</span>
                  <Icon name="chevronRight" size={14} className="crumb-sep" />
                  {crumbs.leaf ? <Link to={crumbs.item.to}>{crumbs.item.label}</Link> : <strong aria-current="page">{crumbs.item.label}</strong>}
                  {crumbs.leaf && <><Icon name="chevronRight" size={14} className="crumb-sep" /><strong aria-current="page">{crumbs.leaf}</strong></>}
                </>
              ) : <strong>Global Gift Pass</strong>}
            </nav>
          </div>
          <div className="topbar-right">
            <button type="button" className="search-trigger" onClick={() => setPaletteOpen(true)} aria-label="Quick navigation">
              <Icon name="search" size={16} />
              <span className="search-trigger-text">Jump to…</span>
              <kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd>
            </button>
            <button type="button" className="icon-btn theme-btn" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} key={theme} />
            </button>
            <span className="topbar-divider" aria-hidden />
            <UserMenu />
          </div>
        </header>
        <main className="route" key={location.pathname}>
          <Outlet />
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
