import { Eye, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Modal } from '../components/ui/Modal'
import { useActiveUser } from '../contexts/useActiveUser'
import { api, unwrapData } from '../lib/api'
import type { Competition, Competitor } from '../types'

const itemsPerPage = 10

const initialForm = {
  competitionId: '',
  competitionIds: [] as string[],
  name: '',
  state: '',
  workstation: '',
}

export function CompetitorsPage() {
  const { activeUser, activeUserCompetitionId, activeUserId, activeUserRole } =
    useActiveUser()
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [editingCompetitorId, setEditingCompetitorId] = useState<number | null>(null)
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingDeleteCompetitor, setPendingDeleteCompetitor] =
    useState<Competitor | null>(null)

  const headers = useMemo(
    () => ({
      'x-user-id': String(activeUserId ?? ''),
      'x-user-role': activeUserRole ?? '',
      'x-user-name': activeUser?.name ?? '',
    }),
    [activeUser?.name, activeUserId, activeUserRole],
  )

  const totalPages = Math.max(1, Math.ceil(competitors.length / itemsPerPage))
  const paginatedCompetitors = competitors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [competitors.length])

  async function loadCompetitors() {
    const response = await api.get<Competitor[]>('/competitors')
    setCompetitors(unwrapData(response))
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
    Promise.all([loadCompetitors(), loadCompetitions()])
      .catch(() => setError('Nao foi possivel carregar dados de competidores.'))
      .finally(() => setLoading(false))
  }, [activeUserCompetitionId])

  function resetForm() {
    setEditingCompetitorId(null)
    setForm((current) => ({
      ...initialForm,
      competitionId: current.competitionId || getDefaultCompetitionId(competitions, activeUserCompetitionId),
      competitionIds:
        current.competitionIds.length > 0
          ? current.competitionIds
          : [getDefaultCompetitionId(competitions, activeUserCompetitionId)].filter(Boolean),
    }))
  }

  function startEdit(competitor: Competitor) {
    setError('')
    setSuccess('')
    setEditingCompetitorId(competitor.id)
    const competitionIds = getCompetitorCompetitionIds(competitor)

    setForm({
      competitionId: competitionIds[0] ?? String(competitor.competitionId),
      competitionIds,
      name: competitor.name,
      state: competitor.state ?? '',
      workstation: competitor.workstation ?? '',
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
      setError('Selecione uma competicao para cadastrar o competidor.')
      return
    }

    setLoading(true)

    try {
      const payload = {
        ...form,
        competitionId: Number(form.competitionIds[0] ?? form.competitionId),
        competitionIds: form.competitionIds.map(Number),
        userId: activeUserId,
        userRole: activeUserRole,
        userName: activeUser?.name,
      }

      if (editingCompetitorId) {
        await api.put(`/competitors/${editingCompetitorId}`, payload, { headers })
        setSuccess('Competidor atualizado com sucesso.')
      } else {
        await api.post('/competitors', payload, { headers })
        setSuccess('Competidor salvo com sucesso.')
      }

      resetForm()
      await loadCompetitors()
    } catch (errorResponse) {
      setError(getApiErrorMessage(errorResponse) || 'Nao foi possivel concluir a operacao.')
    } finally {
      setLoading(false)
    }
  }

  async function deleteCompetitor(competitor: Competitor) {
    setError('')
    setSuccess('')
    setPendingDeleteCompetitor(null)
    setLoading(true)

    try {
      await api.delete(`/competitors/${competitor.id}`, { headers })
      setSuccess('Competidor excluido com sucesso.')
      if (editingCompetitorId === competitor.id) {
        resetForm()
      }
      await loadCompetitors()
    } catch (errorResponse) {
      setError(getApiErrorMessage(errorResponse) || 'Nao foi possivel concluir a operacao.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <PageHeader
        title="Competidores"
        description="Cadastre competidores e postos de trabalho para lancamento de notas."
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
              {editingCompetitorId ? 'Editar competidor' : 'Novo competidor'}
            </h2>
            {editingCompetitorId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-semibold text-slate-600 hover:text-slate-950"
              >
                Novo Competidor
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
            label="Nome do Competidor"
            value={form.name}
            onChange={(name) => setForm((state) => ({ ...state, name }))}
            required
          />
          <Field
            label="Estado"
            value={form.state}
            onChange={(state) => setForm((data) => ({ ...data, state }))}
          />
          <Field
            label="Posto/Bancada"
            value={form.workstation}
            onChange={(workstation) =>
              setForm((state) => ({ ...state, workstation }))
            }
          />

          <div className="mt-2 flex gap-2">
            <button
              disabled={loading || form.competitionIds.length === 0}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {editingCompetitorId ? 'Salvar Alteracoes' : 'Salvar'}
            </button>
            {editingCompetitorId && (
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
          {competitors.length === 0 ? (
            <EmptyState title="Nenhum competidor cadastrado" />
          ) : (
            <>
              <div className="min-h-0 w-full flex-1 overflow-auto">
                <table className="w-full min-w-[620px] text-center text-sm">
                  <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3">Competicoes</th>
                      <th className="px-4 py-3">Acoes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedCompetitors.map((competitor) => (
                      <tr key={competitor.id}>
                        <td className="px-4 py-3 text-center font-medium text-slate-900">
                          {competitor.name}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600">
                          {formatCompetitions(competitor)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              aria-label={`Ver detalhes de ${competitor.name}`}
                              title="Ver detalhes"
                              onClick={() => setSelectedCompetitor(competitor)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Editar ${competitor.name}`}
                              title="Editar"
                              onClick={() => startEdit(competitor)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Excluir ${competitor.name}`}
                              title="Excluir"
                              onClick={() => setPendingDeleteCompetitor(competitor)}
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
                totalItems={competitors.length}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      </div>

      <Modal
        open={Boolean(selectedCompetitor)}
        title="Detalhes do competidor"
        onClose={() => setSelectedCompetitor(null)}
      >
        {selectedCompetitor && (
          <div className="space-y-3 text-sm text-[var(--text-secondary)]">
            <Detail label="Nome" value={selectedCompetitor.name} />
            <Detail label="Estado" value={selectedCompetitor.state ?? '-'} />
            <Detail label="Posto/Bancada" value={selectedCompetitor.workstation ?? '-'} />
            <Detail label="Competicoes" value={formatCompetitions(selectedCompetitor)} />
            <Detail label="ID" value={String(selectedCompetitor.id)} />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDeleteCompetitor)}
        title="Excluir competidor"
        description={
          pendingDeleteCompetitor
            ? `Deseja excluir ${pendingDeleteCompetitor.name}? Essa acao nao podera ser desfeita.`
            : ''
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        onCancel={() => setPendingDeleteCompetitor(null)}
        onConfirm={() => {
          if (pendingDeleteCompetitor) {
            void deleteCompetitor(pendingDeleteCompetitor)
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

function formatCompetitions(competitor: Competitor) {
  const competitions = competitor.competitions?.length
    ? competitor.competitions
    : competitor.competition
      ? [competitor.competition]
      : []

  return competitions.length > 0
    ? competitions
        .map((competition) =>
          competition.location ? `${competition.name} - ${competition.location}` : competition.name,
        )
        .join(', ')
    : '-'
}

function getCompetitorCompetitionIds(competitor: Competitor) {
  const linkedIds = competitor.competitions?.map((competition) => String(competition.id)) ?? []

  return linkedIds.length > 0 ? linkedIds : [String(competitor.competitionId)].filter(Boolean)
}
