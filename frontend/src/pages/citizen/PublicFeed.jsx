import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { complaintService } from '../../services/complaintService'
import { StatusBadge, PriorityBadge } from '../../components/common/StatusBadge'
import { PageLoader } from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import toast from 'react-hot-toast'
import { ThumbUpOutlined, ThumbUp, LocationOn } from '@mui/icons-material'
import { format } from 'date-fns'
import { safeFormat } from '../../utils/dateUtils'
import { CATEGORY_ICONS } from '../../constants'

export default function PublicFeed() {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    complaintService.getPublicFeed()
      .then(({ data }) => setComplaints(Array.isArray(data) ? data : (data.results || [])))
      .finally(() => setLoading(false))
  }, [])

  const handleSupport = async (id) => {
    try {
      const { data } = await complaintService.supportComplaint(id)
      setComplaints(prev => prev.map(c =>
        c.id === id ? { ...c, support_count: data.support_count, has_supported: data.supported } : c
      ))
    } catch { toast.error('Failed') }
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Public Complaint Feed</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Community complaints — support issues you also face</p>
      </div>

      {complaints.length === 0 ? (
        <EmptyState title="No public complaints" description="No complaints in the public feed yet." />
      ) : (
        <div className="space-y-4">
          {complaints.map(c => (
            <div key={c.id} className="card hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="text-2xl">{CATEGORY_ICONS[c.category_name?.toLowerCase().replace(/ /g, '_')] || '📋'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/citizen/complaints/${c.id}`} className="font-semibold text-gray-900 dark:text-white hover:text-primary-600 text-sm">
                      {c.title}
                    </Link>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {c.category_name} · {c.department_name}
                  </p>
                  {c.address && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                      <LocationOn style={{ fontSize: 12 }} /> {c.area || c.city}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    <button onClick={() => handleSupport(c.id)}
                      className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors
                        ${c.has_supported ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                      {c.has_supported ? <ThumbUp style={{ fontSize: 14 }} /> : <ThumbUpOutlined style={{ fontSize: 14 }} />}
                      {c.support_count} Support{c.support_count !== 1 ? 's' : ''}
                    </button>
                    <PriorityBadge priority={c.priority} />
                    <span className="text-xs text-gray-400">{safeFormat(c.submitted_at, 'dd MMM yyyy')}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
