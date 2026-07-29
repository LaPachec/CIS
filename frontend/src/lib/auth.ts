import type { Expert, ExpertRole } from '../types'

export type CurrentUser = {
  id: number
  name: string
  role: ExpertRole
  state: string | null
}

const storageKeys = {
  id: 'currentUserId',
  name: 'currentUserName',
  role: 'currentUserRole',
  state: 'currentUserState',
}

export function getCurrentUser(): CurrentUser | null {
  const id = Number(localStorage.getItem(storageKeys.id))
  const name = localStorage.getItem(storageKeys.name)
  const role = localStorage.getItem(storageKeys.role) as ExpertRole | null
  const state = localStorage.getItem(storageKeys.state)

  if (!Number.isFinite(id) || id <= 0 || !name || !role) {
    return null
  }

  return {
    id,
    name,
    role,
    state: state || null,
  }
}

export function setCurrentUser(user: CurrentUser | Expert) {
  localStorage.setItem(storageKeys.id, String(user.id))
  localStorage.setItem(storageKeys.name, user.name)
  localStorage.setItem(storageKeys.role, user.role)
  localStorage.setItem(storageKeys.state, user.state ?? '')
}

export function logout() {
  localStorage.removeItem(storageKeys.id)
  localStorage.removeItem(storageKeys.name)
  localStorage.removeItem(storageKeys.role)
  localStorage.removeItem(storageKeys.state)
}

export function hasRole(roles: ExpertRole[], user = getCurrentUser()) {
  return Boolean(user?.role && roles.includes(user.role))
}
