import { Pencil, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useActiveUser } from '../contexts/useActiveUser'
import { api, unwrapData } from '../lib/api'
import type { Competition, Competitor } from '../types'

const initialForm = {
  competitionId: '',
  name: '',
  state: '',
  workstation: '',
}

export function CompetitorsPage() {
  const { activeUser, activeUserId, activeUserRole } = useActiveUser()
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [editingCompetitorId, setEditingCompetitorId] = useState<number | null>(null)
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
      competitionId: current.competitionId || String(loadedCompetitions[0]?.id ?? ''),
    }))
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([loadCompetitors(), loadCompetitions()])
      .catch(() => setError('Não foi possível carregar dados de competidores.'))
      .finally(() => setLoading(false))
  }, [])

  function resetForm() {
    setEditingCompetitorId(null)
    setForm((current) => ({
      ...initialForm,
      competitionId: current.competitionId || String(competitions[0]?.id ?? ''),
    }))
  }

  function startEdit(competitor: Competitor) {
    setError('')
    setSuccess('')
    setEditingCompetitorId(competitor.id)
    setForm({
      competitionId: String(competitor.competitionId),
      name: competitor.name,
      state: competitor.state ?? '',
      workstation: competitor.workstation ?? '',
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!form.competitionId) {
      setError('Selecione uma competição para cadastrar o competidor.')
      return
    }

    setLoading(true)

    try {
      const payload = {
        ...form,
        competitionId: Number(form.competitionId),
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
      setError(getApiErrorMessage(errorResponse) || 'Não foi possível concluir a operação.')
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
      setSuccess('Competidor excluído com sucesso.')
      if (editingCompetitorId === competitor.id) {
        resetForm()
      }
      await loadCompetitors()
    } catch (errorResponse) {
      setError(getApiErrorMessage(errorResponse) || 'Não foi possível concluir a operação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <PageHeader
        title="Competidores"
        description="Cadastre competidores e postos de trabalho para lançamento de notas."
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
              <option value="">Selecione uma competição</option>
              {competitions.map((competition) => (
                <option key={competition.id} value={competition.id}>
                  {competition.name}
                  {competition.location ? ` - ${competition.location}` : ''}
                </option>
              ))}
            </select>
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
              disabled={loading || !form.competitionId}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {editingCompetitorId ? 'Salvar Alterações' : 'Salvar'}
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

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {competitors.length === 0 ? (
            <EmptyState title="Nenhum competidor cadastrado" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Posto/Bancada</th>
                    <th className="px-4 py-3">Competição</th>
                    <th className="px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {competitors.map((competitor) => (
                    <tr key={competitor.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {competitor.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {competitor.state ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {competitor.workstation ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {competitor.competition?.name ?? '-'}
                        {competitor.competition?.location
                          ? ` - ${competitor.competition.location}`
                          : ''}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(competitor)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil size={13} />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDeleteCompetitor(competitor)}
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
        open={Boolean(pendingDeleteCompetitor)}
        title="Excluir competidor"
        description={
          pendingDeleteCompetitor
            ? `Deseja excluir ${pendingDeleteCompetitor.name}? Essa ação não poderá ser desfeita.`
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
