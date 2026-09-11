import { useState, useEffect, useRef } from 'react'
import { chatService } from '../../services/index'
import { useWebSocket } from '../../hooks/useWebSocket'
import useAuthStore from '../../contexts/authStore'
import { PageLoader } from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import { safeFormat } from '../../utils/dateUtils'
import { Send, Chat } from '@mui/icons-material'

const isMine = (msg, userId) =>
  msg.sender_id === userId || msg.sender === userId

export default function OfficerChat() {
  const { user } = useAuthStore()
  const [rooms, setRooms] = useState([])
  const [activeRoom, setActiveRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    chatService.getRooms().then(({ data }) => {
      setRooms(data.results || data)
      setLoading(false)
    })
  }, [])

  const { send } = useWebSocket(
    activeRoom ? `/ws/chat/${activeRoom.id}/` : '/ws/notifications/',
    (data) => {
      if (data.type === 'message') {
        setMessages(prev => [...prev, data.message])
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
    }
  )

  const handleSelectRoom = async (room) => {
    setActiveRoom(room)
    const { data } = await chatService.getMessages(room.id)
    setMessages(data.results || data)
    await chatService.markMessagesRead(room.id)
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const handleSend = () => {
    if (!newMessage.trim() || !activeRoom) return
    send({ message: newMessage.trim() })
    setNewMessage('')
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Citizen Chat</h1>
      {rooms.length === 0 ? (
        <EmptyState title="No chats" description="Chats appear when complaints are assigned to you." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
          <div className="card overflow-y-auto p-0">
            {rooms.map(room => (
              <button key={room.id} onClick={() => handleSelectRoom(room)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors
                  ${activeRoom?.id === room.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{room.complaint_title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{room.citizen_name}</p>
                {room.last_message && <p className="text-xs text-gray-400 truncate mt-1">{room.last_message.message}</p>}
                {room.unread_count > 0 && (
                  <span className="inline-block mt-1 bg-indigo-600 text-white text-xs rounded-full px-1.5 py-0.5">{room.unread_count}</span>
                )}
              </button>
            ))}
          </div>
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
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{activeRoom.complaint_title}</p>
                  <p className="text-xs text-gray-500">{activeRoom.citizen_name}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${isMine(msg, user?.id) ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${isMine(msg, user?.id) ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'}`}>
                        <p>{msg.message}</p>
                        <p className={`text-xs mt-1 ${msg.sender_id === user?.id ? 'text-indigo-200' : 'text-gray-400'}`}>
                          {safeFormat(msg.created_at, 'hh:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                  <input className="input-field flex-1 text-sm" placeholder="Type a message..."
                    value={newMessage} onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()} />
                  <button onClick={handleSend} className="btn-primary px-3 py-2"><Send fontSize="small" /></button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
