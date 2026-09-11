import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authService } from '../../services/authService'
import AuthLayout from '../../components/common/AuthLayout'

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const emailFromState = location.state?.email || ''
  const [email] = useState(
    () => (emailFromState || localStorage.getItem('verify_email') || '').toLowerCase().trim()
  )

  useEffect(() => {
    if (email) localStorage.setItem('verify_email', email)
  }, [email])

  useEffect(() => {
    if (!email) navigate('/register', { replace: true })
  }, [email, navigate])

  const [otp, setOtp]           = useState(['', '', '', '', '', ''])
  const [loading, setLoading]   = useState(false)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const inputRefs = useRef([])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]; next[i] = val; setOtp(next)
    if (val && i < 5) inputRefs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputRefs.current[i - 1]?.focus()
  }

  const handlePaste = (e) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (p.length === 6) { setOtp(p.split('')); inputRefs.current[5]?.focus() }
  }

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length < 6) return toast.error('Enter all 6 digits')
    setLoading(true)
    try {
      await authService.verifyEmail(email, code)
      localStorage.removeItem('verify_email')
      toast.success('Email verified! You can now log in.')
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid or expired OTP')
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally { setLoading(false) }
  }

  const sendOtp = async (successMessage = 'Verification OTP sent to your email.') => {
    try {
      await authService.sendOTP(email)
      toast.success(successMessage)
      setCountdown(60)
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
      return true
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send OTP')
      return false
    }
  }

  useEffect(() => {
    if (!email) return
    sendOtp('Verification OTP sent to your email.')
  }, [email])

  const handleResend = async () => {
    setResending(true)
    try {
      await sendOtp('New OTP sent')
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthLayout title="Email Verification" subtitle="Enter the 6-digit OTP sent to your email">
      <div className="text-center mb-5">
        <div className="w-12 h-12 bg-primary-50 border border-primary-200 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl">📧</span>
        </div>
        <p className="text-sm text-neutral-600">
          OTP sent to <span className="font-semibold text-primary-700">{email}</span>
        </p>
        <p className="text-xs text-neutral-400 mt-1">Valid for 10 minutes</p>
      </div>

      {/* OTP boxes */}
      <div className="flex justify-center gap-2 mb-4" onPaste={handlePaste}>
        {otp.map((digit, i) => (
          <input key={i} ref={el => inputRefs.current[i] = el}
            type="text" inputMode="numeric" maxLength={1} value={digit}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            className={`w-11 h-12 text-center text-xl font-bold rounded border-2 transition-all
              focus:outline-none focus:ring-2 focus:ring-primary-400
              ${digit ? 'border-primary-500 bg-primary-50' : 'border-neutral-300 bg-white'}`}
          />
        ))}
      </div>

      <button onClick={handleVerify}
        disabled={loading || otp.join('').length < 6}
        className="btn-primary w-full py-3 mb-4 disabled:opacity-50">
        {loading
          ? <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Verifying...
            </span>
          : 'Verify OTP'
        }
      </button>

      <div className="text-center text-sm">
        {countdown > 0
          ? <p className="text-neutral-500">Resend in <span className="font-semibold text-primary-600">{countdown}s</span></p>
          : <button onClick={handleResend} disabled={resending}
              className="text-primary-600 hover:underline font-medium">
              {resending ? 'Sending...' : 'Resend OTP'}
            </button>
        }
      </div>

      <div className="mt-4 text-center">
        <Link to="/login" className="text-sm text-neutral-500 hover:text-primary-600">← Back to Login</Link>
      </div>
    </AuthLayout>
  )
}
