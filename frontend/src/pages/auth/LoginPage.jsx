import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const ROLE_DASHBOARDS = {
  admin:   '/admin/dashboard',
  teacher: '/teacher/dashboard',
  student: '/student/dashboard',
  parent:  '/parent/dashboard',
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm]     = useState({ email: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) { setError('Please enter your email and password.'); return }
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      const from = location.state?.from?.pathname ?? ROLE_DASHBOARDS[user.role] ?? '/'
      navigate(from, { replace: true })
    } catch (err) {
      const msg = err.response?.data?.errors?.detail
        ?? err.response?.data?.detail
        ?? 'Invalid email or password.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0f1623] flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-base">E</span>
          </div>
          <span className="text-white font-semibold text-lg">EduOS</span>
        </div>

        <div>
          <h2 className="text-4xl font-bold text-white leading-tight">
            School Management<br />
            <span className="text-blue-400">Made Simple</span>
          </h2>
          <p className="text-slate-400 mt-4 text-sm leading-relaxed max-w-sm">
            One platform for admins, teachers, students, and parents. Manage attendance, fees, academics, and more — all in one place.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              ['Students', 'Enrollment & profiles'],
              ['Attendance', 'Daily tracking'],
              ['Fees', 'Payments & receipts'],
              ['Reports', 'Analytics & export'],
            ].map(([title, sub]) => (
              <div key={title} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-white font-medium text-sm">{title}</p>
                <p className="text-slate-500 text-xs mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-600 text-xs">© {new Date().getFullYear()} EduOS. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-8">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">E</span>
            </div>
            <span className="font-semibold text-slate-900 text-lg">EduOS</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="text-slate-500 text-sm mt-1 mb-8">Sign in to your account</p>

          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
              <input
                type="email" name="email" value={form.email}
                onChange={handleChange} placeholder="you@school.com" autoComplete="email"
                className="w-full px-3.5 py-2.5 border border-slate-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition shadow-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <a href="/forgot-password" className="text-xs text-blue-600 hover:underline">Forgot password?</a>
              </div>
              <input
                type="password" name="password" value={form.password}
                onChange={handleChange} placeholder="••••••••" autoComplete="current-password"
                className="w-full px-3.5 py-2.5 border border-slate-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition shadow-sm"
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-sm mt-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
