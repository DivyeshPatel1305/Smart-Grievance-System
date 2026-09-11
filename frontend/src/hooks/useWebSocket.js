import { useEffect, useRef, useCallback } from 'react'
import { WS_BASE_URL } from '../constants'
import useAuthStore from '../contexts/authStore'

export function useWebSocket(path, onMessage) {
  const ws           = useRef(null)
  const token        = useAuthStore((s) => s.accessToken)
  const reconnectRef = useRef(null)
  const mountedRef   = useRef(true)
  // Keep a stable ref to the latest onMessage so connect() doesn't
  // need to depend on it (avoids infinite reconnect loop)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    if (!token || !mountedRef.current) return

    // Clean up existing connection
    if (ws.current) {
      ws.current.onclose = null // prevent reconnect trigger from old socket
      ws.current.close()
    }

    const url = `${WS_BASE_URL}${path}?token=${token}`
    const socket = new WebSocket(url)
    ws.current = socket

    socket.onopen = () => {
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current)
        reconnectRef.current = null
      }
    }

    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        onMessageRef.current(data)
      } catch {}
    }

    socket.onclose = (e) => {
      if (!mountedRef.current) return
      // Reconnect with backoff (3s) unless it was a deliberate close (code 1000)
      if (e.code !== 1000) {
        reconnectRef.current = setTimeout(connect, 3000)
      }
    }

    socket.onerror = () => {
      socket.close()
    }
  // Only depend on token and path — NOT onMessage
  }, [token, path]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      if (ws.current) {
        ws.current.onclose = null
        ws.current.close(1000, 'Component unmounted')
      }
    }
  }, [connect])

  const send = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data))
    }
  }, [])

  return { send }
}
