import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { Loading } from '../components/Loading'
import { PageHeader } from '../components/PageHeader'
import { useActiveUser } from '../contexts/useActiveUser'
import { api, unwrapData } from '../lib/api'
import type { Competitor, Module, ModuleCheckResult } from '../types'

const statusLabels = {
  EMPTY: 'Vazio',
  PARTIAL: 'Parcial',
  COMPLETE: 'Completo',
  REVIEW_REQUIRED: 'Revisão',
  LOCKED: 'Bloqueado',
}

export function CheckPage() {
  const [searchParams] = useSearchParams()
  const queryCompetitorId = searchParams.get('competitorId') ?? ''
  const queryModuleId = searchParams.get('moduleId') ?? ''
  const {
    activeUserCompetitionId,
    activeUserId,
    activeUserRole,
    canManageModuleLocks,
  } = useActiveUser()
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [selectedCompetitorId, setSelectedCompetitorId] = useState('')
  const [selectedModuleId, setSelectedModuleId] = useState('')
  const [check, setCheck] = useState<ModuleCheckResult | null>(null)
  const [loadingFilters, setLoadingFilters] = useState(false)
  const [loadingCheck, setLoadingCheck] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadFilters() {
      setLoadingFilters(true)
      setError('')

      try {
        const [competitorsResponse, modulesResponse] = await Promise.all([
          api.get<Competitor[]>('/competitors'),
          api.get<Module[]>('/modules'),
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
          (current) => current || queryCompetitorId || String(defaultCompetitor?.id ?? ''),
        )
        setSelectedModuleId(
          (current) => current || queryModuleId || String(defaultModule?.id ?? ''),
        )
      } catch {
        setError('Erro ao carregar filtros de conferência.')
      } finally {
        setLoadingFilters(false)
      }
    }

    loadFilters()
  }, [activeUserCompetitionId, queryCompetitorId, queryModuleId])

  const selectedCompetitor = useMemo(
    () =>
      competitors.find(
        (competitor) => String(competitor.id) === selectedCompetitorId,
      ),
    [competitors, selectedCompetitorId],
  )
  const filteredModules = useMemo(() => {
    if (!selectedCompetitor) {
      return modules
    }

    return modules.filter(
      (module) => module.competitionId === selectedCompetitor.competitionId,
    )
  }, [modules, selectedCompetitor])

  useEffect(() => {
    if (
      selectedModuleId &&
      filteredModules.length > 0 &&
      !filteredModules.some((module) => String(module.id) === selectedModuleId)
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedModuleId('')
    }
  }, [filteredModules, selectedModuleId])

  async function loadCheck(competitorId: string, moduleId: string) {
    setLoadingCheck(true)
    setError('')

    try {
      const response = await api.get<ModuleCheckResult>(
        `/checks/competitors/${competitorId}/modules/${moduleId}`,
      )

      setCheck(unwrapData(response))
    } catch {
      setError('Erro ao carregar conferência do módulo.')
      setCheck(null)
    } finally {
      setLoadingCheck(false)
    }
  }

  useEffect(() => {
    if (!selectedCompetitorId || !selectedModuleId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCheck(null)
      return
    }

    loadCheck(selectedCompetitorId, selectedModuleId)
  }, [selectedCompetitorId, selectedModuleId])

  async function setModuleLock(locked: boolean) {
    if (!selectedCompetitorId || !selectedModuleId) {
      return
    }

    if (!canManageModuleLocks) {
      setError('Ação não permitida para este perfil.')
      return
    }

    setLoadingCheck(true)
    setError('')

    try {
      await api.patch(
        `/locks/competitors/${selectedCompetitorId}/modules/${selectedModuleId}/${
          locked ? 'lock' : 'unlock'
        }`,
        {
          userId: activeUserId,
          userRole: activeUserRole,
        },
      )
      await loadCheck(selectedCompetitorId, selectedModuleId)
    } catch {
      setError(
        locked ? 'Erro ao bloquear módulo.' : 'Erro ao desbloquear módulo.',
      )
    } finally {
      setLoadingCheck(false)
    }
  }

  return (
    <section>
      <PageHeader
        title="Conferência"
        description="Revise pendências, divergências de julgamento e bloqueie notas finais por módulo."
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
              disabled={!selectedCompetitorId}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">Selecione</option>
              {filteredModules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.code} - {module.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {(loadingFilters || loadingCheck) && <Loading />}

      {!loadingFilters && !loadingCheck && !check && (
        <EmptyState
          title="Selecione os filtros"
          description="Escolha um competidor e um módulo para iniciar a conferência."
        />
      )}

      {!loadingCheck && check && (
        <div className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-blue-700">
                  {check.module.code} - {check.module.name}
                </p>
                <h2 className="text-xl font-semibold text-slate-950">
                  {check.competitor.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {check.competitor.state ?? '-'} | Posto{' '}
                  {check.competitor.workstation ?? '-'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!check.summary.canLockModule || !canManageModuleLocks}
                  onClick={() => setModuleLock(true)}
                  className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Bloquear módulo
                </button>
                <button
                  type="button"
                  disabled={!canManageModuleLocks}
                  onClick={() => setModuleLock(false)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Desbloquear módulo
                </button>
              </div>
            </div>
            {!canManageModuleLocks && (
              <p className="mt-3 text-sm text-amber-700">
                Seu perfil pode visualizar a conferência, mas não pode bloquear
                ou desbloquear módulo.
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <SummaryCard label="Total" value={String(check.summary.totalAspects)} />
            <SummaryCard label="Avaliados" value={String(check.summary.markedAspects)} />
            <SummaryCard label="Pendentes" value={String(check.summary.missingAspects)} />
            <SummaryCard
              label="Revisões"
              value={String(check.summary.judgementAspectsNeedingReview)}
            />
            <SummaryCard label="Bloqueadas" value={String(check.summary.lockedMarks)} />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Panel title="Pendências">
              {check.missing.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum aspecto pendente.</p>
              ) : (
                <div className="space-y-2">
                  {check.missing.map((item) => (
                    <div
                      key={`${item.subCriterionCode}-${item.aspectCode}`}
                      className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                    >
                      <strong>
                        {item.subCriterionCode} / {item.aspectCode}
                      </strong>
                      <p className="mt-1 text-xs text-amber-800">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Julgamentos para revisar">
              {check.needsReview.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Nenhum julgamento pendente de revisão.
                </p>
              ) : (
                <div className="space-y-2">
                  {check.needsReview.map((item) => (
                    <div
                      key={`${item.subCriterionCode}-${item.aspectCode}`}
                      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
                    >
                      <strong>
                        {item.subCriterionCode} / {item.aspectCode}
                      </strong>
                      <p className="mt-1 text-xs text-red-800">
                        Notas: {item.values.join(', ')} | Diferença:{' '}
                        {item.difference}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Subcritério</th>
                  <th className="px-4 py-3">Avaliados</th>
                  <th className="px-4 py-3">Bloqueadas</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {check.subCriteria.map((subCriterion) => (
                  <tr key={subCriterion.id}>
                    <td className="px-4 py-3 font-semibold text-slate-950">
                      {subCriterion.code}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {subCriterion.name}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {subCriterion.markedAspects}/{subCriterion.totalAspects}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {subCriterion.lockedMarks}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={subCriterion.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <strong className="mt-1 block text-xl font-semibold text-slate-950">
        {value}
      </strong>
    </div>
  )
}

function Panel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-950">{title}</h3>
      {children}
    </div>
  )
}

function StatusBadge({ status }: { status: keyof typeof statusLabels }) {
  const className =
    status === 'LOCKED'
      ? 'bg-amber-50 text-amber-700 ring-amber-200'
      : status === 'REVIEW_REQUIRED'
        ? 'bg-red-50 text-red-700 ring-red-200'
        : status === 'COMPLETE'
          ? 'bg-green-50 text-green-700 ring-green-200'
          : status === 'PARTIAL'
            ? 'bg-blue-50 text-blue-700 ring-blue-200'
            : 'bg-slate-100 text-slate-600 ring-slate-200'

  return (
    <span className={`rounded px-2 py-1 text-xs font-medium ring-1 ${className}`}>
      {statusLabels[status]}
    </span>
  )
}
