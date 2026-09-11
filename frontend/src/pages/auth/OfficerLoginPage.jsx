import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import axios from 'axios'
import useAuthStore from '../../contexts/authStore'
import AuthLayout from '../../components/common/AuthLayout'
import { Visibility, VisibilityOff, AdminPanelSettings, Badge } from '@mui/icons-material'
import { ROLES } from '../../constants'

// Use plain axios — no auth token needed for these public endpoints
// Falls back to full URL if proxy isn't available
const publicApi = axios.create({
  baseURL: '/api/v1',
  timeout: 5000,
})

const CITIES = ['Ahmedabad', 'Surat', 'Baroda', 'Surendranagar']

export default function OfficerLoginPage() {
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()

  // ── Step 1: role choice ─────────────────────────────────────────────────
  const [loginType, setLoginType] = useState(null)  // 'admin' | 'officer'

  // ── Admin login state ──────────────────────────────────────────────────
  const [adminEmail,    setAdminEmail]    = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [showAdminPwd,  setShowAdminPwd]  = useState(false)

  // ── Officer login state ────────────────────────────────────────────────
  const [city,       setCity]       = useState('')
  const [departments,setDepartments]= useState([])
  const [department, setDepartment] = useState('')
  const [officers,   setOfficers]   = useState([])
  const [selectedOfficer, setSelectedOfficer] = useState(null)  // full officer object
  const [officerPassword, setOfficerPassword] = useState('')
  const [showOfficerPwd,  setShowOfficerPwd]  = useState(false)
  const [loadingOfficers, setLoadingOfficers] = useState(false)

  const [deptLoading, setDeptLoading] = useState(true)

  // Load departments on mount with retry
  useEffect(() => {
    let retries = 0
    const load = () => {
      publicApi.get('/departments/')
        .then(({ data }) => {
          const list = Array.isArray(data) ? data : (data.results || [])
          list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
          setDepartments(list)
          setDeptLoading(false)
        })
        .catch(() => {
          retries++
          if (retries < 3) setTimeout(load, 1500)
          else setDeptLoading(false)
        })
    }
    load()
  }, [])

  // Load officers when city + department selected
  useEffect(() => {
    if (!city || !department) { setOfficers([]); setSelectedOfficer(null); return }
    setLoadingOfficers(true)
    setSelectedOfficer(null)
    const token = localStorage.getItem('access_token')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    publicApi.get('/auth/users/officers_by_city/', {
      params: { city, department_id: department },
      headers,
    })
      .then(({ data }) => setOfficers(Array.isArray(data) ? data : []))
      .catch(() => setOfficers([]))
      .finally(() => setLoadingOfficers(false))
  }, [city, department])

  // ── Submit admin login ─────────────────────────────────────────────────
  const handleAdminLogin = async (e) => {
    e.preventDefault()
    if (!adminEmail || !adminPassword) return toast.error('Enter email and password')
    const result = await login({ email: adminEmail, password: adminPassword })
    if (result.success) {
      toast.success(`Welcome, ${result.user.full_name}!`)
      navigate(result.user.role === 'super_admin' ? '/admin' : '/officer')
    } else {
      toast.error(result.error || 'Invalid credentials')
    }
  }

  // ── Submit officer login ───────────────────────────────────────────────
  const handleOfficerLogin = async (e) => {
    e.preventDefault()
    if (!selectedOfficer) return toast.error('Select an officer')
    if (!officerPassword)  return toast.error('Enter password')
    const result = await login({ email: selectedOfficer.email, password: officerPassword })
    if (result.success) {
      toast.success(`Welcome, ${result.user.full_name}!`)
      const map = {
        [ROLES.OFFICER]:          '/officer',
        [ROLES.DEPARTMENT_HEAD]:  '/officer',
        [ROLES.SUPER_ADMIN]:      '/admin',
        [ROLES.CITIZEN]:          '/citizen',
      }
      navigate(map[result.user.role] || '/officer')
    } else if (result.code === 'email_not_verified' ||
               (Array.isArray(result.code) && result.code[0] === 'email_not_verified')) {
      toast.error('Please verify your email.')
    } else {
      toast.error(result.error || 'Invalid credentials')
    }
  }

  // ── Render: step 0 — choose login type ─────────────────────────────────
  if (!loginType) {
    return (
      <AuthLayout title="Officer / Admin Portal" subtitle="Select your login type to continue">
        <div className="grid grid-cols-2 gap-4 mt-2">
          {/* Admin */}
          <button onClick={() => setLoginType('admin')}
            className="flex flex-col items-center gap-3 border-2 border-neutral-200 hover:border-primary-500
                       hover:bg-primary-50 rounded-lg p-6 transition-all group">
            <div className="w-14 h-14 bg-saffron-50 border border-saffron-200 rounded-full
                            flex items-center justify-center group-hover:bg-saffron-100">
              <AdminPanelSettings className="text-saffron-600" style={{ fontSize: 32 }} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-neutral-800">Admin</p>
              <p className="text-xs text-neutral-400 mt-0.5">Super Administrator</p>
            </div>
          </button>

          {/* Officer */}
          <button onClick={() => setLoginType('officer')}
            className="flex flex-col items-center gap-3 border-2 border-neutral-200 hover:border-primary-500
                       hover:bg-primary-50 rounded-lg p-6 transition-all group">
            <div className="w-14 h-14 bg-primary-50 border border-primary-200 rounded-full
                            flex items-center justify-center group-hover:bg-primary-100">
              <Badge className="text-primary-600" style={{ fontSize: 32 }} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-neutral-800">Officer</p>
              <p className="text-xs text-neutral-400 mt-0.5">Field / Dept Officer</p>
            </div>
          </button>
        </div>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-neutral-500 hover:text-primary-600">
            ← Citizen Login
          </Link>
        </div>
      </AuthLayout>
    )
  }

  // ── Render: Admin login ─────────────────────────────────────────────────
  if (loginType === 'admin') {
    return (
      <AuthLayout title="Admin Login" subtitle="Super Administrator access">
        <div className="bg-amber-50 border-l-4 border-amber-400 px-4 py-3 mb-5 text-sm text-amber-800 rounded-r">
          <strong>Restricted Access.</strong> For Super Administrators only.
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label className="input-label">Admin Email</label>
            <input type="email" className="input-field" placeholder="admin@grievance.gov.in"
              value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required />
          </div>
          <div>
            <label className="input-label">Password</label>
            <div className="relative">
              <input type={showAdminPwd ? 'text' : 'password'} className="input-field pr-10"
                placeholder="Enter password"
                value={adminPassword} onChange={e => setAdminPassword(e.target.value)} required />
              <button type="button" onClick={() => setShowAdminPwd(!showAdminPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
                {showAdminPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={isLoading} className="btn-primary w-full py-3">
            {isLoading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              : 'Login as Admin'
            }
          </button>
        </form>

        <button onClick={() => setLoginType(null)}
          className="mt-4 w-full text-sm text-neutral-500 hover:text-primary-600 text-center">
          ← Back
        </button>
      </AuthLayout>
    )
  }

  // ── Render: Officer login ───────────────────────────────────────────────
  return (
    <AuthLayout title="Officer Login" subtitle="Select your city and department to find your account">
      <form onSubmit={handleOfficerLogin} className="space-y-4">

        {/* Step 1: City */}
        <div>
          <label className="input-label">
            <span className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center mr-1.5 font-bold">1</span>
            Select City
          </label>
          <select className="input-field" value={city}
            onChange={e => { setCity(e.target.value); setDepartment(''); setSelectedOfficer(null) }}>
            <option value="">— Choose your city —</option>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Step 2: Department */}
        {city && (
          <div>
            <label className="input-label">
              <span className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center mr-1.5 font-bold">2</span>
              Select Department
              {deptLoading && <span className="ml-2 text-xs text-neutral-400">Loading...</span>}
            </label>
            <select className="input-field" value={department}
              onChange={e => { setDepartment(e.target.value); setSelectedOfficer(null) }}
              disabled={deptLoading}>
              <option value="">— Choose your department —</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {!deptLoading && departments.length === 0 && (
              <p className="text-xs text-red-600 mt-1">Could not load departments. Check backend is running.</p>
            )}
          </div>
        )}

        {/* Step 3: Officer */}
        {city && department && (
          <div>
            <label className="input-label">
              <span className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center mr-1.5 font-bold">3</span>
              Select Officer
              {loadingOfficers && <span className="ml-2 text-xs text-neutral-400">Loading...</span>}
              {!loadingOfficers && officers.length > 0 &&
                <span className="ml-2 text-xs text-neutral-400">{officers.length} available</span>}
            </label>
            {!loadingOfficers && officers.length === 0
              ? <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  No officers found in {city} for this department.
                </div>
              : <div className="space-y-2 max-h-48 overflow-y-auto border border-neutral-200 rounded-lg p-2">
                  {officers.map(o => (
                    <button key={o.id} type="button"
                      onClick={() => setSelectedOfficer(o)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all text-sm
                        ${selectedOfficer?.id === o.id
                          ? 'bg-primary-50 border-primary-500 text-primary-800'
                          : 'bg-white border-neutral-200 hover:border-primary-300 hover:bg-primary-50/50 text-neutral-700'
                        }`}>
                      <p className="font-medium">{o.full_name}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {o.designation || 'Field Officer'} · {o.city}
                        {o.role === 'department_head' && (
                          <span className="ml-1 bg-igreen-500 text-white text-xs px-1.5 py-0.5 rounded-full">Head</span>
                        )}
                      </p>
                    </button>
                  ))}
                </div>
            }
          </div>
        )}

        {/* Step 4: Password */}
        {selectedOfficer && (
          <div>
            <label className="input-label">
              <span className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center mr-1.5 font-bold">4</span>
              Password for <span className="text-primary-700 font-semibold">{selectedOfficer.full_name}</span>
            </label>
            <div className="relative">
              <input type={showOfficerPwd ? 'text' : 'password'} className="input-field pr-10"
                placeholder="Enter your password"
                value={officerPassword} onChange={e => setOfficerPassword(e.target.value)}
                autoFocus />
              <button type="button" onClick={() => setShowOfficerPwd(!showOfficerPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
                {showOfficerPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </button>
            </div>
          </div>
        )}

        {/* Submit */}
        {selectedOfficer && (
          <button type="submit" disabled={isLoading || !officerPassword}
            className="btn-primary w-full py-3 disabled:opacity-50">
            {isLoading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              : `Login as ${selectedOfficer.full_name}`
            }
          </button>
        )}
      </form>

      <button onClick={() => setLoginType(null)}
        className="mt-4 w-full text-sm text-neutral-500 hover:text-primary-600 text-center">
        ← Back
      </button>

      <div className="mt-3 text-center">
        <Link to="/login" className="text-sm text-neutral-400 hover:text-primary-600">
          Citizen Login
        </Link>
      </div>
    </AuthLayout>
  )
}
