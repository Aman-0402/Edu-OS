import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStudentFees, recordPayment, getDefaulters, getCollectionReport } from '@/api/fees'
import { getAcademicYears, getClasses } from '@/api/academics'
import { useAcademicYear } from '@/contexts/AcademicYearContext'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import { toastSuccess, toastError } from '@/lib/toast'

const STATUS_COLORS = {
  pending: 'bg-red-100 text-red-700',
  partial: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  waived: 'bg-gray-100 text-gray-500',
}

function PaymentModal({ studentFee, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ amount_paid: '', payment_date: new Date().toISOString().split('T')[0], method: 'cash', remarks: '' })
  const [error, setError] = useState('')

  const payMut = useMutation({
    mutationFn: (data) => recordPayment(studentFee.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['studentFees'] })
      qc.invalidateQueries({ queryKey: ['defaulters'] })
      toastSuccess('Payment recorded successfully')
      onClose()
    },
    onError: (e) => {
      const msg = e.response?.data?.amount_paid?.[0] ?? e.response?.data?.detail ?? 'Payment failed'
      setError(msg)
      toastError(msg)
    },
  })

  const balance = studentFee.balance

  return (
    <Modal title={`Record Payment — ${studentFee.student_name}`} onClose={onClose}>
      <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm space-y-1">
        <div className="flex justify-between"><span className="text-gray-500">Category</span><span className="font-medium">{studentFee.category_name}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Amount Due</span><span>₹{parseFloat(studentFee.net_amount).toLocaleString()}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Already Paid</span><span className="text-green-600">₹{parseFloat(studentFee.amount_paid).toLocaleString()}</span></div>
        <div className="flex justify-between border-t border-gray-200 pt-1"><span className="font-medium">Balance</span><span className="font-semibold text-red-600">₹{parseFloat(balance).toLocaleString()}</span></div>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); setError(''); payMut.mutate({ ...form, amount_paid: parseFloat(form.amount_paid) }) }} className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
            <input required type="number" min="1" max={balance} step="0.01" value={form.amount_paid}
              onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={balance} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input required type="date" value={form.payment_date}
              onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
          <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="cash">Cash</option>
            <option value="online">Online</option>
            <option value="cheque">Cheque</option>
            <option value="dd">Demand Draft</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
          <input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optional" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
          <button type="submit" disabled={payMut.isPending} className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
            {payMut.isPending ? 'Processing...' : 'Record Payment'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Tab: Collect Fees ─────────────────────────────────────────────────────────

const FEE_PAGE_SIZE = 20

function CollectTab() {
  const { years, selectedYearId, setSelectedYearId } = useAcademicYear()
  const [classId, setClassId] = useState('')
  const [feeStatus, setFeeStatus] = useState('')
  const [feePage, setFeePage] = useState(1)
  const [payingFee, setPayingFee] = useState(null)

  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => getClasses().then((r) => r.data) })

  const params = { page: feePage, page_size: FEE_PAGE_SIZE }
  if (selectedYearId) params.academic_year = selectedYearId
  if (classId) params.class_group = classId
  if (feeStatus) params.status = feeStatus

  const resetPage = () => setFeePage(1)

  const { data: feesData, isLoading } = useQuery({
    queryKey: ['studentFees', params],
    queryFn: () => getStudentFees(params).then((r) => r.data),
    enabled: !!selectedYearId,
  })

  const fees = feesData?.results ?? feesData ?? []
  const feesCount = feesData?.count ?? fees.length

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={selectedYearId ?? ''} onChange={(e) => setSelectedYearId(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Select Year</option>
          {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
        </select>
        <select value={classId} onChange={(e) => { setClassId(e.target.value); resetPage() }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={feeStatus} onChange={(e) => { setFeeStatus(e.target.value); resetPage() }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="waived">Waived</option>
        </select>
      </div>

      {!selectedYearId ? (
        <p className="text-sm text-gray-400">Select an academic year to view fees.</p>
      ) : isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Student</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Class</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Due</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Paid</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {fees.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No fee records. Assign fees to students from Fee Setup first.</td></tr>}
              {fees.map((f) => (
                <tr key={f.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{f.student_name}</td>
                  <td className="px-4 py-3 text-gray-600">{f.class_name}</td>
                  <td className="px-4 py-3 text-gray-700">{f.category_name}</td>
                  <td className="px-4 py-3 text-right text-gray-900">₹{parseFloat(f.net_amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-green-600">₹{parseFloat(f.amount_paid).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">₹{parseFloat(f.balance).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[f.status]}`}>{f.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {f.status !== 'paid' && f.status !== 'waived' && (
                      <button onClick={() => setPayingFee(f)} className="text-xs text-green-600 hover:text-green-800 font-medium">Collect</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination count={feesCount} page={feePage} pageSize={FEE_PAGE_SIZE} onChange={setFeePage} />
        </div>
      )}

      {payingFee && <PaymentModal studentFee={payingFee} onClose={() => setPayingFee(null)} />}
    </div>
  )
}

// ── Tab: Defaulters ───────────────────────────────────────────────────────────

function DefaultersTab() {
  const { years, selectedYearId, setSelectedYearId } = useAcademicYear()
  const [payingFee, setPayingFee] = useState(null)

  const { data: defaulterList = [], isLoading } = useQuery({
    queryKey: ['defaulters', selectedYearId],
    queryFn: () => getDefaulters({ academic_year: selectedYearId }).then((r) => r.data),
    enabled: !!selectedYearId,
  })

  const totalBalance = defaulterList.reduce((sum, f) => sum + parseFloat(f.balance), 0)

  return (
    <div>
      <div className="flex gap-3 mb-4 items-center">
        <select value={selectedYearId ?? ''} onChange={(e) => setSelectedYearId(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Select Year</option>
          {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
        </select>
        {defaulterList.length > 0 && (
          <div className="ml-auto text-sm text-red-600 font-medium">
            {defaulterList.length} outstanding fee{defaulterList.length !== 1 ? 's' : ''} — Total Balance: ₹{totalBalance.toLocaleString()}
          </div>
        )}
      </div>

      {!selectedYearId ? (
        <p className="text-sm text-gray-400">Select an academic year.</p>
      ) : isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Student</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Adm. No.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Class</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Due Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {defaulterList.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No defaulters. All fees are cleared.</td></tr>}
              {defaulterList.map((f) => (
                <tr key={f.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{f.student_name}</td>
                  <td className="px-4 py-3"><span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{f.admission_number}</span></td>
                  <td className="px-4 py-3 text-gray-600">{f.class_name}</td>
                  <td className="px-4 py-3 text-gray-700">{f.category_name}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">₹{parseFloat(f.balance).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600">{f.due_date || '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[f.status]}`}>{f.status}</span></td>
                  <td className="px-4 py-3">
                    <button onClick={() => setPayingFee(f)} className="text-xs text-green-600 hover:text-green-800 font-medium">Collect</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {payingFee && <PaymentModal studentFee={payingFee} onClose={() => setPayingFee(null)} />}
    </div>
  )
}

// ── Tab: Collection Report ────────────────────────────────────────────────────

function ReportTab() {
  const { years, selectedYearId, setSelectedYearId } = useAcademicYear()

  const { data: report = [], isLoading } = useQuery({
    queryKey: ['collectionReport', selectedYearId],
    queryFn: () => getCollectionReport({ academic_year: selectedYearId }).then((r) => r.data),
    enabled: !!selectedYearId,
  })

  const total = report.reduce((s, r) => s + parseFloat(r.total_collected), 0)

  return (
    <div>
      <div className="mb-4">
        <select value={selectedYearId ?? ''} onChange={(e) => setSelectedYearId(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Select Year</option>
          {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
        </select>
      </div>

      {!selectedYearId ? (
        <p className="text-sm text-gray-400">Select an academic year.</p>
      ) : isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <>
          {report.length > 0 && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-xs text-green-600 font-medium">Total Collected</p>
              <p className="text-2xl font-bold text-green-700 mt-1">₹{total.toLocaleString()}</p>
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Total Collected</th>
                </tr>
              </thead>
              <tbody>
                {report.length === 0 && <tr><td colSpan={2} className="px-4 py-8 text-center text-gray-400">No payments recorded for this year.</td></tr>}
                {report.map((r, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-900">{r.category}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">₹{parseFloat(r.total_collected).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FeeCollection() {
  const [tab, setTab] = useState('collect')
  const TABS = [
    { key: 'collect', label: 'Collect Fees' },
    { key: 'defaulters', label: 'Defaulters' },
    { key: 'report', label: 'Collection Report' },
  ]

  return (
    <div>
      <PageHeader title="Fee Collection" subtitle="Record payments, view defaulters and collection summary" />
      <div className="flex gap-1 mb-5">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              tab === t.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'collect' && <CollectTab />}
      {tab === 'defaulters' && <DefaultersTab />}
      {tab === 'report' && <ReportTab />}
    </div>
  )
}
