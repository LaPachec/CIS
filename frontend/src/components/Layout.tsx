import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useActiveUser } from '../contexts/useActiveUser'
import { translateRole } from '../lib/labels'
import { Drawer } from './ui/Drawer'

export function Layout() {
  const location = useLocation()
  const { activeUser } = useActiveUser()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const permissionMessage =
    typeof location.state === 'object' &&
    location.state !== null &&
    'permissionMessage' in location.state
      ? String(location.state.permissionMessage)
      : ''

  return (
    <div className="min-h-screen bg-[#F6F7F9] font-sans text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Abrir menu"
                onClick={() => setMobileSidebarOpen(true)}
                className="rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              >
                <Menu size={22} />
              </button>
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
      <Drawer
        open={mobileSidebarOpen}
        title="Menu"
        description="Navegação do CIS Simulado"
        side="left"
        onClose={() => setMobileSidebarOpen(false)}
      >
        <Sidebar mobile onNavigate={() => setMobileSidebarOpen(false)} />
      </Drawer>
    </div>
  )
}
