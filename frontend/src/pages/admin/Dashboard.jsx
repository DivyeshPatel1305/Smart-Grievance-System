import { useEffect, useState } from 'react'
import { reportService } from '../../services/index'
import StatsCard from '../../components/common/StatsCard'
import { BarChart, LineChart, DoughnutChart, PieChart } from '../../components/charts/Charts'
import { PageLoader } from '../../components/common/LoadingSpinner'
import {
  Assignment, People, Business, CheckCircle,
  HourglassEmpty, Warning, TrendingUp, Star
} from '@mui/icons-material'

export default function AdminDashboard() {
  const [stats, setStats] = useState({})
  const [trends, setTrends] = useState([])
  const [categories, setCategories] = useState([])
  const [deptPerf, setDeptPerf] = useState([])
  const [statusDist, setStatusDist] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      reportService.getDashboardStats(),
      reportService.getTrends({ period: 'monthly' }),
      reportService.getCategoryDistribution(),
      reportService.getDepartmentPerformance(),
      reportService.getStatusDistribution(),
    ]).then(([s, t, c, d, sd]) => {
      if (s.status === 'fulfilled') setStats(s.value.data || {})
      if (t.status === 'fulfilled') setTrends(Array.isArray(t.value.data) ? t.value.data : [])
      if (c.status === 'fulfilled') setCategories(Array.isArray(c.value.data) ? c.value.data : [])
      if (d.status === 'fulfilled') setDeptPerf(Array.isArray(d.value.data) ? d.value.data : [])
      if (sd.status === 'fulfilled') setStatusDist(Array.isArray(sd.value.data) ? sd.value.data : [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">System-wide overview</p>
      </div>

      {/* Stats Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Complaints" value={stats.total_complaints ?? 0} icon={Assignment} color="blue" />
        <StatsCard title="Total Users" value={stats.total_users ?? 0} icon={People} color="purple" />
        <StatsCard title="Departments" value={stats.total_departments ?? 0} icon={Business} color="orange" />
        <StatsCard title="Resolved" value={stats.resolved ?? 0} icon={CheckCircle} color="green" />
      </div>

      {/* Stats Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="In Progress" value={stats.in_progress ?? 0} icon={HourglassEmpty} color="yellow" />
        <StatsCard title="Emergency" value={stats.emergency ?? 0} icon={Warning} color="red" />
        <StatsCard title="This Month" value={stats.this_month ?? 0} icon={TrendingUp} color="blue" />
        <StatsCard title="Officers" value={stats.total_officers ?? 0} icon={Star} color="purple" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Monthly Complaint Trends</h3>
          {trends.length === 0
            ? <p className="text-center text-sm text-gray-400 py-12">No data yet</p>
            : <LineChart
                labels={trends.map(t => t.period)}
                datasets={[{
                  label: 'Complaints',
                  data: trends.map(t => t.count),
                  borderColor: '#3b82f6',
                  backgroundColor: 'rgba(59,130,246,0.1)',
                }]}
                fill
                height={280}
              />
          }
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Status Distribution</h3>
          {statusDist.length === 0
            ? <p className="text-center text-sm text-gray-400 py-12">No data yet</p>
            : <DoughnutChart
                labels={statusDist.map(d => d.status.replace(/_/g, ' '))}
                data={statusDist.map(d => d.count)}
                height={280}
              />
          }
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Category Distribution</h3>
          {categories.length === 0
            ? <p className="text-center text-sm text-gray-400 py-12">No data yet</p>
            : <PieChart
                labels={categories.map(c => c.category)}
                data={categories.map(c => c.count)}
                colors={categories.map(c => c.color)}
                height={280}
              />
          }
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Department Performance</h3>
          {deptPerf.length === 0
            ? <p className="text-center text-sm text-gray-400 py-12">No data yet</p>
            : <BarChart
                labels={deptPerf.slice(0, 8).map(d => d.department.substring(0, 12))}
                datasets={[
                  { label: 'Total', data: deptPerf.slice(0, 8).map(d => d.total), backgroundColor: '#3b82f6', borderRadius: 4 },
                  { label: 'Resolved', data: deptPerf.slice(0, 8).map(d => d.resolved), backgroundColor: '#22c55e', borderRadius: 4 },
                ]}
                height={280}
              />
          }
        </div>
      </div>

      {/* Department Table */}
      {deptPerf.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Department Performance Table</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {['Department', 'Total', 'Resolved', 'Pending', 'Rate'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deptPerf.map((d, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{d.department}</td>
                    <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{d.total}</td>
                    <td className="py-2 px-3 text-green-600">{d.resolved}</td>
                    <td className="py-2 px-3 text-orange-600">{d.pending}</td>
                    <td className="py-2 px-3">
                      <span className={`font-semibold ${d.resolution_rate >= 70 ? 'text-green-600' : d.resolution_rate >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {d.resolution_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
