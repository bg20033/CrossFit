import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Single shared axios instance for the whole app (services/api wraps this too).
const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Attach access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

function clearSessionAndRedirect() {
  localStorage.removeItem('authToken')
  localStorage.removeItem('refreshToken')
  if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
    window.location.href = '/login'
  }
}

// Single-flight refresh: only one /auth/refresh runs at a time.
let refreshing: Promise<string | null> | null = null
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return null
  try {
    // bare axios (not `api`) to avoid interceptor recursion
    const res = await axios.post(`${baseURL}/auth/refresh`, { refreshToken })
    localStorage.setItem('authToken', res.data.token)
    if (res.data.refreshToken) localStorage.setItem('refreshToken', res.data.refreshToken)
    return res.data.token as string
  } catch {
    return null
  }
}

// On 401: try a one-time refresh + retry; otherwise clear session.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    const url = original?.url || ''
    if (error.response?.status === 401 && original && !original._retried && !url.includes('/auth/')) {
      original._retried = true
      if (!refreshing) refreshing = refreshAccessToken()
      const newToken = await refreshing
      refreshing = null
      if (newToken) {
        original.headers = original.headers || {}
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      }
      clearSessionAndRedirect()
    }
    return Promise.reject(error)
  }
)

export default api
