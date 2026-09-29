import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import RefSelect from '../components/RefSelect';
import Icon from '../components/Icon';
import { money, humanize } from '../utils/format';

const MAX_BYTES = 10 * 1024 * 1024;
const PAGE = 50;
const PRODUCT_STATUS = ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];
const ACTION_TONE = { create: 'good', update: 'info', skip: 'neutral', error: 'bad' };
const ACTION_LABEL = { create: 'Create', update: 'Update', skip: 'Skip', error: 'Error' };

const initialOptions = {
  mode: 'create', createMissing: true, categoryId: null, partnerId: null, fallbackPartner: 'Grabsouq',
  city: 'Dubai', country: 'United Arab Emirates', duration: 'As per voucher', validityDays: 365, status: 'DRAFT',
};

/** Collapses indexed columns (proimg[0].src, proimg[1].src …) into one chip per target field. */
function groupMapping(mapped) {
  const byField = new Map();
  for (const m of mapped) {
    if (!byField.has(m.field)) byField.set(m.field, []);
    byField.get(m.field).push(m.header);
  }
  return [...byField].map(([field, headers]) => ({ field, headers }));
}

const fmtBytes = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);

function download(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const csvCell = (v) => { const s = v == null ? '' : String(v); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

function Steps({ step }) {
  const steps = ['Upload file', 'Review', 'Done'];
  return (
    <ol className="steps" aria-label="Import progress">
      {steps.map((label, i) => (
        <li key={label} className={i < step ? 'is-done' : i === step ? 'is-current' : ''} aria-current={i === step ? 'step' : undefined}>
          <span className="step-dot">{i < step ? <Icon name="check" size={14} strokeWidth={2.6} /> : i + 1}</span>
          <span>{label}</span>
        </li>
      ))}
    </ol>
  );
}

function Dropzone({ onFile, disabled }) {
  const [over, setOver] = useState(false);
  const input = useRef(null);
  const pick = (files) => { const f = files?.[0]; if (f) onFile(f); };
  return (
    <div
      className={`dropzone ${over ? 'is-over' : ''}`}
      role="button" tabIndex={0} aria-disabled={disabled}
      onClick={() => !disabled && input.current?.click()}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !disabled) { e.preventDefault(); input.current?.click(); } }}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (!disabled) pick(e.dataTransfer.files); }}
    >
      <span className="dropzone-icon"><Icon name="upload" size={28} /></span>
      <strong>Drop your CSV here, or click to browse</strong>
      <span className="muted">Comma, semicolon or tab separated · UTF-8 · up to 10 MB / 2,000 products</span>
      <input ref={input} type="file" accept=".csv,text/csv" hidden onChange={(e) => { pick(e.target.files); e.target.value = ''; }} />
    </div>
  );
}

