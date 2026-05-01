import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { getKpis, getAttendanceTrend, getFeeCollectionTrend, getStudentStrength } from '@/api/reports'
import { useAuth } from '@/contexts/AuthContext'

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

function KpiCard({ label, value, sub, accent = '#3b82f6' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-semibold mt-1" style={{ color: accent }}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminDashboard() {
  const { user } = useAuth()

  const { data: kpis } = useQuery({
    queryKey: ['adminKpis'],
    queryFn: () => getKpis().then((r) => r.data),
    staleTime: 60_000,
  })

  const { data: attendanceTrend = [] } = useQuery({
    queryKey: ['attendanceTrend', 30],
    queryFn: () => getAttendanceTrend({ days: 30 }).then((r) => r.data),
    staleTime: 5 * 60_000,
  })

  const { data: feeTrend = [] } = useQuery({
    queryKey: ['feeTrend'],
    queryFn: () => getFeeCollectionTrend({}).then((r) => r.data),
    staleTime: 5 * 60_000,
  })

  const { data: strength = [] } = useQuery({
    queryKey: ['studentStrength'],
    queryFn: () => getStudentStrength({}).then((r) => r.data),
    staleTime: 5 * 60_000,
  })

  const fmtCurrency = (n) =>
    n == null ? '—' : `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

  const attPct = kpis?.attendance_today?.percentage
  const attDisplay = attPct != null
    ? `${attPct}%`
    : (kpis?.attendance_today?.total === 0 ? 'No data' : '—')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Welcome back, {user?.full_name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Here's what's happening at your school today.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <KpiCard label="Total Students" value={kpis?.total_students} accent="#3b82f6" />
        <KpiCard label="Total Teachers" value={kpis?.total_teachers} accent="#10b981" />
        <KpiCard
          label="Today's Attendance"
          value={attDisplay}
          sub={kpis?.attendance_today?.total > 0 ? `${kpis.attendance_today.present} / ${kpis.attendance_today.total} present` : undefined}
          accent="#8b5cf6"
        />
        <KpiCard
          label="Fees Collected"
          value={fmtCurrency(kpis?.fees?.collected)}
          sub={kpis?.fees?.academic_year}
          accent="#f59e0b"
        />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Active Enrollments" value={kpis?.active_enrollments} accent="#3b82f6" />
        <KpiCard
          label="Outstanding Fees"
          value={fmtCurrency(kpis?.fees?.outstanding)}
          sub="pending + partial"
          accent="#ef4444"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Attendance — last 30 days</h3>
          {attendanceTrend.length === 0
            ? <p className="text-sm text-gray-400 text-center py-10">No attendance data yet.</p>
            : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={attendanceTrend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                  <Tooltip formatter={(v) => [`${v}%`, 'Attendance']} />
                  <Area type="monotone" dataKey="percentage" stroke="#3b82f6" fill="url(#attGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Fee Collection — monthly</h3>
          {feeTrend.length === 0
            ? <p className="text-sm text-gray-400 text-center py-10">No collection data yet.</p>
            : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={feeTrend} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Collected']} />
                  <Bar dataKey="collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
        </div>
      </div>

      {strength.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Student Strength by Section</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-center">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={strength} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis dataKey="label" type="category" tick={{ fontSize: 11 }} width={60} />
                <Tooltip formatter={(v) => [v, 'Students']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {strength.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={strength} dataKey="count" nameKey="label"
                  cx="50%" cy="50%" outerRadius={90}
                  label={({ label, count }) => `${label}: ${count}`}
                >
                  {strength.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
