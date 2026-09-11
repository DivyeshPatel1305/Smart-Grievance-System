import { useState, useEffect, useRef } from 'react'
import { chatService } from '../../services/index'
import { useWebSocket } from '../../hooks/useWebSocket'
import useAuthStore from '../../contexts/authStore'
import { PageLoader } from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import { safeFormat } from '../../utils/dateUtils'
import { Send, Chat } from '@mui/icons-material'

// A message belongs to current user if sender field (id string) matches user.id
// REST API returns: msg.sender = "<uuid>" (ReferenceField → CharField)
// WebSocket pushes:  msg.sender_id = "<uuid>"
const isMine = (msg, userId) =>
  msg.sender_id === userId || msg.sender === userId

export default function CitizenChat() {
  const { user } = useAuthStore()
  const [rooms, setRooms]           = useState([])
  const [activeRoom, setActiveRoom] = useState(null)
  const [messages, setMessages]     = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading]       = useState(true)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    chatService.getRooms()
      .then(({ data }) => setRooms(Array.isArray(data) ? data : (data.results || [])))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const scrollBottom = () =>
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)

  const { send } = useWebSocket(
    activeRoom ? `/ws/chat/${activeRoom.id}/` : '/ws/notifications/',
    (data) => {
      if (data.type === 'message') {
        setMessages(prev => [...prev, data.message])
        scrollBottom()
      }
    }
  )

  const handleSelectRoom = async (room) => {
    setActiveRoom(room)
    try {
      const { data } = await chatService.getMessages(room.id)
      setMessages(Array.isArray(data) ? data : (data.results || []))
      await chatService.markMessagesRead(room.id)
      scrollBottom()
    } catch {}
  }

  const handleSend = () => {
    if (!newMessage.trim() || !activeRoom) return
    send({ message: newMessage.trim() })
    setNewMessage('')
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chat</h1>

      {rooms.length === 0 ? (
        <EmptyState
          title="No chats yet"
          description="Chats are created when a complaint is assigned to an officer."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">

          {/* Room list */}
          <div className="card overflow-y-auto p-0">
            {rooms.map(room => (
              <button
                key={room.id}
                onClick={() => handleSelectRoom(room)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100
                  dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50
                  transition-colors
                  ${activeRoom?.id === room.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {room.complaint_title || 'Complaint Chat'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {room.complaint_id}
                </p>
                {room.last_message && (
                  <p className="text-xs text-gray-400 truncate mt-1">
                    {room.last_message.message}
                  </p>
                )}
                {room.unread_count > 0 && (
                  <span className="inline-block mt-1 bg-primary-600 text-white text-xs rounded-full px-1.5 py-0.5">
                    {room.unread_count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Message panel */}
          <div className="lg:col-span-2 card flex flex-col p-0 overflow-hidden">
            {!activeRoom ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Chat style={{ fontSize: 48 }} className="mb-2 opacity-30" />
                  <p className="text-sm">Select a conversation</p>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">
                    {activeRoom.complaint_title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {activeRoom.officer_name || 'Awaiting officer assignment'}
                  </p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-8">
                      No messages yet. Start the conversation!
                    </p>
                  )}
                  {messages.map((msg, i) => {
                    const mine = isMine(msg, user?.id)
                    return (
                      <div key={msg.id || i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        {!mine && (
                          <div className="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-semibold mr-2 shrink-0 self-end">
                            {(msg.sender_name || '?')[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className={`max-w-xs lg:max-w-sm px-3 py-2 rounded-2xl text-sm
                          ${mine
                            ? 'bg-primary-600 text-white rounded-br-sm'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm'
                          }`}>
                          {!mine && msg.sender_name && (
                            <p className="text-xs font-semibold opacity-70 mb-0.5">{msg.sender_name}</p>
                          )}
                          <p>{msg.message}</p>
                          <p className={`text-xs mt-1 ${mine ? 'text-primary-200' : 'text-gray-400'}`}>
                            {safeFormat(msg.created_at, 'hh:mm a')}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                  <input
                    className="input-field flex-1 text-sm"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                  />
                  <button onClick={handleSend} className="btn-primary px-3 py-2">
                    <Send fontSize="small" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
