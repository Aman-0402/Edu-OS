import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute, RoleRoute } from '@/components/ui/ProtectedRoute'

import LoginPage from '@/pages/auth/LoginPage'

import AdminLayout from '@/components/layouts/AdminLayout'
import TeacherLayout from '@/components/layouts/TeacherLayout'
import StudentLayout from '@/components/layouts/StudentLayout'
import ParentLayout from '@/components/layouts/ParentLayout'

import AdminDashboard from '@/pages/admin/Dashboard'
import TeacherDashboard from '@/pages/teacher/Dashboard'
import StudentDashboard from '@/pages/student/Dashboard'
import ParentDashboard from '@/pages/parent/Dashboard'

import AcademicYears from '@/pages/admin/academics/AcademicYears'
import Classes from '@/pages/admin/academics/Classes'
import Sections from '@/pages/admin/academics/Sections'
import Subjects from '@/pages/admin/academics/Subjects'

import StudentsList from '@/pages/admin/students/StudentsList'
import StudentForm from '@/pages/admin/students/StudentForm'
import StudentDetail from '@/pages/admin/students/StudentDetail'

import TeachersList from '@/pages/admin/teachers/TeachersList'
import TeacherForm from '@/pages/admin/teachers/TeacherForm'
import TeacherDetail from '@/pages/admin/teachers/TeacherDetail'

import AttendanceReport from '@/pages/admin/attendance/AttendanceReport'
import MarkAttendance from '@/pages/teacher/attendance/MarkAttendance'

import FeeSetup from '@/pages/admin/fees/FeeSetup'
import FeeCollection from '@/pages/admin/fees/FeeCollection'
import ParentsPage from '@/pages/admin/parents/ParentsPage'
import Reports from '@/pages/admin/Reports'

function RootRedirect() {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (!user) return <Navigate to="/login" replace />
  const map = {
    admin: '/admin/dashboard',
    teacher: '/teacher/dashboard',
    student: '/student/dashboard',
    parent: '/parent/dashboard',
  }
  return <Navigate to={map[user.role] ?? '/login'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RootRedirect />} />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['admin']}>
                <AdminLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="academics" element={<Navigate to="years" replace />} />
          <Route path="academics/years" element={<AcademicYears />} />
          <Route path="academics/classes" element={<Classes />} />
          <Route path="academics/sections" element={<Sections />} />
          <Route path="academics/subjects" element={<Subjects />} />

          <Route path="students" element={<StudentsList />} />
          <Route path="students/new" element={<StudentForm />} />
          <Route path="students/:id" element={<StudentDetail />} />

          <Route path="teachers" element={<TeachersList />} />
          <Route path="teachers/new" element={<TeacherForm />} />
          <Route path="teachers/:id" element={<TeacherDetail />} />

          <Route path="attendance" element={<AttendanceReport />} />

          <Route path="fees" element={<Navigate to="setup" replace />} />
          <Route path="fees/setup" element={<FeeSetup />} />
          <Route path="fees/collection" element={<FeeCollection />} />

          <Route path="parents" element={<ParentsPage />} />
          <Route path="reports" element={<Reports />} />
        </Route>

        {/* Teacher */}
        <Route
          path="/teacher"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['teacher']}>
                <TeacherLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="attendance" element={<MarkAttendance />} />
        </Route>

        {/* Student */}
        <Route
          path="/student"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['student']}>
                <StudentLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
        </Route>

        {/* Parent */}
        <Route
          path="/parent"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['parent']}>
                <ParentLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ParentDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
