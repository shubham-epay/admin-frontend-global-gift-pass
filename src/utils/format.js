export const TZ = 'Asia/Dubai';
const TZ_OFFSET = '+04:00'; // UAE has no daylight saving time

const moneyFmt = new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 2 });
export const money = (v, currency = 'AED') => {
  if (v == null || v === '') return '—';
  if (currency === 'AED') return moneyFmt.format(v);
  return new Intl.NumberFormat('en-AE', { style: 'currency', currency }).format(v);
};

const dateFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const date = (v) => (v ? dateFmt.format(new Date(v)) : '—');
export const dateTime = (v) => (v ? dateTimeFmt.format(new Date(v)) : '—');

/** ISO -> "YYYY-MM-DD" in Dubai time, for <input type="date"> */
export const toDateInput = (v) => (v ? new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(v)) : '');
/** ISO -> "YYYY-MM-DDTHH:mm" in Dubai time, for <input type="datetime-local"> */
export const toDateTimeInput = (v) => {
  if (!v) return '';
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(v)).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};
export const fromDateInput = (v, endOfDay = false) => (v ? `${v}T${endOfDay ? '23:59:59' : '00:00:00'}${TZ_OFFSET}` : null);
export const fromDateTimeInput = (v) => (v ? `${v}:00${TZ_OFFSET}` : null);

export const humanize = (s) => (s ? String(s).replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : '');
export const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
export const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
