import { humanize } from '../utils/format';

const TONES = {
  ACTIVE: 'good', PUBLISHED: 'good', PAID: 'good', DELIVERED: 'good', REDEEMED: 'info', AUTHORIZED: 'info',
  PENDING: 'warn', DRAFT: 'neutral', PROCESSING: 'info', SENT: 'info',
  INACTIVE: 'neutral', ARCHIVED: 'neutral', EXPIRED: 'neutral', EXCHANGED: 'info',
  CANCELLED: 'bad', REFUNDED: 'bad', PARTIALLY_REFUNDED: 'warn', FAILED: 'bad', SUSPENDED: 'bad',
};

export default function StatusBadge({ value }) {
  if (!value) return <span className="muted">—</span>;
  return <span className={`badge badge-${TONES[value] || 'neutral'}`}>{humanize(value)}</span>;
}
