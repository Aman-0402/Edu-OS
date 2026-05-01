import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getMyTeacherProfile } from '@/api/teachers'
import { getAnnouncements } from '@/api/teachers'
import { getSessions } from '@/api/attendance'
import { useAuth } from '@/contexts/AuthContext'

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value || '—'}</span>
    </div>
  )
}

export default function TeacherDashboard() {
  const { user } = useAuth()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['teacherMe'],
    queryFn: () => getMyTeacherProfile().then((r) => r.data),
  })

  const { data: announcements = [] } = useQuery({
    queryKey: ['teacherAnnouncements'],
    queryFn: () => getAnnouncements({}).then((r) => r.data),
    staleTime: 2 * 60_000,
  })

  const { data: recentSessions = [] } = useQuery({
    queryKey: ['recentSessions'],
    queryFn: () => getSessions({}).then((r) => r.data),
    staleTime: 60_000,
  })

  const assignments = profile?.assignments ?? []
  const classSections = profile?.class_teacher_of ?? []

  // Group assignments by section for display
  const bySectionId = {}
  assignments.forEach((a) => {
    const key = a.section
    if (!bySectionId[key]) bySectionId[key] = { sectionName: a.section_name, subjects: [] }
    bySectionId[key].subjects.push(a.subject_name)
  })
  const sectionGroups = Object.values(bySectionId)

  if (isLoading) return <p className="text-sm text-gray-400">Loading...</p>

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Welcome, {user?.full_name}</h1>
        {profile && (
          <p className="text-sm text-gray-500 mt-0.5">
            Employee ID: {profile.employee_id}
            {profile.specialization ? ` · ${profile.specialization}` : ''}
          </p>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Sections Teaching</p>
          <p className="text-2xl font-bold text-blue-600 mt-0.5">{sectionGroups.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Subjects</p>
          <p className="text-2xl font-bold text-green-600 mt-0.5">{assignments.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Class Teacher Of</p>
          <p className="text-2xl font-bold text-purple-600 mt-0.5">{classSections.length}</p>
        </div>
        <Link to="/teacher/attendance"
          className="bg-blue-600 hover:bg-blue-700 rounded-xl p-4 text-white flex flex-col justify-between transition-colors">
          <p className="text-xs text-blue-200">Quick Action</p>
          <p className="text-sm font-semibold mt-1">Mark Attendance →</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* My sections */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-3">My Sections &amp; Subjects</h3>
          {sectionGroups.length === 0
            ? <p className="text-sm text-gray-400">No assignments for the current year.</p>
            : (
              <div className="space-y-3">
                {sectionGroups.map((g, i) => (
                  <div key={i} className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm font-medium text-gray-800">{g.sectionName}</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {g.subjects.map((s) => (
                        <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

          {classSections.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Class Teacher</p>
              <div className="flex flex-wrap gap-2">
                {classSections.map((s) => (
                  <span key={s.id} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                    {s.class_group_name}-{s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-3">My Profile</h3>
          {profile && (
            <div>
              <InfoRow label="Employee ID" value={profile.employee_id} />
              <InfoRow label="Email" value={profile.email} />
              <InfoRow label="Phone" value={profile.phone} />
              <InfoRow label="Qualification" value={profile.qualification} />
              <InfoRow label="Specialization" value={profile.specialization} />
              <InfoRow label="Joining Date" value={profile.joining_date} />
            </div>
          )}
        </div>
      </div>

      {/* Recent announcements */}
      <div className="mt-5 bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Announcements</h3>
        {announcements.length === 0
          ? <p className="text-sm text-gray-400">No announcements yet.</p>
          : (
            <div className="space-y-3">
              {announcements.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{a.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{a.content}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs text-gray-400">
                      {a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">{a.target_audience}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  )
}
