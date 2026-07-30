import {
  AlertTriangle,
  Award,
  Eye,
  FolderTree,
  RotateCcw,
  Search,
  UserCheck,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loading } from '../components/Loading'
import { PageHeader } from '../components/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Drawer } from '../components/ui/Drawer'
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

type QuickFilter = 'all' | 'critical' | 'review' | 'missing'

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

const severityWeight: Record<InconsistencySeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
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
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false)
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

    return (inconsistencies?.items ?? [])
      .filter((item) => {
        if (quickFilter === 'critical' && item.severity !== 'critical') {
          return false
        }

        if (
          quickFilter === 'review' &&
          item.type !== 'JUDGEMENT_DIVERGENCE' &&
          item.type !== 'INCOMPLETE_JUDGEMENT'
        ) {
          return false
        }

        if (quickFilter === 'missing' && item.type !== 'MISSING_MARK') {
          return false
        }

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
      .sort(
        (a, b) =>
          severityWeight[a.severity] - severityWeight[b.severity] ||
          a.module.code.localeCompare(b.module.code, 'pt-BR', { numeric: true }) ||
          (a.competitor.workstation ?? '').localeCompare(b.competitor.workstation ?? '', 'pt-BR', { numeric: true }) ||
          a.competitor.name.localeCompare(b.competitor.name, 'pt-BR'),
      )
  }, [filters, inconsistencies, quickFilter])

  const quickFilterCounts = useMemo(() => {
    const items = inconsistencies?.items ?? []

    return {
      all: items.length,
      critical: items.filter((item) => item.severity === 'critical').length,
      review: items.filter(
        (item) => item.type === 'JUDGEMENT_DIVERGENCE' || item.type === 'INCOMPLETE_JUDGEMENT',
      ).length,
      missing: items.filter((item) => item.type === 'MISSING_MARK').length,
    }
  }, [inconsistencies])

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
  const selectedItemIndex = selectedItem
    ? filteredItems.findIndex((item) => item.id === selectedItem.id)
    : -1

  function clearFilters() {
    setFilters(emptyFilters)
    setQuickFilter('all')
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
                className="rounded-lg border border-slate-200 bg-white p-4"
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
                Ações Necessárias
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Pendências e divergências ordenadas por criticidade para orientar o fechamento.
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
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
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
                Tentar novamente
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
                <SummaryCard label="Total" value={inconsistencies.summary.total} />
                <SummaryCard label="Críticas" value={inconsistencies.summary.critical} tone="critical" />
                <SummaryCard label="Alertas" value={inconsistencies.summary.warning} tone="warning" />
                <SummaryCard label="Informativas" value={inconsistencies.summary.info} />
                <SummaryCard label="Sem nota" value={inconsistencies.summary.missingMarks} tone="critical" />
                <SummaryCard label="Para revisar" value={inconsistencies.summary.judgementDivergences + inconsistencies.summary.incompleteJudgements} tone="warning" />
              </div>

              <div className="sticky top-0 z-20 rounded-lg border border-slate-200 bg-white p-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  <QuickFilterChip active={quickFilter === 'all'} label={`Todas (${quickFilterCounts.all})`} onClick={() => setQuickFilter('all')} />
                  <QuickFilterChip active={quickFilter === 'critical'} label={`Críticas (${quickFilterCounts.critical})`} onClick={() => setQuickFilter('critical')} />
                  <QuickFilterChip active={quickFilter === 'review'} label={`Para revisar (${quickFilterCounts.review})`} onClick={() => setQuickFilter('review')} />
                  <QuickFilterChip active={quickFilter === 'missing'} label={`Sem nota (${quickFilterCounts.missing})`} onClick={() => setQuickFilter('missing')} />
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
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
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 px-3 text-xs"
                    onClick={() => setAdvancedFiltersOpen((current) => !current)}
                  >
                    Mais filtros
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 px-3 text-xs"
                    disabled={!hasActiveFilters && quickFilter === 'all'}
                    onClick={clearFilters}
                  >
                    <RotateCcw size={14} />
                    Limpar
                  </Button>
                </div>
                {advancedFiltersOpen && (
                  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Select value={filters.competitorId} onChange={(event) => setFilters((current) => ({ ...current, competitorId: event.target.value }))}>
                      <option value="">Competidor</option>
                      {competitors.map((competitor) => (
                        <option key={competitor.id} value={competitor.id}>
                          {competitor.workstation ?? '-'} - {competitor.name}
                        </option>
                      ))}
                    </Select>
                    <Select value={filters.moduleId} onChange={(event) => setFilters((current) => ({ ...current, moduleId: event.target.value }))}>
                      <option value="">Módulo</option>
                      {modules.map((module) => (
                        <option key={module.id} value={module.id}>
                          {module.code} - {module.name}
                        </option>
                      ))}
                    </Select>
                    <Select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}>
                      <option value="">Tipo</option>
                      {Object.entries(inconsistencyLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                    <Select value={filters.severity} onChange={(event) => setFilters((current) => ({ ...current, severity: event.target.value }))}>
                      <option value="">Severidade</option>
                      {Object.entries(severityLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>

              {filteredItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-8 text-center">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Nenhuma inconsistência encontrada
                  </h3>
                  <p className="mx-auto mt-1 max-w-xl text-sm text-slate-500">
                    A avaliação não possui pendências para os filtros selecionados.
                  </p>
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

      <InconsistencyDetailsDrawer
        item={selectedItem}
        currentIndex={selectedItemIndex}
        totalItems={filteredItems.length}
        canManageModuleLocks={canManageModuleLocks}
        onClose={() => setSelectedItem(null)}
        onPrevious={() => {
          if (selectedItemIndex > 0) {
            setSelectedItem(filteredItems[selectedItemIndex - 1])
          }
        }}
        onNext={() => {
          if (selectedItemIndex >= 0 && selectedItemIndex < filteredItems.length - 1) {
            setSelectedItem(filteredItems[selectedItemIndex + 1])
          }
        }}
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
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <strong className={`mt-1 block text-xl font-semibold ${toneClass}`}>
        {value}
      </strong>
    </div>
  )
}

function QuickFilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'min-h-10 rounded-full border px-3 text-sm font-semibold transition',
        active
          ? 'border-blue-700 bg-blue-700 text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
      ].join(' ')}
    >
      {label}
    </button>
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
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="max-h-[620px] overflow-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="w-56 px-3 py-2.5">Situação</th>
              <th className="w-72 px-3 py-2.5">Competidor e módulo</th>
              <th className="px-3 py-2.5">Problema</th>
              <th className="w-64 px-3 py-2.5">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr
                key={item.id}
                className="cursor-pointer align-top hover:bg-slate-50/70"
                onClick={() => onShowDetails(item)}
              >
                <td className="px-3 py-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      size={18}
                      className={
                        item.severity === 'critical'
                          ? 'mt-0.5 text-red-600'
                          : item.severity === 'warning'
                            ? 'mt-0.5 text-amber-600'
                            : 'mt-0.5 text-slate-500'
                      }
                    />
                    <div className="space-y-1">
                      <SeverityBadge severity={item.severity} />
                      <TypeBadge type={item.type} />
                    </div>
                  </div>
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
                  <div className="flex flex-wrap gap-1.5" onClick={(event) => event.stopPropagation()}>
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-2 py-1 text-xs"
                      onClick={() => onShowDetails(item)}
                    >
                      <Eye size={13} />
                      Detalhes
                    </Button>
                    <ActionLink item={item} label="Corrigir agora" target="marking" />
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
      className="inline-flex min-h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      {label}
    </Link>
  )
}

function InconsistencyDetailsDrawer({
  item,
  currentIndex,
  totalItems,
  canManageModuleLocks,
  onClose,
  onPrevious,
  onNext,
}: {
  item: InconsistencyItem | null
  currentIndex: number
  totalItems: number
  canManageModuleLocks: boolean
  onClose: () => void
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <Drawer
      open={Boolean(item)}
      title={item ? inconsistencyLabels[item.type] : 'Detalhes'}
      description={item ? severityLabels[item.severity] : undefined}
      onClose={onClose}
      footer={
        item && (
          <div className="flex flex-wrap justify-between gap-2">
            <div className="flex gap-2">
              <Button type="button" variant="secondary" className="px-3 py-1.5 text-xs" disabled={currentIndex <= 0} onClick={onPrevious}>
                Anterior
              </Button>
              <Button type="button" variant="secondary" className="px-3 py-1.5 text-xs" disabled={currentIndex < 0 || currentIndex >= totalItems - 1} onClick={onNext}>
                Próxima
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionLink item={item} label="Ir para Correção" target="marking" />
              {canManageModuleLocks && (
                <ActionLink item={item} label="Ir para Conferência" target="checks" />
              )}
            </div>
          </div>
        )
      }
    >
      {item && (
        <div className="space-y-3 text-sm">
          <DetailSection title="Trilha de localização">
            <div className="grid gap-2 sm:grid-cols-2">
              <CompactInfo label="Competidor" value={item.competitor.name} />
              <CompactInfo label="Posto" value={item.competitor.workstation ?? '-'} />
              <CompactInfo label="Módulo" value={`${item.module.code} - ${item.module.name}`} />
              <CompactInfo
                label="Subcritério"
                value={item.subCriterion ? `${item.subCriterion.code} - ${item.subCriterion.name}` : '-'}
              />
              <CompactInfo label="Aspecto" value={item.aspect?.code ?? '-'} />
              <CompactInfo label="Tipo" value={item.aspect ? translateAspectType(item.aspect.type) : '-'} />
            </div>
          </DetailSection>

          <DetailSection title="O que aconteceu">
            <CompactText label="Situação" value={summarizeReason(item)} />
          </DetailSection>

          <DetailSection title="Por que aconteceu">
            <CompactText label="Motivo" value={item.reason} />
          </DetailSection>

          <DetailSection title="Como resolver">
            <CompactText label="Ação recomendada" value={item.recommendation} />
          </DetailSection>

          <DetailSection title="Aspecto">
            {item.aspect ? (
              <CompactText label="Descrição" value={item.aspect.description} />
            ) : (
              <p className="text-sm text-slate-500">
                Esta inconsistência está relacionada ao módulo como um todo.
              </p>
            )}
          </DetailSection>

          <DetailSection title="Valores lançados">
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
      )}
    </Drawer>
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
    return item.reason
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
