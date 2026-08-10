import axios from 'axios'

const defaultApiBaseUrl = 'http://172.25.10.17/cis/api'
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl).replace(/\/+$/, '')

export const api = axios.create({
  baseURL: apiBaseUrl,
})

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
