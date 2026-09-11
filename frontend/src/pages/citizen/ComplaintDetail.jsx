import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { complaintService } from '../../services/complaintService'
import { chatService } from '../../services/index'
import { useWebSocket } from '../../hooks/useWebSocket'
import useAuthStore from '../../contexts/authStore'
import { StatusBadge, PriorityBadge } from '../../components/common/StatusBadge'
import ComplaintsMap from '../../components/maps/ComplaintsMap'
import { PageLoader } from '../../components/common/LoadingSpinner'
import Modal from '../../components/common/Modal'
import { format } from 'date-fns'
import { safeFormat } from '../../utils/dateUtils'
import {
  ThumbUp, ThumbUpOutlined, Chat, Refresh, Star, StarBorder,
  LocationOn, Person, Business, Schedule, CheckCircle, Send
} from '@mui/icons-material'
import { CATEGORY_ICONS, MEDIA_URL } from '../../constants'

function TimelineItem({ item, isLast }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
          <CheckCircle className="text-primary-600 dark:text-primary-400" style={{ fontSize: 16 }} />
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />}
      </div>
      <div className="pb-4 flex-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</p>
        {item.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.description}</p>}
        <p className="text-xs text-gray-400 mt-1">{safeFormat(item.created_at, 'dd MMM yyyy, hh:mm a')}</p>
      </div>
    </div>
  )
}

