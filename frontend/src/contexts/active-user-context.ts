import { createContext } from 'react'
import type { CurrentUser } from '../lib/auth'
import type { Expert, ExpertRole } from '../types'

export type ActiveUserContextValue = {
  experts: Expert[]
  activeUser: CurrentUser | null
  authLoading: boolean
  activeUserId: number | null
  activeUserCompetitionId: number | null
  activeUserRole: ExpertRole | null
  canManageModuleLocks: boolean
  canUnlock: boolean
  canImport: boolean
  setActiveUserId: (id: number | null) => void
  setAuthenticatedUser: (token: string, user: CurrentUser | Expert) => void
  refreshExperts: () => Promise<void>
  logoutUser: () => void
}

export const ActiveUserContext = createContext<ActiveUserContextValue | null>(null)
