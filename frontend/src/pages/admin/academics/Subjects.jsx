import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClasses, getSubjects, createSubject, updateSubject, deleteSubject } from '@/api/academics'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import { confirmDelete } from '@/lib/alerts'
import { toastSuccess, toastError } from '@/lib/toast'

const EMPTY_FORM = { name: '', code: '', class_group: '' }

export default function Subjects() {
  const qc = useQueryClient()
  const [filterClass, setFilterClass] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => getClasses().then((r) => r.data),
  })

  const subjectParams = filterClass ? { class_group: filterClass } : {}

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['subjects', subjectParams],
    queryFn: () => getSubjects(subjectParams).then((r) => r.data),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['subjects'] })

  const createMut = useMutation({
    mutationFn: createSubject,
    onSuccess: () => { invalidate(); close(); toastSuccess('Subject created') },
    onError: (e) => { const msg = e.response?.data?.errors?.detail || 'Failed to create'; setError(msg); toastError(msg) },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateSubject(id, data),
    onSuccess: () => { invalidate(); close(); toastSuccess('Subject updated') },
    onError: (e) => { const msg = e.response?.data?.errors?.detail || 'Failed to update'; setError(msg); toastError(msg) },
  })

  const deleteMut = useMutation({
    mutationFn: deleteSubject,
    onSuccess: () => { invalidate(); toastSuccess('Subject deleted') },
    onError: () => toastError('Failed to delete subject'),
  })

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowModal(true)
  }

  function openEdit(sub) {
    setEditing(sub)
    setForm({ name: sub.name, code: sub.code, class_group: sub.class_group })
    setError('')
    setShowModal(true)
  }

  function close() {
    setShowModal(false)
    setEditing(null)
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const payload = { ...form, class_group: parseInt(form.class_group, 10) }
    if (editing) {
      updateMut.mutate({ id: editing.id, data: payload })
    } else {
      createMut.mutate(payload)
    }
  }

  const isPending = createMut.isPending || updateMut.isPending

  return (
    <div>
      <PageHeader
        title="Subjects"
        subtitle="Define subjects per class"
        action={
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            + Add Subject
          </button>
        }
      />

      {/* Filter */}
      <div className="mb-4">
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Subject Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Class</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {subjects.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    No subjects yet. Add a subject to get started.
                  </td>
                </tr>
              )}
              {subjects.map((sub) => (
                <tr key={sub.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{sub.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{sub.code}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{sub.class_group_name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(sub)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          if (await confirmDelete(`Delete "${sub.name}"?`)) deleteMut.mutate(sub.id)
                        }}
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Edit Subject' : 'Add Subject'} onClose={close}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <select
                required
                value={form.class_group}
                onChange={(e) => setForm({ ...form, class_group: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Mathematics"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code</label>
              <input
                type="text"
                required
                placeholder="e.g. MATH-01"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Must be unique within the class</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={close}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
