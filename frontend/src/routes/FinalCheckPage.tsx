import {
  AlertTriangle,
  CheckCircle,
  Download,
  Eye,
  FileWarning,
  Lock,
  Unlock,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { Loading } from '../components/Loading'
import { PageHeader } from '../components/PageHeader'
import { useActiveUser } from '../contexts/useActiveUser'
import { api, unwrapData } from '../lib/api'
import { downloadFile } from '../lib/downloadFile'
import { translateStatus } from '../lib/labels'
import type {
  CheckSubCriterionStatus,
  Competition,
  FinalCheckCompetitor,
  FinalCheckModule,
  FinalCheckResult,
  ModuleCheckResult,
} from '../types'

const statusLabels: Record<CheckSubCriterionStatus, string> = {
  EMPTY: 'Não iniciado',
  PARTIAL: 'Parcial',
  COMPLETE: 'Completo',
  REVIEW_REQUIRED: 'Revisar',
  LOCKED: 'Bloqueado',
}

export function FinalCheckPage() {
  const { activeUserId, activeUserRole, canManageModuleLocks } = useActiveUser()
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [selectedCompetitionId, setSelectedCompetitionId] = useState('')
  const [data, setData] = useState<FinalCheckResult | null>(null)
  const [expandedCompetitorId, setExpandedCompetitorId] = useState<number | null>(null)
  const [detailsKey, setDetailsKey] = useState('')
  const [details, setDetails] = useState<ModuleCheckResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get<Competition[]>('/competitions')
      .then((response) => setCompetitions(unwrapData(response)))
      .catch(() => setError('Erro ao carregar competições.'))
  }, [])

  async function loadFinalCheck(competitionId: string) {
    setLoading(true)
    setError('')

    try {
      const response = await api.get<FinalCheckResult>('/checks/final', {
        params: { competitionId },
      })
      setData(unwrapData(response))
      setExpandedCompetitorId(null)
      setDetailsKey('')
      setDetails(null)
    } catch {
      setError('Erro ao carregar conferência final.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedCompetitionId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(null)
      return
    }

    loadFinalCheck(selectedCompetitionId)
  }, [selectedCompetitionId])

  const selectedCompetitionName =
    competitions.find((competition) => String(competition.id) === selectedCompetitionId)
      ?.name ?? data?.competition.name

  function getExportHeaders() {
    return {
      'x-user-id': String(activeUserId ?? ''),
      'x-user-role': activeUserRole ?? '',
    }
  }

  async function exportFile(url: string, filename: string) {
    if (!selectedCompetitionId) {
      setError('Selecione uma competição antes de exportar.')
      return
    }

    if (!canManageModuleLocks) {
      setError('Você não tem permissão para exportar resultados.')
      return
    }

    setError('')

    try {
      await downloadFile(url, filename, getExportHeaders())
    } catch (errorResponse) {
      setError(getExportErrorMessage(errorResponse))
    }
  }

  async function exportClosingPdf() {
    if (!selectedCompetitionId) {
      setError('Selecione uma competição antes de gerar o PDF.')
      return
    }

    if (!canManageModuleLocks) {
      setError('Você não tem permissão para gerar o PDF oficial.')
      return
    }

    setError('')

    try {
      await downloadFile(
        `/exports/pdf/closing?competitionId=${selectedCompetitionId}`,
        `fechamento-simulado-${selectedCompetitionId}.pdf`,
        getExportHeaders(),
      )
    } catch (errorResponse) {
      setError(getPdfExportErrorMessage(errorResponse))
    }
  }

  async function setModuleLock(
    competitorId: number,
    moduleId: number,
    locked: boolean,
  ) {
    if (!selectedCompetitionId) {
      return
    }

    if (!canManageModuleLocks) {
      setError('Ação não permitida para este perfil.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await api.patch(
        `/locks/competitors/${competitorId}/modules/${moduleId}/${
          locked ? 'lock' : 'unlock'
        }`,
        {
          userId: activeUserId,
          userRole: activeUserRole,
        },
      )
      await loadFinalCheck(selectedCompetitionId)
    } catch {
      setError(
        locked ? 'Erro ao bloquear módulo.' : 'Erro ao desbloquear módulo.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadModuleDetails(competitorId: number, moduleId: number) {
    const key = `${competitorId}:${moduleId}`

    if (detailsKey === key) {
      setDetailsKey('')
      setDetails(null)
      return
    }

    setDetailsLoading(true)
    setError('')

    try {
      const response = await api.get<ModuleCheckResult>(
        `/checks/competitors/${competitorId}/modules/${moduleId}`,
      )
      setDetailsKey(key)
      setDetails(unwrapData(response))
    } catch {
      setError('Erro ao carregar pendências do módulo.')
    } finally {
      setDetailsLoading(false)
    }
  }

  function handleCloseEvaluation() {
    if (data?.summary.canCloseCompetition) {
      window.alert(
        'A avaliação está pronta para fechamento. Próximo passo: exportar resultados.',
      )
      return
    }

    window.alert('Ainda existem pendências. Corrija os itens antes de fechar.')
  }

  return (
    <section>
      <PageHeader
        title="Conferência Final"
        description="Valide a competição inteira antes do fechamento e exportação dos resultados."
      />

      <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Competição
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
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            {canManageModuleLocks && (
              <>
                <Link
                  to="/module-closing"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Lock size={16} />
                  Fechamento por Módulo
                </Link>
                <button
                  type="button"
                  disabled={!data}
                  onClick={() =>
                    exportFile(
                      `/exports/ranking?competitionId=${selectedCompetitionId}`,
                      `ranking-simulado-${selectedCompetitionId}.xlsx`,
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={16} />
                  Exportar Ranking
                </button>
                <button
                  type="button"
                  disabled={!data}
                  onClick={() =>
                    exportFile(
                      `/exports/competition?competitionId=${selectedCompetitionId}`,
                      `relatorio-completo-competicao-${selectedCompetitionId}.xlsx`,
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={16} />
                  Relatório Completo
                </button>
                <button
                  type="button"
                  disabled={!data}
                  onClick={exportClosingPdf}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={16} />
                  Exportar PDF Oficial
                </button>
              </>
            )}
            <button
              type="button"
              disabled={!data}
              onClick={handleCloseEvaluation}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Fechar avaliação
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && <Loading />}

      {!loading && !data && (
        <EmptyState
          title="Selecione uma competição"
          description="A visão final aparecerá após a seleção."
        />
      )}

      {!loading && data && (
        <div className="space-y-5">
          <FinalStatusBar
            canClose={data.summary.canCloseCompetition}
            reviewCount={data.summary.judgementReviewCount}
            missingAspects={data.summary.missingAspects}
            competitionName={selectedCompetitionName ?? data.competition.name}
          />

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <SummaryCard label="Competidores" value={data.summary.competitorsCount} />
            <SummaryCard label="Módulos previstos" value={data.summary.totalExpectedModules} />
            <SummaryCard label="Módulos completos" value={data.summary.completeModules} />
            <SummaryCard label="Módulos bloqueados" value={data.summary.lockedModules} />
            <SummaryCard label="Aspectos pendentes" value={data.summary.missingAspects} />
            <SummaryCard label="Revisões" value={data.summary.judgementReviewCount} />
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Competidor</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Posto</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">%</th>
                    <th className="px-4 py-3">Módulos completos</th>
                    <th className="px-4 py-3">Pendências</th>
                    <th className="px-4 py-3">Revisões</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.competitors.map((competitor) => (
                    <CompetitorRows
                      key={competitor.id}
                      competitor={competitor}
                      expanded={expandedCompetitorId === competitor.id}
                      detailsKey={detailsKey}
                      details={details}
                      detailsLoading={detailsLoading}
                      canManageModuleLocks={canManageModuleLocks}
                      onToggle={() =>
                        setExpandedCompetitorId((current) =>
                          current === competitor.id ? null : competitor.id,
                        )
                      }
                      onLock={(moduleId) =>
                        setModuleLock(competitor.id, moduleId, true)
                      }
                      onUnlock={(moduleId) =>
                        setModuleLock(competitor.id, moduleId, false)
                      }
                      onLoadDetails={(moduleId) =>
                        loadModuleDetails(competitor.id, moduleId)
                      }
                      onExport={() =>
                        exportFile(
                          `/exports/competitors/${competitor.id}?competitionId=${selectedCompetitionId}`,
                          `relatorio-competidor-${competitor.id}.xlsx`,
                        )
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function CompetitorRows({
  competitor,
  expanded,
  detailsKey,
  details,
  detailsLoading,
  canManageModuleLocks,
  onToggle,
  onLock,
  onUnlock,
  onLoadDetails,
  onExport,
}: {
  competitor: FinalCheckCompetitor
  expanded: boolean
  detailsKey: string
  details: ModuleCheckResult | null
  detailsLoading: boolean
  canManageModuleLocks: boolean
  onToggle: () => void
  onLock: (moduleId: number) => void
  onUnlock: (moduleId: number) => void
  onLoadDetails: (moduleId: number) => void
  onExport: () => void
}) {
  return (
    <>
      <tr
        className="cursor-pointer hover:bg-slate-50"
        onClick={onToggle}
      >
        <td className="px-4 py-3 font-semibold text-slate-950">
          {competitor.name}
        </td>
        <td className="px-4 py-3 text-slate-600">{competitor.state ?? '-'}</td>
        <td className="px-4 py-3 text-slate-600">
          {competitor.workstation ?? '-'}
        </td>
        <td className="px-4 py-3 font-semibold text-slate-900">
          {formatPoints(competitor.summary.score)}/
          {formatPoints(competitor.summary.maxPoints)}
        </td>
        <td className="px-4 py-3 text-slate-700">
          {formatPoints(competitor.summary.percentage)}%
        </td>
        <td className="px-4 py-3 text-slate-700">
          {competitor.summary.completeModules}/
          {competitor.summary.completeModules + competitor.summary.incompleteModules}
        </td>
        <td className="px-4 py-3 text-slate-700">
          {competitor.summary.missingAspects}
        </td>
        <td className="px-4 py-3 text-slate-700">
          {competitor.summary.judgementReviewCount}
        </td>
        <td className="px-4 py-3">
          <span
            className={[
              'rounded px-2 py-1 text-xs font-medium ring-1',
              competitor.summary.status === 'READY'
                ? 'bg-green-50 text-green-700 ring-green-200'
                : 'bg-amber-50 text-amber-700 ring-amber-200',
            ].join(' ')}
          >
            {competitor.summary.status === 'READY' ? 'Pronto' : 'Pendente'}
          </span>
        </td>
        <td className="px-4 py-3">
          {canManageModuleLocks ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onExport()
              }}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download size={14} />
              Exportar
            </button>
          ) : (
            <span className="text-xs text-slate-400">-</span>
          )}
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={10} className="bg-slate-50 px-4 py-4">
            <div className="space-y-3">
              {competitor.modules.map((module) => {
                const moduleDetailsKey = `${competitor.id}:${module.id}`

                return (
                  <div
                    key={module.id}
                    className="rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <ModuleRow
                      module={module}
                      canManageModuleLocks={canManageModuleLocks}
                      onLock={() => onLock(module.id)}
                      onUnlock={() => onUnlock(module.id)}
                      onLoadDetails={() => onLoadDetails(module.id)}
                    />
                    {detailsKey === moduleDetailsKey && (
                      <ModuleDetails details={details} loading={detailsLoading} />
                    )}
                  </div>
                )
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function ModuleRow({
  module,
  canManageModuleLocks,
  onLock,
  onUnlock,
  onLoadDetails,
}: {
  module: FinalCheckModule
  canManageModuleLocks: boolean
  onLock: () => void
  onUnlock: () => void
  onLoadDetails: () => void
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-[80px_1fr_120px_90px_140px_120px_140px] lg:items-center">
      <div className="font-semibold text-slate-950">{module.code}</div>
      <div>
        <p className="font-medium text-slate-900">{module.name}</p>
        <p className="text-xs text-slate-500">
          Aspectos: {module.markedAspects}/{module.totalAspects} | Pendências:{' '}
          {module.missingAspects} | Revisões: {module.judgementReviewCount}
        </p>
      </div>
      <div className="text-sm font-semibold text-slate-900">
        {formatPoints(module.score)}/{formatPoints(module.maxPoints)}
      </div>
      <div className="text-sm text-slate-700">
        {formatPoints(module.percentage)}%
      </div>
      <div className="text-sm text-slate-700">
        {module.lockedMarks} bloqueadas
      </div>
      <StatusBadge status={module.status} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onLoadDetails}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Eye size={14} />
          Ver pendências
        </button>
        {canManageModuleLocks && module.status !== 'LOCKED' && (
          <button
            type="button"
            disabled={!module.canLockModule}
            onClick={onLock}
            className="inline-flex items-center gap-1 rounded-md border border-amber-300 px-2 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Lock size={14} />
            Bloquear
          </button>
        )}
        {canManageModuleLocks && module.status === 'LOCKED' && (
          <button
            type="button"
            onClick={onUnlock}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Unlock size={14} />
            Desbloquear
          </button>
        )}
      </div>
    </div>
  )
}

function ModuleDetails({
  details,
  loading,
}: {
  details: ModuleCheckResult | null
  loading: boolean
}) {
  if (loading) {
    return <div className="mt-4"><Loading /></div>
  }

  if (!details) {
    return null
  }

  return (
    <div className="mt-4 grid gap-4 xl:grid-cols-3">
      <DetailPanel title="Aspectos sem nota">
        {details.missing.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma pendência.</p>
        ) : (
          details.missing.map((item) => (
            <p key={`${item.subCriterionCode}-${item.aspectCode}`} className="mb-2 text-xs text-slate-700">
              <strong>{item.subCriterionCode} / {item.aspectCode}</strong>: {item.description}
            </p>
          ))
        )}
      </DetailPanel>
      <DetailPanel title="Julgamentos divergentes">
        {details.needsReview.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum item para revisar.</p>
        ) : (
          details.needsReview.map((item) => (
            <p key={`${item.subCriterionCode}-${item.aspectCode}`} className="mb-2 text-xs text-red-800">
              <strong>{item.subCriterionCode} / {item.aspectCode}</strong>:
              {' '}notas {item.values.join(', ')} | diferença {item.difference}
            </p>
          ))
        )}
      </DetailPanel>
      <DetailPanel title="Subcritérios">
        <div className="space-y-2">
          {details.subCriteria.map((subCriterion) => (
            <div key={subCriterion.id} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-700">
                <strong>{subCriterion.code}</strong> - {subCriterion.name}
                {' '}({subCriterion.markedAspects}/{subCriterion.totalAspects})
              </span>
              <StatusBadge status={subCriterion.status} />
            </div>
          ))}
        </div>
      </DetailPanel>
    </div>
  )
}

function FinalStatusBar({
  canClose,
  reviewCount,
  missingAspects,
  competitionName,
}: {
  canClose: boolean
  reviewCount: number
  missingAspects: number
  competitionName: string
}) {
  const hasReview = reviewCount > 0
  const className = canClose
    ? 'border-green-200 bg-green-50 text-green-800'
    : hasReview
      ? 'border-red-200 bg-red-50 text-red-800'
      : 'border-amber-200 bg-amber-50 text-amber-800'
  const Icon = canClose ? CheckCircle : hasReview ? AlertTriangle : FileWarning

  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${className}`}>
      <Icon className="mt-0.5 shrink-0" size={20} />
      <div>
        <strong className="block text-sm">
          {canClose ? 'Pronta para fechamento' : 'Pendências encontradas'}
        </strong>
        <p className="text-sm">
          {competitionName}: {missingAspects} aspectos pendentes e {reviewCount}{' '}
          julgamentos para revisar.
        </p>
      </div>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <strong className="mt-1 block text-xl font-semibold text-slate-950">
        {value}
      </strong>
    </div>
  )
}

function DetailPanel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">
        {title}
      </h4>
      {children}
    </div>
  )
}

function StatusBadge({ status }: { status: CheckSubCriterionStatus }) {
  const className =
    status === 'LOCKED'
      ? 'bg-green-50 text-green-700 ring-green-200'
      : status === 'REVIEW_REQUIRED'
        ? 'bg-red-50 text-red-700 ring-red-200'
        : status === 'COMPLETE'
          ? 'bg-blue-50 text-blue-700 ring-blue-200'
          : status === 'PARTIAL'
            ? 'bg-amber-50 text-amber-700 ring-amber-200'
            : 'bg-slate-100 text-slate-600 ring-slate-200'

  return (
    <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ring-1 ${className}`}>
      {translateStatus(status) || statusLabels[status]}
    </span>
  )
}

function getExportErrorMessage(error: unknown) {
  const status =
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'status' in error.response
      ? error.response.status
      : undefined

  if (status === 403) {
    return 'Você não tem permissão para exportar resultados.'
  }

  if (status === 400) {
    return 'Selecione uma competição antes de exportar.'
  }

  if (status === 404) {
    return 'Dados não encontrados para exportação.'
  }

  return 'Erro ao gerar exportação.'
}

function getPdfExportErrorMessage(error: unknown) {
  const status =
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'status' in error.response
      ? error.response.status
      : undefined

  if (status === 403) {
    return 'Você não tem permissão para gerar o PDF oficial.'
  }

  if (status === 400) {
    return 'Selecione uma competição antes de gerar o PDF.'
  }

  if (status === 404) {
    return 'Dados da competição não encontrados.'
  }

  return 'Erro ao gerar PDF oficial.'
}

function formatPoints(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
  }).format(value)
}
