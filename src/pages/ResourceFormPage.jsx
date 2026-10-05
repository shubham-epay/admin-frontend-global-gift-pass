import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { resourceApi } from '../api/resource';
import { api as http, errorMessage, fieldErrors } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import FormField from '../components/FormField';
import ConfirmDialog from '../components/ConfirmDialog';
import UserSecurityPanel from './UserSecurityPanel';
import { fromDateInput, fromDateTimeInput, slugify, toDateInput, toDateTimeInput, dateTime } from '../utils/format';

const LIST_TYPES = ['urlList', 'tags', 'refMulti', 'permissions', 'customFields', 'denominations'];

function emptyFor(f) {
  if (f.default !== undefined) return f.default;
  if (LIST_TYPES.includes(f.type)) return [];
  if (f.type === 'checkbox') return false;
  if (f.type === 'ref') return null;
  return '';
}

function fromDoc(fields, doc) {
  const out = {};
  for (const f of fields) {
    const v = doc[f.name];
    switch (f.type) {
      case 'ref': out[f.name] = v?._id ?? v ?? null; break;
      case 'refMulti': out[f.name] = (v || []).map((x) => x?._id ?? x); break;
      case 'date': case 'dateEnd': out[f.name] = toDateInput(v); break;
      case 'datetime': out[f.name] = toDateTimeInput(v); break;
      case 'checkbox': out[f.name] = Boolean(v); break;
      case 'urlList': case 'tags': case 'permissions': out[f.name] = v || []; break;
      case 'customFields': out[f.name] = (v || []).map(({ key, label, value, public: pub }) => ({ key, label, value: value ?? '', public: Boolean(pub) })); break;
      case 'denominations': out[f.name] = (v || []).map((d) => ({ ...d, value: d.value ?? '', price: d.price ?? '', oldPrice: d.oldPrice ?? '', attributes: d.attributes || [] })); break;
      case 'lines': out[f.name] = (v || []).join('\n'); break;
      case 'pairs': out[f.name] = (v || []).map((p) => (p.value ? `${p.label}: ${p.value}` : p.label)).join('\n'); break;
      case 'password': out[f.name] = ''; break;
      default: out[f.name] = v ?? f.default ?? ''; // older records may predate a field: show its default
    }
  }
  return out;
}

function toPayload(fields, values, isNew) {
  const payload = {};
  const errors = {};
  for (const f of fields) {
    if (!isNew && f.readOnlyOnEdit) continue;
    let v = values[f.name];
    switch (f.type) {
      case 'number': case 'money': v = v === '' || v == null ? null : Number(v); break;
      case 'date': v = fromDateInput(v); break;
      case 'dateEnd': v = fromDateInput(v, true); break;
      case 'datetime': v = fromDateTimeInput(v); break;
      case 'checkbox': v = Boolean(v); break;
      case 'ref': v = v || null; break;
      case 'customFields': v = (v || []).filter((r) => r.label?.trim()).map((r) => ({ ...r, label: r.label.trim(), value: (r.value || '').trim() })); break;
      case 'denominations': {
        const toNum = (x) => (x === '' || x == null ? undefined : Number(x));
        v = (v || []).filter((d) => d.value !== '' && d.value != null).map((d) => ({
          value: toNum(d.value),
          price: toNum(d.price) ?? toNum(d.value),
          ...(toNum(d.oldPrice) != null && { oldPrice: toNum(d.oldPrice) }),
          ...(d.label && { label: d.label }),
          ...(d.img && { img: d.img }),
          attributes: (d.attributes || []).filter((a) => a.label?.trim()).map((a) => ({ label: a.label.trim(), value: String(a.value ?? '').trim(), public: Boolean(a.public) })),
        }));
        if (v.some((d) => Number.isNaN(d.value) || Number.isNaN(d.price))) errors[f.name] = 'Denominations must be numbers';
        break;
      }
      // One item per line. Pairs are "Label: value".
      case 'lines': v = String(v || '').split('\n').map((x) => x.trim()).filter(Boolean); break;
      case 'pairs':
        v = String(v || '').split('\n').map((x) => x.trim()).filter(Boolean).map((line) => {
          const i = line.indexOf(':');
          return i > 0 ? { label: line.slice(0, i).trim(), value: line.slice(i + 1).trim() } : { label: line, value: '' };
        });
        break;
      default:
        if (LIST_TYPES.includes(f.type)) v = v || [];
        else if (typeof v === 'string') { v = f.type === 'password' ? v : v.trim(); if (v === '') v = null; }
    }
    const empty = v === null || (Array.isArray(v) && v.length === 0 && f.type !== 'permissions');
    if (f.required && empty) errors[f.name] = 'Required';
    if (typeof v === 'number' && Number.isNaN(v)) errors[f.name] = 'Must be a number';
    if (isNew && (v === null || (Array.isArray(v) && v.length === 0))) continue; // let server defaults apply
    payload[f.name] = v;
  }
  return { payload, errors };
}

