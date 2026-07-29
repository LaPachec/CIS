import { useEffect, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { useActiveUser } from '../contexts/useActiveUser'
import { api, unwrapData } from '../lib/api'
import type { Competition, Expert, ExpertRole } from '../types'

const roles: ExpertRole[] = ['EXPERT', 'SUPERVISOR', 'ADMIN']

const initialForm = {
  competitionId: '',
  name: '',
  state: '',
  role: 'EXPERT' as ExpertRole,
}

export function ExpertsPage() {
  const { activeUser, activeUserId, activeUserRole } = useActiveUser()
  const [experts, setExperts] = useState<Expert[]>([])
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function loadExperts() {
    const response = await api.get<Expert[]>('/experts')
    setExperts(unwrapData(response))
  }

  async function loadCompetitions() {
    const response = await api.get<Competition[]>('/competitions')
    const loadedCompetitions = unwrapData(response)

    setCompetitions(loadedCompetitions)
    setForm((current) => ({
      ...current,
      competitionId: current.competitionId || String(loadedCompetitions[0]?.id ?? ''),
    }))
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([loadExperts(), loadCompetitions()])
      .catch(() => setError('Erro ao carregar dados para cadastro de usuários.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    try {
      await api.post('/experts', {
        ...form,
        competitionId: Number(form.competitionId),
        userId: activeUserId,
        userRole: activeUserRole,
        userName: activeUser?.name,
      }, {
        headers: {
          'x-user-id': String(activeUserId ?? ''),
          'x-user-role': activeUserRole ?? '',
          'x-user-name': activeUser?.name ?? '',
        },
      })
      setForm((current) => ({
        ...initialForm,
        competitionId: current.competitionId,
      }))
      await loadExperts()
    } catch (errorResponse) {
      setError(getApiErrorMessage(errorResponse) || 'Erro ao cadastrar usuário.')
    }
  }

  return (
    <section>
      <PageHeader
        title="Avaliadores"
        description="Cadastre peritos e perfis de acompanhamento da competição."
      />
      {error && <ErrorMessage message={error} />}
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="mb-4 text-sm font-semibold text-slate-950">
            Novo usuário
          </h2>
          <label className="mb-3 block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Competição
            </span>
            <select
              value={form.competitionId}
              required
              disabled={loading || competitions.length === 0}
              onChange={(event) =>
                setForm((state) => ({ ...state, competitionId: event.target.value }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">Selecione...</option>
              {competitions.map((competition) => (
                <option key={competition.id} value={competition.id}>
                  {competition.name}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Nome"
            value={form.name}
            onChange={(name) => setForm((state) => ({ ...state, name }))}
            required
          />
          <Field
            label="Estado"
            value={form.state}
            onChange={(state) => setForm((data) => ({ ...data, state }))}
          />
          <label className="mb-3 block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Perfil</span>
            <select
              value={form.role}
              onChange={(event) =>
                setForm((state) => ({
                  ...state,
                  role: event.target.value as ExpertRole,
                }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={loading || !form.competitionId}
            className="mt-2 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cadastrar usuário
          </button>
        </form>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          {experts.length === 0 ? (
            <EmptyState title="Nenhum avaliador cadastrado" />
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {experts.map((expert) => (
                  <tr key={expert.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {expert.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {expert.state ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {expert.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">Em breve</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  )
}

function getApiErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null
  ) {
    if ('error' in error.response.data) {
      return String(error.response.data.error)
    }

    if ('message' in error.response.data) {
      return String(error.response.data.message)
    }
  }

  return ''
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  return (
    <label className="mb-3 block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <input
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  )
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  )
}
