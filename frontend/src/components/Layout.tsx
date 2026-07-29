import { Menu } from 'lucide-react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useActiveUser } from '../contexts/useActiveUser'
import { translateRole } from '../lib/labels'

export function Layout() {
  const location = useLocation()
  const { activeUser } = useActiveUser()
  const permissionMessage =
    typeof location.state === 'object' &&
    location.state !== null &&
    'permissionMessage' in location.state
      ? String(location.state.permissionMessage)
      : ''

  return (
    <div className="min-h-screen bg-[#F4F6F8] font-sans text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
            <div className="flex items-center gap-3">
              <Menu size={22} className="text-slate-600" />
              <strong className="text-base font-semibold">CIS Simulado</strong>
            </div>
            {activeUser && (
              <span className="text-xs font-medium text-slate-500">
                {translateRole(activeUser.role)}
              </span>
            )}
          </header>
          <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
            {permissionMessage && (
              <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {permissionMessage}
              </div>
            )}
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
