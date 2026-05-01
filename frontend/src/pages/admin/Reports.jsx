import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  getAttendanceTrend, getStudentStrength, getFeeCollectionTrend,
  getFeeCategoryBreakdown, exportAttendanceCsv, exportFeesCsv,
} from '@/api/reports'
import { getAcademicYears } from '@/api/academics'
import { getSections } from '@/api/academics'
import PageHeader from '@/components/ui/PageHeader'

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
const TABS = ['Attendance', 'Fees', 'Students']

export default function Reports() {
  const [tab, setTab] = useState('Attendance')

  return (
    <div>
      <PageHeader title="Reports" subtitle="School-wide analytics and exports" />

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Attendance' && <AttendanceReport />}
      {tab === 'Fees' && <FeesReport />}
      {tab === 'Students' && <StudentsReport />}
    </div>
  )
}

function AttendanceReport() {
  const [days, setDays] = useState(30)
  const [sectionId, setSectionId] = useState('')

  const { data: sections = [] } = useQuery({
    queryKey: ['sections', {}],
    queryFn: () => getSections({}).then((r) => r.data),
  })

  const params = { days }
  if (sectionId) params.section = sectionId

  const { data: trend = [], isLoading } = useQuery({
    queryKey: ['attTrend', params],
    queryFn: () => getAttendanceTrend(params).then((r) => r.data),
  })

  const avgPct = trend.length
    ? (trend.reduce((s, d) => s + d.percentage, 0) / trend.length).toFixed(1)
    : null

  const exportUrl = exportAttendanceCsv(sectionId ? { section: sectionId } : {})

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Period</label>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Section (optional)</label>
          <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">All sections</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.class_group_name}-{s.name}</option>
            ))}
          </select>
        </div>
        <a href={exportUrl} target="_blank" rel="noreferrer"
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200">
          Export CSV
        </a>
      </div>

      {avgPct && (
        <div className="flex gap-4">
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p className="text-xs text-gray-500">Average Attendance</p>
            <p className={`text-2xl font-bold mt-0.5 ${Number(avgPct) >= 75 ? 'text-green-600' : 'text-red-500'}`}>{avgPct}%</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p className="text-xs text-gray-500">Days with Data</p>
            <p className="text-2xl font-bold mt-0.5 text-gray-700">{trend.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p className="text-xs text-gray-500">Below 75%</p>
            <p className="text-2xl font-bold mt-0.5 text-red-500">{trend.filter((d) => d.percentage < 75).length}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Daily Attendance %</h3>
        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-10">Loading...</p>
        ) : trend.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No attendance data for this period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={trend} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
              <Tooltip formatter={(v) => [`${v}%`, 'Attendance']} />
              <Bar dataKey="percentage" radius={[3, 3, 0, 0]}>
                {trend.map((d, i) => (
                  <Cell key={i} fill={d.percentage >= 75 ? '#10b981' : d.percentage >= 60 ? '#f59e0b' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {trend.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Date</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-600">Present</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-600">Total</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-600">%</th>
              </tr>
            </thead>
            <tbody>
              {[...trend].reverse().map((d, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-4 py-2.5 text-gray-700">{d.date}</td>
                  <td className="px-4 py-2.5 text-right text-green-600">{d.present}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500">{d.total}</td>
                  <td className={`px-4 py-2.5 text-right font-medium ${d.percentage >= 75 ? 'text-green-600' : d.percentage >= 60 ? 'text-yellow-600' : 'text-red-500'}`}>
                    {d.percentage}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function FeesReport() {
  const [yearId, setYearId] = useState('')

  const { data: years = [] } = useQuery({
    queryKey: ['academicYears'],
    queryFn: () => getAcademicYears().then((r) => r.data),
  })

  const params = yearId ? { year: yearId } : {}

  const { data: trend = [] } = useQuery({
    queryKey: ['feeTrend', yearId],
    queryFn: () => getFeeCollectionTrend(params).then((r) => r.data),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['feeCats', yearId],
    queryFn: () => getFeeCategoryBreakdown(params).then((r) => r.data),
  })

  const total = categories.reduce((s, c) => s + c.collected, 0)
  const exportUrl = exportFeesCsv(yearId ? { year: yearId } : {})

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Academic Year</label>
          <select value={yearId} onChange={(e) => setYearId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Current year</option>
            {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
        </div>
        <a href={exportUrl} target="_blank" rel="noreferrer"
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200">
          Export CSV
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Monthly Collection</h3>
          {trend.length === 0
            ? <p className="text-sm text-gray-400 text-center py-10">No data.</p>
            : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={trend} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Collected']} />
                  <Bar dataKey="collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-4">By Category</h3>
          {categories.length === 0
            ? <p className="text-sm text-gray-400 text-center py-10">No data.</p>
            : (
              <>
                <div className="space-y-2 mb-3">
                  {categories.map((c, i) => (
                    <div key={c.category}>
                      <div className="flex justify-between text-sm mb-0.5">
                        <span className="text-gray-700">{c.category}</span>
                        <span className="text-gray-600 font-medium">₹{Number(c.collected).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(c.collected / total) * 100}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t border-gray-100 flex justify-between text-sm font-medium">
                  <span className="text-gray-700">Total</span>
                  <span className="text-gray-900">₹{Number(total).toLocaleString('en-IN')}</span>
                </div>
              </>
            )}
        </div>
      </div>
    </div>
  )
}

function StudentsReport() {
  const [yearId, setYearId] = useState('')

  const { data: years = [] } = useQuery({
    queryKey: ['academicYears'],
    queryFn: () => getAcademicYears().then((r) => r.data),
  })

  const params = yearId ? { year: yearId } : {}

  const { data: strength = [], isLoading } = useQuery({
    queryKey: ['studentStrength', yearId],
    queryFn: () => getStudentStrength(params).then((r) => r.data),
  })

  const total = strength.reduce((s, r) => s + r.count, 0)

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Academic Year</label>
        <select value={yearId} onChange={(e) => setYearId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Current year</option>
          {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
        </select>
      </div>

      {total > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 w-fit">
          <p className="text-xs text-gray-500">Total Active Enrollments</p>
          <p className="text-2xl font-bold mt-0.5 text-blue-600">{total}</p>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : strength.length === 0 ? (
        <p className="text-sm text-gray-400">No enrollment data for this year.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Students per Section</h3>
            <ResponsiveContainer width="100%" height={Math.max(200, strength.length * 32)}>
              <BarChart data={strength} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis dataKey="label" type="category" tick={{ fontSize: 11 }} width={65} />
                <Tooltip formatter={(v) => [v, 'Students']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {strength.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden self-start">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Class</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Section</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-600">Students</th>
                </tr>
              </thead>
              <tbody>
                {strength.map((r, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-4 py-2.5 text-gray-700">{r.class}</td>
                    <td className="px-4 py-2.5 text-gray-500">{r.section}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-800">{r.count}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-700" colSpan={2}>Total</td>
                  <td className="px-4 py-2.5 text-right font-bold text-gray-900">{total}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
