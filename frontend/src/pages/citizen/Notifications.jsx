import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import useNotificationStore from '../../contexts/notificationStore'
import { useWebSocket } from '../../hooks/useWebSocket'
import EmptyState from '../../components/common/EmptyState'
import { safeFormat } from '../../utils/dateUtils'
import { DoneAll, Circle } from '@mui/icons-material'

export default function CitizenNotifications() {
  const { notifications, fetchNotifications, markRead, markAllRead, addNotification } = useNotificationStore()

  useEffect(() => { fetchNotifications() }, [])

  useWebSocket('/ws/notifications/', (data) => {
    if (data.type === 'notification') addNotification(data.notification)
  })

  const typeIcons = {
    complaint_submitted: '📝',
    complaint_assigned: '👤',
    status_changed: '🔄',
    complaint_resolved: '✅',
    new_message: '💬',
    complaint_reopened: '🔁',
    priority_escalated: '⚠️',
    feedback_requested: '⭐',
    announcement: '📢',
    system: '🔔',
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {notifications.filter(n => !n.is_read).length} unread
          </p>
        </div>
        {notifications.some(n => !n.is_read) && (
          <button onClick={markAllRead} className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium">
            <DoneAll fontSize="small" /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState title="No notifications" description="You're all caught up!" />
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => !n.is_read && markRead(n.id)}
              className={`card cursor-pointer transition-all hover:shadow-md ${!n.is_read ? 'border-primary-200 dark:border-primary-700 bg-primary-50/30 dark:bg-primary-900/10' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{typeIcons[n.notification_type] || '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${!n.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                      {n.title}
                    </p>
                    {!n.is_read && <Circle className="text-primary-500 shrink-0" style={{ fontSize: 10 }} />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.message}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400">{safeFormat(n.created_at, 'dd MMM yyyy, hh:mm a')}</span>
                    {n.complaint && (
                      <Link
                        to={`/citizen/complaints/${n.complaint}`}
                        className="text-xs text-primary-600 hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        View complaint →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
