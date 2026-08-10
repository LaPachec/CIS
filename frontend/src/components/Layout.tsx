import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useActiveUser } from '../contexts/useActiveUser'
import { useTheme } from '../contexts/useTheme'
import { translateRole } from '../lib/labels'
import { Drawer } from './ui/Drawer'

export function Layout() {
  const location = useLocation()
  const { activeUser } = useActiveUser()
  const { theme } = useTheme()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const permissionMessage =
    typeof location.state === 'object' &&
    location.state !== null &&
    'permissionMessage' in location.state
      ? String(location.state.permissionMessage)
      : ''

  return (
    <div className={`cis-app theme-${theme} min-h-screen w-full max-w-full overflow-x-hidden font-sans`}>
      <div className="flex min-h-screen w-full min-w-0 overflow-x-hidden">
        <Sidebar />
        <div className="min-w-0 flex-1 overflow-x-hidden lg:ml-[248px]">
          <header className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/85 px-4 py-3 backdrop-blur lg:hidden">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Abrir menu"
                onClick={() => setMobileSidebarOpen(true)}
                className="rounded-md p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Menu size={22} />
              </button>
              <strong className="truncate text-base font-semibold">CIS Simulado</strong>
            </div>
            {activeUser && (
              <span className="shrink-0 text-xs font-medium text-slate-300">
                {translateRole(activeUser.role)}
              </span>
            )}
          </header>
          <main className="mx-auto w-full max-w-7xl min-w-0 overflow-x-hidden px-4 pb-5 pt-16 sm:px-6 lg:px-8">
            {permissionMessage && (
              <div className="mb-4 rounded-md border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
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
