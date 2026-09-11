import { useState, useEffect, useCallback } from 'react'
import { complaintService } from '../../services/complaintService'
import { departmentService } from '../../services/index'
import { StatusBadge, PriorityBadge } from '../../components/common/StatusBadge'
import Pagination from '../../components/common/Pagination'
import { PageLoader } from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import Modal from '../../components/common/Modal'
import toast from 'react-hot-toast'
import { Search, FilterList, PersonAdd } from '@mui/icons-material'
import { safeFormat } from '../../utils/dateUtils'
import { authService } from '../../services/authService'

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ search: '', status: '', priority: '', department: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [departments, setDepartments] = useState([])
  const [assignModal, setAssignModal] = useState(null)
  const [officers, setOfficers] = useState([])
  const [selectedOfficer, setSelectedOfficer] = useState('')

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: 15, ordering: '-submitted_at' }
      if (filters.search) params.search = filters.search
      if (filters.status) params.status = filters.status
      if (filters.priority) params.priority = filters.priority
      if (filters.department) params.department = filters.department
      const { data } = await complaintService.getComplaints(params)
      setComplaints(data.results || data)
      setCount(data.count || (data.results || data).length)
    } finally { setLoading(false) }
  }, [page, filters])

  useEffect(() => { fetch() }, [fetch])
  useEffect(() => {
    departmentService.getDepartments().then(({ data }) => setDepartments(data.results || data))
  }, [])

  const [cityFilter, setCityFilter] = useState('')

  const CITIES = ['Ahmedabad', 'Surat', 'Baroda', 'Surendranagar']

  const handleAssign = async () => {
    if (!selectedOfficer) return toast.error('Select an officer')
    try {
      await complaintService.assignComplaint(assignModal.id, { officer_id: selectedOfficer })
      toast.success('Complaint assigned successfully')
      setAssignModal(null)
      setSelectedOfficer('')
      setCityFilter('')
      fetch()
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to assign'
      toast.error(msg)
    }
  }

  const openAssignModal = async (complaint) => {
    setAssignModal(complaint)
    setSelectedOfficer('')
    // Pre-select city from complaint if available
    const city = complaint.city || ''
    setCityFilter(city)
    await loadOfficers(city, complaint.department_id || '')
  }

  const loadOfficers = async (city = '', departmentId = '') => {
    setOfficers([])
    try {
      const params = {}
      if (city) params.city = city
      if (departmentId) params.department_id = departmentId
      const { data } = await authService.getOfficersByCity(params)
      if (Array.isArray(data) && data.length > 0) {
        setOfficers(data)
      } else {
        // Fallback: load all officers if no city match
        const [officersRes, headsRes] = await Promise.allSettled([
          authService.getUsers({ role: 'officer', page_size: 200 }),
          authService.getUsers({ role: 'department_head', page_size: 50 }),
        ])
        const officerList = officersRes.status === 'fulfilled'
          ? (Array.isArray(officersRes.value.data) ? officersRes.value.data : (officersRes.value.data.results || []))
          : []
        const headList = headsRes.status === 'fulfilled'
          ? (Array.isArray(headsRes.value.data) ? headsRes.value.data : (headsRes.value.data.results || []))
          : []
        setOfficers([...officerList, ...headList])
      }
    } catch {
      toast.error('Failed to load officers')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Complaints</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{count} total complaints</p>
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fontSize="small" />
            <input className="input-field pl-9" placeholder="Search complaints..."
              value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary flex items-center gap-2 text-sm">
            <FilterList fontSize="small" /> Filters
          </button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <select className="input-field text-sm" value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
              <option value="">All Statuses</option>
              {['submitted','verified','assigned','in_progress','resolved','closed','rejected'].map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <select className="input-field text-sm" value={filters.priority} onChange={e => setFilters(p => ({ ...p, priority: e.target.value }))}>
              <option value="">All Priorities</option>
              {['low','medium','high','emergency'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="input-field text-sm" value={filters.department} onChange={e => setFilters(p => ({ ...p, department: e.target.value }))}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {loading ? <PageLoader /> : complaints.length === 0 ? (
        <EmptyState title="No complaints found" />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {['ID', 'Title', 'Citizen', 'Category', 'Department', 'Assigned Officer', 'Status', 'Priority', 'Date', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {complaints.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-2 px-3 font-mono text-xs text-gray-500">{c.complaint_id}</td>
                    <td className="py-2 px-3 font-medium text-gray-900 dark:text-white max-w-[160px] truncate">{c.title}</td>
                    <td className="py-2 px-3 text-gray-500 dark:text-gray-400 text-xs">{c.citizen_name}</td>
                    <td className="py-2 px-3 text-gray-500 dark:text-gray-400 text-xs">{c.category_name}</td>
                    <td className="py-2 px-3 text-gray-500 dark:text-gray-400 text-xs">{c.department_name || '—'}</td>
                    <td className="py-2 px-3">
                      {c.officer_name
                        ? <div>
                            <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{c.officer_name}</p>
                            <p className="text-xs text-gray-400 truncate max-w-[140px]">{c.officer_email}</p>
                          </div>
                        : <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Unassigned</span>
                      }
                    </td>
                    <td className="py-2 px-3"><StatusBadge status={c.status} /></td>
                    <td className="py-2 px-3"><PriorityBadge priority={c.priority} /></td>
                    <td className="py-2 px-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">{safeFormat(c.submitted_at, 'dd MMM yy')}</td>
                    <td className="py-2 px-3">
                      <button onClick={() => openAssignModal(c)}
                        className="text-primary-600 hover:text-primary-700 text-xs font-medium flex items-center gap-1">
                        <PersonAdd style={{ fontSize: 14 }} /> {c.officer_name ? 'Reassign' : 'Assign'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Pagination count={count} page={page} onChange={setPage} />

      <Modal isOpen={!!assignModal} onClose={() => { setAssignModal(null); setSelectedOfficer(''); setCityFilter('') }} title="Assign Officer">
        <div className="space-y-4">
          <div className="bg-neutral-50 border border-neutral-200 rounded p-3">
            <p className="text-xs text-neutral-500">Complaint</p>
            <p className="text-sm font-medium text-neutral-800">{assignModal?.title}</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              {assignModal?.category_name} · {assignModal?.city || 'No city'} · {assignModal?.department_name || 'No dept'}
            </p>
          </div>

          {/* City filter */}
          <div>
            <label className="input-label">Filter by City</label>
            <select className="input-field" value={cityFilter}
              onChange={e => { setCityFilter(e.target.value); setSelectedOfficer(''); loadOfficers(e.target.value) }}>
              <option value="">All Cities</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Officer select */}
          <div>
            <label className="input-label">
              Select Officer
              <span className="ml-2 text-xs font-normal text-neutral-400">
                {officers.length} available{cityFilter ? ` in ${cityFilter}` : ''}
              </span>
            </label>
            {officers.length === 0
              ? <div className="text-sm text-neutral-400 py-3 text-center border border-dashed border-neutral-300 rounded">
                  No officers found{cityFilter ? ` in ${cityFilter}` : ''}
                </div>
              : <select className="input-field" value={selectedOfficer}
                  onChange={e => setSelectedOfficer(e.target.value)}>
                  <option value="">Choose officer...</option>
                  {officers.map(o => {
                    const deptName = o.officer_profile?.department_name || o.department_name || ''
                    const city     = o.officer_profile?.city || o.city || ''
                    const role     = o.role === 'department_head' ? ' [Head]' : ''
                    return (
                      <option key={o.id} value={o.id}>
                        {o.full_name}{role} — {deptName}{city ? ` (${city})` : ''}
                      </option>
                    )
                  })}
                </select>
            }
          </div>

          <button onClick={handleAssign} disabled={!selectedOfficer}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
            Assign Officer
          </button>
        </div>
      </Modal>
    </div>
  )
}
