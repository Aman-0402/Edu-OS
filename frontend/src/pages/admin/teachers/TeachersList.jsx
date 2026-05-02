import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getTeachers, deleteTeacher } from '@/api/teachers'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import { confirmDelete } from '@/lib/alerts'
import { toastSuccess, toastError } from '@/lib/toast'

const PAGE_SIZE = 20

export default function TeachersList() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const params = { page, page_size: PAGE_SIZE }
  if (search) params.search = search

  const { data, isLoading } = useQuery({
    queryKey: ['teachers', params],
    queryFn: () => getTeachers(params).then((r) => r.data),
  })

  const teachers = data?.results ?? data ?? []
  const count = data?.count ?? teachers.length

  const setSearch_ = (v) => { setSearch(v); setPage(1) }

  const deleteMut = useMutation({
    mutationFn: deleteTeacher,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teachers'] }); toastSuccess('Teacher removed') },
    onError: () => toastError('Failed to remove teacher'),
  })

  return (
    <div>
      <PageHeader
        title="Teachers"
        subtitle={`${count} teacher${count !== 1 ? 's' : ''} on staff`}
        action={
          <Link to="/admin/teachers/new"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            + Add Teacher
          </Link>
        }
      />

      <div className="mb-4">
        <input type="text" placeholder="Search by name, email, or employee ID"
          value={search} onChange={(e) => setSearch_(e.target.value)}
          className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Employee ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Qualification</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {teachers.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  {search ? 'No teachers match your search.' : 'No teachers yet. Add one to get started.'}
                </td></tr>
              )}
              {teachers.map((t) => (
                <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/admin/teachers/${t.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                      {t.full_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{t.employee_id}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.email}</td>
                  <td className="px-4 py-3 text-gray-600">{t.qualification || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{t.joining_date || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/admin/teachers/${t.id}`} className="text-xs text-blue-600 hover:text-blue-800 font-medium">View</Link>
                      <button onClick={async () => { if (await confirmDelete(`Remove teacher "${t.full_name}"?`)) deleteMut.mutate(t.id) }}
                        className="text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination count={count} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      )}
    </div>
  )
}
