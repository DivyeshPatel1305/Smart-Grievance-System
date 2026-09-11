import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { complaintService } from '../../services/complaintService'
import { StatusBadge, PriorityBadge } from '../../components/common/StatusBadge'
import Pagination from '../../components/common/Pagination'
import EmptyState from '../../components/common/EmptyState'
import { PageLoader } from '../../components/common/LoadingSpinner'
import { Search, FilterList } from '@mui/icons-material'
import { format } from 'date-fns'
import { safeFormat } from '../../utils/dateUtils'
import { COMPLAINT_STATUSES, PRIORITIES } from '../../constants'

export default function AssignedComplaints() {
  const [complaints, setComplaints] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ search: '', status: '', priority: '' })
  const [showFilters, setShowFilters] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: 10, ordering: '-submitted_at' }
      if (filters.search) params.search = filters.search
      if (filters.status) params.status = filters.status
      if (filters.priority) params.priority = filters.priority
      const { data } = await complaintService.getComplaints(params)
      setComplaints(data.results || data)
      setCount(data.count || (data.results || data).length)
    } finally { setLoading(false) }
  }, [page, filters])

  useEffect(() => { fetch() }, [fetch])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assigned Complaints</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{count} complaints assigned to you</p>
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
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <select className="input-field text-sm" value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
              <option value="">All Statuses</option>
              {COMPLAINT_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <select className="input-field text-sm" value={filters.priority} onChange={e => setFilters(p => ({ ...p, priority: e.target.value }))}>
              <option value="">All Priorities</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        )}
      </div>

      {loading ? <PageLoader /> : complaints.length === 0 ? (
        <EmptyState title="No complaints assigned" description="No complaints match your filters." />
      ) : (
        <div className="space-y-3">
          {complaints.map(c => (
            <Link key={c.id} to={`/officer/complaints/${c.id}`}
              className="card block hover:shadow-md transition-all hover:border-primary-200 dark:hover:border-primary-700">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{c.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {c.complaint_id} · {c.citizen_name} · {c.category_name}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusBadge status={c.status} />
                      <PriorityBadge priority={c.priority} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>{c.area || c.city}</span>
                    <span>{safeFormat(c.submitted_at, 'dd MMM yyyy')}</span>
                    {c.is_emergency && <span className="text-red-500 font-medium">🚨 Emergency</span>}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <Pagination count={count} page={page} onChange={setPage} />
    </div>
  )
}
