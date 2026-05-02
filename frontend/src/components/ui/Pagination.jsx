export default function Pagination({ count, page, pageSize = 20, onChange }) {
  if (!count || count <= pageSize) return null

  const totalPages = Math.ceil(count / pageSize)
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, count)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
      <p className="text-sm text-gray-500">
        Showing <span className="font-medium">{from}–{to}</span> of <span className="font-medium">{count}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 disabled:cursor-not-allowed"
        >
          ← Prev
        </button>
        <span className="px-3 py-1.5 text-sm text-gray-600">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 disabled:cursor-not-allowed"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
