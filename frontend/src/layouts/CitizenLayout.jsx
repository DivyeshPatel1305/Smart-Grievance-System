import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '../contexts/authStore'
import useNotificationStore from '../contexts/notificationStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { useTheme } from '../contexts/ThemeContext'
import toast from 'react-hot-toast'
import ErrorBoundary from '../components/common/ErrorBoundary'
import {
  DashboardOutlined, AddCircleOutline, ListAlt, LocationOn,
  Public, Person, Notifications, Chat, MiscellaneousServices,
  Menu, Close, LightMode, DarkMode, Logout, NotificationsActive, Home
} from '@mui/icons-material'

const navItems = [
  { to: '/citizen',                label: 'Dashboard',       icon: DashboardOutlined,     end: true },
  { to: '/citizen/raise-complaint',label: 'Lodge Complaint', icon: AddCircleOutline },
  { to: '/citizen/complaints',     label: 'My Complaints',   icon: ListAlt },
  { to: '/citizen/nearby',         label: 'Nearby Issues',   icon: LocationOn },
  { to: '/citizen/feed',           label: 'Public Feed',     icon: Public },
  { to: '/citizen/chat',           label: 'Chat',            icon: Chat },
  { to: '/citizen/notifications',  label: 'Notifications',   icon: Notifications },
  { to: '/citizen/services',       label: 'Services',        icon: MiscellaneousServices },
  { to: '/citizen/profile',        label: 'My Profile',      icon: Person },
]

export default function CitizenLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const { unreadCount, fetchUnreadCount, addNotification } = useNotificationStore()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  useEffect(() => { fetchUnreadCount() }, [])

  useWebSocket('/ws/notifications/', (data) => {
    if (data.type === 'notification') {
      addNotification(data.notification)
      toast(data.notification.title, { icon: '🔔' })
    }
  })

  const handleLogout = async () => { await logout(); navigate('/login') }

  return (
    <div className="flex h-screen bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-60 bg-primary-700 flex flex-col
        transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="px-4 py-4 border-b border-primary-600">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-saffron-500 rounded flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">GP</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-bold leading-tight truncate">Grievance Portal</p>
              <p className="text-primary-300 text-xs truncate">Citizen Dashboard</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-primary-300">
              <Close fontSize="small" />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}>
              <Icon fontSize="small" />
              <span className="flex-1">{label}</span>
              {label === 'Notifications' && unreadCount > 0 && (
                <span className="bg-saffron-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-3 border-t border-primary-600">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-saffron-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">{user?.full_name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.full_name}</p>
              <p className="text-xs text-primary-300 truncate">{user?.email}</p>
            </div>
            <button onClick={handleLogout} title="Logout"
              className="text-primary-300 hover:text-red-400 transition-colors">
              <Logout fontSize="small" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 px-4 py-2.5 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-neutral-500 hover:text-neutral-700">
            <Menu />
          </button>

          {/* Breadcrumb area */}
          <div className="flex-1">
            <p className="text-xs text-neutral-400">Smart Grievance Portal &rsaquo; Citizen</p>
          </div>

          <button onClick={toggleTheme} className="p-1.5 rounded text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
            {isDark ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
          </button>

          <NavLink to="/citizen/notifications" className="relative p-1.5 rounded text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
            {unreadCount > 0 ? <NotificationsActive fontSize="small" className="text-saffron-500" /> : <Notifications fontSize="small" />}
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </NavLink>

          <button onClick={() => navigate('/')} title="Home"
            className="p-1.5 rounded text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
            <Home fontSize="small" />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-5">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
