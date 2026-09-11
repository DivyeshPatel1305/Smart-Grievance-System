import { useState, useEffect, useCallback } from 'react'
import { authService } from '../../services/authService'
import { PageLoader } from '../../components/common/LoadingSpinner'
import Pagination from '../../components/common/Pagination'
import EmptyState from '../../components/common/EmptyState'
import toast from 'react-hot-toast'
import { Search, FilterList, ToggleOn, ToggleOff } from '@mui/icons-material'
import { safeFormat } from '../../utils/dateUtils'

const roleColors = {
  citizen: 'bg-blue-100 text-blue-800',
  officer: 'bg-purple-100 text-purple-800',
  department_head: 'bg-indigo-100 text-indigo-800',
  super_admin: 'bg-amber-100 text-amber-800',
}

export default function ManageUsers() {
  const [users, setUsers] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: 15 }
      if (search) params.search = search
      if (roleFilter) params.role = roleFilter
      const { data } = await authService.getUsers(params)
      setUsers(data.results || data)
      setCount(data.count || (data.results || data).length)
    } finally { setLoading(false) }
  }, [page, search, roleFilter])

  useEffect(() => { fetch() }, [fetch])

  const handleToggleActive = async (id) => {
    try {
      const { data } = await authService.toggleUserActive(id)
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: data.is_active } : u))
      toast.success(data.message)
    } catch { toast.error('Failed') }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Users</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{count} total users</p>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fontSize="small" />
          <input className="input-field pl-9" placeholder="Search by name, email..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="input-field w-full sm:w-48 text-sm" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1) }}>
          <option value="">All Roles</option>
          <option value="citizen">Citizen</option>
          <option value="officer">Officer</option>
          <option value="department_head">Department Head</option>
          <option value="super_admin">Super Admin</option>
        </select>
      </div>

      {loading ? <PageLoader /> : users.length === 0 ? (
        <EmptyState title="No users found" />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {['Name', 'Email', 'Phone', 'Role', 'Joined', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{u.full_name}</td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{u.email}</td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{u.phone || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`badge ${roleColors[u.role]}`}>{u.role.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{safeFormat(u.date_joined, 'dd MMM yyyy')}</td>
                    <td className="py-3 px-4">
                      <span className={`badge ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button onClick={() => handleToggleActive(u.id)}
                        className={`text-sm font-medium transition-colors ${u.is_active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}>
                        {u.is_active ? <ToggleOff /> : <ToggleOn />}
                      </button>
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
