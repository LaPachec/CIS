import { LogIn, Scale } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useActiveUser } from '../contexts/useActiveUser'
import { api, unwrapData } from '../lib/api'
import type { Expert } from '../types'

type LoginResponse = {
  token: string
  user: Expert
}

export function LoginPage() {
  const navigate = useNavigate()
  const { activeUser, setAuthenticatedUser } = useActiveUser()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (activeUser) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Informe email e senha para continuar.')
      return
    }

    setLoading(true)

    try {
      const response = await api.post<LoginResponse>('/auth/login', {
        email,
        password,
      })
      const session = unwrapData(response)

      setAuthenticatedUser(session.token, session.user)
      navigate('/', { replace: true })
    } catch (error) {
      setError('Email ou senha invalidos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080B12] px-4 py-10 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(37,99,235,0.34),transparent_30rem),radial-gradient(circle_at_82%_18%,rgba(14,165,233,0.22),transparent_26rem),linear-gradient(135deg,#080B12,#0B0F17)]" />
      <div className="pointer-events-none absolute -right-32 top-20 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 bottom-10 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />

      <div className="relative grid w-full max-w-5xl gap-8 lg:grid-cols-[1fr_430px] lg:items-center">
        <section className="hidden lg:block">
          <span className="inline-flex rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200">
            Ambiente local de avaliacao
          </span>
          <h1 className="mt-5 max-w-xl text-5xl font-semibold tracking-tight text-white">
            CIS Simulado
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-slate-300">
            Skill 17 - Tecnologias Web. Lancamento, conferencia e fechamento de notas em uma interface operacional escura e institucional.
          </p>
          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            {['Notas', 'Conferencia', 'Resultados'].map((item) => (
              <div key={item} className="rounded-xl border border-slate-700/80 bg-slate-900/60 px-4 py-3 text-sm font-medium text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </section>

        <div className="cis-surface cis-blue-glow w-full rounded-2xl">
          <div className="border-b border-slate-700/80 px-7 py-6">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-600 text-white shadow-[0_0_35px_rgba(37,99,235,0.35)]">
            <Scale size={24} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
            CIS Simulado
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Skill 17 - Tecnologias Web
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-7 py-6">
          {error && (
            <div className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              {error}
            </div>
          )}

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-300">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="w-full rounded-lg border border-slate-600 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
              placeholder="admin@local.test"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-300">
              Senha
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-600 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
              placeholder="admin123"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-400/30 bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_38px_rgba(37,99,235,0.3)] transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogIn size={17} />
            {loading ? 'Entrando...' : 'Entrar no Sistema'}
          </button>

          <p className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs text-slate-400">
            Acesso local inicial: <strong>admin@local.test</strong> / <strong>admin123</strong>
          </p>
        </form>
      </div>
      </div>
    </main>
  )
}
