import apiClient from './client'

export const getKpis = () => apiClient.get('/reports/kpis/')
export const getAttendanceTrend = (params) => apiClient.get('/reports/attendance-trend/', { params })
export const getFeeCollectionTrend = (params) => apiClient.get('/reports/fee-trend/', { params })
export const getStudentStrength = (params) => apiClient.get('/reports/student-strength/', { params })
export const getFeeCategoryBreakdown = (params) => apiClient.get('/reports/fee-categories/', { params })
export const exportAttendanceCsv = (params) => {
  const query = new URLSearchParams(params).toString()
  return `/api/reports/export/attendance/?${query}`
}
export const exportFeesCsv = (params) => {
  const query = new URLSearchParams(params).toString()
  return `/api/reports/export/fees/?${query}`
}
