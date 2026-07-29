import { AlertTriangle, Eye, Lock, Unlock } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loading } from '../components/Loading'
import { PageHeader } from '../components/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { useActiveUser } from '../contexts/useActiveUser'
import { api, unwrapData } from '../lib/api'
import type {
  CollectiveModuleClosingResult,
  CollectiveModuleCompetitor,
  CollectiveModuleDetailsResult,
  CollectiveModuleInconsistency,
  CollectiveModuleStatus,
  CollectiveModuleStatusItem,
  Competition,
  InconsistencyType,
} from '../types'

const statusLabels: Record<CollectiveModuleStatus, string> = {
  NOT_STARTED: 'Não Iniciado',
  IN_PROGRESS: 'Em Andamento',
  HAS_INCONSISTENCIES: 'Com Inconsistências',
  READY_TO_LOCK: 'Pronto para Bloqueio',
  LOCKED: 'Bloqueado',
}

const inconsistencyLabels: Record<InconsistencyType, string> = {
  MISSING_MARK: 'Aspecto sem Nota',
  JUDGEMENT_DIVERGENCE: 'Divergência de Julgamento',
  INCOMPLETE_JUDGEMENT: 'Julgamento Incompleto',
  UNLOCKED_COMPLETE_MODULE: 'Módulo Completo Desbloqueado',
  PARTIAL_MODULE: 'Módulo Parcial',
  EMPTY_MODULE: 'Módulo Não Iniciado',
  LOCKED_WITH_PENDING: 'Bloqueado com Pendência',
  MISSING_COMPETITOR_MODULE: 'Módulo Esperado sem Avaliação',
  PERMISSION_OR_DATA_WARNING: 'Alerta Administrativo',
}

