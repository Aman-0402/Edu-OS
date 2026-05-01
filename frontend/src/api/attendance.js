import apiClient from './client'

export const getSession = (section, date) =>
  apiClient.get('/attendance/session/', { params: { section, date } })

export const getSessions = (params) =>
  apiClient.get('/attendance/sessions/', { params })

export const getSectionStudents = (section) =>
  apiClient.get('/attendance/section-students/', { params: { section } })

export const bulkMarkAttendance = (data) =>
  apiClient.post('/attendance/mark/', data)

export const getStudentSummary = (studentId, month, year) =>
  apiClient.get(`/attendance/summary/${studentId}/`, { params: { month, year } })

export const getSectionReport = (params) =>
  apiClient.get('/attendance/report/', { params })
