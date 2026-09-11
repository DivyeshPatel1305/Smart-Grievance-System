import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import useAuthStore from '../../contexts/authStore'
import AuthLayout from '../../components/common/AuthLayout'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import { ROLES } from '../../constants'

export default function LoginPage() {
  const [showPwd, setShowPwd] = useState(false)
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    const result = await login(data)
    if (result.success) {
      toast.success(`Welcome, ${result.user.full_name}!`)
      const map = {
        [ROLES.CITIZEN]: '/citizen',
        [ROLES.OFFICER]: '/officer',
        [ROLES.DEPARTMENT_HEAD]: '/officer',
        [ROLES.SUPER_ADMIN]: '/admin',
      }
      navigate(map[result.user.role] || '/citizen')
    } else if (result.code === 'email_not_verified' ||
               (Array.isArray(result.code) && result.code[0] === 'email_not_verified')) {
      toast.error('Please verify your email before logging in.')
      const emailVal = Array.isArray(result.email) ? result.email[0] : (result.email || data.email)
      navigate('/verify-email', { state: { email: emailVal } })
    } else {
      toast.error(result.error || 'Invalid credentials')
    }
  }

  return (
    <AuthLayout title="Citizen Login" subtitle="Sign in to access the grievance portal">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="input-label">Email Address / User ID</label>
          <input type="email" className="input-field" placeholder="you@example.com"
            {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' } })} />
          {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="input-label mb-0">Password</label>
            <Link to="/forgot-password" className="text-xs text-primary-600 hover:underline">
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <input type={showPwd ? 'text' : 'password'} className="input-field pr-10"
              placeholder="Enter your password"
              {...register('password', { required: 'Password is required' })} />
            <button type="button" onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
              {showPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </button>
          </div>
          {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 mt-2">
          {isLoading
            ? <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </span>
            : 'Login'
          }
        </button>
      </form>

      <div className="mt-5 pt-4 border-t border-neutral-100 text-center space-y-2">
        <p className="text-sm text-neutral-600">
          New user?{' '}
          <Link to="/register" className="text-primary-600 hover:underline font-medium">Register here</Link>
        </p>
        <p className="text-sm text-neutral-600">
          Officer / Admin?{' '}
          <Link to="/officer-login" className="text-primary-600 hover:underline font-medium">Officer Login</Link>
        </p>
      </div>
    </AuthLayout>
  )
}
