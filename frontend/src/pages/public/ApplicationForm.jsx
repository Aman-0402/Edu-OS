import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { submitApplication } from '@/api/applications'

const EMPTY = {
  first_name: '', last_name: '', email: '', phone: '',
  date_of_birth: '', gender: '',
  blood_group: '', address: '',
  father_name: '', father_occupation: '', father_salary_range: '',
  mother_name: '', mother_occupation: '', mother_salary_range: '',
  guardian_name: '', guardian_relation: '', guardian_phone: '',
}

const SALARY_OPTIONS = [
  { value: '₹0',        label: '₹0 (No Income)' },
  { value: 'Below ₹1L', label: 'Below ₹1L / year' },
  { value: '₹1L–3L',   label: '₹1L – 3L / year' },
  { value: '₹3L–5L',   label: '₹3L – 5L / year' },
  { value: '₹5L–10L',  label: '₹5L – 10L / year' },
  { value: '₹10L–20L', label: '₹10L – 20L / year' },
  { value: 'Above ₹20L', label: 'Above ₹20L / year' },
]

// step: 'form' | 'preview' | 'success'
export default function ApplicationForm() {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [step, setStep] = useState('form')
  const [showConfirm, setShowConfirm] = useState(false)

  const mutation = useMutation({
    mutationFn: submitApplication,
    onSuccess: () => { setShowConfirm(false); setStep('success') },
    onError: (e) => {
      setShowConfirm(false)
      setStep('form')
      const data = e.response?.data
      if (data && typeof data === 'object') setErrors(data)
      else setErrors({ non_field_errors: ['Something went wrong. Please try again.'] })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
  })

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => { const next = { ...e }; delete next[field]; return next })
  }

  function handleFormSubmit(e) {
    e.preventDefault()
    setErrors({})
    setStep('preview')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const fe = (f) => errors[f]?.[0] ?? errors[f]

  // ── Success ────────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center shadow-sm">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Application Submitted!</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Your application has been received successfully.
          </p>
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3">
            <p className="text-blue-700 font-medium text-sm">
              Please Contact Admin for Approval of your Form.
            </p>
          </div>
          <button
            onClick={() => { setForm(EMPTY); setErrors({}); setStep('form') }}
            className="mt-6 px-5 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
          >
            Submit another application
          </button>
        </div>
      </div>
    )
  }

  // ── Preview ────────────────────────────────────────────────────────────────
  if (step === 'preview') {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4">
        <Header />

        <div className="max-w-2xl mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 mb-5 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-700 font-medium">Review your details carefully before submitting.</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">

            <PSection title="Account">
              <PRow label="First Name"   value={form.first_name} />
              <PRow label="Last Name"    value={form.last_name} />
              <PRow label="Email"        value={form.email} />
              <PRow label="Phone"        value={form.phone} />
              <PRow label="Date of Birth" value={form.date_of_birth} />
              <PRow label="Gender"       value={cap(form.gender)} />
            </PSection>

            <PSection title="Profile">
              <PRow label="Blood Group" value={form.blood_group} />
              <PRow label="Address"     value={form.address} />
            </PSection>

            <PSection title="Parents">
              <PRow label="Father's Name"       value={form.father_name} />
              <PRow label="Father's Occupation" value={form.father_occupation} />
              <PRow label="Father's Salary"     value={form.father_salary_range} />
              <PRow label="Mother's Name"       value={form.mother_name} />
              <PRow label="Mother's Occupation" value={form.mother_occupation} />
              <PRow label="Mother's Salary"     value={form.mother_salary_range} />
            </PSection>

            <PSection title="Guardian">
              <PRow label="Guardian Name"  value={form.guardian_name} />
              <PRow label="Relation"       value={form.guardian_relation} />
              <PRow label="Guardian Phone" value={form.guardian_phone} />
            </PSection>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setStep('form'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
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

        {showConfirm && (
          <ConfirmModal
            isPending={mutation.isPending}
            onCancel={() => setShowConfirm(false)}
            onConfirm={() => mutation.mutate(form)}
          />
        )}
      </div>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <Header />

      <form onSubmit={handleFormSubmit} className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
        {errors.non_field_errors && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{errors.non_field_errors[0]}</p>
        )}

        {/* Account */}
        <section>
          <SectionTitle>Account</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" error={fe('first_name')}>
              <input required value={form.first_name} onChange={(e) => set('first_name', e.target.value)}
                className={inp(fe('first_name'))} placeholder="Jane" />
            </Field>
            <Field label="Last Name" error={fe('last_name')}>
              <input required value={form.last_name} onChange={(e) => set('last_name', e.target.value)}
                className={inp(fe('last_name'))} placeholder="Doe" />
            </Field>
            <Field label="Email" error={fe('email')}>
              <input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                className={inp(fe('email'))} placeholder="jane@school.com" />
            </Field>
            <Field label="Phone" error={fe('phone')}>
              <input required value={form.phone} onChange={(e) => set('phone', e.target.value)}
                className={inp(fe('phone'))} placeholder="+91 9876543210" />
            </Field>
            <Field label="Date of Birth" error={fe('date_of_birth')}>
              <input required type="date" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)}
                className={inp(fe('date_of_birth'))} />
            </Field>
            <Field label="Gender" error={fe('gender')}>
              <select required value={form.gender} onChange={(e) => set('gender', e.target.value)} className={inp(fe('gender'))}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </div>
        </section>

        {/* Profile */}
        <section>
          <SectionTitle>Profile</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Blood Group" error={fe('blood_group')}>
              <select required value={form.blood_group} onChange={(e) => set('blood_group', e.target.value)} className={inp(fe('blood_group'))}>
                <option value="">Select</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </Field>
            <Field label="Address" error={fe('address')} className="col-span-2">
              <textarea required rows={2} value={form.address} onChange={(e) => set('address', e.target.value)}
                className={inp(fe('address'))} placeholder="Home address" />
            </Field>
          </div>
        </section>

        {/* Parents */}
        <section>
          <SectionTitle>Parents</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Father's Name" error={fe('father_name')}>
              <input required value={form.father_name} onChange={(e) => set('father_name', e.target.value)}
                className={inp(fe('father_name'))} placeholder="Father's full name" />
            </Field>
            <Field label="Father's Occupation" error={fe('father_occupation')}>
              <input required value={form.father_occupation} onChange={(e) => set('father_occupation', e.target.value)}
                className={inp(fe('father_occupation'))} placeholder="e.g. Engineer, Farmer" />
            </Field>
            <Field label="Father's Salary Range" error={fe('father_salary_range')} className="col-span-2">
              <select required value={form.father_salary_range} onChange={(e) => set('father_salary_range', e.target.value)}
                className={inp(fe('father_salary_range'))}>
                <option value="">Select range</option>
                {SALARY_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>

            <Field label="Mother's Name" error={fe('mother_name')}>
              <input required value={form.mother_name} onChange={(e) => set('mother_name', e.target.value)}
                className={inp(fe('mother_name'))} placeholder="Mother's full name" />
            </Field>
            <Field label="Mother's Occupation" error={fe('mother_occupation')}>
              <input required value={form.mother_occupation} onChange={(e) => set('mother_occupation', e.target.value)}
                className={inp(fe('mother_occupation'))} placeholder="e.g. Teacher, Homemaker" />
            </Field>
            <Field label="Mother's Salary Range" error={fe('mother_salary_range')} className="col-span-2">
              <select required value={form.mother_salary_range} onChange={(e) => set('mother_salary_range', e.target.value)}
                className={inp(fe('mother_salary_range'))}>
                <option value="">Select range</option>
                {SALARY_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        {/* Guardian */}
        <section>
          <SectionTitle>Guardian</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Guardian Name" error={fe('guardian_name')}>
              <input required value={form.guardian_name} onChange={(e) => set('guardian_name', e.target.value)}
                className={inp(fe('guardian_name'))} placeholder="Guardian full name" />
            </Field>
            <Field label="Relation to Student" error={fe('guardian_relation')}>
              <select required value={form.guardian_relation} onChange={(e) => set('guardian_relation', e.target.value)}
                className={inp(fe('guardian_relation'))}>
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
            <Field label="Guardian Phone" error={fe('guardian_phone')} className="col-span-2">
              <input required value={form.guardian_phone} onChange={(e) => set('guardian_phone', e.target.value)}
                className={inp(fe('guardian_phone'))} placeholder="+91 9876543210" />
            </Field>
          </div>
        </section>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="submit"
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Preview & Submit →
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function Header() {
  return (
    <div className="max-w-2xl mx-auto mb-8 text-center">
      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
        <span className="text-white font-bold text-lg">E</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Student Admission Application</h1>
      <p className="text-gray-500 text-sm mt-1">
        All fields are required. The school admin will review and approve your form.
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

function PSection({ title, children }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function PRow({ label, value }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-gray-400 w-36 shrink-0">{label}</span>
      <span className="text-gray-800 font-medium flex-1 break-words">
        {value || <span className="text-gray-300 font-normal italic">—</span>}
      </span>
    </div>
  )
}

function ConfirmModal({ isPending, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl text-center">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="font-semibold text-gray-900 mb-1">Are you sure?</h3>
        <p className="text-sm text-gray-500 mb-5">
          Please confirm that all the details you have entered are correct before submitting.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Submitting…' : 'Yes, Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}

const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
