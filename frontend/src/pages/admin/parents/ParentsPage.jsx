import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getParents, createParent, deleteParent, getLinks, createLink, deleteLink } from '@/api/parents'
import { getStudents } from '@/api/students'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'

const EMPTY_PARENT = { email: '', first_name: '', last_name: '', phone: '', password: '', occupation: '', address: '' }
const EMPTY_LINK = { parent: '', student: '', relationship: 'guardian', is_primary: false }

export default function ParentsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [form, setForm] = useState(EMPTY_PARENT)
  const [linkForm, setLinkForm] = useState(EMPTY_LINK)
  const [createErrors, setCreateErrors] = useState({})
  const [linkError, setLinkError] = useState('')

  const params = {}
  if (search) params.search = search

  const { data: parents = [], isLoading } = useQuery({
    queryKey: ['parents', params],
    queryFn: () => getParents(params).then((r) => r.data),
  })

  const { data: links = [] } = useQuery({
    queryKey: ['parentLinks'],
    queryFn: () => getLinks({}).then((r) => r.data),
  })

  const { data: students = [] } = useQuery({
    queryKey: ['students', {}],
    queryFn: () => getStudents({}).then((r) => r.data),
  })

  const createMut = useMutation({
    mutationFn: createParent,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['parents'] }); setShowCreateModal(false); setForm(EMPTY_PARENT) },
    onError: (e) => setCreateErrors(e.response?.data ?? {}),
  })

  const deleteMut = useMutation({
    mutationFn: deleteParent,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parents'] }),
  })

  const linkMut = useMutation({
    mutationFn: createLink,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['parentLinks'] }); setShowLinkModal(false); setLinkForm(EMPTY_LINK) },
    onError: (e) => setLinkError(e.response?.data?.non_field_errors?.[0] ?? 'Failed to create link'),
  })

  const unlinkMut = useMutation({
    mutationFn: deleteLink,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parentLinks'] }),
  })

  function fieldErr(f) { return createErrors[f]?.[0] ?? createErrors[f] }

  // Build parent→children map for display
  const childrenByParent = {}
  links.forEach((l) => {
    if (!childrenByParent[l.parent]) childrenByParent[l.parent] = []
    childrenByParent[l.parent].push(l)
  })

  return (
    <div>
      <PageHeader
        title="Parents"
        subtitle={`${parents.length} parent account${parents.length !== 1 ? 's' : ''}`}
        action={
          <div className="flex gap-2">
            <button onClick={() => { setShowLinkModal(true); setLinkError('') }}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200">
              Link Parent ↔ Student
            </button>
            <button onClick={() => { setShowCreateModal(true); setCreateErrors({}) }}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
              + Add Parent
            </button>
          </div>
        }
      />

      <div className="mb-4">
        <input type="text" placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {isLoading ? <p className="text-sm text-gray-500">Loading...</p> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Children</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {parents.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No parents yet.</td></tr>}
              {parents.map((p) => {
                const children = childrenByParent[p.id] ?? []
                return (
                  <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.full_name}</td>
                    <td className="px-4 py-3 text-gray-600">{p.email}</td>
                    <td className="px-4 py-3 text-gray-600">{p.phone || '—'}</td>
                    <td className="px-4 py-3">
                      {children.length === 0
                        ? <span className="text-gray-400 text-xs">None linked</span>
                        : <div className="flex flex-wrap gap-1">
                            {children.map((l) => (
                              <span key={l.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">
                                {l.student_name}
                                <button onClick={() => { if (confirm('Remove this link?')) unlinkMut.mutate(l.id) }}
                                  className="text-blue-400 hover:text-red-500 leading-none font-bold">×</button>
                              </span>
                            ))}
                          </div>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => { if (confirm(`Remove parent "${p.full_name}"?`)) deleteMut.mutate(p.id) }}
                        className="text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Parent Modal */}
      {showCreateModal && (
        <Modal title="Add Parent" onClose={() => setShowCreateModal(false)}>
          <form onSubmit={(e) => { e.preventDefault(); setCreateErrors({}); createMut.mutate(form) }} className="space-y-3">
            {createErrors.non_field_errors && <p className="text-sm text-red-600">{createErrors.non_field_errors[0]}</p>}
            <div className="grid grid-cols-2 gap-3">
              {[['First Name','first_name'],['Last Name','last_name'],['Email','email'],['Phone','phone']].map(([label, field]) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={field === 'email' ? 'email' : 'text'} value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErr(field) ? 'border-red-400' : 'border-gray-300'}`} />
                  {fieldErr(field) && <p className="text-xs text-red-600 mt-0.5">{fieldErr(field)}</p>}
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErr('password') ? 'border-red-400' : 'border-gray-300'}`} />
                {fieldErr('password') && <p className="text-xs text-red-600 mt-0.5">{fieldErr('password')}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                <input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button type="submit" disabled={createMut.isPending} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {createMut.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Link Modal */}
      {showLinkModal && (
        <Modal title="Link Parent to Student" onClose={() => setShowLinkModal(false)}>
          <form onSubmit={(e) => { e.preventDefault(); setLinkError(''); linkMut.mutate({ ...linkForm, parent: parseInt(linkForm.parent), student: parseInt(linkForm.student) }) }} className="space-y-4">
            {linkError && <p className="text-sm text-red-600">{linkError}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent</label>
              <select required value={linkForm.parent} onChange={(e) => setLinkForm({ ...linkForm, parent: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select parent</option>
                {parents.map((p) => <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
              <select required value={linkForm.student} onChange={(e) => setLinkForm({ ...linkForm, student: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select student</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.admission_number})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
              <select value={linkForm.relationship} onChange={(e) => setLinkForm({ ...linkForm, relationship: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="father">Father</option>
                <option value="mother">Mother</option>
                <option value="guardian">Guardian</option>
                <option value="other">Other</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={linkForm.is_primary} onChange={(e) => setLinkForm({ ...linkForm, is_primary: e.target.checked })} className="w-4 h-4 rounded" />
              <span className="text-sm text-gray-700">Primary contact</span>
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setShowLinkModal(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button type="submit" disabled={linkMut.isPending} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {linkMut.isPending ? 'Linking...' : 'Create Link'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
