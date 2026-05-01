import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { loginApi, logoutApi, refreshTokenApi } from '@/api/auth'
import { setAccessToken, clearAccessToken, getAccessToken } from '@/api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true) // true while checking session on mount

  // On app load: try to restore session silently using refresh cookie
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const { data } = await refreshTokenApi()
        setAccessToken(data.access)
        setUser(data.user ?? null)
        // If API doesn't return user in refresh, decode from token
        if (!data.user && data.access) {
          const payload = JSON.parse(atob(data.access.split('.')[1]))
          setUser({ id: payload.user_id })
        }
      } catch {
        clearAccessToken()
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }
    restoreSession()
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await loginApi(email, password)
    setAccessToken(data.access)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      const token = getAccessToken()
      if (token) await logoutApi(token)
    } catch {
      // swallow — still clear local state
    } finally {
      clearAccessToken()
      setUser(null)
    }
  }, [])

  const value = { user, isLoading, login, logout, isAuthenticated: !!user }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
