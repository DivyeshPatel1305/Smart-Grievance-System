import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { departmentService } from '../../services/index'
import { PageLoader } from '../../components/common/LoadingSpinner'
import Modal from '../../components/common/Modal'
import EmptyState from '../../components/common/EmptyState'
import { Add, Edit, Business } from '@mui/icons-material'

export default function ManageDepartments() {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    departmentService.getDepartments()
      .then(({ data }) => {
        setDepartments(Array.isArray(data) ? data : (data.results || []))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const openCreate = () => { setEditing(null); reset({}); setShowModal(true) }
  const openEdit = (dept) => { setEditing(dept); reset(dept); setShowModal(true) }

  const onSubmit = async (data) => {
    setSubmitting(true)
    try {
      if (editing) {
        const { data: updated } = await departmentService.updateDepartment(editing.id, data)
        setDepartments(prev => prev.map(d => d.id === editing.id ? updated : d))
        toast.success('Department updated')
      } else {
        const { data: created } = await departmentService.createDepartment(data)
        setDepartments(prev => [created, ...prev])
        toast.success('Department created')
      }
      setShowModal(false)
    } catch (err) {
      toast.error(err.response?.data?.name?.[0] || 'Failed')
    } finally { setSubmitting(false) }
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Departments</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{departments.length} departments</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
          <Add fontSize="small" /> Add Department
        </button>
      </div>

      {departments.length === 0 ? (
        <EmptyState title="No departments" action={<button onClick={openCreate} className="btn-primary text-sm">Add Department</button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map(dept => (
            <div key={dept.id} className="card hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                  <Business className="text-amber-600 dark:text-amber-400" fontSize="small" />
                </div>
                <button onClick={() => openEdit(dept)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <Edit fontSize="small" />
                </button>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{dept.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Code: {dept.code}</p>
              {dept.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{dept.description}</p>}
              <div className="flex items-center gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
                <span>👤 {dept.officer_count} officers</span>
                {dept.head_name && <span>Head: {dept.head_name}</span>}
              </div>
              <span className={`badge mt-2 ${dept.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {dept.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Department' : 'Add Department'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
            <input className="input-field" {...register('name', { required: 'Required' })} />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code *</label>
            <input className="input-field" placeholder="e.g. PWD, WATER" {...register('code', { required: 'Required' })} />
            {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea rows={2} className="input-field resize-none" {...register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input type="email" className="input-field" {...register('email')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <input className="input-field" {...register('phone')} />
            </div>
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Saving...' : editing ? 'Update' : 'Create'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
