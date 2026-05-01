import apiClient from './client'

// Categories
export const getCategories = () => apiClient.get('/fees/categories/')
export const createCategory = (data) => apiClient.post('/fees/categories/', data)
export const updateCategory = (id, data) => apiClient.patch(`/fees/categories/${id}/`, data)
export const deleteCategory = (id) => apiClient.delete(`/fees/categories/${id}/`)

// Structures
export const getStructures = (params) => apiClient.get('/fees/structures/', { params })
export const createStructure = (data) => apiClient.post('/fees/structures/', data)
export const updateStructure = (id, data) => apiClient.patch(`/fees/structures/${id}/`, data)
export const deleteStructure = (id) => apiClient.delete(`/fees/structures/${id}/`)

// Bulk assign
export const bulkAssignFees = (data) => apiClient.post('/fees/assign/', data)

// Student fees
export const getStudentFees = (params) => apiClient.get('/fees/student-fees/', { params })
export const getStudentFee = (id) => apiClient.get(`/fees/student-fees/${id}/`)
export const recordPayment = (studentFeeId, data) =>
  apiClient.post(`/fees/student-fees/${studentFeeId}/pay/`, data)

// Reports
export const getDefaulters = (params) => apiClient.get('/fees/defaulters/', { params })
export const getCollectionReport = (params) => apiClient.get('/fees/collection-report/', { params })
