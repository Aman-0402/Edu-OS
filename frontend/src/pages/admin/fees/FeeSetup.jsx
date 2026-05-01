import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCategories, createCategory, updateCategory, deleteCategory,
  getStructures, createStructure, updateStructure, deleteStructure,
  bulkAssignFees,
} from '@/api/fees'
import { getAcademicYears, getClasses } from '@/api/academics'
import { useAcademicYear } from '@/contexts/AcademicYearContext'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'

// ── Tab: Categories ───────────────────────────────────────────────────────────

function CategoriesTab() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', is_recurring: true })
  const [error, setError] = useState('')

  const { data: categories = [] } = useQuery({
    queryKey: ['feeCategories'],
    queryFn: () => getCategories().then((r) => r.data),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['feeCategories'] })

  const createMut = useMutation({ mutationFn: createCategory, onSuccess: () => { invalidate(); close() }, onError: (e) => setError(e.response?.data?.name?.[0] ?? 'Failed') })
  const updateMut = useMutation({ mutationFn: ({ id, data }) => updateCategory(id, data), onSuccess: () => { invalidate(); close() }, onError: (e) => setError(e.response?.data?.name?.[0] ?? 'Failed') })
  const deleteMut = useMutation({ mutationFn: deleteCategory, onSuccess: invalidate })

  function open(cat = null) {
    setEditing(cat)
    setForm(cat ? { name: cat.name, description: cat.description, is_recurring: cat.is_recurring } : { name: '', description: '', is_recurring: true })
    setError('')
    setShowModal(true)
  }
  function close() { setShowModal(false); setEditing(null) }

  function handleSubmit(e) {
    e.preventDefault()
    editing ? updateMut.mutate({ id: editing.id, data: form }) : createMut.mutate(form)
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => open()} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">+ Add Category</button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Recurring</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No categories yet.</td></tr>}
            {categories.map((c) => (
              <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                <td className="px-4 py-3 text-gray-600">{c.description || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.is_recurring ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{c.is_recurring ? 'Yes' : 'No'}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => open(c)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                    <button onClick={() => { if (confirm(`Delete "${c.name}"?`)) deleteMut.mutate(c.id) }} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Category' : 'Add Category'} onClose={close}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Tuition Fee" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_recurring} onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })} className="w-4 h-4 rounded" />
              <span className="text-sm text-gray-700">Recurring (charged each term)</span>
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={close} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {createMut.isPending || updateMut.isPending ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ── Tab: Structures ───────────────────────────────────────────────────────────

function StructuresTab() {
  const qc = useQueryClient()
  const { years, selectedYearId, setSelectedYearId } = useAcademicYear()
  const [filterClass, setFilterClass] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ class_group: '', academic_year: '', category: '', amount: '', due_date: '' })
  const [error, setError] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignResult, setAssignResult] = useState(null)

  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => getClasses().then((r) => r.data) })
  const { data: categories = [] } = useQuery({ queryKey: ['feeCategories'], queryFn: () => getCategories().then((r) => r.data) })

  const structureParams = {}
  if (selectedYearId) structureParams.academic_year = selectedYearId
  if (filterClass) structureParams.class_group = filterClass

  const { data: structures = [] } = useQuery({
    queryKey: ['feeStructures', structureParams],
    queryFn: () => getStructures(structureParams).then((r) => r.data),
    enabled: !!selectedYearId,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['feeStructures'] })
  const createMut = useMutation({ mutationFn: createStructure, onSuccess: () => { invalidate(); close() }, onError: (e) => setError(e.response?.data?.non_field_errors?.[0] ?? 'Failed') })
  const updateMut = useMutation({ mutationFn: ({ id, data }) => updateStructure(id, data), onSuccess: () => { invalidate(); close() }, onError: (e) => setError('Failed to update') })
  const deleteMut = useMutation({ mutationFn: deleteStructure, onSuccess: invalidate })
  const assignMut = useMutation({
    mutationFn: bulkAssignFees,
    onSuccess: (res) => { setAssignResult(res.data.message); setAssigning(false) },
    onError: (e) => { setError(e.response?.data?.error ?? 'Failed to assign'); setAssigning(false) },
  })

  function open(s = null) {
    setEditing(s)
    setForm(s ? { class_group: s.class_group, academic_year: s.academic_year, category: s.category, amount: s.amount, due_date: s.due_date ?? '' }
              : { class_group: filterClass || '', academic_year: selectedYearId || '', category: '', amount: '', due_date: '' })
    setError('')
    setShowModal(true)
  }
  function close() { setShowModal(false); setEditing(null) }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = { ...form, class_group: parseInt(form.class_group), academic_year: parseInt(form.academic_year), category: parseInt(form.category), amount: parseFloat(form.amount) }
    editing ? updateMut.mutate({ id: editing.id, data: payload }) : createMut.mutate(payload)
  }

  function handleAssign() {
    if (!selectedYearId || !filterClass) { setError('Select a year and class before assigning.'); return }
    setError('')
    setAssignResult(null)
    assignMut.mutate({ class_group: parseInt(filterClass), academic_year: parseInt(selectedYearId) })
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <select value={selectedYearId ?? ''} onChange={(e) => setSelectedYearId(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Select Year</option>
          {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
        </select>
        <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex gap-2 ml-auto">
          <button onClick={handleAssign} disabled={!selectedYearId || !filterClass || assignMut.isPending}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50">
            {assignMut.isPending ? 'Assigning...' : 'Assign to Students'}
          </button>
          <button onClick={() => open()} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">+ Add Structure</button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {assignResult && <p className="text-sm text-green-600 mb-3">✓ {assignResult}</p>}

      {!selectedYearId ? (
        <p className="text-sm text-gray-400">Select an academic year to view fee structures.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Class</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Due Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {structures.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No fee structures for this year.</td></tr>}
              {structures.map((s) => (
                <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{s.class_name}</td>
                  <td className="px-4 py-3 text-gray-700">{s.category_name}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">₹{parseFloat(s.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600">{s.due_date || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => open(s)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                      <button onClick={() => { if (confirm('Delete this fee structure?')) deleteMut.mutate(s.id) }} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Edit Fee Structure' : 'Add Fee Structure'} onClose={close}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
              <select required value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select year</option>
                {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <select required value={form.class_group} onChange={(e) => setForm({ ...form, class_group: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input required type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="5000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={close} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {createMut.isPending || updateMut.isPending ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FeeSetup() {
  const [tab, setTab] = useState('structures')

  return (
    <div>
      <PageHeader title="Fee Setup" subtitle="Manage fee categories and class fee structures" />
      <div className="flex gap-1 mb-5">
        {['structures', 'categories'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors ${
              tab === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {t === 'structures' ? 'Fee Structures' : 'Categories'}
          </button>
        ))}
      </div>
      {tab === 'structures' ? <StructuresTab /> : <CategoriesTab />}
    </div>
  )
}
