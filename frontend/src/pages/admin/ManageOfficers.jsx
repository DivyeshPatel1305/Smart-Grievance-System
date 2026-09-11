import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { authService } from '../../services/authService'
import { departmentService } from '../../services/index'
import { PageLoader } from '../../components/common/LoadingSpinner'
import Modal from '../../components/common/Modal'
import EmptyState from '../../components/common/EmptyState'
import { Add, Badge } from '@mui/icons-material'

const uniqueOfficersByName = (users) => {
  const seenNames = new Set()
  return users.filter((officer) => {
    const name = (officer.full_name || officer.email || '').trim().toLocaleLowerCase()
    if (seenNames.has(name)) return false
    seenNames.add(name)
    return true
  })
}

export default function ManageOfficers() {
  const [officers, setOfficers] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    Promise.allSettled([
      authService.getUsers({ role: 'officer', page_size: 100 }),
      departmentService.getDepartments(),
    ]).then(([u, d]) => {
      if (u.status === 'fulfilled') {
        const userData = u.value.data
        const users = Array.isArray(userData) ? userData : (userData.results || [])
        setOfficers(uniqueOfficersByName(users))
      }
      if (d.status === 'fulfilled') {
        const deptData = d.value.data
        setDepartments(Array.isArray(deptData) ? deptData : (deptData.results || []))
      }
      setLoading(false)
    })
  }, [])

  const onSubmit = async (data) => {
    setSubmitting(true)
    try {
      await authService.createOfficer(data)
      toast.success('Officer created successfully')
      setShowModal(false)
      reset()
      const { data: updated } = await authService.getUsers({ role: 'officer', page_size: 100 })
      const users = Array.isArray(updated) ? updated : (updated.results || [])
      setOfficers(uniqueOfficersByName(users))
    } catch (err) {
      const errs = err.response?.data
      if (typeof errs === 'object') Object.values(errs).flat().forEach(m => toast.error(m))
      else toast.error('Failed to create officer')
    } finally { setSubmitting(false) }
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Officers</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{officers.length} officers</p>
        </div>
        <button onClick={() => { reset(); setShowModal(true) }} className="btn-primary flex items-center gap-2 text-sm">
          <Add fontSize="small" /> Add Officer
        </button>
      </div>

      {officers.length === 0 ? (
        <EmptyState title="No officers" action={<button onClick={() => setShowModal(true)} className="btn-primary text-sm">Add Officer</button>} />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {['Name', 'Email', 'Employee ID', 'Department', 'Designation', 'Status'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {officers.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{o.full_name}</td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{o.email}</td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{o.officer_profile?.employee_id || '—'}</td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{o.officer_profile?.department_name || '—'}</td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{o.officer_profile?.designation || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`badge ${o.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {o.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add New Officer">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
              <input className="input-field" {...register('full_name', { required: 'Required' })} />
              {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
              <input type="email" className="input-field" {...register('email', { required: 'Required' })} />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
              <input type="password" className="input-field" {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })} />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <input className="input-field" {...register('phone')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee ID *</label>
              <input className="input-field" {...register('employee_id', { required: 'Required' })} />
              {errors.employee_id && <p className="text-red-500 text-xs mt-1">{errors.employee_id.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
              <select className="input-field" {...register('role')}>
                <option value="officer">Officer</option>
                <option value="department_head">Department Head</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department *</label>
              <select className="input-field" {...register('department_id', { required: 'Required' })}>
                <option value="">Select department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {errors.department_id && <p className="text-red-500 text-xs mt-1">{errors.department_id.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Designation</label>
              <input className="input-field" placeholder="e.g. Junior Engineer" {...register('designation')} />
            </div>
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Creating...' : 'Create Officer'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
