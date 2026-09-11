import { create } from 'zustand'
import { authService } from '../services/authService'

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  accessToken: localStorage.getItem('access_token') || null,
  refreshToken: localStorage.getItem('refresh_token') || null,
  isLoading: false,
  isAuthenticated: !!localStorage.getItem('access_token'),

  login: async (credentials) => {
    set({ isLoading: true })
    try {
      const { data } = await authService.login(credentials)
      localStorage.setItem('access_token', data.access)
      localStorage.setItem('refresh_token', data.refresh)
      localStorage.setItem('user', JSON.stringify(data.user))
      set({
        user: data.user,
        accessToken: data.access,
        refreshToken: data.refresh,
        isAuthenticated: true,
        isLoading: false,
      })
      return { success: true, user: data.user }
    } catch (error) {
      set({ isLoading: false })
      const responseData = error.response?.data
      let message = 'Login failed'
      let code = null
      let email = ''

      if (responseData) {
        // DRF wraps ValidationError values as arrays — unwrap them
        const getVal = (v) => Array.isArray(v) ? v[0] : v

        if (responseData.detail) {
          message = getVal(responseData.detail)
          code    = getVal(responseData.code) || null
          email   = getVal(responseData.email) || ''
        } else if (responseData.non_field_errors) {
          message = Array.isArray(responseData.non_field_errors)
            ? responseData.non_field_errors.join(' ')
            : responseData.non_field_errors
        } else if (typeof responseData === 'object') {
          const values = Object.values(responseData).flat()
          message = values.join(' ') || message
        } else if (typeof responseData === 'string') {
          message = responseData
        }
      } else if (error.message) {
        message = error.message
      }
      return {
        success: false,
        error: message,
        code,
        email: email || credentials?.email || '',
      }
    }
  },

  register: async (formData) => {
    set({ isLoading: true })
    // Clear any stale tokens first
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    set({ isAuthenticated: false, user: null, accessToken: null, refreshToken: null })
    try {
      const { data } = await authService.register(formData)
      // Do NOT store tokens in localStorage yet — user must verify email first.
      // Storing them would make api.js attach the Bearer token on every request
      // and trigger authenticated endpoints unexpectedly.
      set({ isLoading: false })
      return {
        success: true,
        needsVerification: true,
        email: data.user.email,
      }
    } catch (error) {
      set({ isLoading: false })
      const responseData = error.response?.data
      let message = 'Registration failed'
      if (responseData) {
        if (typeof responseData === 'string') {
          const htmlRegex = /<\/?(html|body|div|span|p|!DOCTYPE|head|title|script|style)[\s>]/i
          message = htmlRegex.test(responseData)
            ? 'Unexpected server response. Please try again.'
            : responseData
        } else if (typeof responseData === 'object') {
          if (responseData.detail) {
            message = responseData.detail
          } else {
            const values = Object.values(responseData).flat()
            message = values.join(' ') || message
          }
        }
      } else if (error.message) {
        message = error.message
      }
      return { success: false, error: message }
    }
  },

  logout: async () => {
    try {
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) await authService.logout(refresh)
    } catch {}
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
  },

  updateUser: (userData) => {
    const updated = { ...get().user, ...userData }
    localStorage.setItem('user', JSON.stringify(updated))
    set({ user: updated })
  },
}))

export default useAuthStore
