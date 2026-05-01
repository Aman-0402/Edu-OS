import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const NAV = [
  { to: '/parent/dashboard', label: 'Dashboard', icon: '▦' },
]

export default function ParentLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-5 border-b border-gray-200">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
            <span className="text-white text-sm font-bold">E</span>
          </div>
          <span className="font-semibold text-gray-900">EduOS</span>
          <span className="ml-2 text-xs text-gray-400">Parent</span>
        </div>
        <nav className="flex-1 py-4">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-orange-50 text-orange-700 font-medium border-r-2 border-orange-500'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <span>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name}</p>
          <button
            onClick={async () => { await logout(); navigate('/login') }}
            className="text-xs text-gray-500 hover:text-red-600 mt-1"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6">
          <h2 className="text-sm font-medium text-gray-500">Parent Portal</h2>
        </header>
        <div className="flex-1 overflow-y-auto p-6"><Outlet /></div>
      </main>
    </div>
  )
}