export function ModuleClosingPage() {
  const { activeUser, activeUserId, activeUserRole } = useActiveUser()
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [selectedCompetitionId, setSelectedCompetitionId] = useState('')
  const [data, setData] = useState<CollectiveModuleClosingResult | null>(null)
  const [details, setDetails] = useState<CollectiveModuleDetailsResult | null>(null)
  const [loadingCompetitions, setLoadingCompetitions] = useState(false)
  const [loadingModules, setLoadingModules] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [actionModuleId, setActionModuleId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const headers = useMemo(
    () => ({
      'x-user-id': String(activeUserId ?? ''),
      'x-user-role': activeUserRole ?? '',
      'x-user-name': activeUser?.name ?? '',
    }),
    [activeUser?.name, activeUserId, activeUserRole],
  )

  useEffect(() => {
    async function loadCompetitions() {
      setLoadingCompetitions(true)
      setError('')

      try {
        const response = await api.get<Competition[]>('/competitions')
        const loadedCompetitions = unwrapData(response)

        setCompetitions(loadedCompetitions)
        setSelectedCompetitionId((current) => current || String(loadedCompetitions[0]?.id ?? ''))
      } catch {
        setError('Erro ao carregar competições.')
      } finally {
        setLoadingCompetitions(false)
      }
    }

    loadCompetitions()
  }, [])

  async function loadModules(competitionId: string) {
    setLoadingModules(true)
    setError('')

    try {
      const response = await api.get<CollectiveModuleClosingResult>('/closing/modules', {
        params: { competitionId },
        headers,
      })

      setData(unwrapData(response))
    } catch {
      setError('Erro ao carregar fechamento por módulo.')
      setData(null)
    } finally {
      setLoadingModules(false)
    }
  }

  useEffect(() => {
    if (!selectedCompetitionId) {
      setData(null)
      return
    }

    loadModules(selectedCompetitionId)
  }, [selectedCompetitionId, headers])

  async function openDetails(moduleId: number) {
    if (!selectedCompetitionId) {
      return
    }

    setLoadingDetails(true)
    setError('')

    try {
      const response = await api.get<CollectiveModuleDetailsResult>(
        `/closing/modules/${moduleId}/details`,
        {
          params: { competitionId: selectedCompetitionId },
          headers,
        },
      )
      setDetails(unwrapData(response))
    } catch {
      setError('Erro ao carregar detalhes do módulo.')
    } finally {
      setLoadingDetails(false)
    }
  }

  async function setModuleCollectiveLock(module: CollectiveModuleStatusItem, locked: boolean) {
    if (!selectedCompetitionId) {
      return
    }

    const confirmed = window.confirm(
      locked
        ? `Tem certeza que deseja bloquear o ${module.code} - ${module.name} para todos os competidores? Após o bloqueio, as notas não poderão ser alteradas sem desbloqueio.`
        : `Tem certeza que deseja desbloquear o ${module.code} - ${module.name} para todos os competidores?`,
    )

    if (!confirmed) {
      return
    }

    setActionModuleId(module.id)
    setError('')

    try {
      await api.patch(
        `/closing/modules/${module.id}/${locked ? 'lock-all' : 'unlock-all'}`,
        {
          userId: activeUserId,
          userRole: activeUserRole,
          userName: activeUser?.name,
        },
        {
          params: { competitionId: selectedCompetitionId },
          headers,
        },
      )
      await loadModules(selectedCompetitionId)
      setDetails(null)
    } catch (errorResponse) {
      setError(getActionErrorMessage(errorResponse))
    } finally {
      setActionModuleId(null)
    }
  }

  const summary = useMemo(() => {
    const modules = data?.modules ?? []

    return {
      total: modules.length,
      ready: modules.filter((module) => module.status === 'READY_TO_LOCK').length,
      inconsistent: modules.filter((module) => module.status === 'HAS_INCONSISTENCIES').length,
      locked: modules.filter((module) => module.status === 'LOCKED').length,
    }
  }, [data])

  return (
    <section>
      <PageHeader
        title="Fechamento por Módulo"
        description="Bloqueie módulos coletivamente após validar todos os competidores."
      />

      <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block text-sm lg:max-w-md">
          <span className="mb-1 block font-medium text-slate-700">
            Competição
          </span>
          <Select
            value={selectedCompetitionId}
            disabled={loadingCompetitions}
            onChange={(event) => setSelectedCompetitionId(event.target.value)}
          >
            <option value="">Selecione...</option>
            {competitions.map((competition) => (
              <option key={competition.id} value={competition.id}>
                {competition.name}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {(loadingCompetitions || loadingModules) && <Loading />}

      {!loadingModules && data && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Total de Módulos" value={summary.total} />
            <SummaryCard label="Prontos para Bloqueio" value={summary.ready} tone="success" />
            <SummaryCard label="Com Inconsistências" value={summary.inconsistent} tone="danger" />
            <SummaryCard label="Bloqueados" value={summary.locked} />
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Módulo</th>
                    <th className="px-4 py-3">Competidores Prontos</th>
                    <th className="px-4 py-3">Pendências</th>
                    <th className="px-4 py-3">Revisões</th>
                    <th className="px-4 py-3">Notas Bloqueadas</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.modules.map((module) => (
                    <tr key={module.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <strong className="block text-slate-950">
                          {module.code} - {module.name}
                        </strong>
                        <span className="text-xs text-slate-500">
                          {module.markedAspects}/{module.totalAspects} aspectos avaliados
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {module.readyCompetitors}/{module.totalCompetitors} prontos
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {module.missingAspects} pendências
                        {module.incompleteJudgementCount > 0 && (
                          <span className="block text-xs text-amber-700">
                            {module.incompleteJudgementCount} julgamentos incompletos
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {module.judgementReviewCount} revisões
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {module.lockedMarks}/{module.lockedMarks + module.unlockedMarks}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={module.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            className="px-2 py-1.5 text-xs"
                            onClick={() => openDetails(module.id)}
                          >
                            <Eye size={14} />
                            Ver Detalhes
                          </Button>
                          {module.status === 'LOCKED' ? (
                            <Button
                              type="button"
                              variant="secondary"
                              className="px-2 py-1.5 text-xs"
                              disabled={actionModuleId === module.id}
                              onClick={() => setModuleCollectiveLock(module, false)}
                            >
                              <Unlock size={14} />
                              Desbloquear Todos
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              className="px-2 py-1.5 text-xs"
                              disabled={!module.canLockCollectively || actionModuleId === module.id}
                              onClick={() => setModuleCollectiveLock(module, true)}
                            >
                              <Lock size={14} />
                              Bloquear Todos
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {details && (
        <DetailsModal
          details={details}
          loading={loadingDetails}
          onClose={() => setDetails(null)}
        />
      )}
    </section>
  )
}

function SummaryCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: number
  tone?: 'default' | 'success' | 'danger'
}) {
  const className =
    tone === 'success'
      ? 'text-green-700'
      : tone === 'danger'
        ? 'text-red-700'
        : 'text-slate-950'

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <strong className={`mt-1 block text-xl font-semibold ${className}`}>
        {value}
      </strong>
    </div>
  )
}

function StatusBadge({ status }: { status: CollectiveModuleStatus }) {
  const variant =
    status === 'LOCKED' || status === 'READY_TO_LOCK'
      ? 'success'
      : status === 'HAS_INCONSISTENCIES'
        ? 'danger'
        : status === 'IN_PROGRESS'
          ? 'warning'
          : 'default'

  return <Badge variant={variant}>{statusLabels[status]}</Badge>
}

function DetailsModal({
  details,
  loading,
  onClose,
}: {
  details: CollectiveModuleDetailsResult
  loading: boolean
  onClose: () => void
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="flex max-h-[calc(100vh-24px)] w-[calc(100vw-24px)] max-w-[980px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              Detalhes do Módulo {details.module.code}
            </h2>
            <p className="text-sm text-slate-500">{details.module.name}</p>
          </div>
          <Button type="button" variant="ghost" className="px-2 py-1" onClick={onClose}>
            Fechar
          </Button>
        </div>

        <div className="overflow-y-auto px-4 py-4">
          {loading ? (
            <Loading />
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <CompactStat label="Competidores" value={details.summary.totalCompetitors} />
                <CompactStat label="Prontos" value={details.summary.readyCompetitors} />
                <CompactStat label="Pendentes" value={details.summary.pendingCompetitors} />
              </div>

              {details.competitors.map((competitor) => (
                <CompetitorDetail
                  key={competitor.id}
                  competitor={competitor}
                  moduleId={details.module.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CompactStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <strong className="text-lg text-slate-950">{value}</strong>
    </div>
  )
}

function CompetitorDetail({
  competitor,
  moduleId,
}: {
  competitor: CollectiveModuleCompetitor
  moduleId: number
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <strong className="text-sm text-slate-950">{competitor.name}</strong>
          <p className="text-xs text-slate-500">
            {competitor.state ?? '-'} · Posto {competitor.workstation ?? '-'}
          </p>
        </div>
        <StatusBadge status={competitor.status} />
      </div>

      <div className="mt-3 grid gap-2 text-xs text-slate-700 sm:grid-cols-5">
        <span>Pendências: {competitor.missingAspects}</span>
        <span>Revisões: {competitor.judgementReviewCount}</span>
        <span>Julg. incompletos: {competitor.incompleteJudgementCount}</span>
        <span>Bloqueadas: {competitor.lockedMarks}</span>
        <span>Desbloqueadas: {competitor.unlockedMarks}</span>
      </div>

      {competitor.inconsistencies.length > 0 && (
        <div className="mt-3 space-y-2">
          {competitor.inconsistencies.map((item, index) => (
            <InconsistencyRow
              key={`${item.type}-${item.aspectId ?? 'module'}-${index}`}
              item={item}
              competitorId={competitor.id}
              moduleId={moduleId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function InconsistencyRow({
  item,
  competitorId,
  moduleId,
}: {
  item: CollectiveModuleInconsistency
  competitorId: number
  moduleId: number
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <AlertTriangle size={14} />
          <strong>{inconsistencyLabels[item.type]}</strong>
          <span>{item.subCriterionCode ?? '-'} · {item.aspectCode ?? '-'}</span>
        </div>
        <p className="mt-1">{item.reason}</p>
      </div>
      {item.aspectId && item.subCriterionId && (
        <Link
          to={`/marking?competitorId=${competitorId}&moduleId=${moduleId}&subCriterionId=${item.subCriterionId}&aspectId=${item.aspectId}`}
          className="inline-flex shrink-0 items-center justify-center rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
        >
          Corrigir
        </Link>
      )}
    </div>
  )
}

function getActionErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'status' in error.response &&
    error.response.status === 409
  ) {
    return 'O módulo não pode ser bloqueado coletivamente porque existem inconsistências.'
  }

  return 'Erro ao executar fechamento coletivo do módulo.'
}
