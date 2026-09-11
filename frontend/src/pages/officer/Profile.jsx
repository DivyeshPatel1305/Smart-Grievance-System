import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Email, Phone, Business, ArrowForward } from '@mui/icons-material'
import useAuthStore from '../../contexts/authStore'
import { complaintService } from '../../services/complaintService'
import { StatusBadge, PriorityBadge } from '../../components/common/StatusBadge'
import { PageLoader } from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import { safeFormat } from '../../utils/dateUtils'

export default function OfficerProfile() {
  const { user } = useAuthStore()
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAssignedComplaints = async () => {
      const firstResponse = await complaintService.getComplaints({ page: 1, page_size: 100, ordering: '-submitted_at' })
      const firstPage = firstResponse.data
      if (Array.isArray(firstPage)) return firstPage

      const results = firstPage.results || []
      const totalPages = firstPage.total_pages || 1
      if (totalPages > 1) {
        const remainingPages = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) =>
            complaintService.getComplaints({ page: index + 2, page_size: 100, ordering: '-submitted_at' })
          )
        )
        remainingPages.forEach(({ data }) => results.push(...(data.results || data)))
      }
      return results
    }

    loadAssignedComplaints()
      .then(setComplaints)
      .finally(() => setLoading(false))
  }, [])

  const profile = user?.officer_profile
  const roleLabel = user?.role === 'department_head' ? 'Department Head' : 'Field Officer'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>

      <div className="card">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
            <span className="text-primary-700 dark:text-primary-300 font-bold text-2xl">
              {user?.full_name?.[0]?.toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{user?.full_name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{roleLabel}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 text-sm">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><Email fontSize="small" /> {user?.email}</div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><Phone fontSize="small" /> {user?.phone || 'No phone added'}</div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><Business fontSize="small" /> {profile?.department_name || 'Department not assigned'}</div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><Badge fontSize="small" /> {profile?.employee_id || profile?.designation || 'Officer'}</div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Assigned Complaints</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Complaints currently assigned to you</p>
          </div>
          <Link to="/officer/complaints" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
            View all <ArrowForward style={{ fontSize: 14 }} />
          </Link>
        </div>

        {loading ? <PageLoader /> : complaints.length === 0 ? (
          <EmptyState title="No complaints assigned" description="New complaints assigned to you will appear here." />
        ) : (
          <div className="space-y-3">
            {complaints.map(complaint => (
              <Link key={complaint.id} to={`/officer/complaints/${complaint.id}`} className="card block hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{complaint.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {complaint.complaint_id} · {complaint.category_name || 'Uncategorized'} · {safeFormat(complaint.submitted_at, 'dd MMM yyyy')}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBadge status={complaint.status} />
                    <PriorityBadge priority={complaint.priority} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
