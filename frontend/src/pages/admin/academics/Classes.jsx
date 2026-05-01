import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClasses, createClass, updateClass, deleteClass } from '@/api/academics'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'

const EMPTY_FORM = { name: '', numeric_value: '' }

export default function Classes() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => getClasses().then((r) => r.data),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['classes'] })

  const createMut = useMutation({
    mutationFn: createClass,
    onSuccess: () => { invalidate(); close() },
    onError: (e) => setError(e.response?.data?.errors?.detail || 'Failed to create'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateClass(id, data),
    onSuccess: () => { invalidate(); close() },
    onError: (e) => setError(e.response?.data?.errors?.detail || 'Failed to update'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteClass,
    onSuccess: invalidate,
  })

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowModal(true)
  }

  function openEdit(cls) {
    setEditing(cls)
    setForm({ name: cls.name, numeric_value: cls.numeric_value })
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
    const payload = { ...form, numeric_value: parseInt(form.numeric_value, 10) }
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
        title="Classes"
        subtitle="Define grade levels (e.g. Class 1, Class 10)"
        action={
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            + Add Class
          </button>
        }
      />

      {isLoading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Class Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Numeric Value</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {classes.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                    No classes yet. Add a class to get started.
                  </td>
                </tr>
              )}
              {classes.map((cls) => (
                <tr key={cls.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{cls.name}</td>
                  <td className="px-4 py-3 text-gray-600">{cls.numeric_value}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(cls)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${cls.name}"?`)) deleteMut.mutate(cls.id)
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
        <Modal title={editing ? 'Edit Class' : 'Add Class'} onClose={close}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Class 1"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Numeric Value</label>
              <input
                type="number"
                required
                min={1}
                placeholder="e.g. 1"
                value={form.numeric_value}
                onChange={(e) => setForm({ ...form, numeric_value: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Used for sorting classes in correct order</p>
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
