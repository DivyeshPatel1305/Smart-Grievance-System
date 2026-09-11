import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { complaintService } from '../../services/complaintService'
import useAuthStore from '../../contexts/authStore'
import StatsCard from '../../components/common/StatsCard'
import { StatusBadge, PriorityBadge } from '../../components/common/StatusBadge'
import { PageLoader } from '../../components/common/LoadingSpinner'
import { DoughnutChart } from '../../components/charts/Charts'
import { Assignment, CheckCircle, HourglassEmpty, ArrowForward } from '@mui/icons-material'
import { safeFormat } from '../../utils/dateUtils'

export default function OfficerDashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState({})
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      complaintService.getMyStats(),
      complaintService.getComplaints({ page_size: 5, ordering: '-submitted_at' }),
    ]).then(([s, c]) => {
      if (s.status === 'fulfilled') setStats(s.value.data || {})
      if (c.status === 'fulfilled') {
        const d = c.value.data
        setRecent(Array.isArray(d) ? d : (d.results || []))
      }
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome, {user?.full_name?.split(' ')[0]}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Officer Dashboard</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Total Assigned" value={stats.total_assigned ?? 0} icon={Assignment} color="blue" />
        <StatsCard title="Pending" value={stats.pending ?? 0} icon={HourglassEmpty} color="orange" />
        <StatsCard title="Resolved" value={stats.resolved ?? 0} icon={CheckCircle} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Status Overview</h3>
          <DoughnutChart
            labels={['Pending', 'Resolved']}
            data={[stats.pending || 0, stats.resolved || 0]}
            colors={['#f59e0b', '#22c55e']}
          />
        </div>

        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Recent Assignments</h3>
            <Link to="/officer/complaints" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              View all <ArrowForward style={{ fontSize: 14 }} />
            </Link>
          </div>
          {recent.length === 0
            ? <p className="text-center text-sm text-gray-400 py-8">No assignments yet</p>
            : <div className="space-y-3">
                {recent.map(c => (
                  <Link key={c.id} to={`/officer/complaints/${c.id}`}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {c.complaint_id} · {c.citizen_name} · {safeFormat(c.submitted_at, 'dd MMM yyyy')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusBadge status={c.status} />
                      <PriorityBadge priority={c.priority} />
                    </div>
                  </Link>
                ))}
              </div>
          }
        </div>
      </div>
    </div>
  )
}
