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

  useEffect(() => {
    api
      .get<Expert[]>('/experts')
      .then((response) => {
        const loadedExperts = unwrapData(response)
        setExperts(loadedExperts)
      })
      .catch(() => {
        setExperts([])
      })
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
        name: expert.name,
        role: expert.role,
        state: expert.state,
      })
    }
    const setAuthenticatedUser = (user: CurrentUser | Expert) => {
      setCurrentUser(user)
      setActiveUser({
        id: user.id,
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
      activeUserRole,
      canManageModuleLocks,
      canUnlock: canManageModuleLocks,
      canImport: activeUserRole === 'ADMIN',
      setActiveUserId,
      setAuthenticatedUser,
      logoutUser,
    }
  }, [activeUser, experts])

  return (
    <ActiveUserContext.Provider value={value}>
      {children}
    </ActiveUserContext.Provider>
  )
}
