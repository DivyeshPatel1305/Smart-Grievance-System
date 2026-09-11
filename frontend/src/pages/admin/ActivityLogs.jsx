import { useState, useEffect, useCallback } from 'react'
import { authService } from '../../services/authService'
import { PageLoader } from '../../components/common/LoadingSpinner'
import Pagination from '../../components/common/Pagination'
import EmptyState from '../../components/common/EmptyState'
import { Search } from '@mui/icons-material'
import { safeFormat } from '../../utils/dateUtils'

export default function ActivityLogs() {
  const [logs, setLogs] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: 20 }
      if (search) params.search = search
      const { data } = await authService.getActivityLogs(params)
      setLogs(data.results || data)
      setCount(data.count || (data.results || data).length)
    } finally { setLoading(false) }
  }, [page, search])

  useEffect(() => { fetch() }, [fetch])

  const actionColors = {
    LOGIN: 'bg-green-100 text-green-800',
    LOGOUT: 'bg-gray-100 text-gray-800',
    REGISTER: 'bg-blue-100 text-blue-800',
    PASSWORD_CHANGE: 'bg-yellow-100 text-yellow-800',
    CREATE_OFFICER: 'bg-purple-100 text-purple-800',
    STATUS_CHANGE: 'bg-orange-100 text-orange-800',
    ASSIGN: 'bg-indigo-100 text-indigo-800',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Activity Logs</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{count} log entries</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fontSize="small" />
        <input className="input-field pl-9" placeholder="Search logs..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
      </div>

      {loading ? <PageLoader /> : logs.length === 0 ? (
        <EmptyState title="No logs found" />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {['User', 'Action', 'Description', 'IP Address', 'Time'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-2 px-4 font-medium text-gray-900 dark:text-white">{log.user_name || '—'}</td>
                    <td className="py-2 px-4">
                      <span className={`badge text-xs ${actionColors[log.action] || 'bg-gray-100 text-gray-800'}`}>{log.action}</span>
                    </td>
                    <td className="py-2 px-4 text-gray-500 dark:text-gray-400 max-w-xs truncate">{log.description || '—'}</td>
                    <td className="py-2 px-4 text-gray-500 dark:text-gray-400 font-mono text-xs">{log.ip_address || '—'}</td>
                    <td className="py-2 px-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {safeFormat(log.created_at, 'dd MMM yyyy, hh:mm a')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Pagination count={count} page={page} onChange={setPage} />
    </div>
  )
}