export default function ComplaintDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [complaint, setComplaint] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chatRoom, setChatRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [rating, setRating] = useState(0)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    complaintService.getComplaint(id)
      .then(({ data }) => { setComplaint(data); setLoading(false) })
      .catch(() => { toast.error('Complaint not found'); navigate('/citizen/complaints') })
  }, [id])

  useWebSocket(`/ws/complaints/${id}/`, (data) => {
    if (data.type === 'status_update') {
      setComplaint(prev => prev ? { ...prev, status: data.status } : prev)
      toast(`Status updated: ${data.status}`, { icon: '🔄' })
    }
  })

  const { send: sendWsMessage } = useWebSocket(
    chatRoom ? `/ws/chat/${chatRoom.id}/` : '/ws/notifications/',
    (data) => {
      if (data.type === 'message') {
        setMessages(prev => [...prev, data.message])
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
    }
  )

  const handleOpenChat = async () => {
    try {
      const { data: room } = await chatService.getOrCreateRoom(complaint.id)
      setChatRoom(room)
      const { data: msgs } = await chatService.getMessages(room.id)
      setMessages(msgs.results || msgs)
      setShowChat(true)
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch { toast.error('Could not open chat') }
  }

  const handleSendMessage = () => {
    if (!newMessage.trim() || !chatRoom) return
    sendWsMessage({ message: newMessage.trim() })
    setNewMessage('')
  }

  const handleSupport = async () => {
    try {
      const { data } = await complaintService.supportComplaint(complaint.id)
      setComplaint(prev => ({ ...prev, support_count: data.support_count, has_supported: data.supported }))
      toast.success(data.message)
    } catch { toast.error('Failed to update support') }
  }

  const handleReopen = async () => {
    try {
      await complaintService.reopenComplaint(complaint.id, { reason: 'Issue not resolved' })
      toast.success('Complaint reopened')
      setComplaint(prev => ({ ...prev, status: 'reopened' }))
    } catch { toast.error('Failed to reopen') }
  }

  const handleFeedbackSubmit = async () => {
    if (!rating) return toast.error('Please select a rating')
    setSubmittingFeedback(true)
    try {
      await complaintService.createFeedback({ complaint: complaint.id, rating, comment: feedbackComment })
      toast.success('Feedback submitted!')
      setShowFeedback(false)
      setComplaint(prev => ({ ...prev, feedback: { rating, comment: feedbackComment } }))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit feedback')
    } finally { setSubmittingFeedback(false) }
  }

  if (loading) return <PageLoader />
  if (!complaint) return null

  const mapCenter = complaint.latitude && complaint.longitude
    ? [parseFloat(complaint.latitude), parseFloat(complaint.longitude)]
    : [20.5937, 78.9629]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
              {complaint.complaint_id}
            </span>
            <StatusBadge status={complaint.status} />
            <PriorityBadge priority={complaint.priority} />
            {complaint.is_emergency && <span className="badge bg-red-100 text-red-700">🚨 Emergency</span>}
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{complaint.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {CATEGORY_ICONS[complaint.category?.slug] || '📋'} {complaint.category?.name} · {safeFormat(complaint.submitted_at, 'dd MMM yyyy, hh:mm a')}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSupport}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors
              ${complaint.has_supported ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            {complaint.has_supported ? <ThumbUp fontSize="small" /> : <ThumbUpOutlined fontSize="small" />}
            {complaint.support_count}
          </button>
          {complaint.assigned_officer && (
            <button onClick={handleOpenChat}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
              <Chat fontSize="small" /> Chat
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Description</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{complaint.description}</p>
            {complaint.officer_remarks && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Officer Remarks</p>
                <p className="text-sm text-blue-600 dark:text-blue-300">{complaint.officer_remarks}</p>
              </div>
            )}
          </div>

          {complaint.images?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Photos ({complaint.images.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {complaint.images.map(img => (
                  <div key={img.id} className="relative">
                    <img
                      src={(img.image_url || img.image || '').startsWith('http')
                        ? (img.image_url || img.image)
                        : `${MEDIA_URL}${img.image_url || img.image}`}
                      alt={img.caption || ''}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    {img.is_completion_photo && (
                      <span className="absolute top-1 left-1 badge bg-green-100 text-green-700 text-xs">✓ Done</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {complaint.latitude && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <LocationOn fontSize="small" className="text-primary-600" /> Location
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{complaint.address}</p>
              <ComplaintsMap complaints={[complaint]} center={mapCenter} zoom={15} height="250px" />
            </div>
          )}

          <div className="card">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Timeline</h3>
            {complaint.timeline?.map((item, i) => (
              <TimelineItem key={item.id} item={item} isLast={i === complaint.timeline.length - 1} />
            ))}
          </div>

          {complaint.status === 'resolved' && !complaint.feedback && (
            <div className="card bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2">Rate this Resolution</h3>
              <p className="text-sm text-green-700 dark:text-green-400 mb-3">Your complaint has been resolved. Please share your feedback.</p>
              <button onClick={() => setShowFeedback(true)} className="btn-primary bg-green-600 hover:bg-green-700 text-sm">Give Feedback</button>
            </div>
          )}

          {complaint.feedback && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Your Feedback</h3>
              <div className="flex gap-1 mb-2">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={s <= complaint.feedback.rating ? 'text-yellow-400' : 'text-gray-300'} />
                ))}
              </div>
              {complaint.feedback.comment && <p className="text-sm text-gray-600 dark:text-gray-300">{complaint.feedback.comment}</p>}
            </div>
          )}

          {['resolved', 'closed'].includes(complaint.status) && (
            <button onClick={handleReopen} className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 font-medium">
              <Refresh fontSize="small" /> Reopen Complaint
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="card space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white">Details</h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2"><Business fontSize="small" /><span>{complaint.department?.name || 'Not assigned'}</span></div>
              <div className="flex items-center gap-2"><Person fontSize="small" /><span>{complaint.officer_name || 'Not assigned'}</span></div>
              <div className="flex items-center gap-2"><Schedule fontSize="small" />
                <span>Expected: {safeFormat(complaint.expected_resolution, 'dd MMM yyyy')}</span>
              </div>
              {complaint.resolved_at && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle fontSize="small" />
                  <span>Resolved: {safeFormat(complaint.resolved_at, 'dd MMM yyyy')}</span>
                </div>
              )}
            </div>
          </div>

          <div className="card space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Location Info</h3>
            {complaint.area && <p>Area: {complaint.area}</p>}
            {complaint.city && <p>City: {complaint.city}</p>}
            {complaint.ward_number && <p>Ward: {complaint.ward_number}</p>}
            {complaint.pincode && <p>Pincode: {complaint.pincode}</p>}
          </div>

          <div className="card text-sm text-gray-500 dark:text-gray-400">
            <p>👁 {complaint.view_count} views</p>
            <p>👍 {complaint.support_count} supports</p>
          </div>

          {/* ML Prediction Card */}
          {complaint.ml_outcome && (
            <div className={`card border-l-4 ${
              complaint.ml_outcome === 'likely_rejected'  ? 'border-red-500 bg-red-50'    :
              complaint.ml_outcome === 'urgent_escalation'? 'border-orange-500 bg-orange-50':
              complaint.ml_outcome === 'likely_accepted'  ? 'border-green-500 bg-green-50' :
              'border-yellow-500 bg-yellow-50'
            }`}>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                🤖 ML Prediction
              </p>

              {/* Approval chance bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-neutral-700">Approval Chance</span>
                  <span className={`font-bold ${
                    complaint.ml_approval_chance >= 70 ? 'text-green-600' :
                    complaint.ml_approval_chance >= 45 ? 'text-yellow-600' : 'text-red-600'
                  }`}>{complaint.ml_approval_chance}%</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${
                    complaint.ml_approval_chance >= 70 ? 'bg-green-500' :
                    complaint.ml_approval_chance >= 45 ? 'bg-yellow-500' : 'bg-red-500'
                  }`} style={{ width: `${complaint.ml_approval_chance}%` }} />
                </div>
              </div>

              {/* Outcome label */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">
                  {complaint.ml_outcome === 'likely_rejected'   ? '❌' :
                   complaint.ml_outcome === 'urgent_escalation' ? '🚨' :
                   complaint.ml_outcome === 'likely_accepted'   ? '✅' : '⚠️'}
                </span>
                <p className="text-sm font-medium text-neutral-800">{complaint.ml_outcome_label}</p>
              </div>

              {/* Est. resolution */}
              {complaint.ml_estimated_hours > 0 && (
                <p className="text-xs text-neutral-500">
                  ⏱ Estimated resolution: <span className="font-semibold text-neutral-700">{complaint.ml_estimated_hours} hours</span>
                </p>
              )}

              {/* Confidence */}
              <p className="text-xs text-neutral-400 mt-1">
                Model confidence: {Math.round((complaint.ml_confidence || 0) * 100)}%
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Modal */}
      <Modal isOpen={showChat} onClose={() => setShowChat(false)} title="Chat with Officer" size="md">
        <div className="flex flex-col h-96">
          <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
            {messages.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No messages yet.</p>}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${msg.sender_id === user?.id ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'}`}>
                  <p>{msg.message}</p>
                  <p className={`text-xs mt-1 ${msg.sender_id === user?.id ? 'text-primary-200' : 'text-gray-400'}`}>
                      {safeFormat(msg.created_at, 'hh:mm a')}
                    </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="flex gap-2">
            <input className="input-field flex-1 text-sm" placeholder="Type a message..."
              value={newMessage} onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()} />
            <button onClick={handleSendMessage} className="btn-primary px-3 py-2"><Send fontSize="small" /></button>
          </div>
        </div>
      </Modal>

      {/* Feedback Modal */}
      <Modal isOpen={showFeedback} onClose={() => setShowFeedback(false)} title="Rate Resolution">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rating *</p>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(s => (
                <button key={s} type="button" onClick={() => setRating(s)}>
                  {s <= rating ? <Star className="text-yellow-400" style={{ fontSize: 32 }} /> : <StarBorder className="text-gray-300" style={{ fontSize: 32 }} />}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Comment</label>
            <textarea rows={3} className="input-field resize-none" placeholder="Share your experience..."
              value={feedbackComment} onChange={e => setFeedbackComment(e.target.value)} />
          </div>
          <button onClick={handleFeedbackSubmit} disabled={submittingFeedback} className="btn-primary w-full">
            {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
