import { useEffect, useState } from 'react'
import { reportService } from '../../services/index'
import { complaintService } from '../../services/complaintService'
import { BarChart, DoughnutChart, LineChart } from '../../components/charts/Charts'
import StatsCard from '../../components/common/StatsCard'
import { PageLoader } from '../../components/common/LoadingSpinner'
import {
  Assignment, CheckCircle, HourglassEmpty, Star,
  Speed, Warning, TrendingUp, Timer
} from '@mui/icons-material'

function SLAGauge({ rate }) {
  const color = rate >= 80 ? '#22c55e' : rate >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <path d="M18 2 a16 16 0 0 1 0 32 a16 16 0 0 1 0 -32" fill="none"
            stroke="#e5e7eb" strokeWidth="3" strokeDasharray="100 100" />
          <path d="M18 2 a16 16 0 0 1 0 32 a16 16 0 0 1 0 -32" fill="none"
            stroke={color} strokeWidth="3"
            strokeDasharray={`${rate} 100`}
            strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{rate}%</span>
          <span className="text-xs text-gray-500">On-time</span>
        </div>
      </div>
      <p className="text-sm font-medium mt-2" style={{ color }}>
        {rate >= 80 ? 'Excellent' : rate >= 50 ? 'Needs Improvement' : 'Critical'}
      </p>
    </div>
  )
}

export default function OfficerAnalytics() {
  const [stats, setStats]         = useState({})
  const [statusDist, setStatus]   = useState([])
  const [trends, setTrends]       = useState([])
  const [sla, setSLA]             = useState(null)
  const [recentResolved, setRecent] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    Promise.allSettled([
      complaintService.getMyStats(),
      reportService.getStatusDistribution(),
      reportService.getTrends({ period: 'monthly' }),
      reportService.getSLABreach(),
    ]).then(([s, sd, t, sl]) => {
      if (s.status  === 'fulfilled') setStats(s.value.data || {})
      if (sd.status === 'fulfilled') setStatus(Array.isArray(sd.value.data) ? sd.value.data : [])
      if (t.status  === 'fulfilled') setTrends(Array.isArray(t.value.data) ? t.value.data : [])
      if (sl.status === 'fulfilled') setSLA(sl.value.data || null)
    }).finally(() => setLoading(false))

    // fetch last 5 resolved complaints for resolution time display
    complaintService.getComplaints({ page_size: 5, status: 'resolved', ordering: '-resolved_at' })
      .then(({ data }) => setRecent(Array.isArray(data) ? data : (data.results || [])))
      .catch(() => {})
  }, [])

  if (loading) return <PageLoader />

  const totalResolved  = stats.resolved ?? 0
  const totalAssigned  = stats.total_assigned ?? 0
  const pending        = stats.pending ?? 0
  const resolutionRate = totalAssigned > 0 ? Math.round((totalResolved / totalAssigned) * 100) : 0
  const slaCompliance  = sla?.compliance_rate ?? 0
  const avgHours       = stats.avg_resolution_hours ?? null

  const priorityColors = {
    low: '#22c55e', medium: '#f59e0b', high: '#f97316', emergency: '#ef4444',
  }

  const statusColors = [
    '#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16',
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Personal performance overview</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Assigned"  value={totalAssigned}  icon={Assignment}     color="blue" />
        <StatsCard title="Resolved"        value={totalResolved}  icon={CheckCircle}    color="green" />
        <StatsCard title="Pending"         value={pending}        icon={HourglassEmpty} color="orange" />
        <StatsCard title="Resolution Rate" value={`${resolutionRate}%`} icon={TrendingUp} color="purple" />
      </div>

      {/* Performance metrics row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* SLA Gauge */}
        <div className="card flex flex-col items-center">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 self-start">SLA Compliance</h3>
          <SLAGauge rate={Math.round(slaCompliance)} />
          {sla && (
            <div className="w-full mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
                <p className="font-bold text-green-600 text-lg">{sla.on_time ?? 0}</p>
                <p className="text-gray-500">On Time</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
                <p className="font-bold text-red-600 text-lg">{sla.breached ?? 0}</p>
                <p className="text-gray-500">Breached</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2">
                <p className="font-bold text-orange-600 text-lg">{sla.pending_overdue ?? 0}</p>
                <p className="text-gray-500">Overdue</p>
              </div>
            </div>
          )}
        </div>

        {/* Avg resolution + quick stats */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Performance Stats</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <div className="flex items-center gap-2">
                <Timer className="text-blue-600" fontSize="small" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Avg Resolution Time</span>
              </div>
              <span className="font-bold text-blue-700 dark:text-blue-400">
                {avgHours != null ? `${avgHours}h` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <div className="flex items-center gap-2">
                <Speed className="text-green-600" fontSize="small" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Resolution Rate</span>
              </div>
              <span className="font-bold text-green-700 dark:text-green-400">{resolutionRate}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
              <div className="flex items-center gap-2">
                <Warning className="text-orange-600" fontSize="small" />
                <span className="text-sm text-gray-700 dark:text-gray-300">SLA Breaches</span>
              </div>
              <span className="font-bold text-orange-700 dark:text-orange-400">{sla?.breached ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <div className="flex items-center gap-2">
                <Star className="text-purple-600" fontSize="small" />
                <span className="text-sm text-gray-700 dark:text-gray-300">This Month</span>
              </div>
              <span className="font-bold text-purple-700 dark:text-purple-400">{stats.this_month ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Status doughnut */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Status Breakdown</h3>
          {statusDist.length === 0
            ? <p className="text-center text-sm text-gray-400 py-12">No data yet</p>
            : <DoughnutChart
                labels={statusDist.map(d => d.status.replace(/_/g, ' '))}
                data={statusDist.map(d => d.count)}
                colors={statusColors}
                height={220}
              />
          }
        </div>
      </div>

      {/* Trends chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Monthly Complaint Trends</h3>
          <span className="text-xs text-gray-400">Last 12 months</span>
        </div>
        {trends.length === 0
          ? <p className="text-center text-sm text-gray-400 py-12">No data yet</p>
          : <LineChart
              labels={trends.map(t => t.period)}
              datasets={[{
                label: 'Complaints',
                data: trends.map(t => t.count),
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99,102,241,0.1)',
              }]}
              fill
              height={260}
            />
        }
      </div>

      {/* Recent resolved */}
      {recentResolved.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Recently Resolved</h3>
          <div className="space-y-2">
            {recentResolved.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.title}</p>
                  <p className="text-xs text-gray-500">{c.complaint_id} · {c.category_name}</p>
                </div>
                <div className="shrink-0 text-right ml-4">
                  <span className="badge bg-green-100 text-green-800 text-xs">Resolved</span>
                  <p className="text-xs text-gray-400 mt-1">{c.city || c.area || '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
