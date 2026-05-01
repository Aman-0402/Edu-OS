import { useAuth } from '@/contexts/AuthContext'

export default function AdminDashboard() {
  const { user } = useAuth()
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">
        Welcome back, {user?.full_name} 👋
      </h1>
      <p className="text-gray-500 text-sm mb-8">Here's what's happening at your school today.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Total Students', value: '—', color: 'blue' },
          { label: 'Total Teachers', value: '—', color: 'green' },
          { label: "Today's Attendance", value: '—', color: 'purple' },
          { label: 'Fees Collected Today', value: '—', color: 'orange' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`text-3xl font-semibold mt-1 text-${color}-600`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm text-gray-500">More dashboard data will appear here as you add modules.</p>
      </div>
    </div>
  )
}
