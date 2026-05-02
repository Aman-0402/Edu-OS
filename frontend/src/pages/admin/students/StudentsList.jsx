import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getStudents, deleteStudent } from '@/api/students'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'

const PAGE_SIZE = 20

export default function StudentsList() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [gender, setGender] = useState('')
  const [page, setPage] = useState(1)

  const params = { page, page_size: PAGE_SIZE }
  if (search) params.search = search
  if (gender) params.gender = gender

  const { data, isLoading } = useQuery({
    queryKey: ['students', params],
    queryFn: () => getStudents(params).then((r) => r.data),
  })

  const students = data?.results ?? data ?? []
  const count = data?.count ?? students.length

  // Reset to page 1 when filters change
  const setSearch_ = (v) => { setSearch(v); setPage(1) }
  const setGender_ = (v) => { setGender(v); setPage(1) }

  const deleteMut = useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  })

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle={`${count} student${count !== 1 ? 's' : ''} enrolled`}
        action={
          <Link to="/admin/students/new"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            + Add Student
          </Link>
        }
      />

      <div className="flex gap-3 mb-4">
        <input type="text" placeholder="Search by name, email, or admission no."
          value={search} onChange={(e) => setSearch_(e.target.value)}
          className="flex-1 max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={gender} onChange={(e) => setGender_(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Admission No.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Gender</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Guardian</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {students.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  {search || gender ? 'No students match your filters.' : 'No students yet. Add one to get started.'}
                </td></tr>
              )}
              {students.map((s) => (
                <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/admin/students/${s.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                      {s.full_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{s.admission_number}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.email}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{s.gender || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{s.guardian_name || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/admin/students/${s.id}`} className="text-xs text-blue-600 hover:text-blue-800 font-medium">View</Link>
                      <button onClick={() => { if (confirm(`Remove student "${s.full_name}"?`)) deleteMut.mutate(s.id) }}
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
