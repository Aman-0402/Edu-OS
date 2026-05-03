import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { getApplications, approveApplication, rejectApplication } from '@/api/applications'
import PageHeader from '@/components/ui/PageHeader'

const STATUS_TABS = [
  { key: 'pending',  label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

export default function ApplicationsList() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('pending')
  const [selected, setSelected] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['applications', activeTab],
    queryFn: () => getApplications({ status: activeTab }).then((r) => r.data),
  })

  const approveMut = useMutation({
    mutationFn: (id) => approveApplication(id),
    onSuccess: () => {
      toast.success('Application approved — student account created.')
      qc.invalidateQueries({ queryKey: ['applications'] })
      qc.invalidateQueries({ queryKey: ['students'] })
      setSelected(null)
    },
    onError: (e) => {
      const msg = e.response?.data?.error || e.response?.data?.email?.[0] || 'Approval failed.'
      toast.error(msg)
    },
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }) => rejectApplication(id, reason),
    onSuccess: () => {
      toast.success('Application rejected.')
      qc.invalidateQueries({ queryKey: ['applications'] })
      setSelected(null)
      setShowRejectModal(false)
      setRejectReason('')
    },
    onError: () => toast.error('Rejection failed.'),
  })

  const applications = data?.results ?? data ?? []

  function closeDetail() {
    setSelected(null)
    setShowRejectModal(false)
    setRejectReason('')
  }

  return (
    <div>
      <PageHeader
        title="Admission Applications"
        subtitle="Review and approve student applications submitted online"
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1 w-fit">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); setSelected(null) }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>
      ) : applications.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <p className="text-gray-400 text-sm">No {activeTab} applications</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {applications.map((app) => (
            <button
              key={app.id}
              onClick={() => setSelected(app)}
              className="w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm hover:text-blue-600 transition-colors">
                    {app.first_name} {app.last_name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{app.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <StatusBadge status={app.status} />
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(app.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeDetail() }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="font-semibold text-gray-900">
                  {selected.first_name} {selected.last_name}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">{selected.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={selected.status} />
                <button
                  onClick={closeDetail}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              <Section title="Account">
                <Row label="Full Name"    value={`${selected.first_name} ${selected.last_name}`} />
                <Row label="Email"        value={selected.email} />
                <Row label="Phone"        value={selected.phone} />
                <Row label="Date of Birth" value={selected.date_of_birth} />
                <Row label="Gender"       value={cap(selected.gender)} />
                <Row label="Blood Group"  value={selected.blood_group} />
                <Row label="Address"      value={selected.address} />
              </Section>

              <Section title="Parents">
                <Row label="Father's Name"       value={selected.father_name} />
                <Row label="Father's Occupation" value={selected.father_occupation} />
                <Row label="Father's Salary"     value={selected.father_salary_range} />
                <Row label="Mother's Name"       value={selected.mother_name} />
                <Row label="Mother's Occupation" value={selected.mother_occupation} />
                <Row label="Mother's Salary"     value={selected.mother_salary_range} />
              </Section>

              <Section title="Guardian">
                <Row label="Guardian Name"  value={selected.guardian_name} />
                <Row label="Relation"       value={selected.guardian_relation} />
                <Row label="Guardian Phone" value={selected.guardian_phone} />
              </Section>

              {selected.rejection_reason && (
                <Section title="Rejection">
                  <Row label="Reason" value={selected.rejection_reason} valueClass="text-red-600" />
                </Section>
              )}
            </div>

            {/* Footer actions */}
            {selected.status === 'pending' && !showRejectModal && (
              <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
                <button
                  onClick={() => approveMut.mutate(selected.id)}
                  disabled={approveMut.isPending || rejectMut.isPending}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 disabled:opacity-50"
                >
                  {approveMut.isPending ? 'Approving…' : 'Approve'}
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={approveMut.isPending || rejectMut.isPending}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            )}

            {/* Inline reject form inside modal */}
            {selected.status === 'pending' && showRejectModal && (
              <div className="px-6 py-4 border-t border-gray-100 shrink-0">
                <p className="text-sm font-medium text-gray-700 mb-2">Reason for rejection <span className="text-gray-400 font-normal">(optional)</span></p>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Incomplete documents, already enrolled…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-3"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowRejectModal(false); setRejectReason('') }}
                    className="flex-1 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => rejectMut.mutate({ id: selected.id, reason: rejectReason })}
                    disabled={rejectMut.isPending}
                    className="flex-1 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50"
                  >
                    {rejectMut.isPending ? 'Rejecting…' : 'Confirm Reject'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Row({ label, value, valueClass = 'text-gray-800' }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-gray-400 w-36 shrink-0">{label}</span>
      <span className={`flex-1 min-w-0 break-words font-medium ${valueClass}`}>
        {value || <span className="text-gray-300 font-normal">—</span>}
      </span>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    pending:  'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-600',
  }
  return (
    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[status] ?? ''}`}>
      {cap(status)}
    </span>
  )
}

const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
