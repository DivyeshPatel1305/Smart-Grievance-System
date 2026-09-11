import { useState, useEffect } from 'react'
import { reportService } from '../../services/index'
import { BarChart, LineChart, PieChart, DoughnutChart } from '../../components/charts/Charts'
import { PageLoader } from '../../components/common/LoadingSpinner'
import StatsCard from '../../components/common/StatsCard'
import toast from 'react-hot-toast'
import {
  Download, Refresh, CheckCircle, Warning,
  Speed, Psychology, TrendingUp, Timer
} from '@mui/icons-material'

const PRIORITY_COLORS = {
  low: '#22c55e', medium: '#f59e0b', high: '#f97316', emergency: '#ef4444',
}

function SectionTitle({ children }) {
  return <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{children}</h3>
}

function MetricPill({ label, value, color = 'blue' }) {
  const cls = {
    blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
    green:  'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
    red:    'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
  }
  return (
    <div className={`rounded-xl p-4 ${cls[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-75">{label}</p>
    </div>
  )
}

export default function AdminReports() {
  const [period,      setPeriod]      = useState('monthly')
  const [loading,     setLoading]     = useState(true)
  const [exporting,   setExporting]   = useState(false)
  const [retraining,  setRetraining]  = useState(false)
  const [exportFormat, setExportFormat] = useState('csv')
  const [dateFrom,    setDateFrom]    = useState('')
  const [dateTo,      setDateTo]      = useState('')

  // data
  const [trends,      setTrends]      = useState([])
  const [categories,  setCategories]  = useState([])
  const [officers,    setOfficers]    = useState([])
  const [priority,    setPriorityDist]= useState([])
  const [sla,         setSLA]         = useState(null)
  const [resolution,  setResolution]  = useState(null)
  const [mlInsights,  setMLInsights]  = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.allSettled([
      reportService.getTrends({ period }),
      reportService.getCategoryDistribution(),
      reportService.getOfficerPerformance(),
      reportService.getPriorityDistribution(),
      reportService.getSLABreach(),
      reportService.getResolutionTime(),
      reportService.getMLInsights(),
    ]).then(([t, c, o, p, sl, r, ml]) => {
      if (t.status  === 'fulfilled') setTrends(Array.isArray(t.value.data) ? t.value.data : [])
      if (c.status  === 'fulfilled') setCategories(Array.isArray(c.value.data) ? c.value.data : [])
      if (o.status  === 'fulfilled') setOfficers(Array.isArray(o.value.data) ? o.value.data : [])
      if (p.status  === 'fulfilled') setPriorityDist(Array.isArray(p.value.data) ? p.value.data : [])
      if (sl.status === 'fulfilled') setSLA(sl.value.data || null)
      if (r.status  === 'fulfilled') setResolution(r.value.data || null)
      if (ml.status === 'fulfilled') setMLInsights(ml.value.data || null)
    }).finally(() => setLoading(false))
  }, [period])

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = { format: exportFormat }
      if (dateFrom) params.date_from = dateFrom
      if (dateTo)   params.date_to   = dateTo

      const response = await reportService.exportReport(params)
      const ext = exportFormat === 'excel' ? 'xlsx' : exportFormat

      // data is already a Blob when responseType:'blob' — don't wrap it again
      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data])

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `complaints_report_${new Date().toISOString().slice(0,10)}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Report exported as ${ext.toUpperCase()}`)
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Export failed'
      toast.error(msg)
    } finally { setExporting(false) }
  }

  const handleRetrain = async () => {
    setRetraining(true)
    try {
      const { data } = await reportService.mlRetrain()
      if (data.success) toast.success('ML model retrained successfully!')
      else toast.error(data.message || 'Retraining failed')
      // refresh ML insights
      reportService.getMLInsights().then(({ data: d }) => setMLInsights(d || null)).catch(() => {})
    } catch { toast.error('Retraining failed') }
    finally { setRetraining(false) }
  }

  if (loading) return <PageLoader />

  const slaCompliance  = sla?.compliance_rate ?? 0
  const slaColor       = slaCompliance >= 80 ? 'green' : slaCompliance >= 50 ? 'orange' : 'red'

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Comprehensive system analytics</p>
        </div>
        <button
          onClick={handleRetrain}
          disabled={retraining}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <Refresh fontSize="small" className={retraining ? 'animate-spin' : ''} />
          {retraining ? 'Retraining ML...' : 'Retrain ML Model'}
        </button>
      </div>

      {/* ── ML Insights ─────────────────────────────────────────────── */}
      {mlInsights && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Psychology className="text-purple-600" />
            <SectionTitle>ML Model Insights</SectionTitle>
            <span className={`badge ml-2 ${mlInsights.model_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {mlInsights.model_active ? '🟢 Model Active' : '🔴 Keyword Fallback'}
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricPill label="Prediction Accuracy"
              value={mlInsights.accuracy != null ? `${mlInsights.accuracy}%` : 'N/A'}
              color={mlInsights.accuracy >= 70 ? 'green' : mlInsights.accuracy >= 50 ? 'orange' : 'red'} />
            <MetricPill label="Complaints Evaluated" value={mlInsights.total_evaluated ?? 0} color="blue" />
            <MetricPill label="Categories Detected"  value={mlInsights.top_categories?.length ?? 0} color="purple" />
            <MetricPill label="Model Status" value={mlInsights.model_active ? 'Active' : 'Fallback'} color={mlInsights.model_active ? 'green' : 'orange'} />
          </div>
          {mlInsights.top_categories?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">Top Predicted Categories</p>
              <div className="flex flex-wrap gap-2">
                {mlInsights.top_categories.map((cat, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">{cat.name}</span>
                    <span className="text-gray-500 text-xs">{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SLA + Resolution ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SLA */}
        <div className="card">
          <SectionTitle>SLA Compliance</SectionTitle>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <MetricPill label="Compliance Rate"  value={`${Math.round(slaCompliance)}%`} color={slaColor} />
            <MetricPill label="On Time"          value={sla?.on_time ?? 0}        color="green" />
            <MetricPill label="SLA Breached"     value={sla?.breached ?? 0}       color="red" />
            <MetricPill label="Pending Overdue"  value={sla?.pending_overdue ?? 0} color="orange" />
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Compliance</span><span>{Math.round(slaCompliance)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${slaCompliance >= 80 ? 'bg-green-500' : slaCompliance >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, slaCompliance)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Resolution time by department */}
        <div className="card">
          <SectionTitle>Avg Resolution Time by Department</SectionTitle>
          {!resolution?.by_department?.length
            ? <p className="text-center text-sm text-gray-400 py-8">No resolved complaints yet</p>
            : <BarChart
                labels={resolution.by_department.map(d => d.department.substring(0, 12))}
                datasets={[{
                  label: 'Avg Hours',
                  data: resolution.by_department.map(d => d.avg_hours),
                  backgroundColor: '#6366f1',
                  borderRadius: 4,
                }]}
                height={220}
              />
          }
        </div>
      </div>

      {/* ── Charts row ───────────────────────────────────────────────── */}
      <div className="flex gap-2">
        {['daily', 'weekly', 'monthly'].map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${period === p ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-50'}`}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <SectionTitle>Complaint Trends</SectionTitle>
          {trends.length === 0
            ? <p className="text-center text-sm text-gray-400 py-12">No data yet</p>
            : <LineChart
                labels={trends.map(t => t.period)}
                datasets={[{ label: 'Complaints', data: trends.map(t => t.count),
                  borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)' }]}
                fill height={260}
              />
          }
        </div>
        <div className="card">
          <SectionTitle>Priority Distribution</SectionTitle>
          {priority.length === 0
            ? <p className="text-center text-sm text-gray-400 py-12">No data yet</p>
            : <DoughnutChart
                labels={priority.map(p => p.priority.charAt(0).toUpperCase() + p.priority.slice(1))}
                data={priority.map(p => p.count)}
                colors={priority.map(p => PRIORITY_COLORS[p.priority] || '#6b7280')}
                height={260}
              />
          }
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <SectionTitle>Category Distribution</SectionTitle>
          {categories.length === 0
            ? <p className="text-center text-sm text-gray-400 py-12">No data yet</p>
            : <PieChart
                labels={categories.map(c => c.category)}
                data={categories.map(c => c.count)}
                colors={categories.map(c => c.color)}
                height={260}
              />
          }
        </div>
        <div className="card">
          <SectionTitle>Avg Resolution Time by Category (hours)</SectionTitle>
          {!resolution?.by_category?.length
            ? <p className="text-center text-sm text-gray-400 py-12">No resolved complaints yet</p>
            : <BarChart
                labels={resolution.by_category.map(c => c.category.substring(0, 14))}
                datasets={[{
                  label: 'Avg Hours',
                  data: resolution.by_category.map(c => c.avg_hours),
                  backgroundColor: '#22c55e',
                  borderRadius: 4,
                }]}
                height={260}
              />
          }
        </div>
      </div>

      {/* ── Officer Performance table ────────────────────────────────── */}
      <div className="card">
        <SectionTitle>Officer Performance</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                {['Officer', 'Department', 'Assigned', 'Resolved', 'Pending',
                  'Rate', 'Avg Time', 'SLA Breaches', 'Rating'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {officers.length === 0
                ? <tr><td colSpan={9} className="text-center py-8 text-gray-400 text-sm">No officer data</td></tr>
                : officers.map((o, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{o.name}</td>
                  <td className="py-2 px-3 text-gray-500 dark:text-gray-400 text-xs">{o.department || '—'}</td>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{o.total_assigned}</td>
                  <td className="py-2 px-3 text-green-600">{o.resolved}</td>
                  <td className="py-2 px-3 text-orange-600">{o.pending}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full"
                          style={{ width: `${o.resolution_rate}%`,
                            backgroundColor: o.resolution_rate >= 70 ? '#22c55e' : o.resolution_rate >= 40 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                      <span className={`font-semibold text-xs
                        ${o.resolution_rate >= 70 ? 'text-green-600' : o.resolution_rate >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {o.resolution_rate}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400 text-xs">
                    {o.avg_resolution_hours != null ? `${o.avg_resolution_hours}h` : '—'}
                  </td>
                  <td className="py-2 px-3">
                    <span className={`text-xs font-medium ${o.sla_breaches > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {o.sla_breaches ?? 0}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                    {o.avg_rating ? `⭐ ${o.avg_rating}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Export ──────────────────────────────────────────────────── */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Download fontSize="small" /> Export Report
        </h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Format</label>
            <select className="input-field w-32 text-sm" value={exportFormat} onChange={e => setExportFormat(e.target.value)}>
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input type="date" className="input-field text-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input type="date" className="input-field text-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <button onClick={handleExport} disabled={exporting} className="btn-primary flex items-center gap-2 text-sm">
            <Download fontSize="small" /> {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  )
}
