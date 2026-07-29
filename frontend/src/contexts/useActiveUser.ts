import { useContext } from 'react'
import { ActiveUserContext } from './active-user-context'

export function useActiveUser() {
  const context = useContext(ActiveUserContext)

  if (!context) {
    throw new Error('useActiveUser must be used inside ActiveUserProvider')
  }

  return context
}
