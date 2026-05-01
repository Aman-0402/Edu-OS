import apiClient from './client'

// Teachers
export const getTeachers = (params) => apiClient.get('/teachers/', { params })
export const createTeacher = (data) => apiClient.post('/teachers/', data)
export const getTeacher = (id) => apiClient.get(`/teachers/${id}/`)
export const updateTeacher = (id, data) => apiClient.patch(`/teachers/${id}/`, data)
export const deleteTeacher = (id) => apiClient.delete(`/teachers/${id}/`)

// Assignments
export const getAssignments = (params) => apiClient.get('/teachers/assignments/', { params })
export const createAssignment = (data) => apiClient.post('/teachers/assignments/', data)
export const deleteAssignment = (id) => apiClient.delete(`/teachers/assignments/${id}/`)

// Announcements
export const getAnnouncements = (params) => apiClient.get('/teachers/announcements/', { params })
export const createAnnouncement = (data) => apiClient.post('/teachers/announcements/', data)
export const updateAnnouncement = (id, data) => apiClient.patch(`/teachers/announcements/${id}/`, data)
export const deleteAnnouncement = (id) => apiClient.delete(`/teachers/announcements/${id}/`)
