import { money } from '../utils/format';

/**
 * Commercial facts of a product, read from its custom fields and denominations:
 * denominations / open amount, delivery type, product type and margin (a range when it differs per denomination).
 */
const findAll = (product, rx) => {
  const own = (product.customFields || []).filter((f) => rx.test(f.label)).map((f) => f.value);
  const perDenomination = (product.denominations || []).flatMap((d) => (d.attributes || []).filter((a) => rx.test(a.label)).map((a) => a.value));
  return [...own, ...perDenomination].filter((v) => v != null && v !== '');
};
const uniq = (list) => [...new Set(list)];

export function productFacts(p) {
  const margins = findAll(p, /^margin$/i);
  const pct = margins.map((m) => parseFloat(String(m).replace('%', ''))).filter((n) => !Number.isNaN(n));
  let margin = null;
  if (pct.length) {
    const lo = Math.min(...pct); const hi = Math.max(...pct);
    const f = (n) => `${Number(n.toFixed(2))}%`;
    margin = { text: lo === hi ? f(lo) : `${f(lo)} – ${f(hi)}`, negative: lo < 0 };
  } else if (margins.length) margin = { text: uniq(margins).join(', ') };
  const values = (p.denominations || []).map((d) => d.value);
  return {
    denominations: values,
    openAmount: p.amountMin != null && p.amountMax != null ? [p.amountMin, p.amountMax] : null,
    delivery: uniq(findAll(p, /^delivery( type)?$/i)),
    type: uniq(findAll(p, /^product type$/i)),
    margin,
  };
}

/** Price cell: "USD 10 – 200", "AED 1 – 5,000 (any amount)" or the plain price. */
export function PriceCell({ product: p }) {
  const { denominations, openAmount } = productFacts(p);
  if (denominations.length > 1) {
    return <span className="cell-title"><strong>{money(denominations[0], p.currency)} – {money(denominations[denominations.length - 1], p.currency)}</strong><small>{denominations.length} denominations</small></span>;
  }
  if (openAmount) {
    return <span className="cell-title"><strong>{money(openAmount[0], p.currency)} – {money(openAmount[1], p.currency)}</strong><small>Customer chooses</small></span>;
  }
  return <span>{money(p.salePrice, p.currency)}{p.salePrice < p.price && <s className="muted strike">{money(p.price, p.currency)}</s>}</span>;
}

/** Compact chips for the product list. */
export function FactChips({ product }) {
  const f = productFacts(product);
  const chips = [
    ...f.delivery.map((d) => ({ k: `d-${d}`, label: 'Delivery', value: d, tone: 'info' })),
    ...f.type.map((t) => ({ k: `t-${t}`, label: 'Type', value: t, tone: 'neutral' })),
    ...(f.margin ? [{ k: 'm', label: 'Margin', value: f.margin.text, tone: f.margin.negative ? 'bad' : 'good' }] : []),
  ];
  if (!chips.length) return <span className="muted">—</span>;
  return (
    <span className="fact-chips">
      {chips.map((c) => <span key={c.k} className={`fact-chip tone-${c.tone}`}><small>{c.label}</small>{c.value}</span>)}
    </span>
  );
}

/** Summary card shown at the top of the product edit page. */
export function FactsSummary({ product }) {
  if (!product) return null;
  const f = productFacts(product);
  const items = [
    ['Denominations', f.denominations.length ? `${f.denominations.length} · ${money(f.denominations[0], product.currency)} – ${money(f.denominations[f.denominations.length - 1], product.currency)}`
      : f.openAmount ? `Any amount ${money(f.openAmount[0], product.currency)} – ${money(f.openAmount[1], product.currency)}` : 'Single price'],
    ['Delivery type', f.delivery.join(', ') || '—'],
    ['Product type', f.type.join(', ') || '—'],
    ['Margin', f.margin?.text || '—', f.margin?.negative ? 'bad' : ''],
  ];
  return (
    <section className="facts-summary panel">
      {items.map(([label, value, tone]) => (
        <div key={label}><span>{label}</span><strong className={tone === 'bad' ? 'danger-text' : undefined}>{value}</strong></div>
      ))}
    </section>
  );
}