export default function ResourceFormPage({ resource }) {
  const { id } = useParams();
  const isNew = !id;
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAuth();
  const api = useMemo(() => resourceApi(resource.endpoint), [resource.endpoint]);
  const sections = useMemo(() => resource.sections.map((s) => ({
    ...s, fields: s.fields.filter((f) => !(f.createOnly && !isNew)),
  })).filter((s) => s.fields.length), [resource.sections, isNew]);
  const fields = useMemo(() => sections.flatMap((s) => s.fields), [sections]);

  const [values, setValues] = useState(() => (isNew
    ? Object.fromEntries(fields.map((f) => [f.name, search.get(f.name) ?? emptyFor(f)]))
    : null));
  const [doc, setDoc] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const slugTouched = useRef(!isNew);

  useEffect(() => {
    if (isNew) return;
    api.get(id).then((d) => { setDoc(d); setValues(fromDoc(fields, d)); }).catch((err) => setLoadError(errorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const readOnly = (!isNew && !can(resource.perms.update)) || Boolean(resource.readOnlyWhen?.(doc));

  const setField = (name, v) => {
    setValues((prev) => {
      const next = { ...prev, [name]: v };
      if (!slugTouched.current) {
        for (const f of fields) if (f.type === 'slug' && f.source === name) next[f.name] = slugify(v);
      }
      return next;
    });
    if (fields.find((f) => f.name === name)?.type === 'slug') slugTouched.current = true;
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);
    const { payload, errors: clientErrors } = toPayload(fields, values, isNew);
    if (Object.keys(clientErrors).length) { setErrors(clientErrors); setFormError('Fill in the required fields.'); return; }
    setSaving(true);
    try {
      if (isNew) {
        if (resource.createEndpoint) await http.post(resource.createEndpoint, payload);
        else await api.create(payload);
        toast(`${resource.singular} created`);
      } else {
        await api.update(id, payload);
        toast('Changes saved');
      }
      navigate(resource.path);
    } catch (err) {
      setErrors(fieldErrors(err));
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await api.remove(id);
      toast(`${resource.singular} deleted`);
      navigate(resource.path);
    } catch (err) {
      toast(errorMessage(err), 'error');
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loadError) return <div className="page"><div className="empty"><h2>Couldn’t open this {resource.singular.toLowerCase()}</h2><p>{loadError}</p><Link className="btn" to={resource.path}>Back to {resource.title.toLowerCase()}</Link></div></div>;
  if (!values) {
    return (
      <div className="page page-form">
        <span className="skeleton" style={{ width: 120, height: 12 }} />
        <span className="skeleton" style={{ width: 280, height: 28, margin: '0.6rem 0 1.6rem' }} />
        {[0, 1].map((i) => <div key={i} className="panel form-section"><span className="skeleton" style={{ width: 160, height: 16, marginBottom: '1.2rem' }} /><div className="form-grid">{[0, 1, 2, 3].map((j) => <span key={j} className="skeleton" style={{ height: 38 }} />)}</div></div>)}
      </div>
    );
  }

  const heading = isNew ? `New ${resource.singular.toLowerCase()}` : (doc?.name || doc?.title || doc?.code || doc?.question || resource.singular);
  const canDelete = !isNew && resource.perms.delete && can(resource.perms.delete) && !resource.readOnlyWhen?.(doc);

  return (
    <div className="page page-form">
      <header className="page-head">
        <div>
          <Link to={resource.path} className="back">{resource.title}</Link>
          <h1>{heading}</h1>
          {doc?.updatedAt && <p className="muted">Last updated {dateTime(doc.updatedAt)}</p>}
        </div>
        <div className="head-actions">
          {canDelete && <button type="button" className="btn btn-ghost-danger" onClick={() => setConfirmDelete(true)}>Delete</button>}
          {!readOnly && <button type="submit" form="resource-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : isNew ? `Create ${resource.singular.toLowerCase()}` : 'Save changes'}</button>}
        </div>
      </header>

      {readOnly && <div className="notice">{resource.readOnlyWhen?.(doc) ? resource.readOnlyNote : 'You can view this record but not change it.'}</div>}
      {formError && <div className="notice notice-error" role="alert">{formError}</div>}

      {resource.Summary && doc && <resource.Summary product={doc} />}
      {resource.Preview && <resource.Preview values={values} />}

      <form id="resource-form" onSubmit={submit} noValidate>
        {sections.map((s) => (
          <section key={s.title} className="panel form-section">
            <h2>{s.title}</h2>
            <div className="form-grid">
              {s.fields.map((f) => (
                <FormField key={f.name} field={f} value={values[f.name]} error={errors[f.name]}
                  disabled={readOnly || (!isNew && f.readOnlyOnEdit)} onChange={(v) => setField(f.name, v)} />
              ))}
            </div>
          </section>
        ))}
      </form>

      {!isNew && resource.extra === 'userSecurity' && doc && <UserSecurityPanel user={doc} />}

      <ConfirmDialog open={confirmDelete} title={`Delete this ${resource.singular.toLowerCase()}?`}
        body="This can’t be undone." confirmLabel="Delete" busy={deleting} onConfirm={doDelete} onCancel={() => setConfirmDelete(false)} />
    </div>
  );
}
