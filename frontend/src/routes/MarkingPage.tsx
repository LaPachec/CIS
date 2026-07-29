import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { Loading } from '../components/Loading'
import { AspectCard } from '../components/marking/AspectCard'
import {
  calculateSubCriterionCurrentPoints,
  calculateSubCriterionMaxPoints,
  findExistingMark,
  flattenSubCriteria,
  formatPoints,
  getDefaultValueForAspect,
  getSubCriterionProgress,
  hasValidMarkId,
  type SaveStatusValue,
  updateAspectMark,
} from '../components/marking/marking-utils'
import { SubCriterionNavigator } from '../components/marking/SubCriterionNavigator'
import { SubCriterionTabs } from '../components/marking/SubCriterionTabs'
import { PageHeader } from '../components/PageHeader'
import { useActiveUser } from '../contexts/useActiveUser'
import { api, unwrapData } from '../lib/api'
import type { Aspect, Competitor, CompetitorModuleMarks, Mark, Module } from '../types'

type OptimisticValues = Record<number, number | null>
type StatusByAspect = Record<number, SaveStatusValue>

export function MarkingPage() {
  const [searchParams] = useSearchParams()
  const queryCompetitorId = searchParams.get('competitorId') ?? ''
  const queryModuleId = searchParams.get('moduleId') ?? ''
  const querySubCriterionId = searchParams.get('subCriterionId') ?? ''
  const queryAspectId = searchParams.get('aspectId') ?? ''
  const {
    activeUser,
    activeUserId,
    activeUserRole,
    canUnlock,
  } = useActiveUser()
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [selectedCompetitorId, setSelectedCompetitorId] = useState('')
  const [selectedModuleId, setSelectedModuleId] = useState('')
  const [data, setData] = useState<CompetitorModuleMarks | null>(null)
  const [activeSubCriterionId, setActiveSubCriterionId] = useState<number | null>(null)
  const [optimisticValues, setOptimisticValues] = useState<OptimisticValues>({})
  const [statusByAspect, setStatusByAspect] = useState<StatusByAspect>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadFilters() {
      try {
        const [competitorsResponse, modulesResponse] = await Promise.all([
          api.get<Competitor[]>('/competitors'),
          api.get<Module[]>('/modules'),
        ])
        setCompetitors(unwrapData(competitorsResponse))
        setModules(unwrapData(modulesResponse))
        setSelectedCompetitorId((current) => current || queryCompetitorId)
        setSelectedModuleId((current) => current || queryModuleId)
      } catch {
        setError('Erro ao carregar filtros de lançamento.')
      }
    }

    loadFilters()
  }, [])

  const subCriteria = useMemo(() => {
    if (!data) {
      return []
    }

    return flattenSubCriteria(data)
  }, [data])

  const activeIndex = subCriteria.findIndex(
    (subCriterion) => subCriterion.id === activeSubCriterionId,
  )
  const activeSubCriterion = activeIndex >= 0 ? subCriteria[activeIndex] : null

  const selectedCompetitor = useMemo(
    () =>
      competitors.find(
        (competitor) => String(competitor.id) === selectedCompetitorId,
      ),
    [competitors, selectedCompetitorId],
  )

  async function loadMarkingData(competitorId: number, moduleId: number) {
    setLoading(true)
    setError('')

    try {
      const response = await api.get<CompetitorModuleMarks>(
        `/competitors/${competitorId}/module/${moduleId}/marks`,
      )
      const nextData = unwrapData(response)
      const nextSubCriteria = flattenSubCriteria(nextData)

      setData(nextData)
      setOptimisticValues({})
      setStatusByAspect({})
        const requestedSubCriterionId = Number(querySubCriterionId)
        const requestedSubCriterion = nextSubCriteria.find(
          (subCriterion) => subCriterion.id === requestedSubCriterionId,
        )

        setActiveSubCriterionId(requestedSubCriterion?.id ?? nextSubCriteria[0]?.id ?? null)
    } catch {
      setError('Erro ao carregar estrutura de correção.')
      setData(null)
      setActiveSubCriterionId(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedCompetitorId || !selectedModuleId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(null)
      setActiveSubCriterionId(null)
      setOptimisticValues({})
      setStatusByAspect({})
      return
    }

    loadMarkingData(Number(selectedCompetitorId), Number(selectedModuleId))
  }, [selectedCompetitorId, selectedModuleId])

  useEffect(() => {
    if (!queryAspectId || loading || !data) {
      return
    }

    const target = document.getElementById(`aspect-${queryAspectId}`)

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [data, loading, queryAspectId, activeSubCriterionId])

  async function saveMark(aspect: Aspect, value: number, observation?: string) {
    if (!data) {
      return
    }

    if (!activeUserId) {
      setError('Selecione um usuário ativo para lançar notas.')
      return
    }

    const existingMark = findExistingMark(aspect, activeUserId ?? undefined)
    const competitorId = Number(selectedCompetitorId) || data.competitor.id
    const shouldUpdateMark = hasValidMarkId(existingMark)
    const existingMarkId = shouldUpdateMark ? existingMark?.id : null

    if (existingMark?.locked) {
      setError('Nota bloqueada para edição.')
      return
    }

    const previousValue = optimisticValues[aspect.id] ?? (existingMark ? Number(existingMark.value) : null)
    const nextObservation = observation ?? existingMark?.observation ?? ''

    setError('')
    setOptimisticValues((state) => ({ ...state, [aspect.id]: value }))
    setStatusByAspect((state) => ({ ...state, [aspect.id]: 'saving' }))

    console.log('Saving mark', {
      aspectId: aspect.id,
      competitorId,
      expertId: activeUserId,
      userId: activeUserId,
      userRole: activeUserRole,
      existingMark,
    })

    try {
      const response = shouldUpdateMark
        ? await api.put<Mark>(`/marks/${existingMarkId}`, {
            value,
            observation: nextObservation,
            userId: activeUserId,
            userRole: activeUserRole,
          })
        : await api.post<Mark>('/marks', {
            aspectId: aspect.id,
            competitorId,
            expertId: activeUserId,
            value,
            observation: nextObservation,
            userId: activeUserId,
            userRole: activeUserRole,
          })

      const savedMark = unwrapData(response)
      setData((currentData) =>
        currentData ? updateAspectMark(currentData, aspect.id, savedMark) : currentData,
      )
      setOptimisticValues((state) => ({ ...state, [aspect.id]: Number(savedMark.value) }))
      setStatusByAspect((state) => ({ ...state, [aspect.id]: 'saved' }))
    } catch (errorResponse) {
      setOptimisticValues((state) => ({ ...state, [aspect.id]: previousValue }))
      setStatusByAspect((state) => ({ ...state, [aspect.id]: 'error' }))
      setError(getFriendlySaveError(errorResponse))
    }
  }

  function saveObservation(aspect: Aspect, observation: string) {
    const existingMark = findExistingMark(aspect, activeUserId ?? undefined)
    const value = existingMark
      ? Number(existingMark.value)
      : optimisticValues[aspect.id] ?? getDefaultValueForAspect()

    saveMark(aspect, value, observation)
  }

  function goToPrevious() {
    if (activeIndex > 0) {
      setActiveSubCriterionId(subCriteria[activeIndex - 1].id)
    }
  }

  function goToNext() {
    if (activeIndex < subCriteria.length - 1) {
      setActiveSubCriterionId(subCriteria[activeIndex + 1].id)
    }
  }

  const maxPoints = activeSubCriterion
    ? calculateSubCriterionMaxPoints(activeSubCriterion)
    : 0
  const currentPoints = activeSubCriterion
    ? calculateSubCriterionCurrentPoints(activeSubCriterion, activeUserId ?? undefined)
    : 0
  const activeSubCriterionMarks =
    activeSubCriterion?.aspects
      .map((aspect) => findExistingMark(aspect, activeUserId ?? undefined))
      .filter((mark): mark is Mark => Boolean(mark)) ?? []
  const activeSubCriterionLocked =
    activeSubCriterionMarks.length > 0 &&
    activeSubCriterionMarks.every((mark) => mark.locked)
  const activeSubCriterionHasMarks = activeSubCriterionMarks.length > 0

  async function setActiveSubCriterionLock(locked: boolean) {
    if (!data || !activeSubCriterion) {
      return
    }

    if (locked && !activeUserId) {
      setError('Selecione um usuário ativo para bloquear notas.')
      return
    }

    if (!locked && !canUnlock) {
      setError('Ação não permitida para este perfil.')
      return
    }

    const confirmed = window.confirm(
      locked
        ? 'Tem certeza que deseja bloquear este subcritério?'
        : 'Tem certeza que deseja desbloquear este subcritério?',
    )

    if (!confirmed) {
      return
    }

    setError('')
    setLoading(true)

    try {
      await api.patch(
        `/locks/competitors/${data.competitor.id}/subcriteria/${activeSubCriterion.id}/${
          locked ? 'lock' : 'unlock'
        }`,
        {
          expertId: activeUserId,
          userId: activeUserId,
          userRole: activeUserRole,
        },
      )
      await loadMarkingData(data.competitor.id, data.module.id)
    } catch {
      setError(
        locked
          ? 'Erro ao bloquear subcritério.'
          : 'Erro ao desbloquear subcritério.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <PageHeader
        title="Lançamento de Notas"
        description="Selecione um competidor e um módulo para corrigir a ficha por subcritério."
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
                  {competitor.name}
                  {competitor.workstation ? ` - ${competitor.workstation}` : ''}
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
          Usuário ativo: {activeUser ? `${activeUser.name} (${activeUser.role})` : 'nenhum'}
          {selectedCompetitor ? ` | Competidor: ${selectedCompetitor.name}` : ''}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && <Loading />}

      {!loading && !data && (
        <EmptyState
          title="Nenhuma estrutura carregada"
          description="Escolha um competidor e um módulo para iniciar o lançamento."
        />
      )}

      {!loading && data && subCriteria.length === 0 && (
        <EmptyState
          title="Módulo sem subcritérios"
          description="Importe ou cadastre a estrutura de avaliação antes de lançar notas."
        />
      )}

      {!loading && data && activeSubCriterion && (
        <div className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-blue-700">
                  Módulo {data.module.code}
                </p>
                <h2 className="text-xl font-semibold text-slate-950">
                  {data.module.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Competidor: {data.competitor.name}
                </p>
              </div>
              <SubCriterionNavigator
                currentIndex={activeIndex}
                total={subCriteria.length}
                onPrevious={goToPrevious}
                onNext={goToNext}
              />
            </div>
          </div>

          <SubCriterionTabs
            subCriteria={subCriteria}
            activeId={activeSubCriterionId}
            getProgress={(subCriterion) =>
              getSubCriterionProgress(subCriterion, activeUserId ?? undefined)
            }
            onSelect={setActiveSubCriterionId}
          />

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Critério {activeSubCriterion.criterion.code} -{' '}
                    {activeSubCriterion.criterion.name}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-950">
                    {activeSubCriterion.code} - {activeSubCriterion.name}
                  </h3>
                  {activeSubCriterion.description && (
                    <p className="mt-1 text-sm text-slate-600">
                      {activeSubCriterion.description}
                    </p>
                  )}
                </div>
                <div className="grid min-w-72 grid-cols-2 gap-3">
                  <ScoreSummary
                    label="Pontuação máxima"
                    value={formatPoints(maxPoints)}
                  />
                  <ScoreSummary
                    label="Pontuação parcial estimada"
                    value={formatPoints(currentPoints)}
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span
                  className={[
                    'rounded px-2 py-1 text-xs font-medium',
                    activeSubCriterionLocked
                      ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                      : activeSubCriterionHasMarks
                        ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                        : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
                  ].join(' ')}
                >
                  {activeSubCriterionLocked
                    ? 'Subcritério bloqueado'
                    : activeSubCriterionHasMarks
                      ? 'Subcritério desbloqueado'
                      : 'Sem notas para bloquear'}
                </span>
                <button
                  type="button"
                  disabled={!activeSubCriterionHasMarks || activeSubCriterionLocked}
                  onClick={() => setActiveSubCriterionLock(true)}
                  className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Bloquear subcritério
                </button>
                <button
                  type="button"
                  disabled={
                    !activeSubCriterionHasMarks ||
                    !activeSubCriterionLocked ||
                    !canUnlock
                  }
                  onClick={() => setActiveSubCriterionLock(false)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Desbloquear subcritério
                </button>
              </div>
            </div>

            <div className="space-y-4 p-5">
              {activeSubCriterion.aspects.length === 0 ? (
                <EmptyState title="Subcritério sem aspectos cadastrados" />
              ) : (
                activeSubCriterion.aspects.map((aspect) => (
                  <AspectCard
                    key={aspect.id}
                    aspect={aspect}
                    mark={findExistingMark(aspect, activeUserId ?? undefined)}
                    optimisticValue={optimisticValues[aspect.id] ?? null}
                    status={statusByAspect[aspect.id] ?? 'idle'}
                    highlighted={String(aspect.id) === queryAspectId}
                    onValueChange={(value) => saveMark(aspect, value)}
                    onObservationChange={(observation) =>
                      saveObservation(aspect, observation)
                    }
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function ScoreSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <strong className="mt-1 block text-lg font-semibold text-slate-950">
        {value}
      </strong>
    </div>
  )
}

function getFriendlySaveError(error: unknown) {
  const message = getApiErrorMessage(error)

  if (
    message.toLowerCase().includes('locked') ||
    message.toLowerCase().includes('bloqueada')
  ) {
    return 'Nota bloqueada para edição.'
  }

  return 'Erro ao salvar nota. Verifique se o competidor, avaliador e aspecto existem.'
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
    error.response.data !== null &&
    'error' in error.response.data
  ) {
    return String(error.response.data.error)
  }

  return ''
}
