import { createContext, useContext, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAcademicYears, getCurrentAcademicYear } from '@/api/academics'
import { useAuth } from './AuthContext'

const AcademicYearContext = createContext(null)

export function AcademicYearProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [selectedYearId, setSelectedYearId] = useState(null)

  const { data: yearsData } = useQuery({
    queryKey: ['academicYears'],
    queryFn: () => getAcademicYears().then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  })

  const { data: currentYear } = useQuery({
    queryKey: ['currentAcademicYear'],
    queryFn: () => getCurrentAcademicYear().then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  })

  // Auto-select the current year when it loads
  useEffect(() => {
    if (currentYear && !selectedYearId) {
      setSelectedYearId(currentYear.id)
    }
  }, [currentYear, selectedYearId])

  const selectedYear = yearsData?.find((y) => y.id === selectedYearId) ?? currentYear ?? null

  const value = {
    years: yearsData ?? [],
    selectedYear,
    selectedYearId,
    setSelectedYearId,
    currentYear: currentYear ?? null,
  }

  return (
    <AcademicYearContext.Provider value={value}>
      {children}
    </AcademicYearContext.Provider>
  )
}

export function useAcademicYear() {
  const ctx = useContext(AcademicYearContext)
  if (!ctx) throw new Error('useAcademicYear must be used inside <AcademicYearProvider>')
  return ctx
}
