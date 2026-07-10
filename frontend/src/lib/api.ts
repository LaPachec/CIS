import axios from 'axios'

export const api = axios.create({
  baseURL: 'http://localhost:3333',
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
