import {
  AlertTriangle,
  Award,
  Eye,
  FolderTree,
  RotateCcw,
  Search,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loading } from '../components/Loading'
import { PageHeader } from '../components/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { useActiveUser } from '../contexts/useActiveUser'
import { api, unwrapData } from '../lib/api'
import { translateAspectType } from '../lib/labels'
import type {
  AdminInconsistenciesResult,
  Competition,
  Competitor,
  Expert,
  InconsistencyItem,
  InconsistencySeverity,
  InconsistencyType,
  Module,
} from '../types'

type Stats = {
  competitions: number
  competitors: number
  experts: number
  modules: number
}

type InconsistencyFilters = {
  competitorId: string
  moduleId: string
  type: string
  severity: string
  search: string
}

const emptyFilters: InconsistencyFilters = {
  competitorId: '',
  moduleId: '',
  type: '',
  severity: '',
  search: '',
}

const cards = [
  { key: 'competitions', label: 'Competições', icon: Award },
  { key: 'competitors', label: 'Competidores', icon: Users },
  { key: 'experts', label: 'Avaliadores', icon: UserCheck },
  { key: 'modules', label: 'Módulos', icon: FolderTree },
] as const

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

const severityLabels: Record<InconsistencySeverity, string> = {
  critical: 'Crítica',
  warning: 'Alerta',
  info: 'Informativa',
}

