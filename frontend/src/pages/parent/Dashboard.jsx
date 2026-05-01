import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMyChildren, getChildAttendance, getChildFees, getChildAnnouncements } from '@/api/parents'
import { useAuth } from '@/contexts/AuthContext'

const TABS = ['Attendance', 'Fees', 'Announcements']

const STATUS_COLOR = {
  pending: 'bg-yellow-100 text-yellow-700',
  partial: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  waived: 'bg-gray-100 text-gray-500',
}

function AttendanceTab({ studentId }) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const { data, isLoading } = useQuery({
    queryKey: ['childAttendance', studentId, month, year],
    queryFn: () => getChildAttendance(studentId, month, year).then((r) => r.data),
    enabled: !!studentId,
  })

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const years = [now.getFullYear() - 1, now.getFullYear()]

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
          {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {isLoading ? <p className="text-sm text-gray-400">Loading...</p> : !data ? null : (
        <div>
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Present', value: data.present, color: 'text-green-600' },
              { label: 'Absent', value: data.absent, color: 'text-red-500' },
              { label: 'Late', value: data.late, color: 'text-yellow-600' },
              { label: 'Attendance %', value: data.attendance_percentage != null ? `${Number(data.attendance_percentage).toFixed(1)}%` : '—', color: 'text-blue-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {data.records && data.records.length > 0 && (
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
                  {data.records.map((r, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-4 py-2.5 text-gray-700">{r.date}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.status === 'P' ? 'bg-green-100 text-green-700' :
                          r.status === 'A' ? 'bg-red-100 text-red-600' :
                          r.status === 'L' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {r.status === 'P' ? 'Present' : r.status === 'A' ? 'Absent' : r.status === 'L' ? 'Late' : r.status === 'H' ? 'Half Day' : r.status === 'E' ? 'Excused' : r.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">{r.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FeesTab({ studentId }) {
  const { data: fees = [], isLoading } = useQuery({
    queryKey: ['childFees', studentId],
    queryFn: () => getChildFees(studentId, {}).then((r) => r.data),
    enabled: !!studentId,
  })

  if (isLoading) return <p className="text-sm text-gray-400">Loading...</p>
  if (fees.length === 0) return <p className="text-sm text-gray-400">No fee records found.</p>

  const outstanding = fees
    .filter((f) => f.status === 'pending' || f.status === 'partial')
    .reduce((s, f) => s + parseFloat(f.balance ?? 0), 0)

  return (
    <div>
      {outstanding > 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <p className="text-sm font-medium text-yellow-800">Outstanding Balance</p>
          <p className="text-2xl font-bold text-yellow-700 mt-0.5">₹{outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Fee</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Due</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-600">Amount</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-600">Paid</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-600">Balance</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {fees.map((f) => (
              <tr key={f.id} className="border-t border-gray-100">
                <td className="px-4 py-2.5 text-gray-800 font-medium">{f.fee_structure_display ?? `Fee #${f.id}`}</td>
                <td className="px-4 py-2.5 text-gray-500">{f.due_date ?? '—'}</td>
                <td className="px-4 py-2.5 text-right text-gray-700">₹{parseFloat(f.net_amount ?? f.amount_due).toLocaleString('en-IN')}</td>
                <td className="px-4 py-2.5 text-right text-green-600">₹{parseFloat(f.amount_paid ?? 0).toLocaleString('en-IN')}</td>
                <td className="px-4 py-2.5 text-right text-red-500">₹{parseFloat(f.balance ?? 0).toLocaleString('en-IN')}</td>
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
    </div>
  )
}

function AnnouncementsTab({ studentId }) {
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['childAnnouncements', studentId],
    queryFn: () => getChildAnnouncements(studentId).then((r) => r.data),
    enabled: !!studentId,
  })

  if (isLoading) return <p className="text-sm text-gray-400">Loading...</p>
  if (announcements.length === 0) return <p className="text-sm text-gray-400">No announcements.</p>

  return (
    <div className="space-y-3">
      {announcements.map((a) => (
        <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-gray-900">{a.title}</p>
              <p className="text-sm text-gray-600 mt-1">{a.content}</p>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">{a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Posted by {a.posted_by_name ?? 'Staff'}</p>
        </div>
      ))}
    </div>
  )
}

export default function ParentDashboard() {
  const { user } = useAuth()
  const [activeChild, setActiveChild] = useState(null)
  const [activeTab, setActiveTab] = useState('Attendance')

  const { data: children = [], isLoading } = useQuery({
    queryKey: ['myChildren'],
    queryFn: () => getMyChildren().then((r) => r.data),
  })

  const selected = activeChild ?? children[0]?.id

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Welcome, {user?.full_name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Parent Portal</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading children...</p>
      ) : children.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No children linked to your account.</p>
          <p className="text-sm text-gray-400 mt-1">Contact the school admin to link your account.</p>
        </div>
      ) : (
        <>
          {/* Child selector */}
          <div className="flex gap-3 mb-6">
            {children.map((c) => (
              <button
                key={c.id}
                onClick={() => { setActiveChild(c.id); setActiveTab('Attendance') }}
                className={`px-4 py-3 rounded-xl border text-left transition-colors ${
                  selected === c.id
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <p className={`font-medium text-sm ${selected === c.id ? 'text-orange-700' : 'text-gray-800'}`}>
                  {c.full_name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{c.class_section ?? c.admission_number}</p>
              </button>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {selected && (
            <>
              {activeTab === 'Attendance' && <AttendanceTab studentId={selected} />}
              {activeTab === 'Fees' && <FeesTab studentId={selected} />}
              {activeTab === 'Announcements' && <AnnouncementsTab studentId={selected} />}
            </>
          )}
        </>
      )}
    </div>
  )
}
