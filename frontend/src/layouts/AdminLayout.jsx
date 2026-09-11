import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '../contexts/authStore'
import { useTheme } from '../contexts/ThemeContext'
import ErrorBoundary from '../components/common/ErrorBoundary'
import {
  DashboardOutlined, People, Business, Badge, Category,
  ListAlt, Assessment, History, Settings,
  Menu, Close, LightMode, DarkMode, Logout, Home, AdminPanelSettings
} from '@mui/icons-material'

const navItems = [
  { to: '/admin',              label: 'Dashboard',         icon: DashboardOutlined, end: true },
  { to: '/admin/users',        label: 'Manage Users',      icon: People },
  { to: '/admin/departments',  label: 'Departments',       icon: Business },
  { to: '/admin/officers',     label: 'Officers',          icon: Badge },
  { to: '/admin/categories',   label: 'Categories',        icon: Category },
  { to: '/admin/complaints',   label: 'All Complaints',    icon: ListAlt },
  { to: '/admin/reports',      label: 'Reports & Analytics', icon: Assessment },
  { to: '/admin/activity-logs',label: 'Activity Logs',     icon: History },
  { to: '/admin/settings',     label: 'Settings',          icon: Settings },
]

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const handleLogout = async () => { await logout(); navigate('/login') }

  return (
    <div className="flex h-screen bg-neutral-100 overflow-hidden">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar — darker for admin */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-60 bg-neutral-900 flex flex-col
        transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="px-4 py-4 border-b border-neutral-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-saffron-500 rounded flex items-center justify-center flex-shrink-0">
              <AdminPanelSettings style={{ fontSize: 16 }} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-bold truncate">Admin Panel</p>
              <p className="text-neutral-400 text-xs">Super Administrator</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-neutral-400">
              <Close fontSize="small" />
            </button>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-sm transition-all duration-150
                 ${isActive
                   ? 'bg-white/10 text-white border-l-2 border-saffron-500'
                   : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                 }`
              }
              onClick={() => setSidebarOpen(false)}>
              <Icon fontSize="small" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-neutral-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-saffron-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">{user?.full_name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.full_name}</p>
              <p className="text-xs text-neutral-400">Super Admin</p>
            </div>
            <button onClick={handleLogout} title="Logout" className="text-neutral-400 hover:text-red-400 transition-colors">
              <Logout fontSize="small" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-neutral-200 px-4 py-2.5 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-neutral-500">
            <Menu />
          </button>
          <div className="flex-1">
            <p className="text-xs text-neutral-400">Smart Grievance Portal &rsaquo; Administration</p>
          </div>
          <button onClick={toggleTheme} className="p-1.5 rounded text-neutral-500 hover:bg-neutral-100 transition-colors">
            {isDark ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
          </button>
          <button onClick={() => navigate('/')} className="p-1.5 rounded text-neutral-500 hover:bg-neutral-100 transition-colors" title="Home">
            <Home fontSize="small" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-5">
          <ErrorBoundary><Outlet /></ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
