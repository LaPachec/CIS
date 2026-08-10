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
    <main className="flex min-h-screen items-center justify-center bg-[#F4F6F8] px-4 py-10 text-slate-900">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-7 py-6">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-[#172033] text-white">
            <Scale size={24} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            CIS Simulado
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Entre com seu email e senha para acessar o simulado.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-7 py-6">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              placeholder="admin@local.test"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Senha
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              placeholder="admin123"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#1D4ED8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogIn size={17} />
            {loading ? 'Entrando...' : 'Entrar no Sistema'}
          </button>

          <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Acesso local inicial: <strong>admin@local.test</strong> / <strong>admin123</strong>
          </p>
        </form>
      </div>
    </main>
  )
}
