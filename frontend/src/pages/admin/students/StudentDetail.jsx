import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStudent, updateStudent, getEnrollments, createEnrollment, deleteEnrollment } from '@/api/students'
import { getAcademicYears, getSections } from '@/api/academics'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import { confirmAction } from '@/lib/alerts'
import { toastSuccess, toastError } from '@/lib/toast'

export default function StudentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [enrollModal, setEnrollModal] = useState(false)
  const [enrollForm, setEnrollForm] = useState({ academic_year: '', section: '' })
  const [enrollError, setEnrollError] = useState('')

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => getStudent(id).then((r) => r.data),
  })

  useEffect(() => {
    if (student) {
      setEditForm({
        first_name: student.first_name,
        last_name: student.last_name,
        phone: student.phone ?? '',
        date_of_birth: student.date_of_birth ?? '',
        gender: student.gender ?? '',
        address: student.address ?? '',
        blood_group: student.blood_group ?? '',
        guardian_name: student.guardian_name ?? '',
        guardian_phone: student.guardian_phone ?? '',
      })
    }
  }, [student])

  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments', { student: id }],
    queryFn: () => getEnrollments({ student: id }).then((r) => r.data),
  })

  const { data: years = [] } = useQuery({
    queryKey: ['academicYears'],
    queryFn: () => getAcademicYears().then((r) => r.data),
  })

  const { data: sections = [] } = useQuery({
    queryKey: ['sections', { academic_year: enrollForm.academic_year }],
    queryFn: () => getSections({ academic_year: enrollForm.academic_year }).then((r) => r.data),
    enabled: !!enrollForm.academic_year,
  })

  const updateMut = useMutation({
    mutationFn: (data) => updateStudent(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student', id] })
      setEditMode(false)
      toastSuccess('Student updated')
    },
    onError: () => toastError('Failed to update student'),
  })

  const enrollMut = useMutation({
    mutationFn: createEnrollment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollments'] })
      setEnrollModal(false)
      setEnrollForm({ academic_year: '', section: '' })
      setEnrollError('')
      toastSuccess('Student enrolled')
    },
    onError: (e) => {
      const msg = e.response?.data?.non_field_errors?.[0] ?? e.response?.data?.detail ?? 'Failed to enroll'
      setEnrollError(msg)
      toastError(msg)
    },
  })

  const unenrollMut = useMutation({
    mutationFn: deleteEnrollment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['enrollments'] }); toastSuccess('Enrollment removed') },
    onError: () => toastError('Failed to remove enrollment'),
  })

  if (isLoading) return <div className="text-sm text-gray-500">Loading...</div>
  if (!student) return <div className="text-sm text-red-500">Student not found.</div>

  function handleUpdate(e) {
    e.preventDefault()
    updateMut.mutate(editForm)
  }

  function handleEnroll(e) {
    e.preventDefault()
    setEnrollError('')
    enrollMut.mutate({
      student: parseInt(id, 10),
      section: parseInt(enrollForm.section, 10),
      academic_year: parseInt(enrollForm.academic_year, 10),
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={student.full_name}
        subtitle={`Admission No: ${student.admission_number}`}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setEditMode(!editMode)}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
            >
              {editMode ? 'Cancel' : 'Edit'}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        {/* Profile card */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          {editMode ? (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <LabeledInput label="First Name" value={editForm.first_name}
                  onChange={(v) => setEditForm({ ...editForm, first_name: v })} />
                <LabeledInput label="Last Name" value={editForm.last_name}
                  onChange={(v) => setEditForm({ ...editForm, last_name: v })} />
                <LabeledInput label="Phone" value={editForm.phone}
                  onChange={(v) => setEditForm({ ...editForm, phone: v })} />
                <LabeledInput label="Date of Birth" type="date" value={editForm.date_of_birth}
                  onChange={(v) => setEditForm({ ...editForm, date_of_birth: v })} />
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Gender</label>
                  <select value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Blood Group</label>
                  <select value={editForm.blood_group} onChange={(e) => setEditForm({ ...editForm, blood_group: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select</option>
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <LabeledInput label="Guardian Name" value={editForm.guardian_name}
                  onChange={(v) => setEditForm({ ...editForm, guardian_name: v })} />
                <LabeledInput label="Guardian Phone" value={editForm.guardian_phone}
                  onChange={(v) => setEditForm({ ...editForm, guardian_phone: v })} />
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
                  <textarea rows={2} value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
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
              <InfoRow label="Email" value={student.email} />
              <InfoRow label="Phone" value={student.phone} />
              <InfoRow label="Date of Birth" value={student.date_of_birth} />
              <InfoRow label="Gender" value={student.gender} className="capitalize" />
              <InfoRow label="Blood Group" value={student.blood_group} />
              <InfoRow label="Address" value={student.address} />
              <InfoRow label="Guardian" value={student.guardian_name} />
              <InfoRow label="Guardian Phone" value={student.guardian_phone} />
            </div>
          )}
        </div>

        {/* Stat card */}
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Admission No.</p>
            <p className="text-lg font-mono font-semibold text-gray-900">{student.admission_number}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Status</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              student.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
            }`}>
              {student.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Enrollments */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Enrollments</h3>
          <button onClick={() => setEnrollModal(true)}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            + Enroll
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-2.5 font-medium text-gray-600 text-xs">Academic Year</th>
              <th className="text-left px-5 py-2.5 font-medium text-gray-600 text-xs">Class</th>
              <th className="text-left px-5 py-2.5 font-medium text-gray-600 text-xs">Section</th>
              <th className="text-left px-5 py-2.5 font-medium text-gray-600 text-xs">Status</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {enrollments.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-6 text-center text-gray-400">No enrollments yet.</td></tr>
            )}
            {enrollments.map((e) => (
              <tr key={e.id} className="border-t border-gray-100">
                <td className="px-5 py-3 text-gray-700">{e.academic_year_name}</td>
                <td className="px-5 py-3 text-gray-700">{e.class_name}</td>
                <td className="px-5 py-3 text-gray-700">{e.section_name}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    e.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>{e.status}</span>
                </td>
                <td className="px-5 py-3 text-right">
                  <button onClick={async () => {
                    if (await confirmAction('Remove Enrollment', 'Remove this enrollment record?', 'Remove')) unenrollMut.mutate(e.id)
                  }} className="text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {enrollModal && (
        <Modal title="Enroll Student" onClose={() => setEnrollModal(false)}>
          <form onSubmit={handleEnroll} className="space-y-4">
            {enrollError && <p className="text-sm text-red-600">{enrollError}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
              <select required value={enrollForm.academic_year}
                onChange={(e) => setEnrollForm({ academic_year: e.target.value, section: '' })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select year</option>
                {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
              <select required value={enrollForm.section}
                onChange={(e) => setEnrollForm({ ...enrollForm, section: e.target.value })}
                disabled={!enrollForm.academic_year}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
                <option value="">Select section</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.class_group_name} - {s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setEnrollModal(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button type="submit" disabled={enrollMut.isPending}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {enrollMut.isPending ? 'Enrolling...' : 'Enroll'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function InfoRow({ label, value, className = '' }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-gray-900 mt-0.5 ${className}`}>{value || '—'}</p>
    </div>
  )
}

function LabeledInput({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  )
}
