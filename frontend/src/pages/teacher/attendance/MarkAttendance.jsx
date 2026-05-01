import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getSections } from '@/api/academics'
import { getSectionStudents, getSession, bulkMarkAttendance } from '@/api/attendance'
import { useAcademicYear } from '@/contexts/AcademicYearContext'
import PageHeader from '@/components/ui/PageHeader'

const STATUS_OPTIONS = [
  { value: 'P', label: 'Present', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'A', label: 'Absent',  color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'L', label: 'Late',    color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'H', label: 'Half Day',color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'E', label: 'Excused', color: 'bg-blue-100 text-blue-700 border-blue-300' },
]

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export default function MarkAttendance() {
  const { selectedYearId } = useAcademicYear()
  const [sectionId, setSectionId] = useState('')
  const [date, setDate] = useState(todayStr())
  const [attendance, setAttendance] = useState({}) // { studentId: { status, remarks } }
  const [saved, setSaved] = useState(false)

  const { data: sections = [] } = useQuery({
    queryKey: ['sections', { academic_year: selectedYearId }],
    queryFn: () => getSections({ academic_year: selectedYearId }).then((r) => r.data),
    enabled: !!selectedYearId,
  })

  const { data: students = [] } = useQuery({
    queryKey: ['sectionStudents', sectionId],
    queryFn: () => getSectionStudents(sectionId).then((r) => r.data),
    enabled: !!sectionId,
  })

  // Load existing session if already marked
  const { data: existingSession } = useQuery({
    queryKey: ['attendanceSession', sectionId, date],
    queryFn: () => getSession(sectionId, date).then((r) => r.data),
    enabled: !!sectionId && !!date,
  })

  // Seed grid from existing session or default all to Present
  useEffect(() => {
    if (!students.length) return
    if (existingSession?.records?.length) {
      const map = {}
      existingSession.records.forEach((r) => {
        map[r.student] = { status: r.status, remarks: r.remarks ?? '' }
      })
      setAttendance(map)
    } else {
      const map = {}
      students.forEach((s) => { map[s.id] = { status: 'P', remarks: '' } })
      setAttendance(map)
    }
    setSaved(false)
  }, [students, existingSession])

  const markMut = useMutation({
    mutationFn: bulkMarkAttendance,
    onSuccess: () => setSaved(true),
  })

  function setStatus(studentId, status) {
    setAttendance((prev) => ({ ...prev, [studentId]: { ...prev[studentId], status } }))
    setSaved(false)
  }

  function setRemarks(studentId, remarks) {
    setAttendance((prev) => ({ ...prev, [studentId]: { ...prev[studentId], remarks } }))
    setSaved(false)
  }

  function markAll(status) {
    const map = {}
    students.forEach((s) => { map[s.id] = { status, remarks: attendance[s.id]?.remarks ?? '' } })
    setAttendance(map)
    setSaved(false)
  }

  function handleSubmit() {
    const records = students.map((s) => ({
      student: s.id,
      status: attendance[s.id]?.status ?? 'P',
      remarks: attendance[s.id]?.remarks ?? '',
    }))
    markMut.mutate({ section: parseInt(sectionId, 10), date, records })
  }

  const counts = students.reduce((acc, s) => {
    const st = attendance[s.id]?.status ?? 'P'
    acc[st] = (acc[st] ?? 0) + 1
    return acc
  }, {})

  return (
    <div>
      <PageHeader title="Mark Attendance" subtitle="Daily attendance for your section" />

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={sectionId}
          onChange={(e) => { setSectionId(e.target.value); setSaved(false) }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Select section</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>{s.class_group_name} - {s.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          max={todayStr()}
          onChange={(e) => { setDate(e.target.value); setSaved(false) }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {!sectionId && (
        <p className="text-sm text-gray-400">Select a section to start marking attendance.</p>
      )}

      {sectionId && students.length === 0 && (
        <p className="text-sm text-amber-600">No students enrolled in this section. Enroll students first.</p>
      )}

      {sectionId && students.length > 0 && (
        <>
          {/* Summary bar */}
          <div className="flex flex-wrap gap-3 mb-4">
            {STATUS_OPTIONS.map((opt) => (
              <span key={opt.value} className={`px-3 py-1 rounded-full text-xs font-medium border ${opt.color}`}>
                {opt.label}: {counts[opt.value] ?? 0}
              </span>
            ))}
          </div>

          {/* Quick mark all */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-gray-500 font-medium">Mark all:</span>
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => markAll(opt.value)}
                className={`px-2.5 py-1 rounded text-xs font-medium border ${opt.color} hover:opacity-80`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Student</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Admission No.</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => {
                  const current = attendance[s.id]?.status ?? 'P'
                  const opt = STATUS_OPTIONS.find((o) => o.value === current)
                  return (
                    <tr key={s.id} className="border-t border-gray-100">
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{s.name}</td>
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{s.admission_number}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1 flex-wrap">
                          {STATUS_OPTIONS.map((o) => (
                            <button
                              key={o.value}
                              onClick={() => setStatus(s.id, o.value)}
                              className={`px-2 py-0.5 rounded text-xs font-medium border transition-all ${
                                current === o.value
                                  ? o.color + ' ring-2 ring-offset-1 ring-current'
                                  : 'border-gray-200 text-gray-400 hover:border-gray-400'
                              }`}
                            >
                              {o.value === 'HO' ? 'HOL' : o.value}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          placeholder="Optional note"
                          value={attendance[s.id]?.remarks ?? ''}
                          onChange={(e) => setRemarks(s.id, e.target.value)}
                          className="w-full max-w-xs border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSubmit}
              disabled={markMut.isPending}
              className="px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {markMut.isPending ? 'Saving...' : existingSession ? 'Update Attendance' : 'Submit Attendance'}
            </button>
            {saved && (
              <span className="text-sm text-green-600 font-medium">✓ Attendance saved successfully</span>
            )}
            {markMut.isError && (
              <span className="text-sm text-red-600">Failed to save. Please try again.</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
