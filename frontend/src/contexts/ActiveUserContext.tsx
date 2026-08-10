import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, unwrapData } from '../lib/api'
import {
  getCurrentUser,
  getToken,
  logout,
  setAuthSession,
  setCurrentUser,
  type CurrentUser,
} from '../lib/auth'
import type { Expert } from '../types'
import { ActiveUserContext } from './active-user-context'

function getEffectiveCompetitionId(user: CurrentUser | Expert) {
  const competitions = 'competitions' in user ? user.competitions ?? [] : []

  if (competitions.length === 1) {
    return competitions[0]?.id ?? null
  }

  if (competitions.length > 1) {
    return null
  }

  return user.competitionId ?? null
}

export function ActiveUserProvider({ children }: { children: ReactNode }) {
  const [experts, setExperts] = useState<Expert[]>([])
  const [activeUser, setActiveUser] = useState<CurrentUser | null>(() =>
    getCurrentUser(),
  )
  const [authLoading, setAuthLoading] = useState(Boolean(getToken()))

  async function refreshExperts() {
    const response = await api.get<Expert[]>('/experts')
    setExperts(unwrapData(response))
  }

  useEffect(() => {
    const token = getToken()

    if (!token) {
      setAuthLoading(false)
      return
    }

    api
      .get<Expert>('/auth/me')
      .then((response) => {
        const user = unwrapData(response)
        setCurrentUser(user)
        setActiveUser({
          id: user.id,
          competitionId: getEffectiveCompetitionId(user),
          name: user.name,
          email: user.email ?? null,
          role: user.role,
          state: user.state,
          isActive: user.isActive,
          competitions: user.competitions,
        })
      })
      .catch(() => {
        logout()
        setActiveUser(null)
      })
      .finally(() => setAuthLoading(false))
  }, [])

  const value = useMemo(() => {
    const activeUserRole = activeUser?.role ?? null
    const canManageModuleLocks =
      activeUserRole === 'SUPERVISOR' || activeUserRole === 'ADMIN'
    const setActiveUserId = (id: number | null) => {
      const expert = experts.find((item) => item.id === id)

      if (!expert) {
        return
      }

      setCurrentUser(expert)
      setActiveUser({
        id: expert.id,
        competitionId: getEffectiveCompetitionId(expert),
        name: expert.name,
        email: expert.email,
        role: expert.role,
        state: expert.state,
        isActive: expert.isActive,
        competitions: expert.competitions,
      })
    }
    const setAuthenticatedUser = (token: string, user: CurrentUser | Expert) => {
      setAuthSession(token, user)
      setActiveUser({
        id: user.id,
        competitionId: getEffectiveCompetitionId(user),
        name: user.name,
        email: 'email' in user ? user.email ?? null : null,
        role: user.role,
        state: user.state,
        isActive: 'isActive' in user ? user.isActive : undefined,
        competitions: 'competitions' in user ? user.competitions : undefined,
      })
    }
    const logoutUser = () => {
      logout()
      setExperts([])
      setActiveUser(null)
    }

    return {
      experts,
      activeUser,
      authLoading,
      activeUserId: activeUser?.id ?? null,
      activeUserCompetitionId: activeUser?.competitionId ?? null,
      activeUserRole,
      canManageModuleLocks,
      canUnlock: canManageModuleLocks,
      canImport: activeUserRole === 'ADMIN',
      setActiveUserId,
      setAuthenticatedUser,
      refreshExperts,
      logoutUser,
    }
  }, [activeUser, authLoading, experts])

  return (
    <ActiveUserContext.Provider value={value}>
      {children}
    </ActiveUserContext.Provider>
  )
}
