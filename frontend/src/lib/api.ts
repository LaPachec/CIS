import axios from 'axios'

const apiHost =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'localhost'
    : window.location.hostname

export const api = axios.create({
  baseURL: `http://${apiHost}:3333`,
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
