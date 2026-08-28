import { Eye, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Modal } from '../components/ui/Modal'
import { useActiveUser } from '../contexts/useActiveUser'
import { api, isRequestCanceled, unwrapData } from '../lib/api'
import { getCachedCompetitions } from '../lib/competitions-cache'
import { translateRole } from '../lib/labels'
import type { Competition, Expert, ExpertRole } from '../types'

const itemsPerPage = 10

const roles: Array<{ value: ExpertRole; label: string }> = [
  { value: 'ADMIN', label: 'ADMIN - Administrador' },
  { value: 'SUPERVISOR', label: 'SUPERVISOR - Supervisor' },
  { value: 'EXPERT', label: 'EXPERT - Avaliador' },
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
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
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

  const totalPages = Math.max(1, Math.ceil(experts.length / itemsPerPage))
  const paginatedExperts = experts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [experts.length])

  async function loadExperts(signal?: AbortSignal) {
    const response = await api.get<Expert[]>('/experts', { signal })
    setExperts(unwrapData(response))
  }

  async function loadCompetitions() {
    const loadedCompetitions = await getCachedCompetitions()

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
    const controller = new AbortController()

    setLoading(true)
    Promise.all([loadExperts(controller.signal), loadCompetitions()])
      .catch((errorResponse) => {
        if (isRequestCanceled(errorResponse)) {
          return
        }

        setError('Nao foi possivel carregar os dados de usuarios.')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
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
    const competitionIds = getExpertCompetitionIds(expert)

    setForm({
      competitionId: competitionIds[0] ?? String(expert.competitionId),
      competitionIds,
      name: expert.name,
      email: expert.email ?? '',
      password: '',
      state: expert.state ?? '',
      role: expert.role === 'VIEWER' ? 'EXPERT' : expert.role,
      isActive: expert.isActive,
    })
  }

  function toggleCompetitionId(competitionId: string) {
    setForm((state) => {
      const competitionIds = state.competitionIds.includes(competitionId)
        ? state.competitionIds.filter((id) => id !== competitionId)
        : [...state.competitionIds, competitionId]

      return {
        ...state,
        competitionId: competitionIds[0] ?? '',
        competitionIds,
      }
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (form.competitionIds.length === 0) {
      setError('Selecione uma competicao para cadastrar o usuario.')
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
        setSuccess('Usuario atualizado com sucesso.')
      } else {
        await api.post('/experts', payload, { headers })
        setSuccess('Usuario salvo com sucesso.')
      }

      resetForm()
      await Promise.all([loadExperts(), refreshExperts()])
    } catch (errorResponse) {
      setError(getApiErrorMessage(errorResponse) || 'Nao foi possivel concluir a operacao.')
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
      setSuccess('Usuario excluido com sucesso.')
      if (editingExpertId === expert.id) {
        resetForm()
      }
      await Promise.all([loadExperts(), refreshExperts()])
    } catch (errorResponse) {
      setError(getApiErrorMessage(errorResponse) || 'Nao foi possivel concluir a operacao.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <PageHeader
        title="Usuarios e Avaliadores"
        description="Gerencie os usuarios que acessam o sistema e seus perfis de permissao."
      />

      {error && <Message tone="error" message={error} />}
      {success && <Message tone="success" message={success} />}

      <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-950">
              {editingExpertId ? 'Editar usuario' : 'Novo usuario'}
            </h2>
            {editingExpertId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-semibold text-slate-600 hover:text-slate-950"
              >
                Novo Usuario
              </button>
            )}
          </div>

          <label className="mb-3 block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Competicoes
            </span>
            <div className="max-h-44 overflow-y-auto rounded-md border border-slate-300 bg-white p-2">
              {competitions.length === 0 ? (
                <p className="px-2 py-1 text-xs text-slate-500">
                  Nenhuma competicao cadastrada.
                </p>
              ) : (
                competitions.map((competition) => {
                  const competitionId = String(competition.id)

                  return (
                    <label
                      key={competition.id}
                      className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={form.competitionIds.includes(competitionId)}
                        disabled={loading}
                        onChange={() => toggleCompetitionId(competitionId)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>
                        {competition.name}
                        {competition.location ? ` - ${competition.location}` : ''}
                      </span>
                    </label>
                  )
                })
              )}
            </div>
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
                      {competition?.name ?? `Competicao ${competitionId}`}
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
              {editingExpertId ? 'Salvar Alteracoes' : 'Salvar'}
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

        <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {experts.length === 0 ? (
            <EmptyState title="Nenhum usuario cadastrado" />
          ) : (
            <>
              <div className="min-h-0 w-full flex-1 overflow-auto">
                <table className="w-full min-w-[720px] text-center text-sm">
                  <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3">Competicoes</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Acoes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedExperts.map((expert) => (
                      <tr key={expert.id}>
                        <td className="px-4 py-3 text-center font-medium text-slate-900">
                          {expert.name}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600">
                          {formatCompetitions(expert)}
                        </td>
                        <td className="px-4 py-3 text-center">
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
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              aria-label={`Ver detalhes de ${expert.name}`}
                              title="Ver detalhes"
                              onClick={() => setSelectedExpert(expert)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Editar ${expert.name}`}
                              title="Editar"
                              onClick={() => startEdit(expert)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Excluir ${expert.name}`}
                              title="Excluir"
                              onClick={() => setPendingDeleteExpert(expert)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-700 hover:bg-red-50"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={experts.length}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      </div>

      <Modal
        open={Boolean(selectedExpert)}
        title="Detalhes do usuario"
        onClose={() => setSelectedExpert(null)}
      >
        {selectedExpert && (
          <div className="space-y-3 text-sm text-[var(--text-secondary)]">
            <Detail label="Nome" value={selectedExpert.name} />
            <Detail label="Email" value={selectedExpert.email ?? '-'} />
            <Detail label="Estado" value={selectedExpert.state ?? '-'} />
            <Detail label="Perfil" value={translateRole(selectedExpert.role)} />
            <Detail label="Status" value={selectedExpert.isActive ? 'Ativo' : 'Inativo'} />
            <Detail label="Competicoes" value={formatCompetitions(selectedExpert)} />
            <Detail label="ID" value={String(selectedExpert.id)} />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDeleteExpert)}
        title="Excluir usuario"
        description={
          pendingDeleteExpert
            ? `Deseja excluir ${pendingDeleteExpert.name}? Essa acao nao podera ser desfeita.`
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-0.5 text-[var(--text-primary)]">{value}</dd>
    </div>
  )
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  totalItems: number
  onPageChange: (page: number) => void
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-t border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-600">
      <span>
        {totalItems} registro(s) - pagina {currentPage} de {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Proxima
        </button>
      </div>
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

function getExpertCompetitionIds(expert: Expert) {
  const linkedIds = expert.competitions?.map((competition) => String(competition.id)) ?? []

  return linkedIds.length > 0 ? linkedIds : [String(expert.competitionId)].filter(Boolean)
}
