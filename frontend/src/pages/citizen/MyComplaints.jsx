import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { complaintService } from '../../services/complaintService'
import { departmentService } from '../../services/index'
import { StatusBadge, PriorityBadge } from '../../components/common/StatusBadge'
import Pagination from '../../components/common/Pagination'
import EmptyState from '../../components/common/EmptyState'
import { PageLoader } from '../../components/common/LoadingSpinner'
import { Search, FilterList, LocationOn, ThumbUp } from '@mui/icons-material'
import { format } from 'date-fns'
import { safeFormat } from '../../utils/dateUtils'
import { COMPLAINT_STATUSES, PRIORITIES, CATEGORY_ICONS } from '../../constants'

export default function MyComplaints() {
  const [complaints, setComplaints] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [filters, setFilters] = useState({ search: '', status: '', priority: '', category: '' })
  const [showFilters, setShowFilters] = useState(false)

  const fetchComplaints = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: 10, ordering: '-submitted_at' }
      if (filters.search) params.search = filters.search
      if (filters.status) params.status = filters.status
      if (filters.priority) params.priority = filters.priority
      if (filters.category) params.category = filters.category
      const { data } = await complaintService.getComplaints(params)
      setComplaints(data.results || data)
      setCount(data.count || (data.results || data).length)
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => { fetchComplaints() }, [fetchComplaints])
  useEffect(() => {
    departmentService.getCategories().then(({ data }) => setCategories(data.results || data))
  }, [])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Complaints</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{count} total complaints</p>
        </div>
        <Link to="/citizen/raise-complaint" className="btn-primary text-sm">+ New Complaint</Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="card p-4 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fontSize="small" />
            <input
              className="input-field pl-9"
              placeholder="Search by ID, title, location..."
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 text-sm ${showFilters ? 'bg-primary-50 border-primary-300 text-primary-700' : ''}`}
          >
            <FilterList fontSize="small" /> Filters
          </button>
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100 dark:border-gray-700"
          >
            <select className="input-field text-sm" value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
              <option value="">All Statuses</option>
              {COMPLAINT_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </select>
            <select className="input-field text-sm" value={filters.priority} onChange={e => handleFilterChange('priority', e.target.value)}>
              <option value="">All Priorities</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
            <select className="input-field text-sm" value={filters.category} onChange={e => handleFilterChange('category', e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </motion.div>
        )}
      </div>

      {/* List */}
      {loading ? <PageLoader /> : complaints.length === 0 ? (
        <EmptyState
          title="No complaints found"
          description="You haven't raised any complaints yet or no results match your filters."
          action={<Link to="/citizen/raise-complaint" className="btn-primary text-sm">Raise First Complaint</Link>}
        />
      ) : (
        <div className="space-y-3">
          {complaints.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={`/citizen/complaints/${c.id}`}
                className="card block hover:shadow-md transition-all hover:border-primary-200 dark:hover:border-primary-700"
              >
                <div className="flex items-start gap-4">
                  <div className="text-2xl">{CATEGORY_ICONS[c.category_name?.toLowerCase().replace(/ /g, '_')] || '📋'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{c.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {c.complaint_id} · {c.category_name}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <StatusBadge status={c.status} />
                        <PriorityBadge priority={c.priority} />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      {c.address && (
                        <span className="flex items-center gap-1">
                          <LocationOn style={{ fontSize: 12 }} /> {c.area || c.city}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <ThumbUp style={{ fontSize: 12 }} /> {c.support_count} supports
                      </span>
                      <span>{safeFormat(c.submitted_at, 'dd MMM yyyy')}</span>
                      {c.is_emergency && <span className="text-red-500 font-medium">🚨 Emergency</span>}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <Pagination count={count} page={page} onChange={setPage} />
    </div>
  )
}
