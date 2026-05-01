import { useAuth } from '@/contexts/AuthContext'

export default function TeacherDashboard() {
  const { user } = useAuth()
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">
        Welcome, {user?.full_name} 👋
      </h1>
      <p className="text-gray-500 text-sm">Your teacher dashboard will appear here.</p>
    </div>
  )
}