function SummaryTiles({ plan, result }) {
  const tiles = result
    ? [
      { k: 'created', label: 'Created', value: result.created, tone: 'good', icon: 'plus' },
      { k: 'updated', label: 'Updated', value: result.updated, tone: 'info', icon: 'refresh' },
      { k: 'skip', label: 'Skipped', value: plan.summary.skip, tone: 'neutral', icon: 'chevronRight' },
      { k: 'failed', label: 'Failed', value: plan.summary.error + result.failed.length, tone: 'bad', icon: 'alert' },
    ]
    : [
      { k: 'total', label: 'Rows in file', value: plan.totalRows, tone: 'ink', icon: 'file' },
      { k: 'create', label: 'Will be created', value: plan.summary.create, tone: 'good', icon: 'plus' },
      { k: 'update', label: 'Will be updated', value: plan.summary.update, tone: 'info', icon: 'refresh' },
      { k: 'skip', label: 'Skipped', value: plan.summary.skip, tone: 'neutral', icon: 'chevronRight' },
      { k: 'error', label: 'Need fixing', value: plan.summary.error, tone: 'bad', icon: 'alert' },
    ];
  return (
    <div className="import-tiles">
      {tiles.map((t, i) => (
        <div key={t.k} className={`import-tile tone-${t.tone} rise`} style={{ '--i': i }}>
          <span className="import-tile-icon"><Icon name={t.icon} size={16} strokeWidth={2.2} /></span>
          <span className="import-tile-value">{t.value}</span>
          <span className="import-tile-label">{t.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function ProductImportPage() {
  const { can } = useAuth();
  const toast = useToast();
  const canUpdate = can('products.update');
  const [file, setFile] = useState(null);           // { name, size, text }
  const [options, setOptions] = useState(initialOptions);
  const [plan, setPlan] = useState(null);
  const [checking, setChecking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [guide, setGuide] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const runId = useRef(0);

  const setOpt = (k, v) => setOptions((o) => ({ ...o, [k]: v }));

  const params = useCallback((dryRun) => {
    const p = { dryRun: String(dryRun), mode: options.mode, createMissing: String(options.createMissing), status: options.status };
    for (const k of ['categoryId', 'partnerId', 'fallbackPartner', 'city', 'country', 'duration', 'validityDays']) {
      const v = options[k];
      if (v !== null && v !== undefined && String(v).trim() !== '') p[k] = String(v).trim();
    }
    return p;
  }, [options]);

  const send = useCallback((dryRun) => api.post('/admin/products/import', file.text, {
    params: params(dryRun), headers: { 'Content-Type': 'text/csv' }, timeout: dryRun ? 60000 : 300000,
  }).then((r) => r.data.data), [file, params]);

  // Re-validate (dry run) whenever the file or the options change.
  useEffect(() => {
    if (!file || result) return undefined;
    const id = ++runId.current;
    const t = setTimeout(() => {
      setChecking(true); setError(null);
      send(true)
        .then((data) => { if (id === runId.current) { setPlan(data); setPage(1); } })
        .catch((err) => { if (id === runId.current) { setPlan(null); setError(errorMessage(err)); } })
        .finally(() => { if (id === runId.current) setChecking(false); });
    }, 350);
    return () => clearTimeout(t);
  }, [file, send, result]);

  useEffect(() => {
    if (!showGuide || guide) return;
    api.get('/admin/products/import/fields').then((r) => setGuide(r.data.data.fields)).catch(() => setGuide([]));
  }, [showGuide, guide]);

  const onFile = async (f) => {
    setError(null); setResult(null); setPlan(null); setFilter('all');
    if (!/\.csv$/i.test(f.name) && !/csv|excel|text\/plain/.test(f.type)) { setError('Choose a .csv file. In Excel or Google Sheets use File → Download / Save as → CSV.'); return; }
    if (f.size > MAX_BYTES) { setError(`That file is ${fmtBytes(f.size)}. The limit is 10 MB — split it into smaller files.`); return; }
    setFile({ name: f.name, size: f.size, text: await f.text() });
  };

  const reset = () => { setFile(null); setPlan(null); setResult(null); setError(null); setFilter('all'); };

  const runImport = async () => {
    setImporting(true); setError(null);
    try {
      const data = await send(false);
      setPlan(data);
      setResult(data.result);
      const n = data.result.created + data.result.updated;
      toast(`${n} product${n === 1 ? '' : 's'} imported`);
    } catch (err) {
      setError(errorMessage(err));
      toast(errorMessage(err), 'error');
    } finally { setImporting(false); }
  };

  const templateDownload = async () => {
    try {
      const r = await api.get('/admin/products/import/template', { responseType: 'blob' });
      download('products-import-template.csv', r.data);
    } catch (err) { toast(errorMessage(err), 'error'); }
  };

  const errorReport = () => {
    const rows = [['row', 'title', 'slug', 'field', 'problem']];
    for (const r of plan.rows) for (const e of r.errors) rows.push([r.row, r.preview.title, r.preview.slug, e.field, e.message]);
    for (const f of result?.failed || []) rows.push([f.row, f.title, '', '', f.message]);
    download('import-errors.csv', new Blob([`﻿${rows.map((r) => r.map(csvCell).join(',')).join('\r\n')}`], { type: 'text/csv' }));
  };

  const failedRows = useMemo(() => new Map((result?.failed || []).map((f) => [f.row, f.message])), [result]);
  const visible = useMemo(() => {
    if (!plan) return [];
    return plan.rows.filter((r) => (filter === 'all' ? true : filter === 'warn' ? r.warnings.length > 0 : r.action === filter));
  }, [plan, filter]);
  const pageRows = visible.slice((page - 1) * PAGE, page * PAGE);
  const pages = Math.max(1, Math.ceil(visible.length / PAGE));
  const importable = plan ? plan.summary.create + plan.summary.update : 0;
  const step = result ? 2 : plan ? 1 : 0;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <Link to="/products" className="back">Products</Link>
          <h1>Import products</h1>
          <p className="muted">Upload a CSV to add or update many products at once. Nothing is saved until you confirm.</p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn" onClick={templateDownload}><Icon name="download" size={16} />Download template</button>
        </div>
      </header>

      <Steps step={step} />

      {error && <div className="notice notice-error rise" role="alert"><Icon name="alert" size={16} /> {error}</div>}

      {result ? (
        <section className="panel pad import-done rise">
          <div className="done-mark" aria-hidden>
            <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" /><path d="m15 27 7 7 15-16" /></svg>
          </div>
          <h2>Import finished</h2>
          <p className="muted">{file?.name}</p>
          <SummaryTiles plan={plan} result={result} />
          {(result.createdReferences?.categories?.length > 0 || result.createdReferences?.partners?.length > 0) && (
            <p className="muted">
              Also created
              {result.createdReferences.categories.length > 0 && <> categories: <strong>{result.createdReferences.categories.join(', ')}</strong></>}
              {result.createdReferences.partners.length > 0 && <> partners: <strong>{result.createdReferences.partners.join(', ')}</strong></>}
              . Review their details before publishing.
            </p>
          )}
          <div className="done-actions">
            <Link to="/products" className="btn btn-primary"><Icon name="box" size={16} />View products</Link>
            <button type="button" className="btn" onClick={reset}><Icon name="upload" size={16} />Import another file</button>
            {(plan.summary.error > 0 || result.failed.length > 0) && <button type="button" className="btn btn-ghost-danger" onClick={errorReport}><Icon name="download" size={16} />Download error report</button>}
          </div>
        </section>
      ) : (
        <div className="import-grid">
          <div className="stack">
            <section className="panel pad rise">
              <div className="row-between"><h2>1. Choose file</h2>
                <button type="button" className="linkbtn" onClick={() => setShowGuide((s) => !s)} aria-expanded={showGuide}>{showGuide ? 'Hide' : 'Show'} accepted columns</button>
              </div>
              <div className="divider-sm" />
              {file ? (
                <div className="file-card">
                  <span className="file-icon"><Icon name="file" size={22} /></span>
                  <span className="grow"><strong>{file.name}</strong><small className="block muted">{fmtBytes(file.size)}{plan && ` · ${plan.totalRows} rows${plan.totalProducts > plan.totalRows ? ` → ${plan.totalProducts} products` : ''} · ${plan.columns.mapped.length} columns recognised`}</small></span>
                  {checking && <span className="spinner" aria-label="Checking" />}
                  <button type="button" className="icon-btn" title="Remove file" aria-label="Remove file" onClick={reset} disabled={importing}><Icon name="close" size={16} /></button>
                </div>
              ) : <Dropzone onFile={onFile} />}
              {showGuide && (
                <div className="guide rise">
                  {!guide ? <p className="muted">Loading…</p> : (
                    <table className="table table-compact">
                      <thead><tr><th>Field</th><th>Header names accepted</th></tr></thead>
                      <tbody>
                        {guide.map((f) => (
                          <tr key={f.key}>
                            <td><strong>{f.label}</strong>{f.required && <span className="req"> *</span>}{f.help && <small className="block muted">{f.help}</small>}</td>
                            <td className="guide-aliases">{f.aliases.map((a) => <code key={a}>{a}</code>)}{f.array && <small className="block muted">Also indexed: {f.aliases[0]}.0, {f.aliases[0]}[1], {f.aliases[0]}_2 … or several URLs separated by |</small>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <p className="muted small">Headers are matched ignoring case, spaces and punctuation. Unknown columns are ignored. Booleans accept TRUE/FALSE, yes/no or 1/0.</p>
                </div>
              )}
            </section>

            {plan && (
              <section className="panel rise">
                <div className="pad-head">
                  <h2>2. Review</h2>
                  {checking && <span className="muted small"><span className="spinner spinner-sm" /> Re-checking…</span>}
                </div>
                <div className="pad-x">
                  <SummaryTiles plan={plan} />
                  {plan.columns.missing.length > 0 && (
                    <div className="notice notice-error"><Icon name="alert" size={16} /> Missing required columns: <strong>{plan.columns.missing.join(', ')}</strong>. Add them to the file or set a default on the right.</div>
                  )}
                  <details className="mapping">
                    <summary>Column mapping <span className="muted">({plan.columns.mapped.length} used, {plan.columns.ignored.length} ignored)</span></summary>
                    <div className="mapping-chips">
                      {groupMapping(plan.columns.mapped).map((g) => (
                        <span key={g.field} className="map-chip" title={g.headers.join(', ')}>
                          <code>{g.headers[0]}</code>{g.headers.length > 1 && <span className="map-more">+{g.headers.length - 1}</span>}
                          <Icon name="chevronRight" size={12} /><strong>{g.field}</strong>
                        </span>
                      ))}
                      {plan.columns.ignored.map((h) => <span key={h} className="map-chip is-ignored" title="Not imported"><code>{h}</code></span>)}
                    </div>
                  </details>
                  {(plan.newReferences.categories.length > 0 || plan.newReferences.partners.length > 0) && (
                    <div className="notice"><Icon name="sparkle" size={16} /> Will also create
                      {plan.newReferences.categories.length > 0 && <> categories <strong>{plan.newReferences.categories.join(', ')}</strong></>}
                      {plan.newReferences.partners.length > 0 && <> partners <strong>{plan.newReferences.partners.join(', ')}</strong></>}.
                    </div>
                  )}
                  <div className="tabs" role="tablist">
                    {[['all', 'All', plan.rows.length], ['error', 'Errors', plan.summary.error], ['create', 'New', plan.summary.create], ['update', 'Updates', plan.summary.update], ['skip', 'Skipped', plan.summary.skip], ['warn', 'Warnings', plan.rows.filter((r) => r.warnings.length).length]]
                      .map(([k, label, n]) => (
                        <button key={k} type="button" role="tab" aria-selected={filter === k} className={`tab ${filter === k ? 'is-active' : ''}`} onClick={() => { setFilter(k); setPage(1); }}>
                          {label}<span className="tab-count">{n}</span>
                        </button>
                      ))}
                  </div>
                </div>
                <div className="table-wrap">
                  {pageRows.length === 0 ? <div className="empty"><p>No rows in this view.</p></div> : (
                    <table className="table import-table">
                      <thead><tr><th>Row</th><th className="col-thumb" /><th>Product</th><th>Category · Partner</th><th className="num">Price · Status</th><th>Result</th></tr></thead>
                      <tbody>
                        {pageRows.map((r, i) => (
                          <tr key={r.row} className={`row-in ${r.action === 'error' ? 'is-error' : ''}`} style={{ '--i': i }}>
                            <td className="mono muted">{r.row}</td>
                            <td>{r.preview.image ? <img className="thumb" src={r.preview.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /> : <span className="thumb thumb-empty" />}</td>
                            <td>
                              <span className="cell-title"><strong>{r.preview.title || <span className="muted">Untitled</span>}</strong><small className="mono">{r.preview.slug}</small></span>
                              {r.errors.length > 0 && <ul className="issues">{r.errors.map((e, j) => <li key={j} className="issue-bad"><strong>{e.field}</strong>: {e.message}</li>)}</ul>}
                              {r.warnings.length > 0 && <ul className="issues">{r.warnings.map((w, j) => <li key={j} className="issue-warn">{w}</li>)}</ul>}
                            </td>
                            <td>
                              {r.preview.category || <span className="muted">—</span>}{r.preview.newCategory && <span className="new-tag">new</span>}
                              <small className="block muted">{r.preview.partner || '—'}{r.preview.newPartner && <span className="new-tag">new</span>}</small>
                            </td>
                            <td className="num">{r.preview.salePrice != null ? money(r.preview.salePrice, r.preview.currency) : '—'}{r.preview.price != null && r.preview.salePrice < r.preview.price && <s className="muted strike block">{money(r.preview.price, r.preview.currency)}</s>}
                              <small className="block muted">{r.preview.status ? humanize(r.preview.status) : '—'}</small></td>
                            <td><span className={`badge badge-${ACTION_TONE[r.action]}`}>{failedRows.has(r.row) ? 'Failed' : ACTION_LABEL[r.action]}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                {pages > 1 && (
                  <div className="pagination pad-x pad-b">
                    <span className="muted">{(page - 1) * PAGE + 1}–{Math.min(page * PAGE, visible.length)} of {visible.length}</span>
                    <div className="pagination-buttons">
                      <button type="button" className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><Icon name="chevronLeft" size={15} />Previous</button>
                      <span className="muted">Page {page} of {pages}</span>
                      <button type="button" className="btn btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next<Icon name="chevronRight" size={15} /></button>
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>

          <aside className="stack import-side">
            <section className="panel pad rise" style={{ '--i': 1 }}>
              <h2>Existing products</h2>
              <div className="choice-list" role="radiogroup" aria-label="What to do with products that already exist">
                <label className={`choice ${options.mode === 'create' ? 'is-selected' : ''}`}>
                  <input type="radio" name="mode" checked={options.mode === 'create'} onChange={() => setOpt('mode', 'create')} />
                  <span><strong>Add new only</strong><small>Rows whose slug already exists are skipped.</small></span>
                </label>
                <label className={`choice ${options.mode === 'upsert' ? 'is-selected' : ''} ${canUpdate ? '' : 'is-disabled'}`} title={canUpdate ? undefined : 'Needs the "Edit products" permission'}>
                  <input type="radio" name="mode" checked={options.mode === 'upsert'} disabled={!canUpdate} onChange={() => setOpt('mode', 'upsert')} />
                  <span><strong>Add new and update existing</strong><small>Matched by slug. Only the columns in the file are changed.</small></span>
                </label>
              </div>
            </section>

            <section className="panel pad rise" style={{ '--i': 2 }}>
              <h2>Defaults</h2>
              <p className="muted small">Used when a row leaves the value empty, or when its category/partner isn’t found.</p>
              <div className="stack-sm">
                <div className="field"><label className="field-label" htmlFor="d-cat">Category</label>
                  <RefSelect id="d-cat" endpoint="/admin/categories" labelKey="name" value={options.categoryId} onChange={(v) => setOpt('categoryId', v)} placeholder="Search categories…" /></div>
                <div className="field"><label className="field-label" htmlFor="d-partner">Partner</label>
                  <RefSelect id="d-partner" endpoint="/admin/partners" labelKey="name" optionLabel={(p) => `${p.name} · ${p.city}`} value={options.partnerId} onChange={(v) => setOpt('partnerId', v)} placeholder="Search partners…" /></div>
                <div className="form-grid">
                  <div className="field"><label className="field-label" htmlFor="d-city">City</label><input id="d-city" className="input" value={options.city} onChange={(e) => setOpt('city', e.target.value)} placeholder="e.g. Dubai" /></div>
                  <div className="field"><label className="field-label" htmlFor="d-country">Country</label><input id="d-country" className="input" value={options.country} onChange={(e) => setOpt('country', e.target.value)} /></div>
                  <div className="field"><label className="field-label" htmlFor="d-duration">Duration</label><input id="d-duration" className="input" value={options.duration} onChange={(e) => setOpt('duration', e.target.value)} placeholder="e.g. Instant" /></div>
                  <div className="field"><label className="field-label" htmlFor="d-validity">Validity (days)</label><input id="d-validity" className="input" type="number" min="1" max="3650" value={options.validityDays} onChange={(e) => setOpt('validityDays', e.target.value)} /></div>
                </div>
                <div className="field"><label className="field-label" htmlFor="d-status">Status for new products</label>
                  <select id="d-status" className="input" value={options.status} onChange={(e) => setOpt('status', e.target.value)}>
                    {PRODUCT_STATUS.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
                  </select>
                  <p className="field-help">Used when the file has no status / active column. Draft keeps them off the store until reviewed.</p>
                </div>
                <label className="check">
                  <input type="checkbox" checked={options.createMissing} onChange={(e) => setOpt('createMissing', e.target.checked)} />
                  Create categories and partners that don’t exist yet (matched by name)
                </label>
                {options.createMissing && !options.partnerId && (
                  <div className="field rise"><label className="field-label" htmlFor="d-fallback">Partner for rows without a brand</label>
                    <input id="d-fallback" className="input" value={options.fallbackPartner} onChange={(e) => setOpt('fallbackPartner', e.target.value)} placeholder="e.g. Grabsouq" />
                    <p className="field-help">Used (and created if needed) when the brand / partner cell is empty.</p>
                  </div>
                )}
              </div>
            </section>

            <div className="import-cta rise" style={{ '--i': 3 }}>
              <button type="button" className="btn btn-primary btn-block btn-lg" disabled={!plan || importable === 0 || checking || importing} onClick={runImport}>
                {importing ? <><span className="spinner spinner-light" />Importing…</> : <><Icon name="upload" size={18} />{plan ? `Import ${importable} product${importable === 1 ? '' : 's'}` : 'Import products'}</>}
              </button>
              {plan && plan.summary.error > 0 && (
                <p className="muted small center">{plan.summary.error} row{plan.summary.error === 1 ? '' : 's'} with errors will be skipped. <button type="button" className="linkbtn" onClick={errorReport}>Download error report</button></p>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
