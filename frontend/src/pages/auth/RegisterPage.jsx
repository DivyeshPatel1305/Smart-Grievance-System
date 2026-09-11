import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import useAuthStore from '../../contexts/authStore'
import AuthLayout from '../../components/common/AuthLayout'
import { Visibility, VisibilityOff } from '@mui/icons-material'

export default function RegisterPage() {
  const [showPwd, setShowPwd] = useState(false)
  const { register: registerUser, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const password = watch('password')

  const onSubmit = async (data) => {
    const result = await registerUser(data)
    if (result.success && result.needsVerification) {
      toast.success('Account created! Check your email for the OTP.')
      navigate('/verify-email', { state: { email: result.email } })
    } else if (result.success) {
      navigate('/citizen')
    } else {
      const errs = result.error
      if (typeof errs === 'string') toast.error(errs)
      else if (Array.isArray(errs)) errs.flat().forEach(m => toast.error(m))
      else if (typeof errs === 'object' && errs) Object.values(errs).flat().forEach(m => toast.error(m))
      else toast.error('Registration failed')
    }
  }

  return (
    <AuthLayout title="Citizen Registration" subtitle="Create your account to access the grievance portal">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Full name */}
          <div className="sm:col-span-2">
            <label className="input-label">Full Name <span className="text-red-500">*</span></label>
            <input className="input-field" placeholder="As per Aadhaar / ID proof"
              {...register('full_name', { required: 'Required', minLength: { value: 3, message: 'Min 3 characters' } })} />
            {errors.full_name && <p className="text-red-600 text-xs mt-1">{errors.full_name.message}</p>}
          </div>

          {/* Email */}
          <div className="sm:col-span-2">
            <label className="input-label">Email Address <span className="text-red-500">*</span></label>
            <input type="email" className="input-field" placeholder="you@example.com"
              {...register('email', { required: 'Required', pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' } })} />
            {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>}
          </div>

          {/* Phone */}
          <div className="sm:col-span-2">
            <label className="input-label">Mobile Number</label>
            <input className="input-field" placeholder="+91 XXXXX XXXXX" {...register('phone')} />
          </div>

          {/* Password */}
          <div>
            <label className="input-label">Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} className="input-field pr-10"
                placeholder="Min 8 characters"
                {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })} />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
                {showPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </button>
            </div>
            {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>}
          </div>

          {/* Confirm password */}
          <div>
            <label className="input-label">Confirm Password <span className="text-red-500">*</span></label>
            <input type="password" className="input-field" placeholder="Repeat password"
              {...register('confirm_password', {
                required: 'Required',
                validate: v => v === password || 'Passwords do not match'
              })} />
            {errors.confirm_password && <p className="text-red-600 text-xs mt-1">{errors.confirm_password.message}</p>}
          </div>

          {/* City */}
          <div>
            <label className="input-label">City</label>
            <input className="input-field" placeholder="Your city" {...register('city')} />
          </div>

          {/* Ward */}
          <div>
            <label className="input-label">Ward Number</label>
            <input className="input-field" placeholder="Ward no." {...register('ward_number')} />
          </div>

          {/* Address */}
          <div className="sm:col-span-2">
            <label className="input-label">Address</label>
            <input className="input-field" placeholder="House no., street, area" {...register('address')} />
          </div>
        </div>

        <p className="text-xs text-neutral-500 bg-neutral-50 border border-neutral-200 rounded p-3">
          By registering, you agree to use this portal solely for legitimate civic grievances.
          Your details are protected under the Government's data privacy policy.
        </p>

        <button type="submit" disabled={isLoading} className="btn-primary w-full py-3">
          {isLoading
            ? <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating Account...
              </span>
            : 'Register'
          }
        </button>
      </form>

      <div className="mt-4 pt-4 border-t border-neutral-100 text-center">
        <p className="text-sm text-neutral-600">
          Already registered?{' '}
          <Link to="/login" className="text-primary-600 hover:underline font-medium">Sign In</Link>
        </p>
      </div>
    </AuthLayout>
  )
}
