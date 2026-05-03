import axios from 'axios'
import apiClient from './client'

// Public — no auth token needed
export const submitApplication = (data) =>
  axios.post('/api/students/applications/submit/', data, {
    headers: { 'Content-Type': 'application/json' },
  })

// Admin — requires auth
export const getApplications = (params) =>
  apiClient.get('/students/applications/', { params })

export const getApplication = (id) =>
  apiClient.get(`/students/applications/${id}/`)

export const approveApplication = (id) =>
  apiClient.post(`/students/applications/${id}/`, { action: 'approve' })

export const rejectApplication = (id, rejection_reason = '') =>
  apiClient.post(`/students/applications/${id}/`, { action: 'reject', rejection_reason })
