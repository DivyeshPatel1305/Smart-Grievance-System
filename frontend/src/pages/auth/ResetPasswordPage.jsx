import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authService } from '../../services/authService'
import AuthLayout from '../../components/common/AuthLayout'
import { Visibility, VisibilityOff } from '@mui/icons-material'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = (location.state?.email || localStorage.getItem('reset_email') || '').toLowerCase().trim()

  useEffect(() => { if (!email) navigate('/forgot-password', { replace: true }) }, [email, navigate])

  const [otp,        setOtp]        = useState(['', '', '', '', '', ''])
  const [newPwd,     setNewPwd]     = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPwd,    setShowPwd]    = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [resending,  setResending]  = useState(false)
  const [countdown,  setCountdown]  = useState(60)
  const inputRefs = useRef([])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleOtpChange = (i, val) => {
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

  const handleResend = async () => {
    setResending(true)
    try {
      const { data } = await authService.forgotPassword(email)
      toast.success('New OTP sent')
      if (data.otp) toast(`Dev OTP: ${data.otp}`, { icon: '🔑', duration: 30000 })
      setCountdown(60); setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } catch { toast.error('Failed to resend') }
    finally { setResending(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) return toast.error('Enter all 6 OTP digits')
    if (newPwd.length < 8) return toast.error('Password must be at least 8 characters')
    if (newPwd !== confirmPwd) return toast.error('Passwords do not match')
    setLoading(true)
    try {
      await authService.resetPassword({ email, otp: code, new_password: newPwd, confirm_password: confirmPwd })
      localStorage.removeItem('reset_email')
      toast.success('Password reset successfully!')
      navigate('/login', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid or expired OTP'
      toast.error(msg)
      if (msg.toLowerCase().includes('otp')) { setOtp(['', '', '', '', '', '']); inputRefs.current[0]?.focus() }
    } finally { setLoading(false) }
  }

  return (
    <AuthLayout title="Reset Password" subtitle={`OTP sent to ${email}`}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* OTP */}
        <div>
          <label className="input-label mb-2 block">Enter OTP</label>
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input key={i} ref={el => inputRefs.current[i] = el}
                type="text" inputMode="numeric" maxLength={1} value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className={`w-11 h-12 text-center text-xl font-bold rounded border-2 transition-all
                  focus:outline-none focus:ring-2 focus:ring-primary-400
                  ${digit ? 'border-primary-500 bg-primary-50' : 'border-neutral-300 bg-white'}`}
              />
            ))}
          </div>
          <div className="text-center mt-2 text-sm">
            {countdown > 0
              ? <span className="text-neutral-500">Resend in <b className="text-primary-600">{countdown}s</b></span>
              : <button type="button" onClick={handleResend} disabled={resending}
                  className="text-primary-600 hover:underline font-medium">
                  {resending ? 'Sending...' : 'Resend OTP'}
                </button>
            }
          </div>
        </div>

        {/* New password */}
        <div>
          <label className="input-label">New Password</label>
          <div className="relative">
            <input type={showPwd ? 'text' : 'password'} className="input-field pr-10"
              placeholder="Min 8 characters" value={newPwd}
              onChange={e => setNewPwd(e.target.value)} />
            <button type="button" onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
              {showPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </button>
          </div>
          {/* Strength bar */}
          {newPwd && (
            <div className="mt-1.5 flex gap-1">
              {[1,2,3,4].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                  newPwd.length >= i * 3
                    ? newPwd.length >= 12 ? 'bg-igreen-500' : newPwd.length >= 8 ? 'bg-yellow-400' : 'bg-red-400'
                    : 'bg-neutral-200'}`} />
              ))}
            </div>
          )}
        </div>

        {/* Confirm */}
        <div>
          <label className="input-label">Confirm New Password</label>
          <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
            className={`input-field ${confirmPwd && confirmPwd !== newPwd ? 'border-red-400' : confirmPwd && confirmPwd === newPwd ? 'border-igreen-500' : ''}`}
            placeholder="Repeat new password" />
          {confirmPwd && confirmPwd !== newPwd && <p className="text-red-600 text-xs mt-1">Passwords do not match</p>}
          {confirmPwd && confirmPwd === newPwd  && <p className="text-igreen-500 text-xs mt-1">✓ Passwords match</p>}
        </div>

        <button type="submit"
          disabled={loading || otp.join('').length < 6 || !newPwd || newPwd !== confirmPwd}
          className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading
            ? <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Resetting...
              </span>
            : 'Reset Password'
          }
        </button>
      </form>

      <div className="mt-4 text-center">
        <Link to="/login" className="text-sm text-neutral-500 hover:text-primary-600">← Back to Login</Link>
      </div>
    </AuthLayout>
  )
}
