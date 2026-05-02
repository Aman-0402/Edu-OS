import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { IconDashboard, IconAcademics, IconAttendance, IconSignOut, IconAnnounce } from '@/components/ui/Icons'

const NAV = [
  { to: '/teacher/dashboard',  label: 'Dashboard',    Icon: IconDashboard },
  { to: '/teacher/my-classes', label: 'My Classes',   Icon: IconAcademics },
  { to: '/teacher/attendance', label: 'Attendance',   Icon: IconAttendance },
  { to: '/teacher/announcements', label: 'Announcements', Icon: IconAnnounce },
]

export default function TeacherLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-60 bg-[#0f1623] flex flex-col shrink-0">
        <div className="h-16 flex items-center px-5 border-b border-white/10">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3 shrink-0">
            <span className="text-white text-sm font-bold">E</span>
          </div>
          <span className="font-semibold text-white">EduOS</span>
          <span className="ml-auto text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Teacher</span>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm mx-2 rounded-lg mb-0.5 transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2.5 p-2 rounded-lg">
            <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-semibold">{user?.full_name?.[0] ?? 'T'}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
              <p className="text-xs text-slate-400">Teacher</p>
            </div>
            <button onClick={async () => { await logout(); navigate('/login') }} title="Sign out"
              className="text-slate-500 hover:text-red-400 transition-colors p-1">
              <IconSignOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6">
          <p className="text-sm text-slate-500">
            {location.pathname.split('/').filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' / ')}
          </p>
        </header>
        <div className="flex-1 overflow-y-auto p-6"><Outlet /></div>
      </main>
    </div>
  )
}
