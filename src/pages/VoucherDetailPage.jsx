import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errorMessage, fieldErrors } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';
import RefSelect from '../components/RefSelect';
import { money, date, dateTime, humanize, toDateInput, fromDateInput } from '../utils/format';

export default function VoucherDetailPage() {
  const { id } = useParams();
  const { can } = useAuth();
  const toast = useToast();
  const [v, setV] = useState(null);
  const [error, setError] = useState(null);
  const [edit, setEdit] = useState(null);
  const [st, setSt] = useState({ status: '', reason: '', expiryDate: '', redeemedAtPartnerId: null });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/admin/vouchers/${id}`).then((r) => {
    const d = r.data.data;
    setV(d);
    setEdit({ recipientName: d.recipientName, recipientEmail: d.recipientEmail, recipientPhone: d.recipientPhone || '', senderName: d.senderName, message: d.message || '', expiryDate: toDateInput(d.expiryDate) });
    setSt({ status: '', reason: '', expiryDate: '', redeemedAtPartnerId: null });
  }).catch((e) => setError(errorMessage(e)));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const saveDetails = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({});
    try {
      await api.patch(`/admin/vouchers/${id}`, { ...edit, recipientPhone: edit.recipientPhone || null, message: edit.message || null, expiryDate: fromDateInput(edit.expiryDate, true) });
      toast('Voucher updated');
      await load();
    } catch (err) { setErrors(fieldErrors(err)); toast(errorMessage(err), 'error'); } finally { setBusy(false); }
  };

  const changeStatus = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({});
    try {
      await api.patch(`/admin/vouchers/${id}/status`, {
        status: st.status, reason: st.reason || null,
        expiryDate: st.expiryDate ? fromDateInput(st.expiryDate, true) : null,
        redeemedAtPartnerId: st.redeemedAtPartnerId || null,
      });
      toast(`Voucher marked ${humanize(st.status).toLowerCase()}`);
      await load();
    } catch (err) { setErrors(fieldErrors(err)); toast(errorMessage(err), 'error'); } finally { setBusy(false); }
  };

  if (error) return <div className="page"><div className="empty"><h2>Couldn’t open this voucher</h2><p>{error}</p><Link className="btn" to="/vouchers">Back to vouchers</Link></div></div>;
  if (!v) return <div className="page"><p className="muted">Loading…</p></div>;

  const canUpdate = can('vouchers.update');
  const set = (k) => (e) => setEdit({ ...edit, [k]: e.target.value });

  return (
    <div className="page">
      <header className="page-head">
        <div><Link to="/vouchers" className="back">Vouchers</Link><h1>Voucher</h1></div>
        <StatusBadge value={v.status} />
      </header>

      <div className="grid-2 grid-wide-left">
        <div className="stack">
          <div className={`voucher-pass status-${v.status.toLowerCase()}`}>
            <div className="voucher-main">
              <p className="voucher-what">{v.productId?.title || v.giftBoxId?.name || 'Gift voucher'}</p>
              <p className="voucher-code mono">{v.code}</p>
              <p>For {v.recipientName} · from {v.senderName}</p>
              {v.message && <p className="voucher-msg">“{v.message}”</p>}
            </div>
            <div className="voucher-stub">
              <span>{v.value != null ? money(v.value, v.currency) : '—'}</span>
              <small>Valid until {date(v.expiryDate)}</small>
            </div>
          </div>

          <section className="panel pad">
            <h2>Details</h2>
            <dl className="kv">
              <div><dt>Order</dt><dd>{v.orderId ? <Link className="mono" to={`/orders/${v.orderId._id}`}>{v.orderId.orderNumber}</Link> : '—'}</dd></div>
              <div><dt>Recipient email</dt><dd>{v.recipientEmail}</dd></div>
              <div><dt>Issued</dt><dd>{dateTime(v.issuedAt)}{v.createdBy ? ` by ${v.createdBy.name}` : ''}</dd></div>
              {v.redeemedAt && <div><dt>Redeemed</dt><dd>{dateTime(v.redeemedAt)}{v.redeemedAtPartnerId ? ` at ${v.redeemedAtPartnerId.name}` : ''}</dd></div>}
              {v.statusReason && <div><dt>Reason</dt><dd>{v.statusReason}</dd></div>}
            </dl>
          </section>

          {canUpdate && v.status === 'ACTIVE' && (
            <section className="panel form-section">
              <h2>Edit recipient and expiry</h2>
              <form onSubmit={saveDetails}>
                <div className="form-grid">
                  {[['recipientName', 'Recipient name'], ['recipientEmail', 'Recipient email'], ['recipientPhone', 'Recipient phone'], ['senderName', 'Sender name']].map(([k, l]) => (
                    <div className="field" key={k}>
                      <label className="field-label" htmlFor={k}>{l}</label>
                      <input id={k} className="input" value={edit[k]} onChange={set(k)} />
                      {errors[k] && <p className="field-error">{errors[k]}</p>}
                    </div>
                  ))}
                  <div className="field">
                    <label className="field-label" htmlFor="exp">Expiry date</label>
                    <input id="exp" type="date" className="input" value={edit.expiryDate} onChange={set('expiryDate')} />
                    {errors.expiryDate && <p className="field-error">{errors.expiryDate}</p>}
                  </div>
                  <div className="field field-wide">
                    <label className="field-label" htmlFor="msg">Gift message</label>
                    <textarea id="msg" className="input" rows={3} value={edit.message} onChange={set('message')} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={busy}>Save changes</button>
              </form>
            </section>
          )}
        </div>

        {canUpdate && v.allowedTransitions.length > 0 && (
          <section className="panel pad">
            <h2>Change status</h2>
            <form onSubmit={changeStatus} className="stack-sm">
              <div className="field">
                <label className="field-label" htmlFor="vs">New status</label>
                <select id="vs" className="input" value={st.status} onChange={(e) => setSt({ ...st, status: e.target.value })} required>
                  <option value="">Choose…</option>
                  {v.allowedTransitions.map((s) => <option key={s} value={s}>{s === 'ACTIVE' ? 'Reinstate (active)' : humanize(s)}</option>)}
                </select>
              </div>
              {st.status === 'REDEEMED' && (
                <div className="field">
                  <label className="field-label">Redeemed at partner</label>
                  <RefSelect endpoint="/admin/partners" labelKey="name" value={st.redeemedAtPartnerId} onChange={(x) => setSt({ ...st, redeemedAtPartnerId: x })} />
                </div>
              )}
              {st.status === 'ACTIVE' && (
                <div className="field">
                  <label className="field-label" htmlFor="nexp">New expiry date</label>
                  <input id="nexp" type="date" className="input" value={st.expiryDate} onChange={(e) => setSt({ ...st, expiryDate: e.target.value })} required />
                  {errors.expiryDate && <p className="field-error">{errors.expiryDate}</p>}
                </div>
              )}
              <div className="field">
                <label className="field-label" htmlFor="rsn">Reason{st.status === 'CANCELLED' && <span className="req"> *</span>}</label>
                <textarea id="rsn" className="input" rows={2} value={st.reason} onChange={(e) => setSt({ ...st, reason: e.target.value })} required={st.status === 'CANCELLED'} />
                {errors.reason && <p className="field-error">{errors.reason}</p>}
              </div>
              <button type="submit" className={`btn ${st.status === 'CANCELLED' ? 'btn-danger' : 'btn-primary'}`} disabled={busy || !st.status}>
                {st.status === 'CANCELLED' ? 'Cancel voucher' : st.status ? `Mark as ${humanize(st.status).toLowerCase()}` : 'Change status'}
              </button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
