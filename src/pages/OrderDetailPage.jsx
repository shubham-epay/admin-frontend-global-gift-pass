import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errorMessage, fieldErrors } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import { money, dateTime, date, humanize } from '../utils/format';

const DESTRUCTIVE = { CANCELLED: 'Cancel order', REFUNDED: 'Mark as refunded' };

export default function OrderDetailPage() {
  const { id } = useParams();
  const { can } = useAuth();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ orderStatus: '', trackingNumber: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [settle, setSettle] = useState(null); // { payment, op: 'capture' | 'void' }
  const [settling, setSettling] = useState(false);

  const load = () => api.get(`/admin/orders/${id}`).then((r) => {
    const o = r.data.data;
    setOrder(o);
    setForm({ orderStatus: '', trackingNumber: o.trackingNumber || '', notes: '' });
  }).catch((e) => setError(errorMessage(e)));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const save = async () => {
    setSaving(true); setErrors({});
    try {
      const body = { orderStatus: form.orderStatus || order.orderStatus, trackingNumber: form.trackingNumber || null, notes: form.notes || null };
      const r = await api.patch(`/admin/orders/${id}/status`, body);
      const n = r.data.data.cancelledVouchers;
      toast(form.orderStatus ? `Order marked ${humanize(form.orderStatus).toLowerCase()}${n ? `, ${n} voucher(s) cancelled` : ''}` : 'Order updated');
      setConfirm(false);
      await load();
    } catch (e) {
      setErrors(fieldErrors(e));
      toast(errorMessage(e), 'error');
      setConfirm(false);
    } finally { setSaving(false); }
  };

  /** Captures (takes) or voids (releases) the amount held by a card authorization. */
  const settleAuthorization = async () => {
    setSettling(true);
    try {
      await api.post(`/admin/orders/${id}/payments/${settle.payment._id}/${settle.op}`, {});
      toast(settle.op === 'capture' ? 'Payment captured, order marked paid' : 'Authorization voided');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setSettling(false);
      setSettle(null);
      await load(); // the payment may have changed even when the call failed
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (DESTRUCTIVE[form.orderStatus]) setConfirm(true); else save();
  };

  if (error) return <div className="page"><div className="empty"><h2>Couldn’t open this order</h2><p>{error}</p><Link className="btn" to="/orders">Back to orders</Link></div></div>;
  if (!order) return <div className="page"><p className="muted">Loading…</p></div>;

  const canUpdate = can('orders.updateStatus');
  const canSettle = can('orders.managePayments');
  const terminal = order.allowedTransitions.length === 0;
  const canIssue = can('vouchers.create') && ['PAID', 'PROCESSING', 'SENT', 'DELIVERED'].includes(order.orderStatus);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <Link to="/orders" className="back">Orders</Link>
          <h1 className="mono">{order.orderNumber}</h1>
          <p className="muted">Placed {dateTime(order.placedAt || order.createdAt)}</p>
        </div>
        <div className="head-actions"><StatusBadge value={order.paymentStatus} /><StatusBadge value={order.orderStatus} /></div>
      </header>

      <div className="grid-2 grid-wide-left">
        <div className="stack">
          <section className="panel">
            <div className="pad-head"><h2>Items</h2></div>
            <table className="table">
              <thead><tr><th>Item</th><th>Recipient</th><th className="num">Qty</th><th className="num">Total</th></tr></thead>
              <tbody>
                {order.items.map((it) => (
                  <tr key={it._id}>
                    <td><strong>{it.titleSnapshot}</strong><small className="block muted">{humanize(it.itemType)} · {money(it.unitPrice)} each</small></td>
                    <td>{it.recipient?.name || '—'}<small className="block muted">{it.recipient?.email}</small></td>
                    <td className="num">{it.quantity}</td>
                    <td className="num">{money(it.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="totals">
              <div><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
              {order.discountTotal > 0 && <div><dt>Discount{order.couponCode && <span className="mono"> ({order.couponCode})</span>}</dt><dd>−{money(order.discountTotal)}</dd></div>}
              {order.taxTotal > 0 && <div><dt>VAT</dt><dd>{money(order.taxTotal)}</dd></div>}
              <div className="total"><dt>Total</dt><dd>{money(order.total)}</dd></div>
            </dl>
          </section>

          <section className="panel">
            <div className="pad-head"><h2>Vouchers</h2>{canIssue && <Link className="btn btn-sm" to={`/vouchers/new?orderId=${order._id}`}>Issue voucher</Link>}</div>
            {order.vouchers.length === 0 ? <p className="muted pad">No vouchers issued for this order.</p> : (
              <table className="table">
                <tbody>
                  {order.vouchers.map((v) => (
                    <tr key={v._id}>
                      <td><Link className="mono" to={`/vouchers/${v._id}`}>{v.code}</Link></td>
                      <td>{v.recipientName}<small className="block muted">{v.recipientEmail}</small></td>
                      <td>Expires {date(v.expiryDate)}</td>
                      <td><StatusBadge value={v.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="panel pad">
            <h2>Payments</h2>
            {order.payments.length === 0 ? <p className="muted">No payment records.</p> : order.payments.map((p) => (
              <dl key={p._id} className="kv">
                <div><dt>Provider</dt><dd>{p.provider}{p.method ? ` · ${p.method}` : ''}{p.cardLast4 ? ` · •••• ${p.cardLast4}` : ''}</dd></div>
                <div><dt>Reference</dt><dd className="mono">{p.providerReference || '—'}</dd></div>
                <div><dt>Amount</dt><dd>{money(p.amount, p.currency)}{p.refundedAmount > 0 && ` (refunded ${money(p.refundedAmount)})`}</dd></div>
                <div><dt>Status</dt><dd><StatusBadge value={p.status} /></dd></div>
                {canSettle && p.status === 'AUTHORIZED' && p.method === 'DIRECT_CARD' && (
                  <div>
                    <dt>Authorization</dt>
                    <dd className="head-actions">
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => setSettle({ payment: p, op: 'capture' })}>Capture</button>
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => setSettle({ payment: p, op: 'void' })}>Void</button>
                    </dd>
                  </div>
                )}
              </dl>
            ))}
          </section>
        </div>

        <div className="stack">
          <section className="panel pad">
            <h2>Customer</h2>
            <dl className="kv">
              <div><dt>Name</dt><dd>{order.customer?.name || order.userId?.name}</dd></div>
              <div><dt>Email</dt><dd>{order.customer?.email || order.userId?.email}</dd></div>
              <div><dt>Phone</dt><dd>{order.customer?.phone || order.userId?.phone || '—'}</dd></div>
              <div><dt>Delivery</dt><dd>{humanize(order.deliveryMethod)}</dd></div>
            </dl>
          </section>

          {canUpdate && !terminal && (
            <section className="panel pad">
              <h2>Update order</h2>
              <form onSubmit={onSubmit} className="stack-sm">
                <div className="field">
                  <label className="field-label" htmlFor="os">Move to</label>
                  <select id="os" className="input" value={form.orderStatus} onChange={(e) => setForm({ ...form, orderStatus: e.target.value })}>
                    <option value="">Keep as {humanize(order.orderStatus).toLowerCase()}</option>
                    {order.allowedTransitions.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
                  </select>
                  {errors.orderStatus && <p className="field-error">{errors.orderStatus}</p>}
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="tn">Tracking number</label>
                  <input id="tn" className="input" value={form.trackingNumber} onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })} />
                  {errors.trackingNumber && <p className="field-error">{errors.trackingNumber}</p>}
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="nt">Internal note</label>
                  <textarea id="nt" className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                {form.orderStatus === 'REFUNDED' && <p className="notice">This only records the refund. Process the refund with the payment provider first.</p>}
                <button type="submit" className={`btn ${DESTRUCTIVE[form.orderStatus] ? 'btn-danger' : 'btn-primary'}`} disabled={saving}>
                  {saving ? 'Saving…' : DESTRUCTIVE[form.orderStatus] || (form.orderStatus ? `Mark as ${humanize(form.orderStatus).toLowerCase()}` : 'Save')}
                </button>
              </form>
            </section>
          )}

          <section className="panel pad">
            <h2>History</h2>
            {order.notes && <p className="note">{order.notes}</p>}
            <ol className="timeline">
              {[...order.statusHistory].reverse().map((h, i) => (
                <li key={i}>
                  <StatusBadge value={h.to} />
                  <span className="muted">{dateTime(h.at)} · {h.changedBy?.name || humanize(h.source)}</span>
                  {h.note && <p>{h.note}</p>}
                </li>
              ))}
              {order.statusHistory.length === 0 && <li className="muted">No status changes yet.</li>}
            </ol>
          </section>
        </div>
      </div>

      <ConfirmDialog open={confirm} title={`${DESTRUCTIVE[form.orderStatus]}?`}
        body="All active vouchers on this order will be cancelled. This status is final and can’t be reversed."
        confirmLabel={DESTRUCTIVE[form.orderStatus]} busy={saving} onConfirm={save} onCancel={() => setConfirm(false)} />
      <ConfirmDialog open={Boolean(settle)}
        title={settle?.op === 'void' ? 'Void this authorization?' : 'Capture this payment?'}
        body={settle?.op === 'void'
          ? `The ${settle ? money(settle.payment.amount, settle.payment.currency) : ''} held on the customer’s card is released and nothing is charged. This can’t be undone.`
          : `${settle ? money(settle.payment.amount, settle.payment.currency) : ''} is charged to the customer’s card and the order is marked paid. This can’t be undone, only refunded.`}
        confirmLabel={settle?.op === 'void' ? 'Void authorization' : 'Capture payment'} busy={settling}
        onConfirm={settleAuthorization} onCancel={() => setSettle(null)} />
    </div>
  );
}
