import { Pencil, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useActiveUser } from '../contexts/useActiveUser'
import { api, unwrapData } from '../lib/api'
import { translateRole } from '../lib/labels'
import type { Competition, Expert, ExpertRole } from '../types'

const roles: Array<{ value: ExpertRole; label: string }> = [
  { value: 'ADMIN', label: 'ADMIN — Administrador' },
  { value: 'SUPERVISOR', label: 'SUPERVISOR — Supervisor' },
  { value: 'EXPERT', label: 'EXPERT — Avaliador' },
]

const initialForm = {
  competitionId: '',
  competitionIds: [] as string[],
  name: '',
  email: '',
  password: '',
  state: '',
  role: 'EXPERT' as ExpertRole,
  isActive: true,
}

export function ExpertsPage() {
  const {
    activeUser,
    activeUserCompetitionId,
    activeUserId,
    activeUserRole,
    refreshExperts,
  } = useActiveUser()
  const [experts, setExperts] = useState<Expert[]>([])
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [editingExpertId, setEditingExpertId] = useState<number | null>(null)
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingDeleteExpert, setPendingDeleteExpert] =
    useState<Expert | null>(null)

  const headers = useMemo(
    () => ({
      'x-user-id': String(activeUserId ?? ''),
      'x-user-role': activeUserRole ?? '',
      'x-user-name': activeUser?.name ?? '',
    }),
    [activeUser?.name, activeUserId, activeUserRole],
  )

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
      competitionId: current.competitionId || getDefaultCompetitionId(loadedCompetitions, activeUserCompetitionId),
      competitionIds:
        current.competitionIds.length > 0
          ? current.competitionIds
          : [getDefaultCompetitionId(loadedCompetitions, activeUserCompetitionId)].filter(Boolean),
    }))
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([loadExperts(), loadCompetitions()])
      .catch(() => setError('Não foi possível carregar os dados de usuários.'))
      .finally(() => setLoading(false))
  }, [activeUserCompetitionId])

  function resetForm() {
    setEditingExpertId(null)
    setForm((current) => ({
      ...initialForm,
      competitionId: current.competitionId || getDefaultCompetitionId(competitions, activeUserCompetitionId),
      competitionIds:
        current.competitionIds.length > 0
          ? current.competitionIds
          : [getDefaultCompetitionId(competitions, activeUserCompetitionId)].filter(Boolean),
    }))
  }

  function startEdit(expert: Expert) {
    setError('')
    setSuccess('')
    setEditingExpertId(expert.id)
    setForm({
      competitionId: String(expert.competitionId),
      competitionIds:
        expert.competitions?.map((competition) => String(competition.id)) ??
        [String(expert.competitionId)],
      name: expert.name,
      email: expert.email ?? '',
      password: '',
      state: expert.state ?? '',
      role: expert.role === 'VIEWER' ? 'EXPERT' : expert.role,
      isActive: expert.isActive,
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (form.competitionIds.length === 0) {
      setError('Selecione uma competição para cadastrar o usuário.')
      return
    }

    setLoading(true)

    try {
      const payload = {
        ...form,
        password: form.password || undefined,
        competitionId: Number(form.competitionIds[0] ?? form.competitionId),
        competitionIds: form.competitionIds.map(Number),
        userId: activeUserId,
        userRole: activeUserRole,
        userName: activeUser?.name,
      }

      if (editingExpertId) {
        await api.put(`/experts/${editingExpertId}`, payload, { headers })
        setSuccess('Usuário atualizado com sucesso.')
      } else {
        await api.post('/experts', payload, { headers })
        setSuccess('Usuário salvo com sucesso.')
      }

      resetForm()
      await Promise.all([loadExperts(), refreshExperts()])
    } catch (errorResponse) {
      setError(getApiErrorMessage(errorResponse) || 'Não foi possível concluir a operação.')
    } finally {
      setLoading(false)
    }
  }

  async function deleteExpert(expert: Expert) {
    setError('')
    setSuccess('')
    setPendingDeleteExpert(null)
    setLoading(true)

    try {
      await api.delete(`/experts/${expert.id}`, { headers })
      setSuccess('Usuário excluído com sucesso.')
      if (editingExpertId === expert.id) {
        resetForm()
      }
      await Promise.all([loadExperts(), refreshExperts()])
    } catch (errorResponse) {
      setError(getApiErrorMessage(errorResponse) || 'Não foi possível concluir a operação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <PageHeader
        title="Usuários e Avaliadores"
        description="Gerencie os usuários que acessam o sistema e seus perfis de permissão."
      />

      {error && <Message tone="error" message={error} />}
      {success && <Message tone="success" message={success} />}

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-950">
              {editingExpertId ? 'Editar usuário' : 'Novo usuário'}
            </h2>
            {editingExpertId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-semibold text-slate-600 hover:text-slate-950"
              >
                Novo Usuário
              </button>
            )}
          </div>

          <label className="mb-3 block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Competições
            </span>
            <select
              multiple
              value={form.competitionIds}
              required
              disabled={loading || competitions.length === 0}
              onChange={(event) => {
                const competitionIds = Array.from(event.target.selectedOptions).map(
                  (option) => option.value,
                )
                setForm((state) => ({
                  ...state,
                  competitionId: competitionIds[0] ?? '',
                  competitionIds,
                }))
              }}
              className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {competitions.map((competition) => (
                <option key={competition.id} value={competition.id}>
                  {competition.name}
                  {competition.location ? ` — ${competition.location}` : ''}
                </option>
              ))}
            </select>
            {form.competitionIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.competitionIds.map((competitionId) => {
                  const competition = competitions.find(
                    (item) => String(item.id) === competitionId,
                  )

                  return (
                    <span
                      key={competitionId}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700"
                    >
                      {competition?.name ?? `Competição ${competitionId}`}
                    </span>
                  )
                })}
              </div>
            )}
          </label>

          <Field
            label="Nome"
            value={form.name}
            onChange={(name) => setForm((state) => ({ ...state, name }))}
            required
          />
          <Field
            label="Email"
            value={form.email}
            onChange={(email) => setForm((state) => ({ ...state, email }))}
            required
          />
          <Field
            label={editingExpertId ? 'Nova senha (opcional)' : 'Senha'}
            value={form.password}
            onChange={(password) => setForm((state) => ({ ...state, password }))}
            required={!editingExpertId}
            type="password"
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
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>

          <label className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((state) => ({ ...state, isActive: event.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Usuario ativo
          </label>

          <div className="mt-2 flex gap-2">
            <button
              disabled={loading || form.competitionIds.length === 0}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {editingExpertId ? 'Salvar Alterações' : 'Salvar'}
            </button>
            {editingExpertId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {experts.length === 0 ? (
            <EmptyState title="Nenhum usuário cadastrado" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Perfil</th>
                    <th className="px-4 py-3">Competições</th>
                    <th className="px-4 py-3">Status</th>
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
                          {translateRole(expert.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatCompetitions(expert)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            'rounded px-2 py-1 text-xs font-medium ring-1',
                            expert.isActive
                              ? 'bg-green-50 text-green-700 ring-green-200'
                              : 'bg-slate-100 text-slate-600 ring-slate-200',
                          ].join(' ')}
                        >
                          {expert.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(expert)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil size={13} />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDeleteExpert(expert)}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            <Trash2 size={13} />
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDeleteExpert)}
        title="Excluir usuário"
        description={
          pendingDeleteExpert
            ? `Deseja excluir ${pendingDeleteExpert.name}? Essa ação não poderá ser desfeita.`
            : ''
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        onCancel={() => setPendingDeleteExpert(null)}
        onConfirm={() => {
          if (pendingDeleteExpert) {
            void deleteExpert(pendingDeleteExpert)
          }
        }}
      />
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
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  type?: string
}) {
  return (
    <label className="mb-3 block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  )
}

function Message({ message, tone }: { message: string; tone: 'error' | 'success' }) {
  const className =
    tone === 'success'
      ? 'border-green-200 bg-green-50 text-green-700'
      : 'border-red-200 bg-red-50 text-red-700'

  return (
    <div className={`mb-4 rounded-md border px-4 py-3 text-sm ${className}`}>
      {message}
    </div>
  )
}

function getDefaultCompetitionId(competitions: Competition[], activeCompetitionId?: number | null) {
  return String(
    competitions.find((competition) => competition.id === activeCompetitionId)?.id ??
      competitions[0]?.id ??
      '',
  )
}

function formatCompetitions(expert: Expert) {
  const competitions = expert.competitions?.length
    ? expert.competitions
    : expert.competition
      ? [expert.competition]
      : []

  return competitions.length > 0
    ? competitions
        .map((competition) =>
          competition.location ? `${competition.name} - ${competition.location}` : competition.name,
        )
        .join(', ')
    : '-'
}
