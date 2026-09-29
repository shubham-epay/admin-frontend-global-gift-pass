import Icon from './Icon';

export default function Pagination({ meta, onPage }) {
  if (!meta || meta.total === 0) return null;
  const { page, totalPages, total, limit } = meta;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <div className="pagination">
      <span className="muted">{from}–{to} of {total}</span>
      <div className="pagination-buttons">
        <button type="button" className="btn btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><Icon name="chevronLeft" size={15} />Previous</button>
        <span className="muted">Page {page} of {totalPages}</span>
        <button type="button" className="btn btn-sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">Next<Icon name="chevronRight" size={15} /></button>
      </div>
    </div>
  );
}
