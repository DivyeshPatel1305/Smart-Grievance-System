import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { departmentService } from '../../services/index'
import { PageLoader } from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import Modal from '../../components/common/Modal'
import { format } from 'date-fns'
import { safeFormat } from '../../utils/dateUtils'
import { Add } from '@mui/icons-material'

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

export default function ServiceRequests() {
  const [requests, setRequests] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    Promise.all([
      api.get('/services/'),
      departmentService.getDepartments(),
    ]).then(([svcRes, deptRes]) => {
      setRequests(svcRes.data.results || svcRes.data)
      setDepartments(deptRes.data.results || deptRes.data)
    }).finally(() => setLoading(false))
  }, [])

  const onSubmit = async (data) => {
    setSubmitting(true)
    try {
      const payload = {
        service_type: data.service_type,
        description: data.description,
        department: data.department || null,
      }
      const { data: req } = await api.post('/services/', payload)
      setRequests(prev => [req, ...prev])
      toast.success('Service request submitted!')
      setShowModal(false)
      reset()
    } catch (err) {
      const msg = err.response?.data
      if (msg && typeof msg === 'object') {
        Object.values(msg).flat().forEach(m => toast.error(m))
      } else {
        toast.error('Failed to submit request')
      }
    } finally { setSubmitting(false) }
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Service Requests</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Request government services online</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Add fontSize="small" /> New Request
        </button>
      </div>

      {requests.length === 0 ? (
        <EmptyState title="No service requests" description="Submit a new service request to get started."
          action={<button onClick={() => setShowModal(true)} className="btn-primary text-sm">New Request</button>} />
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{req.service_type}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{req.department_name}</p>
                    <p className="text-xs text-gray-400">{safeFormat(req.created_at, 'dd MMM yyyy')}</p>
                  {req.remarks && <p className="text-xs text-gray-500 mt-1 italic">"{req.remarks}"</p>}
                </div>
                <span className={`badge ${statusColors[req.status]}`}>
                  {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Service Request">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Service Type *</label>
            <input className="input-field" placeholder="e.g. Birth Certificate, Water Connection"
              {...register('service_type', { required: 'Required' })} />
            {errors.service_type && <p className="text-red-500 text-xs mt-1">{errors.service_type.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department *</label>
            <select className="input-field" {...register('department', { required: 'Required' })}>
              <option value="">Select department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
            <textarea rows={3} className="input-field resize-none" placeholder="Describe your request..."
              {...register('description', { required: 'Required' })} />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
