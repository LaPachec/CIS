import axios from 'axios'
import { clearAuthStorage, getToken } from './auth'

function getDefaultApiBaseUrl() {
  if (typeof window === 'undefined') {
    return 'http://localhost:3333'
  }

  const hostname =
    window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
      ? 'localhost'
      : window.location.hostname

  return `http://${hostname}:3333`
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? getDefaultApiBaseUrl()).replace(/\/+$/, '')

export const api = axios.create({
  baseURL: apiBaseUrl,
})

api.interceptors.request.use((config) => {
  const token = getToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthStorage()

      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = '/cis/login'
      }
    }

    return Promise.reject(error)
  },
)

export function unwrapData<T>(response: { data: T | { data: T } }): T {
  if (
    response.data &&
    typeof response.data === 'object' &&
    'data' in response.data
  ) {
    return response.data.data
  }

  return response.data as T
}
