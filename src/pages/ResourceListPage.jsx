import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resourceApi } from '../api/resource';
import { errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import Icon from '../components/Icon';
import { money, date, dateTime, humanize, get } from '../utils/format';

function Cell({ col, row }) {
  if (col.render) return col.render(row);
  const v = get(row, col.key);
  switch (col.type) {
    case 'thumb': {
      const src = Array.isArray(v) ? v[0] : v;
      return src ? <img className={`thumb ${col.wide ? 'thumb-wide' : ''}`} src={src} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span className={`thumb thumb-empty ${col.wide ? 'thumb-wide' : ''}`} />;
    }
    case 'title':
      return <span className="cell-title"><strong className={col.mono ? 'mono' : undefined}>{v || '—'}</strong>{col.sub && col.sub(row) && <small>{col.sub(row)}</small>}</span>;
    case 'money': return money(v, row.currency || 'AED');
    case 'status': return <StatusBadge value={v} />;
    case 'date': return date(v);
    case 'datetime': return dateTime(v);
    case 'bool': return v ? 'Yes' : <span className="muted">No</span>;
    case 'humanize': return humanize(v);
    default: return v == null || v === '' ? <span className="muted">—</span> : <span className={col.mono ? 'mono' : undefined}>{String(v)}</span>;
  }
}

function SkeletonTable({ columns }) {
  return (
    <table className="table" aria-busy="true">
      <tbody>
        {Array.from({ length: 6 }, (_, r) => (
          <tr key={r}>
            {Array.from({ length: columns }, (_, c) => (
              <td key={c}><span className="skeleton" style={{ width: c === 0 ? 46 : `${40 + ((r * 7 + c * 13) % 45)}%`, height: c === 0 ? 46 : 12 }} /></td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ResourceListPage({ resource }) {
  const { can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const api = useMemo(() => resourceApi(resource.endpoint), [resource.endpoint]);
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || '');
  const [state, setState] = useState({ loading: true, items: [], meta: null, error: null });
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [reload, setReload] = useState(0);

  const page = Number(params.get('page') || 1);
  const filterValues = Object.fromEntries((resource.filters || []).map((f) => [f.key, params.get(f.key) || '']));
  const queryKey = params.toString();

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    const t = setTimeout(() => { if ((params.get('q') || '') !== search) setParam('q', search.trim()); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    api.list({ ...resource.fixedQuery, page, limit: 20, q: params.get('q'), ...filterValues })
      .then((res) => alive && setState({ loading: false, items: res.data, meta: res.meta, error: null }))
      .catch((err) => alive && setState({ loading: false, items: [], meta: null, error: errorMessage(err) }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, reload, resource.key]);

  const canCreate = resource.perms.create && can(resource.perms.create);
  const canDelete = resource.perms.delete && can(resource.perms.delete);
  const canImport = resource.importPath && can(resource.importPerm);
  const hasDetail = !resource.noDetail;
  const hasFilters = Boolean(params.get('q')) || Object.values(filterValues).some(Boolean);

  const doDelete = async () => {
    setDeleting(true);
    try {
      await api.remove(toDelete._id);
      toast(`${resource.singular} deleted`);
      setToDelete(null);
      setReload((n) => n + 1);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>{resource.title}</h1>
          <p className="muted">{state.meta ? <><span className="count-pill">{state.meta.total}</span> total</> : '\u00a0'}</p>
        </div>
        <div className="head-actions">
          {canImport && <Link className="btn" to={resource.importPath}><Icon name="upload" size={16} />Import CSV</Link>}
          {canCreate && <Link className="btn btn-primary" to={`${resource.path}/new`}><Icon name="plus" size={16} strokeWidth={2.2} />{resource.createLabel || `New ${resource.singular.toLowerCase()}`}</Link>}
        </div>
      </header>

      <div className="toolbar">
        <label className="search-wrap">
          <Icon name="search" size={16} className="search-icon" />
          <input className="input search" type="search" placeholder={resource.search || 'Search'} value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
        </label>
        {(resource.filters || []).map((f) => (
          <select key={f.key} className="input" value={filterValues[f.key]} onChange={(e) => setParam(f.key, e.target.value)} aria-label={f.label}>
            <option value="">{f.label}: all</option>
            {f.options.map((o) => <option key={o} value={o}>{f.optionLabel ? f.optionLabel(o) : humanize(o)}</option>)}
          </select>
        ))}
        {hasFilters && <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setSearch(''); setParams({}, { replace: true }); }}><Icon name="close" size={14} />Clear filters</button>}
      </div>

      <div className="panel table-wrap">
        {state.error ? (
          <div className="empty"><span className="empty-icon is-bad" aria-hidden><Icon name="alert" size={24} /></span><h2>Couldn’t load {resource.title.toLowerCase()}</h2><p>{state.error}</p>
            <button type="button" className="btn" onClick={() => setReload((n) => n + 1)}><Icon name="refresh" size={16} />Try again</button></div>
        ) : state.loading && state.items.length === 0 ? (
          <SkeletonTable columns={resource.columns.length + (canDelete ? 1 : 0)} />
        ) : !state.loading && state.items.length === 0 ? (
          <div className="empty">
            <span className="empty-icon" aria-hidden><Icon name={hasFilters ? 'search' : 'box'} size={24} /></span>
            <h2>{hasFilters ? 'Nothing matches these filters' : `No ${resource.title.toLowerCase()} yet`}</h2>
            {canCreate && !hasFilters && <Link className="btn btn-primary" to={`${resource.path}/new`}><Icon name="plus" size={16} strokeWidth={2.2} />{resource.createLabel || `Create the first ${resource.singular.toLowerCase()}`}</Link>}
          </div>
        ) : (
          <table className={`table ${state.loading ? 'is-loading' : ''}`}>
            <thead>
              <tr>
                {resource.columns.map((c) => <th key={c.key} className={c.type === 'thumb' ? 'col-thumb' : undefined}>{c.label || ''}</th>)}
                {canDelete && <th className="col-actions"><span className="sr-only">Actions</span></th>}
              </tr>
            </thead>
            <tbody>
              {state.items.map((row, i) => (
                <tr key={row._id} className={`row-in ${hasDetail ? 'is-clickable' : ''}`} style={{ '--i': i }}
                  onClick={hasDetail ? () => navigate(`${resource.path}/${row._id}`) : undefined}>
                  {resource.columns.map((c) => <td key={c.key} className={c.type === 'money' ? 'num' : undefined}><Cell col={c} row={row} /></td>)}
                  {canDelete && (
                    <td className="col-actions">
                      <button type="button" className="icon-btn danger" title="Delete" aria-label={`Delete ${resource.singular.toLowerCase()}`} onClick={(e) => { e.stopPropagation(); setToDelete(row); }}><Icon name="trash" size={16} /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination meta={state.meta} onPage={(p) => setParam('page', String(p))} />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={`Delete this ${resource.singular.toLowerCase()}?`}
        body="This can’t be undone. Items in use elsewhere are protected and will be refused."
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={doDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
