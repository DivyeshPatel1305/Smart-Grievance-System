import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { authService } from '../../services/authService'
import useAuthStore from '../../contexts/authStore'
import { PageLoader } from '../../components/common/LoadingSpinner'
import { Person, Edit, Save, Lock } from '@mui/icons-material'
import { MEDIA_URL } from '../../constants'

export default function CitizenProfile() {
  const { user, updateUser } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [profilePicPreview, setProfilePicPreview] = useState(null)
  const [profilePicFile, setProfilePicFile] = useState(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()
  const { register: regPwd, handleSubmit: handlePwd, reset: resetPwd, watch, formState: { errors: pwdErrors } } = useForm()
  const newPwd = watch('new_password')

  useEffect(() => {
    if (user) reset({ full_name: user.full_name, phone: user.phone || '' })
  }, [user])

  const onProfileSubmit = async (data) => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('full_name', data.full_name)
      formData.append('phone', data.phone || '')
      if (profilePicFile) formData.append('profile_picture', profilePicFile)
      const { data: updated } = await authService.updateProfile(formData)
      updateUser(updated)
      toast.success('Profile updated successfully')
      setEditMode(false)
    } catch { toast.error('Failed to update profile') }
    finally { setLoading(false) }
  }

  const onPasswordSubmit = async (data) => {
    try {
      await authService.changePassword(data)
      toast.success('Password changed successfully')
      resetPwd()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password')
    }
  }

  const avatarSrc = profilePicPreview || (user?.profile_picture
    ? (user.profile_picture.startsWith('http') ? user.profile_picture : `${MEDIA_URL}${user.profile_picture}`)
    : null)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>

      {/* Profile Card */}
      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            {avatarSrc ? (
              <img src={avatarSrc} alt="Avatar" className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                <span className="text-primary-700 dark:text-primary-300 font-bold text-2xl">
                  {user?.full_name?.[0]?.toUpperCase()}
                </span>
              </div>
            )}
            {editMode && (
              <label className="absolute bottom-0 right-0 w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center cursor-pointer">
                <Edit style={{ fontSize: 14 }} className="text-white" />
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => {
                    const f = e.target.files[0]
                    if (f) { setProfilePicFile(f); setProfilePicPreview(URL.createObjectURL(f)) }
                  }} />
              </label>
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{user?.full_name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
            <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-400 mt-1">Citizen</span>
          </div>
          <button onClick={() => setEditMode(!editMode)} className="ml-auto btn-secondary text-sm flex items-center gap-1.5">
            <Edit fontSize="small" /> {editMode ? 'Cancel' : 'Edit'}
          </button>
        </div>

        <form onSubmit={handleSubmit(onProfileSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
              <input className="input-field" disabled={!editMode}
                {...register('full_name', { required: 'Required' })} />
              {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <input className="input-field" disabled={!editMode} {...register('phone')} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input className="input-field bg-gray-50 dark:bg-gray-700/50" value={user?.email || ''} disabled />
            </div>
          </div>
          {editMode && (
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 text-sm">
              <Save fontSize="small" /> {loading ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </form>
      </div>

      {/* Change Password */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Lock fontSize="small" /> Change Password
        </h3>
        <form onSubmit={handlePwd(onPasswordSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
            <input type="password" className="input-field"
              {...regPwd('old_password', { required: 'Required' })} />
            {pwdErrors.old_password && <p className="text-red-500 text-xs mt-1">{pwdErrors.old_password.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
            <input type="password" className="input-field"
              {...regPwd('new_password', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })} />
            {pwdErrors.new_password && <p className="text-red-500 text-xs mt-1">{pwdErrors.new_password.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
            <input type="password" className="input-field"
              {...regPwd('confirm_password', { required: 'Required', validate: v => v === newPwd || 'Passwords do not match' })} />
            {pwdErrors.confirm_password && <p className="text-red-500 text-xs mt-1">{pwdErrors.confirm_password.message}</p>}
          </div>
          <button type="submit" className="btn-primary text-sm">Update Password</button>
        </form>
      </div>
    </div>
  )
}
