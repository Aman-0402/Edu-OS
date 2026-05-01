import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getClasses,
  getSections,
  createSection,
  updateSection,
  deleteSection,
  assignTeacher,
} from '@/api/academics'
import { useAcademicYear } from '@/contexts/AcademicYearContext'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import apiClient from '@/api/client'

const EMPTY_FORM = { name: '', class_group: '', capacity: '' }
const EMPTY_TEACHER_FORM = { class_teacher_id: '' }

export default function Sections() {
  const qc = useQueryClient()
  const { years, selectedYearId, setSelectedYearId } = useAcademicYear()

  const [filterClass, setFilterClass] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showTeacherModal, setShowTeacherModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [assigningSection, setAssigningSection] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [teacherForm, setTeacherForm] = useState(EMPTY_TEACHER_FORM)
  const [error, setError] = useState('')

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => getClasses().then((r) => r.data),
  })

  const { data: teachers = [] } = useQuery({
    queryKey: ['teacherUsers'],
    queryFn: () => apiClient.get('/users/', { params: { role: 'teacher' } }).then((r) => r.data.results ?? r.data),
  })

  const sectionsParams = {}
  if (selectedYearId) sectionsParams.academic_year = selectedYearId
  if (filterClass) sectionsParams.class_group = filterClass

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ['sections', sectionsParams],
    queryFn: () => getSections(sectionsParams).then((r) => r.data),
    enabled: !!selectedYearId,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['sections'] })

  const createMut = useMutation({
    mutationFn: createSection,
    onSuccess: () => { invalidate(); closeSection() },
    onError: (e) => setError(e.response?.data?.errors?.detail || 'Failed to create'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateSection(id, data),
    onSuccess: () => { invalidate(); closeSection() },
    onError: (e) => setError(e.response?.data?.errors?.detail || 'Failed to update'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteSection,
    onSuccess: invalidate,
  })

  const assignMut = useMutation({
    mutationFn: ({ id, teacher_id }) => assignTeacher(id, teacher_id),
    onSuccess: () => { invalidate(); closeTeacher() },
    onError: (e) => setError(e.response?.data?.errors?.detail || 'Failed to assign teacher'),
  })

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowModal(true)
  }

  function openEdit(sec) {
    setEditing(sec)
    setForm({
      name: sec.name,
      class_group: sec.class_group,
      capacity: sec.capacity ?? '',
    })
    setError('')
    setShowModal(true)
  }

  function openAssignTeacher(sec) {
    setAssigningSection(sec)
    setTeacherForm({ class_teacher_id: sec.class_teacher ?? '' })
    setError('')
    setShowTeacherModal(true)
  }

  function closeSection() {
    setShowModal(false)
    setEditing(null)
  }

  function closeTeacher() {
    setShowTeacherModal(false)
    setAssigningSection(null)
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const payload = {
      name: form.name,
      class_group: parseInt(form.class_group, 10),
      academic_year: selectedYearId,
      ...(form.capacity ? { capacity: parseInt(form.capacity, 10) } : {}),
    }
    if (editing) {
      updateMut.mutate({ id: editing.id, data: payload })
    } else {
      createMut.mutate(payload)
    }
  }

  function handleAssignTeacher(e) {
    e.preventDefault()
    setError('')
    assignMut.mutate({
      id: assigningSection.id,
      teacher_id: teacherForm.class_teacher_id || null,
    })
  }

  const isPending = createMut.isPending || updateMut.isPending

  return (
    <div>
      <PageHeader
        title="Sections"
        subtitle="Manage class sections and assign class teachers"
        action={
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            disabled={!selectedYearId}
          >
            + Add Section
          </button>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={selectedYearId ?? ''}
          onChange={(e) => setSelectedYearId(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Year</option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>{y.name}</option>
          ))}
        </select>
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

      {!selectedYearId ? (
        <div className="text-sm text-gray-400 py-8 text-center">Select an academic year to view sections.</div>
      ) : isLoading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Section</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Class</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Class Teacher</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Capacity</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sections.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No sections for this year/class. Add one to get started.
                  </td>
                </tr>
              )}
              {sections.map((sec) => (
                <tr key={sec.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{sec.full_name ?? `${sec.class_group_name} - ${sec.name}`}</td>
                  <td className="px-4 py-3 text-gray-600">{sec.class_group_name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {sec.class_teacher_name ?? (
                      <span className="text-gray-400 italic">Not assigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{sec.capacity ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openAssignTeacher(sec)}
                        className="text-xs text-green-600 hover:text-green-800 font-medium"
                      >
                        Assign Teacher
                      </button>
                      <button
                        onClick={() => openEdit(sec)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete section "${sec.full_name ?? sec.name}"?`)) deleteMut.mutate(sec.id)
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
        <Modal title={editing ? 'Edit Section' : 'Add Section'} onClose={closeSection}>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Section Name</label>
              <input
                type="text"
                required
                placeholder="e.g. A"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                type="number"
                min={1}
                placeholder="e.g. 40"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeSection}
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

      {showTeacherModal && assigningSection && (
        <Modal title={`Assign Teacher — ${assigningSection.full_name ?? assigningSection.name}`} onClose={closeTeacher}>
          <form onSubmit={handleAssignTeacher} className="space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class Teacher</label>
              <select
                value={teacherForm.class_teacher_id}
                onChange={(e) => setTeacherForm({ class_teacher_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None (unassign)</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.first_name} {t.last_name} ({t.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeTeacher}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={assignMut.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {assignMut.isPending ? 'Saving...' : 'Assign'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
