import apiClient from './client'

// Admin
export const getParents = (params) => apiClient.get('/parents/', { params })
export const createParent = (data) => apiClient.post('/parents/', data)
export const getParent = (id) => apiClient.get(`/parents/${id}/`)
export const updateParent = (id, data) => apiClient.patch(`/parents/${id}/`, data)
export const deleteParent = (id) => apiClient.delete(`/parents/${id}/`)

// Links
export const getLinks = (params) => apiClient.get('/parents/links/', { params })
export const createLink = (data) => apiClient.post('/parents/links/', data)
export const deleteLink = (id) => apiClient.delete(`/parents/links/${id}/`)

// Parent portal
export const getMyChildren = () => apiClient.get('/parents/my-children/')
export const getChildAttendance = (studentId, month, year) =>
  apiClient.get(`/parents/child/${studentId}/attendance/`, { params: { month, year } })
export const getChildFees = (studentId, params) =>
  apiClient.get(`/parents/child/${studentId}/fees/`, { params })
export const getChildAnnouncements = (studentId) =>
  apiClient.get(`/parents/child/${studentId}/announcements/`)
