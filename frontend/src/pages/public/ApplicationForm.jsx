import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { submitApplication } from '@/api/applications'

const SALARY_OPTIONS = [
  { value: '₹0', label: '₹0 (No Income)' },
  { value: 'Below ₹1L', label: 'Below ₹1L / year' },
  { value: '₹1L–3L', label: '₹1L – 3L / year' },
  { value: '₹3L–5L', label: '₹3L – 5L / year' },
  { value: '₹5L–10L', label: '₹5L – 10L / year' },
  { value: '₹10L–20L', label: '₹10L – 20L / year' },
  { value: 'Above ₹20L', label: 'Above ₹20L / year' },
]

const EMPTY = {
  first_name: '', last_name: '', email: '', phone: '',
  date_of_birth: '', gender: '', address: '', blood_group: '',
  father_name: '', father_occupation: '', father_salary_range: '',
  mother_name: '', mother_occupation: '', mother_salary_range: '',
  guardian_name: '', guardian_phone: '', guardian_relation: '',
}

// page: 'form' | 'preview' | 'success'
export default function ApplicationForm() {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [page, setPage] = useState('form')
  const [showConfirm, setShowConfirm] = useState(false)

  const mutation = useMutation({
    mutationFn: submitApplication,
    onSuccess: () => { setShowConfirm(false); setPage('success') },
    onError: (e) => {
      setShowConfirm(false)
      setPage('form')
      const data = e.response?.data
      if (data && typeof data === 'object') setErrors(data)
      else setErrors({ non_field_errors: ['Something went wrong. Please try again.'] })
    },
  })

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => { const next = { ...e }; delete next[field]; return next })
  }

  function handleFormSubmit(e) {
    e.preventDefault()
    setErrors({})
    setPage('preview')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const fieldError = (f) => errors[f]?.[0] ?? errors[f]

  if (page === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center shadow-sm">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Application Submitted!</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-1">
            Your application has been received successfully.
          </p>
          <p className="text-blue-700 font-medium text-sm bg-blue-50 rounded-lg px-4 py-2 mt-3">
            Please Contact Admin for Approval of your Form.
          </p>
          <button
            onClick={() => { setForm(EMPTY); setErrors({}); setPage('form') }}
            className="mt-6 px-5 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
          >
            Submit another application
          </button>
        </div>
      </div>
    )
  }

  if (page === 'preview') {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4">
        <PageHeader />

        <div className="max-w-2xl mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 mb-5 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-700 font-medium">Please review your details before submitting.</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
            <PreviewSection title="Student Information">
              <PreviewRow label="Full Name" value={`${form.first_name} ${form.last_name}`} />
              <PreviewRow label="Email" value={form.email} />
              <PreviewRow label="Phone" value={form.phone} />
              <PreviewRow label="Date of Birth" value={form.date_of_birth} />
              <PreviewRow label="Gender" value={cap(form.gender)} />
              <PreviewRow label="Blood Group" value={form.blood_group} />
              <PreviewRow label="Address" value={form.address} />
            </PreviewSection>

            <PreviewSection title="Father's Information">
              <PreviewRow label="Name" value={form.father_name} />
              <PreviewRow label="Occupation" value={form.father_occupation} />
              <PreviewRow label="Annual Salary" value={salaryLabel(form.father_salary_range)} />
            </PreviewSection>

            <PreviewSection title="Mother's Information">
              <PreviewRow label="Name" value={form.mother_name} />
              <PreviewRow label="Occupation" value={form.mother_occupation} />
              <PreviewRow label="Annual Salary" value={salaryLabel(form.mother_salary_range)} />
            </PreviewSection>

            <PreviewSection title="Guardian / Primary Contact">
              <PreviewRow label="Guardian Name" value={form.guardian_name} />
              <PreviewRow label="Relation" value={form.guardian_relation} />
              <PreviewRow label="Phone" value={form.guardian_phone} />
            </PreviewSection>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setPage('form'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200"
              >
                ← Edit Details
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700"
              >
                Submit Application →
              </button>
            </div>
          </div>
        </div>

        {/* Confirm modal */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Are you sure?</h3>
              <p className="text-sm text-gray-500 mb-5">
                Once submitted, this application will be sent to the school admin for approval. Make sure all details are correct.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={mutation.isPending}
                  className="flex-1 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  Go Back
                </button>
                <button
                  onClick={() => mutation.mutate(form)}
                  disabled={mutation.isPending}
                  className="flex-1 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {mutation.isPending ? 'Submitting…' : 'Yes, Submit'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // page === 'form'
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <PageHeader />

      <form onSubmit={handleFormSubmit} className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
        {errors.non_field_errors && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{errors.non_field_errors[0]}</p>
        )}

        {/* Student Information */}
        <section>
          <SectionTitle>Student Information</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First Name" error={fieldError('first_name')}>
              <input required value={form.first_name} onChange={(e) => set('first_name', e.target.value)}
                className={inp(fieldError('first_name'))} placeholder="e.g. Priya" />
            </Field>
            <Field label="Last Name" error={fieldError('last_name')}>
              <input required value={form.last_name} onChange={(e) => set('last_name', e.target.value)}
                className={inp(fieldError('last_name'))} placeholder="e.g. Sharma" />
            </Field>
            <Field label="Email Address" error={fieldError('email')}>
              <input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                className={inp(fieldError('email'))} placeholder="student@example.com" />
            </Field>
            <Field label="Phone Number" error={fieldError('phone')}>
              <input required value={form.phone} onChange={(e) => set('phone', e.target.value)}
                className={inp(fieldError('phone'))} placeholder="+91 9876543210" />
            </Field>
            <Field label="Date of Birth" error={fieldError('date_of_birth')}>
              <input required type="date" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)}
                className={inp(fieldError('date_of_birth'))} />
            </Field>
            <Field label="Gender" error={fieldError('gender')}>
              <select required value={form.gender} onChange={(e) => set('gender', e.target.value)} className={inp(fieldError('gender'))}>
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Blood Group" error={fieldError('blood_group')}>
              <select required value={form.blood_group} onChange={(e) => set('blood_group', e.target.value)} className={inp(fieldError('blood_group'))}>
                <option value="">Select blood group</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </Field>
            <Field label="Home Address" error={fieldError('address')} className="sm:col-span-2">
              <textarea required rows={2} value={form.address} onChange={(e) => set('address', e.target.value)}
                className={inp(fieldError('address'))} placeholder="Full home address" />
            </Field>
          </div>
        </section>

        {/* Father */}
        <section>
          <SectionTitle>Father's Information</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Father's Full Name" error={fieldError('father_name')}>
              <input required value={form.father_name} onChange={(e) => set('father_name', e.target.value)}
                className={inp(fieldError('father_name'))} placeholder="Father's full name" />
            </Field>
            <Field label="Occupation" error={fieldError('father_occupation')}>
              <input required value={form.father_occupation} onChange={(e) => set('father_occupation', e.target.value)}
                className={inp(fieldError('father_occupation'))} placeholder="e.g. Engineer, Farmer" />
            </Field>
            <Field label="Annual Salary Range" error={fieldError('father_salary_range')} className="sm:col-span-2">
              <select required value={form.father_salary_range} onChange={(e) => set('father_salary_range', e.target.value)}
                className={inp(fieldError('father_salary_range'))}>
                <option value="">Select salary range</option>
                {SALARY_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        {/* Mother */}
        <section>
          <SectionTitle>Mother's Information</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Mother's Full Name" error={fieldError('mother_name')}>
              <input required value={form.mother_name} onChange={(e) => set('mother_name', e.target.value)}
                className={inp(fieldError('mother_name'))} placeholder="Mother's full name" />
            </Field>
            <Field label="Occupation" error={fieldError('mother_occupation')}>
              <input required value={form.mother_occupation} onChange={(e) => set('mother_occupation', e.target.value)}
                className={inp(fieldError('mother_occupation'))} placeholder="e.g. Teacher, Homemaker" />
            </Field>
            <Field label="Annual Salary Range" error={fieldError('mother_salary_range')} className="sm:col-span-2">
              <select required value={form.mother_salary_range} onChange={(e) => set('mother_salary_range', e.target.value)}
                className={inp(fieldError('mother_salary_range'))}>
                <option value="">Select salary range</option>
                {SALARY_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        {/* Guardian */}
        <section>
          <SectionTitle>Guardian / Primary Contact</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Guardian Name" error={fieldError('guardian_name')}>
              <input required value={form.guardian_name} onChange={(e) => set('guardian_name', e.target.value)}
                className={inp(fieldError('guardian_name'))} placeholder="Guardian full name" />
            </Field>
            <Field label="Relation to Student" error={fieldError('guardian_relation')}>
              <select required value={form.guardian_relation} onChange={(e) => set('guardian_relation', e.target.value)}
                className={inp(fieldError('guardian_relation'))}>
                <option value="">Select relation</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Grandfather">Grandfather</option>
                <option value="Grandmother">Grandmother</option>
                <option value="Uncle">Uncle</option>
                <option value="Aunt">Aunt</option>
                <option value="Elder Sibling">Elder Sibling</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="Guardian Phone" error={fieldError('guardian_phone')} className="sm:col-span-2">
              <input required value={form.guardian_phone} onChange={(e) => set('guardian_phone', e.target.value)}
                className={inp(fieldError('guardian_phone'))} placeholder="+91 9876543210" />
            </Field>
          </div>
        </section>

        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
          >
            Preview Application →
          </button>
          <p className="text-center text-xs text-gray-400 mt-3">
            All fields are required. Your information will only be used for admission purposes.
          </p>
        </div>
      </form>
    </div>
  )
}

// ── Shared components ──────────────────────────────────────────────────────────

function PageHeader() {
  return (
    <div className="max-w-2xl mx-auto mb-8 text-center">
      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
        <span className="text-white font-bold text-lg">E</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Student Admission Application</h1>
      <p className="text-gray-500 text-sm mt-1">
        Fill in the details below. The school admin will review and approve your form.
      </p>
    </div>
  )
}

function SectionTitle({ children }) {
  return <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">{children}</h3>
}

function Field({ label, error, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} <span className="text-red-500">*</span>
      </label>
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

function PreviewSection({ title, children }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function PreviewRow({ label, value }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-gray-400 w-32 shrink-0">{label}</span>
      <span className="text-gray-800 font-medium flex-1">{value || <span className="text-gray-300 font-normal italic">—</span>}</span>
    </div>
  )
}

const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

const salaryLabel = (val) => SALARY_OPTIONS.find((o) => o.value === val)?.label ?? val
