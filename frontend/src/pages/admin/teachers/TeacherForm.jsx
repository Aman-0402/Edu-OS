import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTeacher } from '@/api/teachers'
import PageHeader from '@/components/ui/PageHeader'

const EMPTY = {
  email: '', first_name: '', last_name: '', phone: '', password: '',
  qualification: '', specialization: '', joining_date: '',
}

export default function TeacherForm() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  const createMut = useMutation({
    mutationFn: createTeacher,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['teachers'] })
      navigate(`/admin/teachers/${res.data.id}`)
    },
    onError: (e) => {
      const data = e.response?.data
      if (data && typeof data === 'object') setErrors(data)
      else setErrors({ non_field_errors: ['Something went wrong.'] })
    },
  })

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => { const next = { ...e }; delete next[field]; return next })
  }

  function handleSubmit(e) {
    e.preventDefault()
    setErrors({})
    createMut.mutate(form)
  }

  const fieldError = (f) => errors[f]?.[0] ?? errors[f]

  return (
    <div>
      <PageHeader title="Add New Teacher" subtitle="Creates a teacher account and profile" />

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl space-y-6">
        {errors.non_field_errors && (
          <p className="text-sm text-red-600">{errors.non_field_errors[0]}</p>
        )}

        {/* Account */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">Account</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" error={fieldError('first_name')}>
              <input required value={form.first_name} onChange={(e) => set('first_name', e.target.value)}
                className={inp(fieldError('first_name'))} placeholder="John" />
            </Field>
            <Field label="Last Name" error={fieldError('last_name')}>
              <input required value={form.last_name} onChange={(e) => set('last_name', e.target.value)}
                className={inp(fieldError('last_name'))} placeholder="Smith" />
            </Field>
            <Field label="Email" error={fieldError('email')}>
              <input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                className={inp(fieldError('email'))} placeholder="john@school.com" />
            </Field>
            <Field label="Phone" error={fieldError('phone')}>
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)}
                className={inp(fieldError('phone'))} placeholder="+91 9876543210" />
            </Field>
            <Field label="Password" error={fieldError('password')} className="col-span-2">
              <input required type="password" value={form.password} onChange={(e) => set('password', e.target.value)}
                className={inp(fieldError('password'))} placeholder="Min 8 characters" />
            </Field>
          </div>
        </section>

        {/* Profile */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">Professional Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Qualification" error={fieldError('qualification')}>
              <input value={form.qualification} onChange={(e) => set('qualification', e.target.value)}
                className={inp(fieldError('qualification'))} placeholder="e.g. B.Ed, M.Sc" />
            </Field>
            <Field label="Specialization" error={fieldError('specialization')}>
              <input value={form.specialization} onChange={(e) => set('specialization', e.target.value)}
                className={inp(fieldError('specialization'))} placeholder="e.g. Mathematics" />
            </Field>
            <Field label="Joining Date" error={fieldError('joining_date')}>
              <input type="date" value={form.joining_date} onChange={(e) => set('joining_date', e.target.value)}
                className={inp(fieldError('joining_date'))} />
            </Field>
          </div>
        </section>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => navigate('/admin/teachers')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
            Cancel
          </button>
          <button type="submit" disabled={createMut.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {createMut.isPending ? 'Creating...' : 'Create Teacher'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, error, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

function inp(hasError) {
  return `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    hasError ? 'border-red-400' : 'border-gray-300'
  }`
}
