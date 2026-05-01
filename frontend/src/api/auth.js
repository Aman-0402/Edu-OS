import apiClient from './client'

export const loginApi = (email, password) =>
  apiClient.post('/auth/login/', { email, password })

export const logoutApi = (refresh) =>
  apiClient.post('/auth/logout/', { refresh })

export const refreshTokenApi = () =>
  apiClient.post('/auth/token/refresh/', {})

export const getProfileApi = () =>
  apiClient.get('/auth/profile/')

export const updateProfileApi = (data) =>
  apiClient.put('/auth/profile/', data)

export const changePasswordApi = (data) =>
  apiClient.post('/auth/change-password/', data)

export const passwordResetRequestApi = (email) =>
  apiClient.post('/auth/password-reset/', { email })

export const passwordResetConfirmApi = (data) =>
  apiClient.post('/auth/password-reset/confirm/', data)
