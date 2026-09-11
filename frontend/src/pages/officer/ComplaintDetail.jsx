import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { complaintService } from '../../services/complaintService'
import { chatService } from '../../services/index'
import { useWebSocket } from '../../hooks/useWebSocket'
import useAuthStore from '../../contexts/authStore'
import { StatusBadge, PriorityBadge } from '../../components/common/StatusBadge'
import ComplaintsMap from '../../components/maps/ComplaintsMap'
import { PageLoader } from '../../components/common/LoadingSpinner'
import { safeFormat } from '../../utils/dateUtils'
import { Send, CloudUpload, CheckCircle } from '@mui/icons-material'
import { MEDIA_URL, CATEGORY_ICONS } from '../../constants'

const STATUS_TRANSITIONS = {
  submitted: ['verified', 'rejected'],
  verified: ['assigned'],
  assigned: ['accepted', 'rejected'],
  accepted: ['work_started'],
  work_started: ['in_progress'],
  in_progress: ['resolved'],
  resolved: ['closed'],
  reopened: ['accepted'],
}

export default function OfficerComplaintDetail() {
  const { id } = useParams()
  const { user } = useAuthStore()
  const [complaint, setComplaint] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [remarks, setRemarks] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [chatRoom, setChatRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [completionPhotos, setCompletionPhotos] = useState([])
  const messagesEndRef = useRef(null)

  useEffect(() => {
    complaintService.getComplaint(id)
      .then(({ data }) => {
        setComplaint(data)
        setLoading(false)
        loadChat(data.id)
      })
      .catch(() => setLoading(false))
  }, [id])

  const loadChat = async (complaintId) => {
    try {
      const { data: room } = await chatService.getOrCreateRoom(complaintId)
      setChatRoom(room)
      const { data: msgs } = await chatService.getMessages(room.id)
      setMessages(Array.isArray(msgs) ? msgs : (msgs.results || []))
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch {}
  }

  const { send } = useWebSocket(
    chatRoom ? `/ws/chat/${chatRoom.id}/` : '/ws/notifications/',
    (data) => {
      if (data.type === 'message') {
        setMessages(prev => [...prev, data.message])
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
    }
  )

  const handleStatusUpdate = async () => {
    if (!newStatus) return toast.error('Select a status')
    setUpdating(true)
    try {
      const { data } = await complaintService.updateComplaint(id, {
        status: newStatus,
        officer_remarks: remarks,
      })
      setComplaint(data)
      setNewStatus('')
      setRemarks('')
      toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update status')
    } finally { setUpdating(false) }
  }

  const handleUploadPhotos = async () => {
    if (!completionPhotos.length) return
    const formData = new FormData()
    completionPhotos.forEach(f => formData.append('images', f))
    try {
      await complaintService.uploadCompletionPhotos(id, formData)
      toast.success('Photos uploaded')
      setCompletionPhotos([])
      const { data } = await complaintService.getComplaint(id)
      setComplaint(data)
    } catch { toast.error('Upload failed') }
  }

  const handleSendMessage = () => {
    if (!newMessage.trim() || !chatRoom) return
    send({ message: newMessage.trim() })
    setNewMessage('')
  }

  if (loading) return <PageLoader />
  if (!complaint) return <p className="text-center text-gray-500 py-16">Complaint not found.</p>

  const allowedStatuses = STATUS_TRANSITIONS[complaint.status] || []
  const mapCenter = complaint.latitude && complaint.longitude
    ? [parseFloat(complaint.latitude), parseFloat(complaint.longitude)]
    : [20.5937, 78.9629]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-600 dark:text-gray-400">
            {complaint.complaint_id}
          </span>
          <StatusBadge status={complaint.status} />
          <PriorityBadge priority={complaint.priority} />
          {complaint.is_emergency && <span className="badge bg-red-100 text-red-700">🚨 Emergency</span>}
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{complaint.title}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {CATEGORY_ICONS[complaint.category?.slug] || '📋'} {complaint.category?.name} ·
          Citizen: {complaint.citizen_name} · {safeFormat(complaint.submitted_at, 'dd MMM yyyy')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Description</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{complaint.description}</p>
            {complaint.officer_remarks && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Officer Remarks</p>
                <p className="text-sm text-blue-600 dark:text-blue-300">{complaint.officer_remarks}</p>
              </div>
            )}
          </div>

          {/* Images */}
          {complaint.images?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Photos</h3>
              <div className="grid grid-cols-3 gap-3">
                {complaint.images.map(img => {
                  const src = img.image_url || img.image || ''
                  return (
                    <div key={img.id} className="relative">
                      <img
                        src={src.startsWith('http') ? src : `${MEDIA_URL}${src}`}
                        alt={img.caption || ''}
                        className="w-full h-28 object-cover rounded-lg"
                      />
                      {img.is_completion_photo && (
                        <span className="absolute top-1 left-1 badge bg-green-100 text-green-700 text-xs">✓ Done</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Map */}
          {complaint.latitude && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Location</h3>
              <p className="text-sm text-gray-500 mb-2">{complaint.address}</p>
              <ComplaintsMap complaints={[complaint]} center={mapCenter} zoom={15} height="250px" />
            </div>
          )}

          {/* Status Update */}
          {allowedStatuses.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Update Status</h3>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {allowedStatuses.map(s => (
                    <button key={s} onClick={() => setNewStatus(s)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
                        ${newStatus === s
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400'}`}>
                      {s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </button>
                  ))}
                </div>
                <textarea rows={3} className="input-field resize-none"
                  placeholder="Add remarks (optional)..."
                  value={remarks} onChange={e => setRemarks(e.target.value)} />
                <button onClick={handleStatusUpdate} disabled={!newStatus || updating} className="btn-primary text-sm">
                  {updating ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          )}

          {/* Upload Completion Photos */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Upload Completion Photos</h3>
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-primary-400 transition-colors bg-gray-50 dark:bg-gray-700/30">
              <CloudUpload className="text-gray-400 mb-1" />
              <span className="text-sm text-gray-500">Click to upload</span>
              <input type="file" multiple accept="image/*" className="hidden"
                onChange={e => setCompletionPhotos(Array.from(e.target.files))} />
            </label>
            {completionPhotos.length > 0 && (
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">{completionPhotos.length} file(s) selected</p>
                <button onClick={handleUploadPhotos} className="btn-primary text-sm flex items-center gap-1.5">
                  <CheckCircle fontSize="small" /> Upload
                </button>
              </div>
            )}
          </div>

          {/* Timeline */}
          {complaint.timeline?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Timeline</h3>
              <div className="space-y-3">
                {complaint.timeline.map(item => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</p>
                      {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                      <p className="text-xs text-gray-400">{safeFormat(item.created_at, 'dd MMM yyyy, hh:mm a')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right - Chat */}
        <div className="space-y-4">
          <div className="card flex flex-col" style={{ height: '500px' }}>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 shrink-0">Chat with Citizen</h3>
            <div className="flex-1 overflow-y-auto space-y-3 mb-3">
              {messages.length === 0 && (
                <p className="text-center text-xs text-gray-400 py-4">No messages yet</p>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs
                    ${msg.sender_id === user?.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'}`}>
                    <p>{msg.message}</p>
                    <p className={`text-xs mt-0.5 ${msg.sender_id === user?.id ? 'text-indigo-200' : 'text-gray-400'}`}>
                      {safeFormat(msg.created_at, 'hh:mm a')}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="flex gap-2 shrink-0">
              <input className="input-field flex-1 text-sm" placeholder="Type..."
                value={newMessage} onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()} />
              <button onClick={handleSendMessage} className="btn-primary px-3 py-2">
                <Send fontSize="small" />
              </button>
            </div>
          </div>

          <div className="card space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <h3 className="font-semibold text-gray-900 dark:text-white">Citizen Info</h3>
            <p>Name: {complaint.citizen_name}</p>
            {complaint.citizen_phone && <p>Phone: {complaint.citizen_phone}</p>}
            <p>Area: {complaint.area || complaint.city || 'N/A'}</p>
            <p>Ward: {complaint.ward_number || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