export function Dashboard() {
  const { activeUserId, activeUserRole, canManageModuleLocks } = useActiveUser()
  const [stats, setStats] = useState<Stats | null>(null)
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [selectedCompetitionId, setSelectedCompetitionId] = useState('')
  const [inconsistencies, setInconsistencies] =
    useState<AdminInconsistenciesResult | null>(null)
  const [selectedItem, setSelectedItem] = useState<InconsistencyItem | null>(null)
  const [filters, setFilters] = useState<InconsistencyFilters>(emptyFilters)
  const [loadingStats, setLoadingStats] = useState(false)
  const [loadingInconsistencies, setLoadingInconsistencies] = useState(false)
  const [dashboardError, setDashboardError] = useState('')
  const [inconsistenciesError, setInconsistenciesError] = useState('')
  const [reloadInconsistenciesKey, setReloadInconsistenciesKey] = useState(0)

  const canViewAdminPanel =
    activeUserRole === 'ADMIN' || activeUserRole === 'SUPERVISOR'

  useEffect(() => {
    async function loadStats() {
      setLoadingStats(true)
      setDashboardError('')

      try {
        const [competitionsResponse, competitors, experts, modules] =
          await Promise.all([
            api.get<Competition[]>('/competitions'),
            api.get<Competitor[]>('/competitors'),
            api.get<Expert[]>('/experts'),
            api.get<Module[]>('/modules'),
          ])
        const loadedCompetitions = unwrapData(competitionsResponse)

        setCompetitions(loadedCompetitions)
        setSelectedCompetitionId((current) => current || String(loadedCompetitions[0]?.id ?? ''))
        setStats({
          competitions: loadedCompetitions.length,
          competitors: unwrapData(competitors).length,
          experts: unwrapData(experts).length,
          modules: unwrapData(modules).length,
        })
      } catch {
        setDashboardError('Erro ao carregar dados do dashboard.')
      } finally {
        setLoadingStats(false)
      }
    }

    loadStats()
  }, [])

  useEffect(() => {
    if (!canViewAdminPanel || !selectedCompetitionId) {
      setInconsistencies(null)
      return
    }

    async function loadInconsistencies() {
      setLoadingInconsistencies(true)
      setInconsistenciesError('')

      try {
        const response = await api.get<AdminInconsistenciesResult>(
          '/admin/inconsistencies',
          {
            params: { competitionId: selectedCompetitionId },
            headers: {
              'x-user-id': String(activeUserId ?? ''),
              'x-user-role': activeUserRole ?? '',
            },
          },
        )
        setInconsistencies(unwrapData(response))
      } catch {
        setInconsistenciesError('Não foi possível carregar as inconsistências.')
        setInconsistencies(null)
      } finally {
        setLoadingInconsistencies(false)
      }
    }

    loadInconsistencies()
  }, [
    activeUserId,
    activeUserRole,
    canViewAdminPanel,
    selectedCompetitionId,
    reloadInconsistenciesKey,
  ])

  const filteredItems = useMemo(() => {
    const search = filters.search.trim().toLocaleLowerCase('pt-BR')

    return (inconsistencies?.items ?? []).filter((item) => {
      if (filters.competitorId && String(item.competitor.id) !== filters.competitorId) {
        return false
      }

      if (filters.moduleId && String(item.module.id) !== filters.moduleId) {
        return false
      }

      if (filters.type && item.type !== filters.type) {
        return false
      }

      if (filters.severity && item.severity !== filters.severity) {
        return false
      }

      if (!search) {
        return true
      }

      return [
        item.competitor.name,
        item.competitor.workstation,
        item.competitor.state,
        item.module.code,
        item.module.name,
        item.subCriterion?.code,
        item.subCriterion?.name,
        item.aspect?.code,
        item.aspect?.description,
        item.reason,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('pt-BR').includes(search))
    })
  }, [filters, inconsistencies])

  const competitors = useMemo(() => {
    const map = new Map<number, InconsistencyItem['competitor']>()

    for (const item of inconsistencies?.items ?? []) {
      map.set(item.competitor.id, item.competitor)
    }

    return Array.from(map.values())
  }, [inconsistencies])

  const modules = useMemo(() => {
    const map = new Map<number, InconsistencyItem['module']>()

    for (const item of inconsistencies?.items ?? []) {
      map.set(item.module.id, item.module)
    }

    return Array.from(map.values())
  }, [inconsistencies])

  const hasActiveFilters = Object.values(filters).some(Boolean)

  function clearFilters() {
    setFilters(emptyFilters)
  }

  return (
    <section>
      <PageHeader
        title="Dashboard"
        description="Visão geral operacional do ambiente de avaliação."
      />

      {dashboardError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {dashboardError}
        </div>
      )}

      {loadingStats || !stats ? (
        <Loading />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.key}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                  <Icon size={19} />
                </div>
                <p className="text-sm text-slate-500">{card.label}</p>
                <strong className="mt-1 block text-2xl font-semibold text-slate-950">
                  {stats[card.key]}
                </strong>
              </div>
            )
          })}
        </div>
      )}

      {canViewAdminPanel && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Inconsistências da Avaliação
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Localize pendências, divergências e ações recomendadas para fechamento.
              </p>
            </div>
            <label className="text-sm lg:min-w-80">
              <span className="mb-1 block font-medium text-slate-700">
                Competição
              </span>
              <Select
                value={selectedCompetitionId}
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

          {loadingInconsistencies && (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm">
              Carregando inconsistências...
            </div>
          )}

          {!loadingInconsistencies && inconsistenciesError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <p className="font-semibold">{inconsistenciesError}</p>
              <Button
                type="button"
                variant="secondary"
                className="mt-3 px-3 py-1.5 text-xs"
                onClick={() => setReloadInconsistenciesKey((current) => current + 1)}
              >
                Tentar Novamente
              </Button>
            </div>
          )}

          {!loadingInconsistencies && inconsistencies && (
            <>
              {inconsistencies.summary.critical > 0 && (
                <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  Existem inconsistências críticas que impedem o fechamento da avaliação.
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                <SummaryCard label="Total de Inconsistências" value={inconsistencies.summary.total} />
                <SummaryCard label="Críticas" value={inconsistencies.summary.critical} tone="critical" />
                <SummaryCard label="Alertas" value={inconsistencies.summary.warning} tone="warning" />
                <SummaryCard label="Informativas" value={inconsistencies.summary.info} />
                <SummaryCard label="Aspectos sem Nota" value={inconsistencies.summary.missingMarks} tone="critical" />
                <SummaryCard label="Julgamentos para Revisar" value={inconsistencies.summary.judgementDivergences} tone="warning" />
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
                  <label className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input
                      value={filters.search}
                      onChange={(event) =>
                        setFilters((current) => ({ ...current, search: event.target.value }))
                      }
                      placeholder="Buscar por competidor, posto, módulo ou aspecto"
                      className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <Select
                    value={filters.competitorId}
                    onChange={(event) =>
                      setFilters((current) => ({ ...current, competitorId: event.target.value }))
                    }
                  >
                    <option value="">Competidor</option>
                    {competitors.map((competitor) => (
                      <option key={competitor.id} value={competitor.id}>
                        {competitor.workstation ?? '-'} - {competitor.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={filters.moduleId}
                    onChange={(event) =>
                      setFilters((current) => ({ ...current, moduleId: event.target.value }))
                    }
                  >
                    <option value="">Módulo</option>
                    {modules.map((module) => (
                      <option key={module.id} value={module.id}>
                        {module.code} - {module.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={filters.type}
                    onChange={(event) =>
                      setFilters((current) => ({ ...current, type: event.target.value }))
                    }
                  >
                    <option value="">Tipo</option>
                    {Object.entries(inconsistencyLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={filters.severity}
                    onChange={(event) =>
                      setFilters((current) => ({ ...current, severity: event.target.value }))
                    }
                  >
                    <option value="">Severidade</option>
                    {Object.entries(severityLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 whitespace-nowrap px-3 text-xs"
                    disabled={!hasActiveFilters}
                    onClick={clearFilters}
                  >
                    <RotateCcw size={14} />
                    Limpar Filtros
                  </Button>
                </div>
              </div>

              {filteredItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-8 text-center shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Nenhuma Inconsistência Encontrada
                  </h3>
                  <p className="mx-auto mt-1 max-w-xl text-sm text-slate-500">
                    A avaliação não possui pendências para os filtros selecionados.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-4 px-3 py-1.5 text-xs"
                    disabled={!hasActiveFilters}
                    onClick={clearFilters}
                  >
                    Limpar Filtros
                  </Button>
                </div>
              ) : (
                <InconsistencyTable
                  items={filteredItems}
                  canManageModuleLocks={canManageModuleLocks}
                  onShowDetails={setSelectedItem}
                />
              )}
            </>
          )}
        </div>
      )}

      <InconsistencyDetailsModal
        item={selectedItem}
        canManageModuleLocks={canManageModuleLocks}
        onClose={() => setSelectedItem(null)}
      />
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
  tone?: 'default' | 'critical' | 'warning'
}) {
  const toneClass =
    tone === 'critical'
      ? 'text-red-700'
      : tone === 'warning'
        ? 'text-amber-700'
        : 'text-slate-950'

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <strong className={`mt-1 block text-xl font-semibold ${toneClass}`}>
        {value}
      </strong>
    </div>
  )
}

function InconsistencyTable({
  items,
  canManageModuleLocks,
  onShowDetails,
}: {
  items: InconsistencyItem[]
  canManageModuleLocks: boolean
  onShowDetails: (item: InconsistencyItem) => void
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="max-h-[620px] overflow-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="w-28 px-3 py-2.5">Severidade</th>
              <th className="w-52 px-3 py-2.5">Tipo</th>
              <th className="w-64 px-3 py-2.5">Localização</th>
              <th className="px-3 py-2.5">Motivo</th>
              <th className="w-56 px-3 py-2.5">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="align-top hover:bg-slate-50/70">
                <td className="px-3 py-3">
                  <SeverityBadge severity={item.severity} />
                </td>
                <td className="px-3 py-3">
                  <TypeBadge type={item.type} />
                </td>
                <td className="px-3 py-3">
                  <LocationCell item={item} />
                </td>
                <td className="px-3 py-3">
                  <p className="max-w-xl overflow-hidden text-sm leading-5 text-slate-700 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                    {summarizeReason(item)}
                  </p>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-2 py-1 text-xs"
                      onClick={() => onShowDetails(item)}
                    >
                      <Eye size={13} />
                      Detalhes
                    </Button>
                    <ActionLink item={item} label="Corrigir" target="marking" />
                    {canManageModuleLocks && (
                      <ActionLink item={item} label="Conferência" target="checks" />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LocationCell({ item }: { item: InconsistencyItem }) {
  return (
    <div className="space-y-0.5">
      <p className="font-medium text-slate-950">
        {item.competitor.name}
        <span className="font-normal text-slate-500">
          {' · '}
          {item.competitor.workstation ?? '-'}
        </span>
      </p>
      <p className="text-xs text-slate-600">
        {item.module.code} - {item.module.name}
      </p>
      <p className="text-xs text-slate-500">
        {item.subCriterion?.code ?? '-'}
        {' · '}
        {item.aspect?.code ?? '-'}
      </p>
    </div>
  )
}

function SeverityBadge({ severity }: { severity: InconsistencySeverity }) {
  const variant =
    severity === 'critical'
      ? 'danger'
      : severity === 'warning'
        ? 'warning'
        : 'default'

  return <Badge variant={variant}>{severityLabels[severity]}</Badge>
}

function TypeBadge({ type }: { type: InconsistencyType }) {
  return <Badge>{inconsistencyLabels[type]}</Badge>
}

function ActionLink({
  item,
  label,
  target,
}: {
  item: InconsistencyItem
  label: string
  target: 'marking' | 'checks'
}) {
  const href =
    target === 'checks'
      ? `/checks?competitorId=${item.competitor.id}&moduleId=${item.module.id}`
      : `/marking?competitorId=${item.competitor.id}&moduleId=${item.module.id}${item.subCriterion ? `&subCriterionId=${item.subCriterion.id}` : ''}${item.aspect ? `&aspectId=${item.aspect.id}` : ''}`

  return (
    <Link
      to={href}
      className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      {label}
    </Link>
  )
}

function InconsistencyDetailsModal({
  item,
  canManageModuleLocks,
  onClose,
}: {
  item: InconsistencyItem | null
  canManageModuleLocks: boolean
  onClose: () => void
}) {
  useEffect(() => {
    if (!item) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [item, onClose])

  if (!item) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="flex max-h-[calc(100vh-24px)] w-[calc(100vw-24px)] max-w-[900px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg sm:max-h-[calc(100vh-48px)] sm:w-[min(900px,calc(100vw-32px))]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-slate-950">
                Detalhes da Inconsistência
              </h2>
              <SeverityBadge severity={item.severity} />
            </div>
            <p className="text-xs text-slate-500">{inconsistencyLabels[item.type]}</p>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Fechar modal"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto px-4 py-4 text-sm">
          <DetailSection title="Resumo">
            <div className="grid gap-2 sm:grid-cols-2">
              <CompactInfo label="Tipo" value={inconsistencyLabels[item.type]} />
              <CompactInfo label="Severidade" value={severityLabels[item.severity]} />
            </div>
            <CompactText label="Motivo" value={item.reason} />
            <CompactText label="Ação Recomendada" value={item.recommendation} />
          </DetailSection>

          <DetailSection title="Localização">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <CompactInfo label="Competidor" value={item.competitor.name} />
              <CompactInfo label="Estado" value={item.competitor.state ?? '-'} />
              <CompactInfo label="Posto" value={item.competitor.workstation ?? '-'} />
              <CompactInfo label="Módulo" value={`${item.module.code} - ${item.module.name}`} />
              <CompactInfo
                label="Subcritério"
                value={item.subCriterion ? `${item.subCriterion.code} - ${item.subCriterion.name}` : '-'}
              />
              <CompactInfo label="Aspecto" value={item.aspect?.code ?? '-'} />
            </div>
          </DetailSection>

          <DetailSection title="Aspecto">
            {item.aspect ? (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  <CompactInfo label="Código" value={item.aspect.code} />
                  <CompactInfo label="Tipo" value={translateAspectType(item.aspect.type)} />
                </div>
                <CompactText label="Descrição" value={item.aspect.description} />
              </>
            ) : (
              <p className="text-sm text-slate-500">
                Esta inconsistência está relacionada ao módulo como um todo.
              </p>
            )}
          </DetailSection>

          <DetailSection title="Valores Lançados">
            {item.values.length > 0 ? (
              <div className="overflow-x-auto rounded-md border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Avaliador</th>
                      <th className="px-3 py-2">Nota</th>
                      <th className="px-3 py-2">Observação</th>
                      <th className="px-3 py-2">Bloqueada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {item.values.map((value) => (
                      <tr key={`${value.expertId}-${value.value}-${value.observation ?? ''}`}>
                        <td className="px-3 py-2">{value.expertName}</td>
                        <td className="px-3 py-2">{value.value}</td>
                        <td className="px-3 py-2">{value.observation ?? '-'}</td>
                        <td className="px-3 py-2">{value.locked ? 'Sim' : 'Não'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Não há notas lançadas para este aspecto.
              </p>
            )}
          </DetailSection>
        </div>

        <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3">
          <Button
            type="button"
            variant="secondary"
            className="px-3 py-1.5 text-xs"
            onClick={onClose}
          >
            Fechar
          </Button>
          <ActionLink item={item} label="Ir para Lançamento" target="marking" />
          {canManageModuleLocks && (
            <ActionLink item={item} label="Ir para Conferência" target="checks" />
          )}
        </div>
      </div>
    </div>
  )
}

function DetailSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function CompactInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  )
}

function CompactText({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <strong className="mb-0.5 block text-xs font-semibold uppercase text-slate-500">
        {label}
      </strong>
      <p className="text-sm leading-5 text-slate-700">{value}</p>
    </div>
  )
}

function summarizeReason(item: InconsistencyItem) {
  if (item.type === 'MISSING_MARK') {
    return 'O aspecto ainda não possui nota lançada.'
  }

  if (item.type === 'JUDGEMENT_DIVERGENCE') {
    return 'As notas de julgamento possuem diferença maior que 1.'
  }

  if (item.type === 'INCOMPLETE_JUDGEMENT') {
    return 'O julgamento possui menos de 3 notas lançadas.'
  }

  if (item.type === 'UNLOCKED_COMPLETE_MODULE') {
    return 'O módulo está completo, mas ainda possui notas desbloqueadas.'
  }

  if (item.type === 'PARTIAL_MODULE') {
    return 'O módulo foi iniciado, mas ainda não foi totalmente avaliado.'
  }

  if (item.type === 'EMPTY_MODULE') {
    return 'Nenhuma nota foi lançada para este competidor neste módulo.'
  }

  if (item.type === 'LOCKED_WITH_PENDING') {
    return 'Existem notas bloqueadas, mas o módulo ainda possui pendências.'
  }

  return item.reason
}
