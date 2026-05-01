import apiClient from './client'

// Academic Years
export const getAcademicYears = () => apiClient.get('/academics/years/')
export const getCurrentAcademicYear = () => apiClient.get('/academics/years/current/')
export const createAcademicYear = (data) => apiClient.post('/academics/years/', data)
export const updateAcademicYear = (id, data) => apiClient.patch(`/academics/years/${id}/`, data)
export const deleteAcademicYear = (id) => apiClient.delete(`/academics/years/${id}/`)

// Classes
export const getClasses = () => apiClient.get('/academics/classes/')
export const createClass = (data) => apiClient.post('/academics/classes/', data)
export const updateClass = (id, data) => apiClient.patch(`/academics/classes/${id}/`, data)
export const deleteClass = (id) => apiClient.delete(`/academics/classes/${id}/`)

// Sections
export const getSections = (params) => apiClient.get('/academics/sections/', { params })
export const createSection = (data) => apiClient.post('/academics/sections/', data)
export const updateSection = (id, data) => apiClient.patch(`/academics/sections/${id}/`, data)
export const deleteSection = (id) => apiClient.delete(`/academics/sections/${id}/`)
export const assignTeacher = (id, class_teacher_id) =>
  apiClient.patch(`/academics/sections/${id}/assign-teacher/`, { class_teacher_id })

// Subjects
export const getSubjects = (params) => apiClient.get('/academics/subjects/', { params })
export const createSubject = (data) => apiClient.post('/academics/subjects/', data)
export const updateSubject = (id, data) => apiClient.patch(`/academics/subjects/${id}/`, data)
export const deleteSubject = (id) => apiClient.delete(`/academics/subjects/${id}/`)
