import {
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  Database,
  FileSpreadsheet,
  FileWarning,
  FolderTree,
  Lock,
  LogOut,
  Medal,
  Scale,
  Trophy,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useActiveUser } from '../contexts/useActiveUser'
import { translateRole } from '../lib/labels'
import type { ExpertRole } from '../types'

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  roles: ExpertRole[]
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Avaliação',
    items: [
      { to: '/', label: 'Dashboard', icon: BarChart3, roles: ['ADMIN', 'SUPERVISOR', 'EXPERT', 'VIEWER'] },
      { to: '/marking', label: 'Lançamento de Notas', icon: ClipboardCheck, roles: ['ADMIN', 'SUPERVISOR', 'EXPERT'] },
      { to: '/checks', label: 'Conferência', icon: ClipboardList, roles: ['ADMIN', 'SUPERVISOR', 'EXPERT'] },
      { to: '/final-check', label: 'Conferência Final', icon: FileWarning, roles: ['ADMIN', 'SUPERVISOR', 'VIEWER'] },
      { to: '/module-closing', label: 'Fechamento por Módulo', icon: Lock, roles: ['ADMIN', 'SUPERVISOR'] },
    ],
  },
  {
    label: 'Resultados',
    items: [
      { to: '/results', label: 'Resultados', icon: Trophy, roles: ['ADMIN', 'SUPERVISOR', 'VIEWER'] },
    ],
  },
  {
    label: 'Administração',
    items: [
      { to: '/competitions', label: 'Competições', icon: Medal, roles: ['ADMIN'] },
      { to: '/competitors', label: 'Competidores', icon: Users, roles: ['ADMIN'] },
      { to: '/experts', label: 'Avaliadores', icon: UserCheck, roles: ['ADMIN'] },
      { to: '/modules', label: 'Módulos', icon: FolderTree, roles: ['ADMIN'] },
      { to: '/import', label: 'Importação', icon: FileSpreadsheet, roles: ['ADMIN'] },
      { to: '/backup', label: 'Backup', icon: Database, roles: ['ADMIN', 'SUPERVISOR'] },
    ],
  },
]

export function Sidebar() {
  const navigate = useNavigate()
  const { activeUser, activeUserRole, logoutUser } = useActiveUser()
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => activeUserRole && item.roles.includes(activeUserRole),
      ),
    }))
    .filter((group) => group.items.length > 0)

  function handleLogout() {
    logoutUser()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-slate-800 bg-[#172033] px-4 py-5 text-white lg:flex lg:flex-col">
      <div className="mb-7 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 text-white">
          <Scale size={20} />
        </div>
        <div>
          <strong className="block text-base font-semibold">CIS Simulado</strong>
          <span className="text-xs text-slate-300">Skill 17</span>
        </div>
      </div>

      <nav className="flex-1 space-y-6">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition',
                        isActive
                          ? 'bg-blue-700 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                      ].join(' ')
                    }
                  >
                    <Icon size={17} />
                    {item.label}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-6 border-t border-slate-700 pt-4">
        <div className="mb-3 px-2">
          <p className="truncate text-sm font-semibold text-white">
            {activeUser?.name ?? 'Usuário não identificado'}
          </p>
          <p className="text-xs text-slate-300">
            {translateRole(activeUserRole)}
            {activeUser?.state ? ` - ${activeUser.state}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  )
}
