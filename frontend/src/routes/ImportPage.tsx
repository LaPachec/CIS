import { Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { useActiveUser } from '../contexts/useActiveUser'
import { api, unwrapData } from '../lib/api'
import type { Competition } from '../types'

export function ImportPage() {
  const { activeUserId, activeUserRole } = useActiveUser()
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [competitionId, setCompetitionId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get<Competition[]>('/competitions')
      .then((response) => setCompetitions(unwrapData(response)))
      .catch(() => setError('Não foi possível carregar as competições.'))
  }, [])

  async function submitImport() {
    if (!competitionId) {
      setError('Selecione uma competição para continuar.')
      return
    }

    if (!file) {
      setError('Selecione uma ficha Excel para importar.')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const formData = new FormData()
      formData.append('competitionId', competitionId)
      formData.append('userRole', activeUserRole ?? '')
      formData.append('file', file)

      const response = await api.post('/import/assessment-sheet', formData, {
        headers: {
          'x-user-id': String(activeUserId ?? ''),
          'x-user-role': activeUserRole ?? '',
        },
      })
      const result = unwrapData<{
        modulesCreated: number
        modulesUpdated: number
        aspectsCreated: number
        aspectsUpdated: number
      }>(response)

      setMessage(
        `Ficha importada com sucesso. Módulos: ${result.modulesCreated} novos, ${result.modulesUpdated} atualizados. Aspectos: ${result.aspectsCreated} novos, ${result.aspectsUpdated} atualizados.`,
      )
      setFile(null)
    } catch {
      setError('Não foi possível importar a ficha de avaliação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <PageHeader
        title="Importar Ficha de Avaliação"
        description="Atualize a estrutura da competição a partir da ficha oficial em Excel."
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {competitions.length === 0 ? (
        <EmptyState
          title="Nenhuma Competição Encontrada"
          description="Cadastre uma competição antes de importar a ficha de avaliação."
        />
      ) : (
        <div className="cis-surface max-w-5xl rounded-xl p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_minmax(260px,1.2fr)_auto] lg:items-end">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-[var(--text-secondary)]">
                Competição
              </span>
              <select
                value={competitionId}
                onChange={(event) => setCompetitionId(event.target.value)}
                className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--focus)] focus:ring-2 focus:ring-sky-400/20"
              >
                <option value="">Selecione...</option>
                {competitions.map((competition) => (
                  <option key={competition.id} value={competition.id}>
                    {competition.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block font-medium text-[var(--text-secondary)]">
                Ficha Excel (.xlsx)
              </span>
              <input
                type="file"
                accept=".xlsx"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="file-input block w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text-secondary)]"
              />
            </label>
          <button
            type="button"
            onClick={submitImport}
            disabled={loading}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(37,99,235,0.22)] hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
          >
            <Upload size={16} />
            {loading ? 'Importando...' : 'Importar Ficha de Avaliação'}
          </button>
          </div>
        </div>
      )}
    </section>
  )
}
