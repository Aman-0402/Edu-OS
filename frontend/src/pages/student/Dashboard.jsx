import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMyStudentProfile } from '@/api/students'
import { getStudentSummary } from '@/api/attendance'
import { getStudentFees } from '@/api/fees'
import { getAnnouncements } from '@/api/teachers'
import { useAuth } from '@/contexts/AuthContext'

const STATUS_COLOR = {
  pending: 'bg-yellow-100 text-yellow-700',
  partial: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  waived: 'bg-gray-100 text-gray-500',
}

const ATT_STATUS_LABEL = { P: 'Present', A: 'Absent', L: 'Late', H: 'Half Day', E: 'Excused', HO: 'Holiday' }
const ATT_STATUS_COLOR = {
  P: 'bg-green-100 text-green-700',
  A: 'bg-red-100 text-red-600',
  L: 'bg-yellow-100 text-yellow-700',
  H: 'bg-blue-100 text-blue-600',
  E: 'bg-purple-100 text-purple-600',
  HO: 'bg-gray-100 text-gray-500',
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function StudentDashboard() {
  const { user } = useAuth()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [tab, setTab] = useState('Attendance')

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['studentMe'],
    queryFn: () => getMyStudentProfile().then((r) => r.data),
  })

  const { data: attendance } = useQuery({
    queryKey: ['myAttendance', profile?.id, month, year],
    queryFn: () => getStudentSummary(profile.id, month, year).then((r) => r.data),
    enabled: !!profile?.id,
  })

  const { data: fees = [] } = useQuery({
    queryKey: ['myFees'],
    queryFn: () => getStudentFees({}).then((r) => r.data),
  })

  const { data: announcements = [] } = useQuery({
    queryKey: ['myAnnouncements'],
    queryFn: () => getAnnouncements({ audience: 'students' }).then((r) => r.data),
    staleTime: 2 * 60_000,
  })

  const outstanding = fees
    .filter((f) => f.status === 'pending' || f.status === 'partial')
    .reduce((s, f) => s + parseFloat(f.balance ?? 0), 0)

  const enrollment = profile?.current_enrollment

  if (profileLoading) return <p className="text-sm text-gray-400">Loading...</p>

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Welcome, {user?.full_name}</h1>
        {enrollment
          ? <p className="text-sm text-gray-500 mt-0.5">{enrollment.class_name} — Section {enrollment.section_name} · {enrollment.academic_year_name}</p>
          : <p className="text-sm text-gray-400 mt-0.5">No active enrollment found</p>
        }
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Admission No</p>
          <p className="text-lg font-semibold text-gray-800 mt-0.5">{profile?.admission_number ?? '—'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">This Month</p>
          <p className={`text-2xl font-bold mt-0.5 ${(attendance?.percentage ?? 0) >= 75 ? 'text-green-600' : 'text-red-500'}`}>
            {attendance?.percentage != null ? `${attendance.percentage}%` : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Attendance</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Outstanding Fees</p>
          <p className={`text-2xl font-bold mt-0.5 ${outstanding > 0 ? 'text-red-500' : 'text-green-600'}`}>
            {outstanding > 0 ? `₹${outstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '✓ Clear'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Announcements</p>
          <p className="text-2xl font-bold mt-0.5 text-blue-600">{announcements.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
        {['Attendance', 'Fees', 'Announcements'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Attendance tab */}
      {tab === 'Attendance' && (
        <div>
          <div className="flex gap-3 mb-4">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
              {[now.getFullYear() - 1, now.getFullYear()].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {attendance && (
            <>
              <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Present', value: attendance.present, color: 'text-green-600' },
                  { label: 'Absent', value: attendance.absent, color: 'text-red-500' },
                  { label: 'Late', value: attendance.late, color: 'text-yellow-600' },
                  { label: 'Attendance %', value: `${attendance.percentage}%`, color: attendance.percentage >= 75 ? 'text-green-600' : 'text-red-500' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-gray-500 mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {attendance.records && attendance.records.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600">Date</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600">Status</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.records.map((r, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-4 py-2.5 text-gray-700">{r.date}</td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ATT_STATUS_COLOR[r.status] ?? 'bg-gray-100 text-gray-500'}`}>
                              {ATT_STATUS_LABEL[r.status] ?? r.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-400">{r.remarks || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {(!attendance.records || attendance.records.length === 0) && attendance.total_days === 0 && (
                <p className="text-sm text-gray-400">No attendance recorded for this month.</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Fees tab */}
      {tab === 'Fees' && (
        <div>
          {outstanding > 0 && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-sm font-medium text-yellow-800">Outstanding Balance</p>
              <p className="text-2xl font-bold text-yellow-700 mt-0.5">
                ₹{outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
          {fees.length === 0
            ? <p className="text-sm text-gray-400">No fee records found.</p>
            : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Category</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-600">Amount</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-600">Paid</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-600">Balance</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fees.map((f) => (
                      <tr key={f.id} className="border-t border-gray-100">
                        <td className="px-4 py-2.5 text-gray-800 font-medium">
                          {f.fee_structure_display ?? `Fee #${f.id}`}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-700">
                          ₹{parseFloat(f.net_amount ?? f.amount_due).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-2.5 text-right text-green-600">
                          ₹{parseFloat(f.amount_paid ?? 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-2.5 text-right text-red-500">
                          ₹{parseFloat(f.balance ?? 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[f.status] ?? ''}`}>
                            {f.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {/* Announcements tab */}
      {tab === 'Announcements' && (
        <div className="space-y-3">
          {announcements.length === 0
            ? <p className="text-sm text-gray-400">No announcements.</p>
            : announcements.map((a) => (
              <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900">{a.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{a.content}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Posted by {a.posted_by_name ?? 'Staff'}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
