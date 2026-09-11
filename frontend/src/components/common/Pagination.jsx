export default function Pagination({ count, page, onChange, pageSize = 10 }) {
  const totalPages = Math.ceil(count / pageSize) || 1
  if (totalPages <= 1) return null

  const pages = []
  const delta = 2
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
    pages.push(i)
  }

  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      <p className="text-neutral-500 text-xs">
        Showing page <strong>{page}</strong> of <strong>{totalPages}</strong>
        {count != null && ` (${count} records)`}
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(1)} disabled={page === 1}
          className="px-2.5 py-1.5 rounded border border-neutral-300 text-neutral-600
                     hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs">
          «
        </button>
        <button onClick={() => onChange(page - 1)} disabled={page === 1}
          className="px-2.5 py-1.5 rounded border border-neutral-300 text-neutral-600
                     hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs">
          ‹
        </button>
        {pages.map(p => (
          <button key={p} onClick={() => onChange(p)}
            className={`px-3 py-1.5 rounded border text-xs font-medium transition-colors
              ${p === page
                ? 'bg-primary-600 border-primary-600 text-white'
                : 'border-neutral-300 text-neutral-600 hover:bg-neutral-50'
              }`}>
            {p}
          </button>
        ))}
        <button onClick={() => onChange(page + 1)} disabled={page >= totalPages}
          className="px-2.5 py-1.5 rounded border border-neutral-300 text-neutral-600
                     hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs">
          ›
        </button>
        <button onClick={() => onChange(totalPages)} disabled={page >= totalPages}
          className="px-2.5 py-1.5 rounded border border-neutral-300 text-neutral-600
                     hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs">
          »
        </button>
      </div>
    </div>
  )
}
