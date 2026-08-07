import { LogIn, Scale } from 'lucide-react'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useActiveUser } from '../contexts/useActiveUser'
import { api, unwrapData } from '../lib/api'
import { translateRole } from '../lib/labels'
import type { Expert } from '../types'

export function LoginPage() {
  const navigate = useNavigate()
  const { activeUser, setAuthenticatedUser } = useActiveUser()
  const [experts, setExperts] = useState<Expert[]>([])
  const [selectedExpertId, setSelectedExpertId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    api
      .get<Expert[]>('/experts')
      .then((response) => {
        const loadedExperts = unwrapData(response)
        setExperts(loadedExperts)
        setSelectedExpertId(String(loadedExperts[0]?.id ?? ''))
      })
      .catch(() => setError('Não foi possível carregar os usuários.'))
      .finally(() => setLoading(false))
  }, [])

  const selectedExpert = useMemo(
    () => experts.find((expert) => String(expert.id) === selectedExpertId) ?? null,
    [experts, selectedExpertId],
  )

  if (activeUser) {
    return <Navigate to="/" replace />
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedExpert) {
      setError('Selecione seu usuário para continuar.')
      return
    }

    setAuthenticatedUser(selectedExpert)
    navigate('/', { replace: true })
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
            Sistema de Avaliação - Skill 17 Tecnologias Web
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
              Selecione Seu Usuário
            </span>
            <select
              value={selectedExpertId}
              onChange={(event) => setSelectedExpertId(event.target.value)}
              disabled={loading}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">Selecione...</option>
              {experts.map((expert) => (
                <option key={expert.id} value={expert.id}>
                  {expert.name}
                  {expert.state ? ` - ${expert.state}` : ''}
                  {expert.competition?.name ? ` | ${expert.competition.name}` : ''}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
            <span className="block text-xs font-medium uppercase text-slate-500">
              Perfil
            </span>
            <strong className="mt-1 block text-slate-950">
              {selectedExpert ? translateRole(selectedExpert.role) : 'Nenhum Usuário Selecionado'}
            </strong>
            {selectedExpert?.competition?.name && (
              <span className="mt-1 block text-xs text-slate-600">
                Competição: {selectedExpert.competition.name}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !selectedExpert}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#1D4ED8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogIn size={17} />
            Entrar no Sistema
          </button>
        </form>
      </div>
    </main>
  )
}
