import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/admin/users', label: 'Users', icon: '👥' },
  {
    label: 'Academics',
    icon: '🏫',
    prefix: '/admin/academics',
    children: [
      { to: '/admin/academics/years', label: 'Years' },
      { to: '/admin/academics/classes', label: 'Classes' },
      { to: '/admin/academics/sections', label: 'Sections' },
      { to: '/admin/academics/subjects', label: 'Subjects' },
    ],
  },
  { to: '/admin/students', label: 'Students', icon: '🎓' },
  { to: '/admin/teachers', label: 'Teachers', icon: '📚' },
  { to: '/admin/attendance', label: 'Attendance', icon: '✅' },
  {
    label: 'Fees',
    icon: '💳',
    prefix: '/admin/fees',
    children: [
      { to: '/admin/fees/setup', label: 'Setup' },
      { to: '/admin/fees/collection', label: 'Collection' },
    ],
  },
  { to: '/admin/parents', label: 'Parents', icon: '👨‍👩‍👧' },
  { to: '/admin/reports', label: 'Reports', icon: '📊' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-gray-200">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
            <span className="text-white text-sm font-bold">E</span>
          </div>
          <span className="font-semibold text-gray-900">EduOS</span>
          <span className="ml-2 text-xs text-gray-400">Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV.map((item) => {
            if (item.children) {
              const isGroupActive = location.pathname.startsWith(item.prefix)
              return (
                <div key={item.label}>
                  <div
                    className={`flex items-center gap-3 px-5 py-2.5 text-sm ${
                      isGroupActive ? 'text-blue-700 font-medium' : 'text-gray-600'
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </div>
                  <div className="ml-8 border-l border-gray-100">
                    {item.children.map(({ to, label }) => (
                      <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                          `block px-4 py-1.5 text-sm transition-colors ${
                            isActive
                              ? 'text-blue-700 font-medium'
                              : 'text-gray-500 hover:text-gray-900'
                          }`
                        }
                      >
                        {label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              )
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-700 text-xs font-semibold">
                {user?.full_name?.[0] ?? 'A'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-sm text-gray-500 hover:text-red-600 text-left transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6">
          <h2 className="text-sm font-medium text-gray-500">School Management</h2>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
