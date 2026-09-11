import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import useAuthStore from './contexts/authStore'
import ErrorBoundary from './components/common/ErrorBoundary'

// Layouts
import CitizenLayout from './layouts/CitizenLayout'
import OfficerLayout from './layouts/OfficerLayout'
import AdminLayout from './layouts/AdminLayout'

// Auth Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import OfficerLoginPage from './pages/auth/OfficerLoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'

// Citizen Pages
import CitizenDashboard from './pages/citizen/Dashboard'
import RaiseComplaint from './pages/citizen/RaiseComplaint'
import MyComplaints from './pages/citizen/MyComplaints'
import ComplaintDetail from './pages/citizen/ComplaintDetail'
import NearbyComplaints from './pages/citizen/NearbyComplaints'
import PublicFeed from './pages/citizen/PublicFeed'
import CitizenProfile from './pages/citizen/Profile'
import CitizenNotifications from './pages/citizen/Notifications'
import CitizenChat from './pages/citizen/Chat'
import ServiceRequests from './pages/citizen/ServiceRequests'

// Officer Pages
import OfficerDashboard from './pages/officer/Dashboard'
import OfficerProfile from './pages/officer/Profile'
import AssignedComplaints from './pages/officer/AssignedComplaints'
import OfficerComplaintDetail from './pages/officer/ComplaintDetail'
import OfficerChat from './pages/officer/Chat'
import OfficerAnalytics from './pages/officer/Analytics'

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard'
import ManageUsers from './pages/admin/ManageUsers'
import ManageDepartments from './pages/admin/ManageDepartments'
import ManageOfficers from './pages/admin/ManageOfficers'
import ManageCategories from './pages/admin/ManageCategories'
import AdminComplaints from './pages/admin/Complaints'
import AdminReports from './pages/admin/Reports'
import ActivityLogs from './pages/admin/ActivityLogs'
import SystemSettings from './pages/admin/SystemSettings'

// Error Pages
import NotFound from './pages/errors/NotFound'
import Forbidden from './pages/errors/Forbidden'

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user?.role)) return <Navigate to="/403" replace />
  return children
}

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/officer-login" element={<OfficerLoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Citizen */}
        <Route path="/citizen" element={
          <ProtectedRoute allowedRoles={['citizen']}>
            <CitizenLayout />
          </ProtectedRoute>
        }>
          <Route index element={<CitizenDashboard />} />
          <Route path="raise-complaint" element={<RaiseComplaint />} />
          <Route path="complaints" element={<MyComplaints />} />
          <Route path="complaints/:id" element={<ComplaintDetail />} />
          <Route path="nearby" element={<NearbyComplaints />} />
          <Route path="feed" element={<PublicFeed />} />
          <Route path="profile" element={<CitizenProfile />} />
          <Route path="notifications" element={<CitizenNotifications />} />
          <Route path="chat" element={<CitizenChat />} />
          <Route path="services" element={<ServiceRequests />} />
        </Route>

        {/* Officer */}
        <Route path="/officer" element={
          <ProtectedRoute allowedRoles={['officer', 'department_head']}>
            <OfficerLayout />
          </ProtectedRoute>
        }>
          <Route index element={<OfficerDashboard />} />
          <Route path="profile" element={<OfficerProfile />} />
          <Route path="complaints" element={<AssignedComplaints />} />
          <Route path="complaints/:id" element={<OfficerComplaintDetail />} />
          <Route path="chat" element={<OfficerChat />} />
          <Route path="analytics" element={<OfficerAnalytics />} />
        </Route>

        {/* Admin */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="departments" element={<ManageDepartments />} />
          <Route path="officers" element={<ManageOfficers />} />
          <Route path="categories" element={<ManageCategories />} />
          <Route path="complaints" element={<AdminComplaints />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="activity-logs" element={<ActivityLogs />} />
          <Route path="settings" element={<SystemSettings />} />
        </Route>

        {/* Errors */}
        <Route path="/403" element={<Forbidden />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </ErrorBoundary>
    </ThemeProvider>
  )
}
