import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTeacher, updateTeacher, getAssignments, createAssignment, deleteAssignment } from '@/api/teachers'
import { getAcademicYears, getSections, getSubjects } from '@/api/academics'
import { useAcademicYear } from '@/contexts/AcademicYearContext'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'

export default function TeacherDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const { selectedYearId } = useAcademicYear()

  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [assignModal, setAssignModal] = useState(false)
  const [assignForm, setAssignForm] = useState({ academic_year: '', section: '', subject: '' })
  const [assignError, setAssignError] = useState('')

  const { data: teacher, isLoading } = useQuery({
    queryKey: ['teacher', id],
    queryFn: () => getTeacher(id).then((r) => r.data),
  })

  useEffect(() => {
    if (teacher) {
      setEditForm({
        first_name: teacher.first_name, last_name: teacher.last_name,
        phone: teacher.phone ?? '', qualification: teacher.qualification ?? '',
        specialization: teacher.specialization ?? '', joining_date: teacher.joining_date ?? '',
      })
    }
  }, [teacher])

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments', { teacher: id }],
    queryFn: () => getAssignments({ teacher: id }).then((r) => r.data),
  })

  const { data: years = [] } = useQuery({
    queryKey: ['academicYears'],
    queryFn: () => getAcademicYears().then((r) => r.data),
  })

  const { data: sections = [] } = useQuery({
    queryKey: ['sections', { academic_year: assignForm.academic_year }],
    queryFn: () => getSections({ academic_year: assignForm.academic_year }).then((r) => r.data),
    enabled: !!assignForm.academic_year,
  })

  const selectedSection = sections.find((s) => String(s.id) === String(assignForm.section))

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', { class_group: selectedSection?.class_group }],
    queryFn: () => getSubjects({ class_group: selectedSection.class_group }).then((r) => r.data),
    enabled: !!selectedSection,
  })

  const updateMut = useMutation({
    mutationFn: (data) => updateTeacher(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher', id] })
      setEditMode(false)
    },
  })

  const assignMut = useMutation({
    mutationFn: createAssignment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] })
      setAssignModal(false)
      setAssignForm({ academic_year: '', section: '', subject: '' })
      setAssignError('')
    },
    onError: (e) => setAssignError(
      e.response?.data?.non_field_errors?.[0] ?? e.response?.data?.detail ?? 'Failed to assign'
    ),
  })

  const removeMut = useMutation({
    mutationFn: deleteAssignment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  })

  if (isLoading) return <div className="text-sm text-gray-500">Loading...</div>
  if (!teacher) return <div className="text-sm text-red-500">Teacher not found.</div>

  function handleUpdate(e) {
    e.preventDefault()
    updateMut.mutate(editForm)
  }

  function handleAssign(e) {
    e.preventDefault()
    setAssignError('')
    assignMut.mutate({
      teacher: parseInt(id, 10),
      section: parseInt(assignForm.section, 10),
      subject: parseInt(assignForm.subject, 10),
      academic_year: parseInt(assignForm.academic_year, 10),
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={teacher.full_name}
        subtitle={`Employee ID: ${teacher.employee_id}`}
        action={
          <button
            onClick={() => setEditMode(!editMode)}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
          >
            {editMode ? 'Cancel' : 'Edit'}
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        {/* Profile card */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          {editMode ? (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['First Name', 'first_name', 'text'],
                  ['Last Name', 'last_name', 'text'],
                  ['Phone', 'phone', 'text'],
                  ['Joining Date', 'joining_date', 'date'],
                  ['Qualification', 'qualification', 'text'],
                  ['Specialization', 'specialization', 'text'],
                ].map(([label, field, type]) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                    <input type={type} value={editForm[field] ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditMode(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={updateMut.isPending}
                  className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {updateMut.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <InfoRow label="Email" value={teacher.email} />
              <InfoRow label="Phone" value={teacher.phone} />
              <InfoRow label="Qualification" value={teacher.qualification} />
              <InfoRow label="Specialization" value={teacher.specialization} />
              <InfoRow label="Joining Date" value={teacher.joining_date} />
            </div>
          )}
        </div>

        {/* Stat cards */}
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Employee ID</p>
            <p className="text-lg font-mono font-semibold text-gray-900">{teacher.employee_id}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Assignments</p>
            <p className="text-2xl font-semibold text-gray-900">{assignments.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Status</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              teacher.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
            }`}>
              {teacher.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Assignments */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Subject Assignments</h3>
          <button onClick={() => setAssignModal(true)}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            + Assign Subject
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-2.5 font-medium text-gray-600 text-xs">Academic Year</th>
              <th className="text-left px-5 py-2.5 font-medium text-gray-600 text-xs">Section</th>
              <th className="text-left px-5 py-2.5 font-medium text-gray-600 text-xs">Subject</th>
              <th className="text-left px-5 py-2.5 font-medium text-gray-600 text-xs">Code</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {assignments.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-6 text-center text-gray-400">No assignments yet.</td></tr>
            )}
            {assignments.map((a) => (
              <tr key={a.id} className="border-t border-gray-100">
                <td className="px-5 py-3 text-gray-700">{a.academic_year_name}</td>
                <td className="px-5 py-3 text-gray-700">{a.section_name}</td>
                <td className="px-5 py-3 text-gray-700">{a.subject_name}</td>
                <td className="px-5 py-3">
                  <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{a.subject_code}</span>
                </td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => {
                    if (confirm('Remove this assignment?')) removeMut.mutate(a.id)
                  }} className="text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {assignModal && (
        <Modal title="Assign Subject" onClose={() => setAssignModal(false)}>
          <form onSubmit={handleAssign} className="space-y-4">
            {assignError && <p className="text-sm text-red-600">{assignError}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
              <select required value={assignForm.academic_year}
                onChange={(e) => setAssignForm({ academic_year: e.target.value, section: '', subject: '' })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select year</option>
                {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
              <select required value={assignForm.section}
                onChange={(e) => setAssignForm({ ...assignForm, section: e.target.value, subject: '' })}
                disabled={!assignForm.academic_year}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
                <option value="">Select section</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.class_group_name} - {s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select required value={assignForm.subject}
                onChange={(e) => setAssignForm({ ...assignForm, subject: e.target.value })}
                disabled={!assignForm.section}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
              {assignForm.section && subjects.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No subjects found for this class. Add subjects first.</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setAssignModal(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button type="submit" disabled={assignMut.isPending}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {assignMut.isPending ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-gray-900 mt-0.5">{value || '—'}</p>
    </div>
  )
}
