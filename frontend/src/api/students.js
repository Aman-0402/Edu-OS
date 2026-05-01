import apiClient from './client'

// Students
export const getStudents = (params) => apiClient.get('/students/', { params })
export const createStudent = (data) => apiClient.post('/students/', data)
export const getStudent = (id) => apiClient.get(`/students/${id}/`)
export const updateStudent = (id, data) => apiClient.patch(`/students/${id}/`, data)
export const deleteStudent = (id) => apiClient.delete(`/students/${id}/`)

// Enrollments
export const getEnrollments = (params) => apiClient.get('/students/enrollments/', { params })
export const createEnrollment = (data) => apiClient.post('/students/enrollments/', data)
export const updateEnrollment = (id, data) => apiClient.patch(`/students/enrollments/${id}/`, data)
export const deleteEnrollment = (id) => apiClient.delete(`/students/enrollments/${id}/`)
