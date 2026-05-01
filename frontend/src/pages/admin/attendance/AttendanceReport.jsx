import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAcademicYears, getSections } from '@/api/academics'
import { getSectionReport, getSessions } from '@/api/attendance'
import PageHeader from '@/components/ui/PageHeader'

function firstDayOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function pctColor(pct) {
  if (pct >= 85) return 'text-green-600'
  if (pct >= 70) return 'text-yellow-600'
  return 'text-red-600'
}

export default function AttendanceReport() {
  const [yearId, setYearId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [fromDate, setFromDate] = useState(firstDayOfMonth())
  const [toDate, setToDate] = useState(todayStr())
  const [view, setView] = useState('report') // 'report' | 'sessions'

  const { data: years = [] } = useQuery({
    queryKey: ['academicYears'],
    queryFn: () => getAcademicYears().then((r) => r.data),
  })

  const { data: sections = [] } = useQuery({
    queryKey: ['sections', { academic_year: yearId }],
    queryFn: () => getSections({ academic_year: yearId }).then((r) => r.data),
    enabled: !!yearId,
  })

  const reportParams = { section: sectionId, from_date: fromDate, to_date: toDate }
  const { data: report = [], isFetching: reportLoading } = useQuery({
    queryKey: ['sectionReport', reportParams],
    queryFn: () => getSectionReport(reportParams).then((r) => r.data),
    enabled: !!sectionId && !!fromDate && !!toDate,
  })

  const sessionParams = { section: sectionId, from_date: fromDate, to_date: toDate }
  const { data: sessions = [], isFetching: sessionsLoading } = useQuery({
    queryKey: ['sessions', sessionParams],
    queryFn: () => getSessions(sessionParams).then((r) => r.data),
    enabled: !!sectionId && view === 'sessions',
  })

  const avgPct =
    report.length > 0
      ? Math.round(report.reduce((s, r) => s + r.percentage, 0) / report.length)
      : null

  const lowAttendance = report.filter((r) => r.percentage < 75)

  return (
    <div>
      <PageHeader title="Attendance Reports" subtitle="View section attendance across any date range" />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={yearId} onChange={(e) => { setYearId(e.target.value); setSectionId('') }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Select Year</option>
          {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
        </select>
        <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}
          disabled={!yearId}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
          <option value="">Select Section</option>
          {sections.map((s) => <option key={s.id} value={s.id}>{s.class_group_name} - {s.name}</option>)}
        </select>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {!sectionId && (
        <p className="text-sm text-gray-400">Select a year and section to view the report.</p>
      )}

      {sectionId && (
        <>
          {/* Stats row */}
          {report.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-5">
              <StatCard label="Students" value={report.length} />
              <StatCard label="Avg Attendance" value={`${avgPct}%`} valueClass={pctColor(avgPct)} />
              <StatCard label="Below 75%" value={lowAttendance.length} valueClass={lowAttendance.length > 0 ? 'text-red-600' : 'text-green-600'} />
            </div>
          )}

          {/* View toggle */}
          <div className="flex gap-1 mb-4">
            {['report', 'sessions'].map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors ${
                  view === v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {v === 'report' ? 'Student Summary' : 'Daily Sessions'}
              </button>
            ))}
          </div>

          {view === 'report' && (
            reportLoading ? <p className="text-sm text-gray-500">Loading...</p> :
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Student</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Adm. No.</th>
                    <th className="text-center px-3 py-3 font-medium text-gray-600">Present</th>
                    <th className="text-center px-3 py-3 font-medium text-gray-600">Absent</th>
                    <th className="text-center px-3 py-3 font-medium text-gray-600">Late</th>
                    <th className="text-center px-3 py-3 font-medium text-gray-600">Half Day</th>
                    <th className="text-center px-3 py-3 font-medium text-gray-600">Excused</th>
                    <th className="text-center px-3 py-3 font-medium text-gray-600">Total</th>
                    <th className="text-center px-3 py-3 font-medium text-gray-600">%</th>
                  </tr>
                </thead>
                <tbody>
                  {report.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No attendance data for this range.</td></tr>
                  )}
                  {report.map((r) => (
                    <tr key={r.student_id} className={`border-t border-gray-100 ${r.percentage < 75 ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">{r.student_name}</td>
                      <td className="px-4 py-3"><span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{r.admission_number}</span></td>
                      <td className="px-3 py-3 text-center text-green-700 font-medium">{r.present}</td>
                      <td className="px-3 py-3 text-center text-red-600 font-medium">{r.absent}</td>
                      <td className="px-3 py-3 text-center text-yellow-600">{r.late}</td>
                      <td className="px-3 py-3 text-center text-orange-600">{r.half_day}</td>
                      <td className="px-3 py-3 text-center text-blue-600">{r.excused}</td>
                      <td className="px-3 py-3 text-center text-gray-700">{r.total_days}</td>
                      <td className={`px-3 py-3 text-center font-semibold ${pctColor(r.percentage)}`}>{r.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {view === 'sessions' && (
            sessionsLoading ? <p className="text-sm text-gray-500">Loading...</p> :
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Section</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Marked By</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Records</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No sessions found.</td></tr>
                  )}
                  {sessions.map((s) => (
                    <tr key={s.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-medium text-gray-900">{s.date}</td>
                      <td className="px-4 py-3 text-gray-700">{s.section_name}</td>
                      <td className="px-4 py-3 text-gray-600">{s.marked_by_name ?? '—'}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{s.record_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, valueClass = 'text-gray-900' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  )
}
