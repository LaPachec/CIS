import {
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  Database,
  FileSpreadsheet,
  FileWarning,
  FolderTree,
  KeyRound,
  Lock,
  LogOut,
  Moon,
  Medal,
  Scale,
  Sun,
  Trophy,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useActiveUser } from '../contexts/useActiveUser'
import { useTheme } from '../contexts/useTheme'
import { api } from '../lib/api'
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
    label: 'Avaliacao',
    items: [
      { to: '/', label: 'Dashboard', icon: BarChart3, roles: ['ADMIN', 'SUPERVISOR', 'EXPERT', 'VIEWER'] },
      { to: '/marking', label: 'Lancamento de Notas', icon: ClipboardCheck, roles: ['ADMIN', 'SUPERVISOR', 'EXPERT'] },
      { to: '/checks', label: 'Conferencia', icon: ClipboardList, roles: ['ADMIN', 'SUPERVISOR', 'EXPERT'] },
      { to: '/final-check', label: 'Conferencia Final', icon: FileWarning, roles: ['ADMIN', 'SUPERVISOR', 'VIEWER'] },
      { to: '/module-closing', label: 'Fechamento por Modulo', icon: Lock, roles: ['ADMIN', 'SUPERVISOR'] },
    ],
  },
  {
    label: 'Resultados',
    items: [
      { to: '/results', label: 'Resultados', icon: Trophy, roles: ['ADMIN', 'SUPERVISOR', 'VIEWER'] },
    ],
  },
  {
    label: 'Administracao',
    items: [
      { to: '/competitions', label: 'Competicoes', icon: Medal, roles: ['ADMIN'] },
      { to: '/competitors', label: 'Competidores', icon: Users, roles: ['ADMIN'] },
      { to: '/experts', label: 'Avaliadores', icon: UserCheck, roles: ['ADMIN'] },
      { to: '/modules', label: 'Modulos', icon: FolderTree, roles: ['ADMIN'] },
      { to: '/import', label: 'Importacao', icon: FileSpreadsheet, roles: ['ADMIN'] },
      { to: '/backup', label: 'Backup', icon: Database, roles: ['ADMIN', 'SUPERVISOR'] },
    ],
  },
]

type SidebarProps = {
  mobile?: boolean
  onNavigate?: () => void
}

export function Sidebar({ mobile = false, onNavigate }: SidebarProps) {
  const navigate = useNavigate()
  const { activeUser, activeUserRole, logoutUser } = useActiveUser()
  const { theme, toggleTheme } = useTheme()
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
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
    onNavigate?.()
    navigate('/login', { replace: true })
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordMessage('')
    setPasswordError('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Preencha todos os campos.')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmacao da senha nao confere.')
      return
    }

    setPasswordLoading(true)

    try {
      await api.patch('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMessage('Senha alterada com sucesso.')
    } catch {
      setPasswordError('Nao foi possivel alterar a senha. Confira a senha atual.')
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <aside
      className={[
        'min-w-0 shrink-0 overflow-x-hidden border-r border-[var(--border)] bg-[var(--surface-strong)] px-4 py-5 text-[var(--text-primary)] shadow-[18px_0_60px_rgba(0,0,0,0.16)] backdrop-blur',
        mobile
          ? 'flex h-full w-full max-w-full flex-col'
          : 'hidden lg:fixed lg:left-0 lg:top-0 lg:flex lg:h-screen lg:w-[248px] lg:max-w-[248px] lg:flex-col',
      ].join(' ')}
    >
      <div className="mb-6 flex min-w-0 shrink-0 items-center gap-3 px-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-600 text-white shadow-[0_0_30px_rgba(37,99,235,0.35)]">
          <Scale size={20} />
        </div>
        <div className="min-w-0">
          <strong className="block truncate text-base font-semibold">CIS Simulado</strong>
          <span className="text-xs text-[var(--text-muted)]">Skill 17 - Web</span>
        </div>
      </div>

      <nav className="scroll-area min-h-0 min-w-0 flex-1 space-y-6 overflow-y-auto pr-1">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
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
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                        isActive
                          ? 'border border-blue-400/30 bg-blue-600/90 text-white shadow-[0_0_28px_rgba(37,99,235,0.25)]'
                          : 'border border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-[var(--primary-soft)] hover:text-[var(--text-primary)]',
                      ].join(' ')
                    }
                  >
                    <Icon size={17} className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-4 shrink-0 border-t border-[var(--border)] pt-4">
        <div className="mb-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
            {activeUser?.name ?? 'Usuario nao identificado'}
          </p>
          <p className="truncate text-xs text-[var(--text-muted)]">
            {translateRole(activeUserRole)}
            {activeUser?.state ? ` - ${activeUser.state}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="mb-1 flex w-full min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--primary-soft)] hover:text-[var(--text-primary)]"
        >
          {theme === 'dark' ? <Sun size={16} className="shrink-0" /> : <Moon size={16} className="shrink-0" />}
          <span className="truncate">{theme === 'dark' ? 'Tema claro' : 'Tema escuro'}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setPasswordModalOpen(true)
            setPasswordMessage('')
            setPasswordError('')
          }}
          className="mb-1 flex w-full min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--primary-soft)] hover:text-[var(--text-primary)]"
        >
          <KeyRound size={16} className="shrink-0" />
          <span className="truncate">Alterar senha</span>
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--primary-soft)] hover:text-[var(--text-primary)]"
        >
          <LogOut size={16} className="shrink-0" />
          <span className="truncate">Sair</span>
        </button>
      </div>

      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm">
          <div className="cis-surface w-full max-w-md rounded-xl p-5 text-slate-100">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Alterar senha</h2>
              <p className="text-sm text-slate-300">
                Informe a senha atual e defina uma nova senha de acesso.
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {passwordError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {passwordError}
                </div>
              )}
              {passwordMessage && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {passwordMessage}
                </div>
              )}

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-300">Senha atual</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-300">Nova senha</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-300">Confirmar nova senha</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {passwordLoading ? 'Salvando...' : 'Salvar senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  )
}
