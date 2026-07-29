import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useActiveUser } from '../../contexts/useActiveUser'
import type { ExpertRole } from '../../types'

type ProtectedRouteProps = {
  roles?: ExpertRole[]
  children?: ReactNode
}

export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const { activeUser } = useActiveUser()
  const location = useLocation()

  if (!activeUser) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (roles && !roles.includes(activeUser.role)) {
    return (
      <Navigate
        to="/"
        replace
        state={{ permissionMessage: 'Você não tem permissão para acessar esta área.' }}
      />
    )
  }

  return children ? <>{children}</> : <Outlet />
}
