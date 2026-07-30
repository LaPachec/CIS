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
  name: '',
  state: '',
  role: 'EXPERT' as ExpertRole,
}

export function ExpertsPage() {
  const { activeUser, activeUserId, activeUserRole, refreshExperts } = useActiveUser()
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
      competitionId: current.competitionId || String(loadedCompetitions[0]?.id ?? ''),
    }))
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([loadExperts(), loadCompetitions()])
      .catch(() => setError('Não foi possível carregar os dados de usuários.'))
      .finally(() => setLoading(false))
  }, [])

  function resetForm() {
    setEditingExpertId(null)
    setForm((current) => ({
      ...initialForm,
      competitionId: current.competitionId || String(competitions[0]?.id ?? ''),
    }))
  }

  function startEdit(expert: Expert) {
    setError('')
    setSuccess('')
    setEditingExpertId(expert.id)
    setForm({
      competitionId: String(expert.competitionId),
      name: expert.name,
      state: expert.state ?? '',
      role: expert.role === 'VIEWER' ? 'EXPERT' : expert.role,
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!form.competitionId) {
      setError('Selecione uma competição para cadastrar o usuário.')
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
                  {competition.location ? ` — ${competition.location}` : ''}
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
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-2 flex gap-2">
            <button
              disabled={loading || !form.competitionId}
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
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Perfil</th>
                    <th className="px-4 py-3">Competição</th>
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
                        {expert.competition?.name ?? '-'}
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
