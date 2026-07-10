import {
  BarChart3,
  ClipboardCheck,
  FolderTree,
  Medal,
  Scale,
  UserCheck,
  Users,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', icon: BarChart3 },
  { to: '/competitions', label: 'Competições', icon: Medal },
  { to: '/competitors', label: 'Competidores', icon: Users },
  { to: '/experts', label: 'Avaliadores', icon: UserCheck },
  { to: '/modules', label: 'Módulos', icon: FolderTree },
  { to: '/marking', label: 'Lançamento de Notas', icon: ClipboardCheck },
]

export function Sidebar() {
  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-slate-200 bg-white px-5 py-6 lg:block">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
          <Scale size={20} />
        </div>
        <div>
          <strong className="block text-base font-semibold text-slate-950">
            CIS Simulado
          </strong>
          <span className="text-xs text-slate-500">Tecnologias Web</span>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                ].join(' ')
              }
            >
              <Icon size={18} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
