import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { money, dateTime, date, humanize } from '../utils/format';
import { ORDER_STATUS, VOUCHER_STATUS } from '../config/resources';
import Icon from '../components/Icon';

/** Eases a number from 0 to `value` once it changes (respects reduced motion). */
function useCountUp(value, ms = 900) {
  const [shown, setShown] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    const target = Number(value) || 0;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setShown(target); return undefined; }
    const start = performance.now();
    const tick = (t) => {
      const k = Math.min((t - start) / ms, 1);
      setShown(target * (1 - (1 - k) ** 3));
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, ms]);
  return shown;
}

function CountUp({ value, format = (n) => Math.round(n).toLocaleString('en-AE') }) {
  return <>{format(useCountUp(value))}</>;
}

function Kpi({ icon, label, value, format, to, tone = 'emerald', i }) {
  const body = (
    <>
      <span className={`kpi-icon tone-${tone}`}><Icon name={icon} size={20} /></span>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value"><CountUp value={value} format={format} /></span>
    </>
  );
  return to
    ? <Link to={to} className="kpi panel is-link rise" style={{ '--i': i }}>{body}<Icon name="chevronRight" size={16} className="kpi-go" /></Link>
    : <div className="kpi panel rise" style={{ '--i': i }}>{body}</div>;
}

function SalesChart({ points }) {
  const max = Math.max(...points.map((p) => p.revenue), 1);
  const w = 100 / points.length;
  return (
    <svg className="chart" viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label="Revenue per day">
      {points.map((p, i) => {
        const h = (p.revenue / max) * 38;
        return (
          <rect key={p.date} style={{ '--i': i }} x={i * w + w * 0.15} y={40 - Math.max(h, p.revenue ? 0.6 : 0.25)} width={w * 0.7} height={Math.max(h, p.revenue ? 0.6 : 0.25)} className={p.revenue ? 'bar' : 'bar bar-zero'}>
            <title>{`${date(p.date)}: ${money(p.revenue)} · ${p.orders} orders`}</title>
          </rect>
        );
      })}
    </svg>
  );
}

function Breakdown({ title, counts, order, link }) {
  const total = order.reduce((n, k) => n + (counts[k] || 0), 0);
  return (
    <section className="panel pad rise">
      <h2>{title}</h2>
      {total === 0 ? <p className="muted">Nothing yet.</p> : (
        <ul className="breakdown">
          {order.filter((k) => counts[k]).map((k) => (
            <li key={k}>
              <Link to={`${link}?${link === '/orders' ? 'orderStatus' : 'status'}=${k}`}>{humanize(k)}</Link>
              <span className="breakdown-bar"><span style={{ width: `${(counts[k] / total) * 100}%` }} /></span>
              <span className="num">{counts[k]}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="kpis">{Array.from({ length: 6 }, (_, i) => <div key={i} className="kpi panel"><span className="skeleton" style={{ width: 40, height: 40, borderRadius: 12 }} /><span className="skeleton" style={{ width: '60%', height: 12 }} /><span className="skeleton" style={{ width: '45%', height: 22 }} /></div>)}</div>
      <div className="panel pad"><span className="skeleton" style={{ height: 180 }} /></div>
    </>
  );
}

export default function Dashboard() {
  const { user, can } = useAuth();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    api.get('/admin/dashboard/summary', { params: { days } }).then((r) => setData(r.data.data)).catch((e) => setError(errorMessage(e)));
  }, [days]);

  return (
    <div className="page">
      <header className="page-head">
        <div><h1>Good to see you, {user?.name?.split(' ')[0]}</h1><p className="muted">Paid orders and activity, UAE time.</p></div>
        <select className="input" value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Date range">
          <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
        </select>
      </header>
      {error && <div className="notice notice-error">{error}</div>}
      {!data ? <DashboardSkeleton /> : (
        <>
          <div className="kpis">
            <Kpi i={0} icon="orders" label="Paid orders" value={data.totals.paidOrders} to={can('orders.read') ? '/orders?orderStatus=PAID' : undefined} tone="info" />
            <Kpi i={1} icon="trend" label="Average order" value={data.totals.averageOrderValue} format={(n) => money(n)} tone="saffron" />
            <Kpi i={2} icon="box" label="Live products" value={data.totals.activeProducts} to={can('products.read') ? '/products?status=ACTIVE' : undefined} />
            <Kpi i={3} icon="users" label="Customers" value={data.totals.customers} to={can('users.manage') ? '/customers' : undefined} tone="info" />
            <Kpi i={4} icon="percent" label="Running coupons" value={data.totals.activeCoupons} to={can(['coupons.read', 'coupons.create', 'coupons.update']) ? '/coupons?status=ACTIVE' : undefined} tone="saffron" />
            <Kpi i={5} icon="ticket" label="Expiring in 30 days" value={data.totals.vouchersExpiringIn30Days} to={can('vouchers.read') ? '/vouchers?expiringInDays=30' : undefined} tone="danger" />
          </div>

          <section className="panel pad revenue rise" style={{ '--i': 3 }}>
            <div className="revenue-head">
              <div>
                <p className="muted">Revenue, last {data.rangeDays} days</p>
                <p className="revenue-figure"><CountUp value={data.totals.revenue} format={(n) => money(n)} /></p>
              </div>
              <span className="badge badge-good">{data.totals.paidOrders} paid orders</span>
            </div>
            <SalesChart points={data.salesByDay} />
            <div className="chart-axis muted"><span>{date(data.salesByDay[0]?.date)}</span><span>{date(data.salesByDay.at(-1)?.date)}</span></div>
          </section>

          <div className="grid-2">
            <Breakdown title="Orders by status" counts={data.ordersByStatus} order={ORDER_STATUS} link="/orders" />
            <Breakdown title="Vouchers by status" counts={data.vouchersByStatus} order={VOUCHER_STATUS} link="/vouchers" />
          </div>

          <div className="grid-2 grid-wide-left">
            <section className="panel rise">
              <div className="pad-head"><h2>Latest orders</h2>{can('orders.read') && <Link to="/orders">All orders</Link>}</div>
              {data.recentOrders.length === 0 ? <p className="muted pad">No orders yet.</p> : (
                <table className="table">
                  <tbody>
                    {data.recentOrders.map((o) => (
                      <tr key={o._id}>
                        <td><Link to={`/orders/${o._id}`} className="mono">{o.orderNumber}</Link><small className="block muted">{dateTime(o.createdAt)}</small></td>
                        <td>{o.customer?.name}</td>
                        <td className="num">{money(o.total)}</td>
                        <td><StatusBadge value={o.orderStatus} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
            <section className="panel pad rise">
              <h2>Top experiences</h2>
              {data.topProducts.length === 0 ? <p className="muted">No sales in this period.</p> : (
                <ol className="top-list">
                  {data.topProducts.map((p, i) => (
                    <li key={p._id}><span className="rank">{i + 1}</span><span className="grow">{p.title}<small className="block muted">{p.units} sold</small></span><span className="num">{money(p.revenue)}</span></li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
