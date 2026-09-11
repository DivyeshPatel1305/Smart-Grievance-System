import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { authService } from '../../services/authService'
import AuthLayout from '../../components/common/AuthLayout'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async ({ email }) => {
    setLoading(true)
    try {
      const { data } = await authService.forgotPassword(email.toLowerCase().trim())
      toast.success('OTP sent! Check your email.')
      if (data.otp) toast(`Dev OTP: ${data.otp}`, { icon: '🔑', duration: 30000 })
      localStorage.setItem('reset_email', email.toLowerCase().trim())
      navigate('/reset-password', { state: { email: email.toLowerCase().trim() } })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Something went wrong')
    } finally { setLoading(false) }
  }

  return (
    <AuthLayout title="Forgot Password" subtitle="Enter your registered email to receive an OTP">
      <div className="bg-amber-50 border-l-4 border-amber-400 px-4 py-3 mb-5 text-sm text-amber-800 rounded-r">
        A 6-digit OTP will be sent to your registered email address.
        The OTP is valid for <strong>10 minutes</strong>.
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="input-label">Registered Email Address</label>
          <input type="email" className="input-field" placeholder="you@example.com"
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' }
            })} />
          {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading
            ? <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending OTP...
              </span>
            : 'Send OTP'
          }
        </button>
      </form>

      <div className="mt-4 text-center">
        <Link to="/login" className="text-sm text-neutral-500 hover:text-primary-600">← Back to Login</Link>
      </div>
    </AuthLayout>
  )
}
