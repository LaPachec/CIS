import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, unwrapData } from '../lib/api'
import { getCurrentUser, logout, setCurrentUser, type CurrentUser } from '../lib/auth'
import type { Expert } from '../types'
import { ActiveUserContext } from './active-user-context'

export function ActiveUserProvider({ children }: { children: ReactNode }) {
  const [experts, setExperts] = useState<Expert[]>([])
  const [activeUser, setActiveUser] = useState<CurrentUser | null>(() =>
    getCurrentUser(),
  )

  async function refreshExperts() {
    const response = await api.get<Expert[]>('/experts')
    setExperts(unwrapData(response))
  }

  useEffect(() => {
    refreshExperts().catch(() => {
      setExperts([])
    })
  }, [])

  useEffect(() => {
    if (!activeUser || activeUser.competitionId) {
      return
    }

    const matchingExpert = experts.find((expert) => expert.id === activeUser.id)

    if (!matchingExpert) {
      return
    }

    setCurrentUser(matchingExpert)
    setActiveUser({
      id: matchingExpert.id,
      competitionId: matchingExpert.competitionId,
      name: matchingExpert.name,
      role: matchingExpert.role,
      state: matchingExpert.state,
    })
  }, [activeUser, experts])

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
        competitionId: expert.competitionId,
        name: expert.name,
        role: expert.role,
        state: expert.state,
      })
    }
    const setAuthenticatedUser = (user: CurrentUser | Expert) => {
      setCurrentUser(user)
      setActiveUser({
        id: user.id,
        competitionId: user.competitionId ?? null,
        name: user.name,
        role: user.role,
        state: user.state,
      })
    }
    const logoutUser = () => {
      logout()
      setActiveUser(null)
    }

    return {
      experts,
      activeUser,
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
  }, [activeUser, experts])

  return (
    <ActiveUserContext.Provider value={value}>
      {children}
    </ActiveUserContext.Provider>
  )
}
