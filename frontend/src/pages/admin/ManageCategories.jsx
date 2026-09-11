import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { departmentService } from '../../services/index'
import { PageLoader } from '../../components/common/LoadingSpinner'
import Modal from '../../components/common/Modal'
import { Add, Edit } from '@mui/icons-material'
import { CATEGORY_ICONS } from '../../constants'

export default function ManageCategories() {
  const [categories, setCategories] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    Promise.allSettled([
      departmentService.getCategories(),
      departmentService.getDepartments(),
    ]).then(([c, d]) => {
      if (c.status === 'fulfilled') {
        const data = c.value.data
        setCategories(Array.isArray(data) ? data : (data.results || []))
      }
      if (d.status === 'fulfilled') {
        const data = d.value.data
        setDepartments(Array.isArray(data) ? data : (data.results || []))
      }
      setLoading(false)
    })
  }, [])

  const openCreate = () => { setEditing(null); reset({ sla_hours: 72, color: '#3B82F6' }); setShowModal(true) }
  const openEdit = (cat) => { setEditing(cat); reset({ ...cat, department: cat.department }); setShowModal(true) }

  const onSubmit = async (data) => {
    setSubmitting(true)
    try {
      if (editing) {
        const { data: updated } = await departmentService.updateCategory(editing.id, data)
        setCategories(prev => prev.map(c => c.id === editing.id ? updated : c))
        toast.success('Category updated')
      } else {
        const { data: created } = await departmentService.createCategory(data)
        setCategories(prev => [created, ...prev])
        toast.success('Category created')
      }
      setShowModal(false)
    } catch { toast.error('Failed') }
    finally { setSubmitting(false) }
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Complaint Categories</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{categories.length} categories</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
          <Add fontSize="small" /> Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => (
          <div key={cat.id} className="card hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{CATEGORY_ICONS[cat.slug] || '📋'}</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{cat.name}</p>
                  <p className="text-xs text-gray-500">{cat.department_name}</p>
                </div>
              </div>
              <button onClick={() => openEdit(cat)} className="text-gray-400 hover:text-gray-600">
                <Edit fontSize="small" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
              <span className="text-xs text-gray-500">SLA: {cat.sla_hours}h</span>
              <span className={`badge ml-auto ${cat.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {cat.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Category' : 'Add Category'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
            <input className="input-field" {...register('name', { required: 'Required' })} />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug *</label>
            <select className="input-field" {...register('slug', { required: 'Required' })}>
              <option value="">Select slug</option>
              {Object.keys(CATEGORY_ICONS).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            {errors.slug && <p className="text-red-500 text-xs mt-1">{errors.slug.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
            <select className="input-field" {...register('department')}>
              <option value="">Select department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SLA Hours</label>
              <input type="number" className="input-field" {...register('sla_hours')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
              <input type="color" className="input-field h-10 p-1 cursor-pointer" {...register('color')} />
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
