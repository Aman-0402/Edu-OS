import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  IconDashboard, IconStudents, IconTeachers, IconAttendance,
  IconFees, IconReports, IconParents, IconAcademics, IconAnnounce,
  IconChevronDown, IconSignOut,
} from '@/components/ui/Icons'

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', Icon: IconDashboard },
  {
    label: 'Academics',
    Icon: IconAcademics,
    prefix: '/admin/academics',
    children: [
      { to: '/admin/academics/years',    label: 'Years' },
      { to: '/admin/academics/classes',  label: 'Classes' },
      { to: '/admin/academics/sections', label: 'Sections' },
      { to: '/admin/academics/subjects', label: 'Subjects' },
    ],
  },
  { to: '/admin/students',   label: 'Students',   Icon: IconStudents },
  { to: '/admin/teachers',   label: 'Teachers',   Icon: IconTeachers },
  { to: '/admin/attendance', label: 'Attendance', Icon: IconAttendance },
  {
    label: 'Fees',
    Icon: IconFees,
    prefix: '/admin/fees',
    children: [
      { to: '/admin/fees/setup',      label: 'Setup' },
      { to: '/admin/fees/collection', label: 'Collection' },
    ],
  },
  { to: '/admin/parents',  label: 'Parents',  Icon: IconParents },
  { to: '/admin/reports',  label: 'Reports',  Icon: IconReports },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => { await logout(); navigate('/login') }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 bg-[#0f1623] flex flex-col shrink-0">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-white/10">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3 shrink-0">
            <span className="text-white text-sm font-bold">E</span>
          </div>
          <span className="font-semibold text-white">EduOS</span>
          <span className="ml-auto text-[10px] font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV.map((item) => {
            if (item.children) {
              const isGroupActive = location.pathname.startsWith(item.prefix)
              return (
                <div key={item.label} className="mb-0.5">
                  <div className={`flex items-center gap-3 px-4 py-2.5 text-sm mx-2 rounded-lg ${isGroupActive ? 'text-white' : 'text-slate-400'}`}>
                    <item.Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    <IconChevronDown className={`w-3.5 h-3.5 transition-transform ${isGroupActive ? 'rotate-180' : ''}`} />
                  </div>
                  <div className="ml-9 mr-2 border-l border-white/10 pl-3">
                    {item.children.map(({ to, label }) => (
                      <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                          `block py-1.5 text-sm transition-colors ${isActive ? 'text-blue-400 font-medium' : 'text-slate-500 hover:text-slate-300'}`
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
                  `flex items-center gap-3 px-4 py-2.5 text-sm mx-2 rounded-lg mb-0.5 transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`
                }
              >
                <item.Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2.5 p-2 rounded-lg">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-semibold">{user?.full_name?.[0] ?? 'A'}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
            <button onClick={handleLogout} title="Sign out"
              className="text-slate-500 hover:text-red-400 transition-colors p-1">
              <IconSignOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6">
          <p className="text-sm text-slate-500">
            {location.pathname.split('/').filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' / ')}
          </p>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
