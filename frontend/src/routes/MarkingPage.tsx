import { CheckCircle2, Lock, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { Loading } from '../components/Loading'
import { PageHeader } from '../components/PageHeader'
import { api, unwrapData } from '../lib/api'
import type {
  Aspect,
  Competitor,
  CompetitorModuleMarks,
  Mark,
  Module,
} from '../types'

const fixedExpertId = 1

type Draft = {
  value: number | null
  observation: string
}

export function MarkingPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [selectedCompetitorId, setSelectedCompetitorId] = useState('')
  const [selectedModuleId, setSelectedModuleId] = useState('')
  const [data, setData] = useState<CompetitorModuleMarks | null>(null)
  const [drafts, setDrafts] = useState<Record<number, Draft>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function loadFilters() {
      try {
        const [competitorsResponse, modulesResponse] = await Promise.all([
          api.get<Competitor[]>('/competitors'),
          api.get<Module[]>('/modules'),
        ])
        setCompetitors(unwrapData(competitorsResponse))
        setModules(unwrapData(modulesResponse))
      } catch {
        setError('Erro ao carregar filtros de lançamento.')
      }
    }

    loadFilters()
  }, [])

  useEffect(() => {
    if (!selectedCompetitorId || !selectedModuleId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(null)
      setDrafts({})
      return
    }

    loadMarkingData(Number(selectedCompetitorId), Number(selectedModuleId))
  }, [selectedCompetitorId, selectedModuleId])

  async function loadMarkingData(competitorId: number, moduleId: number) {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await api.get<CompetitorModuleMarks>(
        `/competitors/${competitorId}/module/${moduleId}/marks`,
      )
      const nextData = unwrapData(response)
      setData(nextData)
      setDrafts(createDrafts(nextData))
    } catch {
      setError('Erro ao carregar estrutura de correção.')
      setData(null)
      setDrafts({})
    } finally {
      setLoading(false)
    }
  }

  const selectedCompetitor = useMemo(
    () =>
      competitors.find(
        (competitor) => String(competitor.id) === selectedCompetitorId,
      ),
    [competitors, selectedCompetitorId],
  )

  async function saveMark(aspect: Aspect) {
    const draft = drafts[aspect.id]

    if (!data || !draft || draft.value === null) {
      setError('Selecione uma nota antes de salvar.')
      return
    }

    const existingMark = findExpertMark(aspect)

    if (existingMark?.locked) {
      setError('Esta nota está bloqueada e não pode ser alterada.')
      return
    }

    setError('')
    setSuccess('')

    try {
      if (existingMark) {
        await api.put(`/marks/${existingMark.id}`, {
          value: draft.value,
          observation: draft.observation,
        })
      } else {
        await api.post('/marks', {
          aspectId: aspect.id,
          competitorId: data.competitor.id,
          expertId: fixedExpertId,
          value: draft.value,
          observation: draft.observation,
        })
      }

      setSuccess('Nota salva com sucesso.')
      await loadMarkingData(data.competitor.id, data.module.id)
    } catch (errorResponse) {
      const message = getErrorMessage(errorResponse)
      setError(
        message.includes('Locked')
          ? 'Esta nota está bloqueada e não pode ser alterada.'
          : 'Erro ao salvar nota.',
      )
    }
  }

  function updateDraft(aspectId: number, patch: Partial<Draft>) {
    setDrafts((state) => ({
      ...state,
      [aspectId]: {
        ...state[aspectId],
        value: state[aspectId]?.value ?? null,
        observation: state[aspectId]?.observation ?? '',
        ...patch,
      },
    }))
  }

  function findExpertMark(aspect: Aspect) {
    return aspect.marks?.find((mark) => mark.expertId === fixedExpertId)
  }

  return (
    <section>
      <PageHeader
        title="Lançamento de Notas"
        description="Selecione um competidor e um módulo para lançar notas por aspecto avaliativo."
      />

      <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Competidor
            </span>
            <select
              value={selectedCompetitorId}
              onChange={(event) => setSelectedCompetitorId(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Selecione</option>
              {competitors.map((competitor) => (
                <option key={competitor.id} value={competitor.id}>
                  {competitor.name} {competitor.workstation ? `- ${competitor.workstation}` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Módulo
            </span>
            <select
              value={selectedModuleId}
              onChange={(event) => setSelectedModuleId(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Selecione</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.code} - {module.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Avaliador fixo nesta versão: expertId {fixedExpertId}
          {selectedCompetitor ? ` | Competidor: ${selectedCompetitor.name}` : ''}
        </p>
      </div>

      {error && <Message tone="error" text={error} />}
      {success && <Message tone="success" text={success} />}

      {loading && <Loading />}

      {!loading && !data && (
        <EmptyState
          title="Nenhuma estrutura carregada"
          description="Escolha um competidor e um módulo para iniciar o lançamento."
        />
      )}

      {!loading && data && (
        <div className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-blue-700">
              Módulo {data.module.code}
            </p>
            <h2 className="text-xl font-semibold text-slate-950">
              {data.module.name}
            </h2>
            <p className="text-sm text-slate-500">
              Competidor: {data.competitor.name}
            </p>
          </div>

          {data.module.criteria.map((criterion) => (
            <div
              key={criterion.id}
              className="rounded-lg border border-slate-200 bg-white shadow-sm"
            >
              <div className="border-b border-slate-200 px-5 py-4">
                <p className="text-sm font-semibold text-slate-950">
                  {criterion.code} - {criterion.name}
                </p>
              </div>
              <div className="space-y-4 p-5">
                {criterion.subCriteria.map((subCriterion) => (
                  <div key={subCriterion.id}>
                    <div className="mb-3">
                      <h3 className="text-sm font-semibold text-slate-800">
                        {subCriterion.code} - {subCriterion.name}
                      </h3>
                      {subCriterion.markingDay && (
                        <p className="text-xs text-slate-500">
                          Dia de marcação: {subCriterion.markingDay}
                        </p>
                      )}
                    </div>
                    <div className="space-y-3">
                      {(subCriterion.aspects ?? []).map((aspect) => (
                        <AspectMarkingCard
                          key={aspect.id}
                          aspect={aspect}
                          draft={drafts[aspect.id] ?? { value: null, observation: '' }}
                          existingMark={findExpertMark(aspect)}
                          onDraftChange={(patch) => updateDraft(aspect.id, patch)}
                          onSave={() => saveMark(aspect)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function AspectMarkingCard({
  aspect,
  draft,
  existingMark,
  onDraftChange,
  onSave,
}: {
  aspect: Aspect
  draft: Draft
  existingMark?: Mark
  onDraftChange: (patch: Partial<Draft>) => void
  onSave: () => void
}) {
  const maxPoints = Number(aspect.maxPoints)
  const options =
    aspect.type === 'MEASUREMENT'
      ? [
          { label: 'Não atende', value: 0 },
          { label: 'Atende', value: maxPoints },
        ]
      : [0, 1, 2, 3].map((value) => ({ label: String(value), value }))

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <strong className="text-sm text-slate-950">{aspect.code}</strong>
            <span className="rounded bg-white px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
              {aspect.type}
            </span>
            <span className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
              {aspect.maxPoints} pts
            </span>
            {aspect.wsos && (
              <span className="rounded bg-slate-200 px-2 py-1 text-xs text-slate-700">
                WSOS {aspect.wsos}
              </span>
            )}
            {existingMark?.locked && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                <Lock size={12} />
                Bloqueada
              </span>
            )}
          </div>
          <p className="text-sm text-slate-800">{aspect.description}</p>
          {existingMark && (
            <p className="mt-2 text-xs text-slate-500">
              Valor atual: {existingMark.value}
              {existingMark.observation ? ` | Obs: ${existingMark.observation}` : ''}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {options.map((option) => {
              const selected = Number(draft.value) === Number(option.value)

              return (
                <button
                  key={`${aspect.id}-${option.label}`}
                  type="button"
                  disabled={existingMark?.locked}
                  onClick={() => onDraftChange({ value: option.value })}
                  className={[
                    'rounded-md border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
                    selected
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100',
                  ].join(' ')}
                >
                  {option.label}
                </button>
              )
            })}
          </div>

          <textarea
            value={draft.observation}
            disabled={existingMark?.locked}
            onChange={(event) =>
              onDraftChange({ observation: event.target.value })
            }
            placeholder="Observação da avaliação"
            className="min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
          />

          <button
            type="button"
            disabled={existingMark?.locked}
            onClick={onSave}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={16} />
            Salvar nota
          </button>
        </div>
      </div>
    </div>
  )
}

function createDrafts(data: CompetitorModuleMarks) {
  const drafts: Record<number, Draft> = {}

  for (const criterion of data.module.criteria) {
    for (const subCriterion of criterion.subCriteria) {
      for (const aspect of subCriterion.aspects) {
        const mark = aspect.marks?.find((item) => item.expertId === fixedExpertId)
        drafts[aspect.id] = {
          value: mark ? Number(mark.value) : null,
          observation: mark?.observation ?? '',
        }
      }
    }
  }

  return drafts
}

function Message({ tone, text }: { tone: 'error' | 'success'; text: string }) {
  const className =
    tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-green-200 bg-green-50 text-green-700'

  return (
    <div className={`mb-4 flex items-center gap-2 rounded-md border px-4 py-3 text-sm ${className}`}>
      {tone === 'success' && <CheckCircle2 size={16} />}
      {text}
    </div>
  )
}

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null &&
    'error' in error.response.data
  ) {
    return String(error.response.data.error)
  }

  return ''
}
