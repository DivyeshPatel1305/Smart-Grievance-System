import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { complaintService } from '../../services/complaintService'
import useAuthStore from '../../contexts/authStore'
import StatsCard from '../../components/common/StatsCard'
import { StatusBadge, PriorityBadge } from '../../components/common/StatusBadge'
import { PageLoader } from '../../components/common/LoadingSpinner'
import { DoughnutChart, LineChart } from '../../components/charts/Charts'
import {
  Assignment, CheckCircle, HourglassEmpty, Cancel,
  AddCircleOutline, ArrowForward, Warning
} from '@mui/icons-material'
import { format } from 'date-fns'
import { safeFormat } from '../../utils/dateUtils'

export default function CitizenDashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState(null)
  const [recentComplaints, setRecentComplaints] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      complaintService.getMyStats(),
      complaintService.getComplaints({ page_size: 5, ordering: '-submitted_at' }),
    ]).then(([statsRes, complaintsRes]) => {
      setStats(statsRes.data)
      const complaintsData = complaintsRes.data
      setRecentComplaints(
        Array.isArray(complaintsData)
          ? complaintsData
          : (complaintsData.results || [])
      )
    }).catch(() => {
      setStats({})
      setRecentComplaints([])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  const doughnutLabels = ['Submitted', 'In Progress', 'Resolved', 'Closed', 'Rejected']
  const doughnutData = [
    stats?.submitted || 0,
    stats?.in_progress || 0,
    stats?.resolved || 0,
    stats?.closed || 0,
    stats?.rejected || 0,
  ]

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.full_name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Here's an overview of your complaints
          </p>
        </div>
        <Link to="/citizen/raise-complaint" className="btn-primary flex items-center gap-2 hidden sm:flex">
          <AddCircleOutline fontSize="small" />
          Raise Complaint
        </Link>
      </div>

      {/* Emergency Banner */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3"
      >
        <Warning className="text-red-500" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">Emergency Complaint?</p>
          <p className="text-xs text-red-600 dark:text-red-400">For urgent civic issues, use the Emergency button when raising a complaint.</p>
        </div>
        <Link to="/citizen/raise-complaint" className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors font-medium">
          Report Now
        </Link>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Complaints" value={stats?.total} icon={Assignment} color="blue" />
        <StatsCard title="In Progress" value={stats?.in_progress} icon={HourglassEmpty} color="orange" />
        <StatsCard title="Resolved" value={stats?.resolved} icon={CheckCircle} color="green" />
        <StatsCard title="Rejected" value={stats?.rejected} icon={Cancel} color="red" />
      </div>

      {/* Charts + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doughnut */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Complaint Status</h3>
          <DoughnutChart labels={doughnutLabels} data={doughnutData} />
        </div>

        {/* Recent Complaints */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Recent Complaints</h3>
            <Link to="/citizen/complaints" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              View all <ArrowForward style={{ fontSize: 14 }} />
            </Link>
          </div>
          <div className="space-y-3">
            {recentComplaints.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">No complaints yet.</p>
                <Link to="/citizen/raise-complaint" className="text-primary-600 text-sm hover:underline mt-1 inline-block">
                  Raise your first complaint →
                </Link>
              </div>
            ) : recentComplaints.map((c) => (
              <Link key={c.id} to={`/citizen/complaints/${c.id}`}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.title}</p>
                    {c.is_emergency && (
                      <span className="badge bg-red-100 text-red-700 text-xs">🚨 Emergency</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {c.complaint_id} · {c.category_name} · {safeFormat(c.submitted_at, 'dd MMM yyyy')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <StatusBadge status={c.status} />
                  <PriorityBadge priority={c.priority} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { to: '/citizen/raise-complaint', label: 'Raise Complaint', icon: '📝', color: 'bg-blue-50 dark:bg-blue-900/20' },
          { to: '/citizen/nearby', label: 'Nearby Issues', icon: '📍', color: 'bg-green-50 dark:bg-green-900/20' },
          { to: '/citizen/feed', label: 'Public Feed', icon: '📢', color: 'bg-purple-50 dark:bg-purple-900/20' },
          { to: '/citizen/services', label: 'Services', icon: '🏛️', color: 'bg-orange-50 dark:bg-orange-900/20' },
        ].map((item) => (
          <Link key={item.to} to={item.to}
            className={`${item.color} rounded-xl p-4 text-center hover:shadow-md transition-all group`}
          >
            <div className="text-2xl mb-2">{item.icon}</div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
