import type { Expert, ExpertRole } from '../types'

export type CurrentUser = {
  id: number
  competitionId: number | null
  name: string
  email: string | null
  role: ExpertRole
  state: string | null
  isActive?: boolean
}

const storageKeys = {
  token: 'cisToken',
  user: 'cisUser',
  id: 'currentUserId',
  competitionId: 'currentUserCompetitionId',
  name: 'currentUserName',
  role: 'currentUserRole',
  state: 'currentUserState',
}

export function getToken() {
  return localStorage.getItem(storageKeys.token)
}

export function getCurrentUser(): CurrentUser | null {
  const rawUser = localStorage.getItem(storageKeys.user)

  if (rawUser) {
    try {
      const parsedUser = JSON.parse(rawUser) as CurrentUser

      if (parsedUser.id && parsedUser.name && parsedUser.role) {
        return parsedUser
      }
    } catch {
      clearAuthStorage()
    }
  }

  const id = Number(localStorage.getItem(storageKeys.id))
  const competitionId = Number(localStorage.getItem(storageKeys.competitionId))
  const name = localStorage.getItem(storageKeys.name)
  const role = localStorage.getItem(storageKeys.role) as ExpertRole | null
  const state = localStorage.getItem(storageKeys.state)

  if (!Number.isFinite(id) || id <= 0 || !name || !role) {
    return null
  }

  return {
    id,
    competitionId: Number.isFinite(competitionId) && competitionId > 0 ? competitionId : null,
    name,
    email: null,
    role,
    state: state || null,
  }
}

export function setAuthSession(token: string, user: CurrentUser | Expert) {
  localStorage.setItem(storageKeys.token, token)
  setCurrentUser(user)
}

export function setCurrentUser(user: CurrentUser | Expert) {
  const currentUser: CurrentUser = {
    id: user.id,
    competitionId: user.competitionId ?? null,
    name: user.name,
    email: 'email' in user ? user.email ?? null : null,
    role: user.role,
    state: user.state ?? null,
    isActive: 'isActive' in user ? user.isActive : undefined,
  }

  localStorage.setItem(storageKeys.user, JSON.stringify(currentUser))
  localStorage.setItem(storageKeys.id, String(currentUser.id))
  localStorage.setItem(storageKeys.competitionId, String(currentUser.competitionId ?? ''))
  localStorage.setItem(storageKeys.name, currentUser.name)
  localStorage.setItem(storageKeys.role, currentUser.role)
  localStorage.setItem(storageKeys.state, currentUser.state ?? '')
}

export function clearAuthStorage() {
  localStorage.removeItem(storageKeys.token)
  localStorage.removeItem(storageKeys.user)
  localStorage.removeItem(storageKeys.id)
  localStorage.removeItem(storageKeys.competitionId)
  localStorage.removeItem(storageKeys.name)
  localStorage.removeItem(storageKeys.role)
  localStorage.removeItem(storageKeys.state)
}

export function logout() {
  clearAuthStorage()
}

export function hasRole(roles: ExpertRole[], user = getCurrentUser()) {
  return Boolean(user?.role && roles.includes(user.role))
}
