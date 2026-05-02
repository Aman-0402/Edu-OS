export default function Pagination({ count, page, pageSize = 20, onChange }) {
  if (!count || count <= pageSize) return null

  const totalPages = Math.ceil(count / pageSize)
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, count)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-white">
      <p className="text-sm text-slate-500">
        Showing <span className="font-medium text-slate-700">{from}–{to}</span> of <span className="font-medium text-slate-700">{count}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 disabled:cursor-not-allowed text-slate-600 transition-colors"
        >
          ← Prev
        </button>
        <span className="px-3 py-1.5 text-sm text-slate-500">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 disabled:cursor-not-allowed text-slate-600 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
