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
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useActiveUser } from '../contexts/useActiveUser'
import { api, unwrapData } from '../lib/api'
import type { Aspect, Competition, Competitor, CompetitorModuleMarks, Mark, Module } from '../types'

type OptimisticValues = Record<number, number | null>
type StatusByAspect = Record<number, SaveStatusValue>
type PendingSubCriterionLock = {
  locked: boolean
  title: string
  description: string
} | null

export function MarkingPage() {
  const [searchParams] = useSearchParams()
  const queryCompetitorId = searchParams.get('competitorId') ?? ''
  const queryModuleId = searchParams.get('moduleId') ?? ''
  const querySubCriterionId = searchParams.get('subCriterionId') ?? ''
  const queryAspectId = searchParams.get('aspectId') ?? ''
  const {
    activeUser,
    activeUserId,
    activeUserCompetitionId,
    activeUserRole,
    canUnlock,
  } = useActiveUser()
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [selectedCompetitionId, setSelectedCompetitionId] = useState('')
  const [selectedCompetitorId, setSelectedCompetitorId] = useState('')
  const [selectedModuleId, setSelectedModuleId] = useState('')
  const [data, setData] = useState<CompetitorModuleMarks | null>(null)
  const [activeSubCriterionId, setActiveSubCriterionId] = useState<number | null>(null)
  const [optimisticValues, setOptimisticValues] = useState<OptimisticValues>({})
  const [statusByAspect, setStatusByAspect] = useState<StatusByAspect>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingSubCriterionLock, setPendingSubCriterionLock] =
    useState<PendingSubCriterionLock>(null)

  useEffect(() => {
    async function loadCompetitions() {
      try {
        const response = await api.get<Competition[]>('/competitions')
        const loadedCompetitions = unwrapData(response)
        const defaultCompetitionId =
          activeUserCompetitionId &&
          loadedCompetitions.some((competition) => competition.id === activeUserCompetitionId)
            ? String(activeUserCompetitionId)
            : String(loadedCompetitions[0]?.id ?? '')

        setCompetitions(loadedCompetitions)
        setSelectedCompetitionId((current) => current || defaultCompetitionId)
      } catch {
        setError('Erro ao carregar competicoes.')
      }
    }

    loadCompetitions()
  }, [activeUserCompetitionId])

  useEffect(() => {
    async function loadFilters() {
      if (!selectedCompetitionId) {
        return
      }

      try {
        const [competitorsResponse, modulesResponse] = await Promise.all([
          api.get<Competitor[]>('/competitors', {
            params: { competitionId: selectedCompetitionId },
          }),
          api.get<Module[]>('/modules', {
            params: { competitionId: selectedCompetitionId },
          }),
        ])
        const loadedCompetitors = unwrapData(competitorsResponse)
        const loadedModules = unwrapData(modulesResponse)
        const defaultCompetitor = activeUserCompetitionId
          ? loadedCompetitors.find(
              (competitor) => competitor.competitionId === activeUserCompetitionId,
            )
          : null
        const defaultModule = activeUserCompetitionId
          ? loadedModules.find((module) => module.competitionId === activeUserCompetitionId)
          : null

        setCompetitors(loadedCompetitors)
        setModules(loadedModules)
        setSelectedCompetitorId(
          queryCompetitorId || String(defaultCompetitor?.id ?? ''),
        )
        setSelectedModuleId(
          queryModuleId || String(defaultModule?.id ?? ''),
        )
        setData(null)
        setActiveSubCriterionId(null)
        setOptimisticValues({})
        setStatusByAspect({})
      } catch {
        setError('Erro ao carregar filtros de lançamento.')
      }
    }

    loadFilters()
  }, [activeUserCompetitionId, queryCompetitorId, queryModuleId, selectedCompetitionId])

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
      const competitorBelongs = competitors.some(
        (competitor) => competitor.id === competitorId,
      )
      const moduleBelongs = modules.some((module) => module.id === moduleId)

      if (!selectedCompetitionId || !competitorBelongs || !moduleBelongs) {
        throw new Error('invalid-competition-link')
      }

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
      setError('Competidor ou módulo não pertence à competição selecionada.')
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
  }, [competitors, modules, selectedCompetitionId, selectedCompetitorId, selectedModuleId])

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
  const activeAspectsCount = activeSubCriterion?.aspects.length ?? 0
  const markedAspectsCount =
    activeSubCriterion?.aspects.filter((aspect) => {
      const hasSavedMark = Boolean(findExistingMark(aspect, activeUserId ?? undefined))
      const hasOptimisticMark = optimisticValues[aspect.id] !== undefined

      return hasSavedMark || hasOptimisticMark
    }).length ?? 0
  const saveStatuses = Object.values(statusByAspect)
  const autoSaveStatus = saveStatuses.includes('saving')
    ? 'Salvando...'
    : saveStatuses.includes('error')
      ? 'Falha ao salvar'
      : saveStatuses.includes('saved')
        ? 'Alterações salvas'
        : 'Aguardando lançamento'
  const autoSaveStatusClass = saveStatuses.includes('error')
    ? 'border-red-200 bg-red-50 text-red-700'
    : saveStatuses.includes('saving')
      ? 'border-blue-200 bg-blue-50 text-blue-700'
      : saveStatuses.includes('saved')
        ? 'border-green-200 bg-green-50 text-green-700'
        : 'border-slate-200 bg-slate-50 text-slate-600'

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

  function requestActiveSubCriterionLock(locked: boolean) {
    if (!activeSubCriterion) {
      return
    }

    setPendingSubCriterionLock({
      locked,
      title: locked ? 'Bloquear subcritério' : 'Desbloquear subcritério',
      description: locked
        ? `Você vai bloquear as notas do subcritério ${activeSubCriterion.code} - ${activeSubCriterion.name}. Após o bloqueio, elas não poderão ser alteradas sem desbloqueio.`
        : `Você vai desbloquear as notas do subcritério ${activeSubCriterion.code} - ${activeSubCriterion.name}. As notas poderão ser alteradas novamente.`,
    })
  }

  return (
    <section>
      <PageHeader
        title="Lançamento de Notas"
        description="Selecione um competidor e um módulo para corrigir a ficha por subcritério."
      />

      <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Simulados
            </span>
            <select
              value={selectedCompetitionId}
              onChange={(event) => setSelectedCompetitionId(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Selecione</option>
              {competitions.map((competition) => (
                <option key={competition.id} value={competition.id}>
                  {competition.name}
                  {competition.location ? ` - ${competition.location}` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Competidor
            </span>
            <select
              value={selectedCompetitorId}
              onChange={(event) => setSelectedCompetitorId(event.target.value)}
              disabled={!selectedCompetitionId}
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
              disabled={!selectedCompetitionId}
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
          </div>

          <SubCriterionTabs
            subCriteria={subCriteria}
            activeId={activeSubCriterionId}
            getProgress={(subCriterion) =>
              getSubCriterionProgress(subCriterion, activeUserId ?? undefined)
            }
            onSelect={setActiveSubCriterionId}
          />

          <div className="sticky top-0 z-20 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Lançamento ativo
                </p>
                <p className="text-sm font-semibold text-slate-400">
                  {activeSubCriterion.code} - {activeSubCriterion.name}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-slate-700">
                  {markedAspectsCount}/{activeAspectsCount} aspectos lançados
                </span>
                <span
                  className={`rounded-md border px-2.5 py-1.5 ${autoSaveStatusClass}`}
                >
                  {autoSaveStatus}
                </span>
                <SubCriterionNavigator
                  currentIndex={activeIndex}
                  total={subCriteria.length}
                  onPrevious={goToPrevious}
                  onNext={goToNext}
                />
              </div>
            </div>
          </div>

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
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3">
                <span
                  className={[
                    'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
                    activeSubCriterionLocked
                      ? 'bg-amber-500/15 text-[var(--warning)] ring-amber-500/40'
                      : activeSubCriterionHasMarks
                        ? 'bg-emerald-500/15 text-[var(--success)] ring-emerald-500/35'
                        : 'bg-[var(--surface)] text-[var(--text-muted)] ring-[var(--border)]',
                  ].join(' ')}
                >
                  {activeSubCriterionLocked
                    ? 'Subcritério bloqueado'
                    : activeSubCriterionHasMarks
                      ? 'Subcritério desbloqueado'
                      : 'Sem notas para bloquear'}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={!activeSubCriterionHasMarks || activeSubCriterionLocked}
                    onClick={() => requestActiveSubCriterionLock(true)}
                    className="inline-flex h-9 items-center rounded-lg border border-amber-500/45 bg-amber-700/85 px-3 text-xs font-semibold text-white hover:border-amber-400 hover:bg-amber-600 focus-visible:ring-2 focus-visible:ring-amber-300/50 disabled:cursor-not-allowed disabled:border-[var(--border)] disabled:bg-[var(--surface)] disabled:text-[var(--text-muted)] disabled:opacity-60"
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
                    onClick={() => requestActiveSubCriterionLock(false)}
                    className="inline-flex h-9 items-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] disabled:cursor-not-allowed disabled:text-[var(--text-muted)] disabled:opacity-60"
                  >
                    Desbloquear subcritério
                  </button>
                </div>
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
      <ConfirmDialog
        open={Boolean(pendingSubCriterionLock)}
        title={pendingSubCriterionLock?.title ?? ''}
        description={pendingSubCriterionLock?.description ?? ''}
        confirmLabel={pendingSubCriterionLock?.locked ? 'Bloquear' : 'Desbloquear'}
        cancelLabel="Cancelar"
        variant={pendingSubCriterionLock?.locked ? 'danger' : 'default'}
        onCancel={() => setPendingSubCriterionLock(null)}
        onConfirm={() => {
          const nextLock = pendingSubCriterionLock

          setPendingSubCriterionLock(null)
          if (nextLock) {
            setActiveSubCriterionLock(nextLock.locked)
          }
        }}
      />
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
