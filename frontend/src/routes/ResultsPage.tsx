import {
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { Download } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Radar } from 'react-chartjs-2'
import { EmptyState } from '../components/EmptyState'
import { Loading } from '../components/Loading'
import { PageHeader } from '../components/PageHeader'
import { useActiveUser } from '../contexts/useActiveUser'
import { api, unwrapData } from '../lib/api'
import type {
  Competition,
  Competitor,
  RankingResult,
  WsosPerformanceResult,
} from '../types'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

type ResultsTab = 'ranking' | 'wsos'

export function ResultsPage() {
  const { activeUser, activeUserCompetitionId, activeUserId, activeUserRole } =
    useActiveUser()
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [selectedCompetitionId, setSelectedCompetitionId] = useState('')
  const [selectedWsosCompetitorId, setSelectedWsosCompetitorId] = useState('')
  const [wsosPerformance, setWsosPerformance] = useState<WsosPerformanceResult | null>(null)
  const [ranking, setRanking] = useState<RankingResult[]>([])
  const [activeTab, setActiveTab] = useState<ResultsTab>('ranking')
  const [expandedCompetitorId, setExpandedCompetitorId] = useState<number | null>(null)
  const [loadingFilters, setLoadingFilters] = useState(false)
  const [loadingRanking, setLoadingRanking] = useState(false)
  const [loadingWsos, setLoadingWsos] = useState(false)
  const [error, setError] = useState('')
  const [wsosError, setWsosError] = useState('')
  const chartRef = useRef<ChartJS<'radar', number[], string> | null>(null)

  const headers = useMemo(
    () => ({
      'x-user-id': String(activeUserId ?? ''),
      'x-user-role': activeUserRole ?? '',
      'x-user-name': activeUser?.name ?? '',
    }),
    [activeUser?.name, activeUserId, activeUserRole],
  )

  useEffect(() => {
    async function loadFilters() {
      setLoadingFilters(true)
      setError('')

      try {
        const competitionsResponse = await api.get<Competition[]>('/competitions')

        const loadedCompetitions = unwrapData(competitionsResponse)
        setCompetitions(loadedCompetitions)
        setSelectedCompetitionId((current) => {
          if (current) {
            return current
          }

          const activeCompetition = loadedCompetitions.find(
            (competition) => competition.id === activeUserCompetitionId,
          )

          return String(activeCompetition?.id ?? '')
        })
      } catch {
        setError('Erro ao carregar filtros de resultados.')
      } finally {
        setLoadingFilters(false)
      }
    }

    loadFilters()
  }, [activeUserCompetitionId])

  useEffect(() => {
    if (!selectedCompetitionId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRanking([])
      setCompetitors([])
      setExpandedCompetitorId(null)
      setSelectedWsosCompetitorId('')
      setWsosPerformance(null)
      return
    }

    async function loadCompetitionData() {
      setLoadingRanking(true)
      setError('')

      try {
        const [rankingResponse, competitorsResponse] = await Promise.all([
          api.get<RankingResult[]>('/results/ranking', {
            params: {
              competitionId: selectedCompetitionId,
            },
            headers,
          }),
          api.get<Competitor[]>('/competitors', {
            params: {
              competitionId: selectedCompetitionId,
            },
          }),
        ])

        setRanking(unwrapData(rankingResponse))
        setCompetitors(unwrapData(competitorsResponse))
        setExpandedCompetitorId(null)
      } catch {
        setError('Erro ao calcular ranking. Verifique a competição selecionada.')
        setRanking([])
        setCompetitors([])
      } finally {
        setLoadingRanking(false)
      }
    }

    loadCompetitionData()
  }, [headers, selectedCompetitionId])

  const filteredCompetitors = useMemo(() => competitors, [competitors])

  useEffect(() => {
    if (filteredCompetitors.length === 1) {
      setSelectedWsosCompetitorId(String(filteredCompetitors[0].id))
    } else {
      setSelectedWsosCompetitorId('')
    }

    setWsosPerformance(null)
    setWsosError('')
  }, [filteredCompetitors])

  const summary = useMemo(() => {
    const totalCompetitors = ranking.length
    const scores = ranking.map((result) => result.score)
    const average =
      totalCompetitors > 0
        ? scores.reduce((total, score) => total + score, 0) / totalCompetitors
        : 0

    return {
      totalCompetitors,
      average: roundScore(average),
      highest: roundScore(Math.max(0, ...scores)),
      lowest: roundScore(totalCompetitors > 0 ? Math.min(...scores) : 0),
    }
  }, [ranking])

  async function generateWsosPerformance() {
    setWsosError('')
    setWsosPerformance(null)

    if (!selectedCompetitionId) {
      setWsosError('Selecione uma competição.')
      return
    }

    if (!selectedWsosCompetitorId) {
      setWsosError('Selecione um competidor.')
      return
    }

    setLoadingWsos(true)

    try {
      const response = await api.get<WsosPerformanceResult>('/reports/wsos-performance', {
        params: {
          competitionId: selectedCompetitionId,
          competitorId: selectedWsosCompetitorId,
        },
        headers,
      })

      setWsosPerformance(unwrapData(response))
    } catch (errorResponse) {
      setWsosError(getApiErrorMessage(errorResponse) || 'Erro ao gerar gráfico por WSOS.')
    } finally {
      setLoadingWsos(false)
    }
  }

  function downloadWsosChart() {
    const chart = chartRef.current

    if (!chart || !wsosPerformance) {
      return
    }

    const link = document.createElement('a')
    link.href = chart.toBase64Image('image/png', 1)
    link.download = `grafico-wsos-${sanitizeFilename(wsosPerformance.competitor.name)}-${sanitizeFilename(wsosPerformance.competition.name)}.png`
    link.click()
  }

  function handleWsosCompetitorChange(competitorId: string) {
    setSelectedWsosCompetitorId(competitorId)
    setWsosPerformance(null)
    setWsosError('')
  }

  return (
    <section className="min-w-0">
      <PageHeader
        title="Resultados"
        description="Acompanhe o ranking consolidado, os totais por módulo e relatórios por WSOS."
      />

      <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Competição
          </span>
          <select
            value={selectedCompetitionId}
            onChange={(event) => setSelectedCompetitionId(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:max-w-xl"
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
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <ResultsTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'wsos' && (
        <WsosPerformanceSection
        selectedCompetitionId={selectedCompetitionId}
        selectedCompetitorId={selectedWsosCompetitorId}
        competitors={filteredCompetitors}
        loading={loadingWsos}
        error={wsosError}
        data={wsosPerformance}
        chartRef={chartRef}
        onCompetitorChange={handleWsosCompetitorChange}
        onGenerate={generateWsosPerformance}
        onDownload={downloadWsosChart}
        />
      )}

      {activeTab === 'ranking' && (
        <div className="min-w-0">
          {loadingFilters && <Loading />}

      {!loadingFilters && (
        <div className="mb-5 grid min-w-0 gap-4 md:grid-cols-4">
          <SummaryCard label="Competidores" value={String(summary.totalCompetitors)} />
          <SummaryCard label="Média geral" value={formatPoints(summary.average)} />
          <SummaryCard label="Maior nota" value={formatPoints(summary.highest)} />
          <SummaryCard label="Menor nota" value={formatPoints(summary.lowest)} />
        </div>
      )}

      {loadingRanking && <Loading />}

      {!loadingRanking && !selectedCompetitionId && (
        <EmptyState
          title="Selecione uma competição"
          description="Escolha uma competição para calcular o ranking consolidado."
        />
      )}

      {!loadingRanking && selectedCompetitionId && ranking.length === 0 && (
        <EmptyState
          title="Nenhum resultado encontrado"
          description="Cadastre competidores, módulos e notas para visualizar o ranking."
        />
      )}

      {!loadingRanking && ranking.length > 0 && (
        <div className="w-full min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="w-full min-w-0 overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Posição</th>
                  <th className="px-4 py-3">Competidor</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Posto</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">%</th>
                  <th className="px-4 py-3">Módulos</th>
                  <th className="px-4 py-3">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ranking.map((result) => (
                  <ResultsRow
                    key={result.competitor.id}
                    result={result}
                    expanded={expandedCompetitorId === result.competitor.id}
                    onToggle={() =>
                      setExpandedCompetitorId((current) =>
                        current === result.competitor.id ? null : result.competitor.id,
                      )
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </div>
      )}
    </section>
  )
}

function ResultsTabs({
  activeTab,
  onChange,
}: {
  activeTab: ResultsTab
  onChange: (tab: ResultsTab) => void
}) {
  const tabs: Array<{ id: ResultsTab; label: string }> = [
    { id: 'ranking', label: 'Ranking' },
    { id: 'wsos', label: 'Desempenho WSOS' },
  ]

  return (
    <div
      role="tablist"
      aria-label="SeÃ§Ãµes de resultados"
      className="mb-5 flex w-full min-w-0 gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
          className={[
            'shrink-0 rounded-md px-4 py-2 text-sm font-semibold transition',
            activeTab === tab.id
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
          ].join(' ')}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function WsosPerformanceSection({
  selectedCompetitionId,
  selectedCompetitorId,
  competitors,
  loading,
  error,
  data,
  chartRef,
  onCompetitorChange,
  onGenerate,
  onDownload,
}: {
  selectedCompetitionId: string
  selectedCompetitorId: string
  competitors: Competitor[]
  loading: boolean
  error: string
  data: WsosPerformanceResult | null
  chartRef: React.MutableRefObject<ChartJS<'radar', number[], string> | null>
  onCompetitorChange: (value: string) => void
  onGenerate: () => void
  onDownload: () => void
}) {
  const hasCompetition = Boolean(selectedCompetitionId)
  const hasNoCompetitors = hasCompetition && competitors.length === 0
  const hasSingleCompetitor = hasCompetition && competitors.length === 1
  const hasMultipleCompetitors = hasCompetition && competitors.length > 1
  const canGenerate = hasCompetition && Boolean(selectedCompetitorId) && !loading
  const canDownload = Boolean(data && data.items.length > 0)
  const chartData = useMemo<ChartData<'radar', number[], string>>(() => {
    const items = data?.items ?? []

    return {
      labels: items.map((item) => truncateLabel(item.wsos)),
      datasets: [
        {
          label: data?.competitor.name ?? 'Competidor',
          data: items.map((item) => clampPercentage(item.percentage)),
          backgroundColor: 'rgba(37, 99, 235, 0.18)',
          borderColor: '#2563eb',
          borderWidth: 2,
          pointBackgroundColor: '#2563eb',
          pointBorderColor: '#ffffff',
          pointHoverBackgroundColor: '#1d4ed8',
          pointRadius: 4,
          fill: true,
        },
      ],
    }
  }, [data])

  const chartOptions = useMemo<ChartOptions<'radar'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20,
            backdropColor: 'transparent',
          },
          grid: {
            color: '#cbd5e1',
          },
          angleLines: {
            color: '#cbd5e1',
          },
          pointLabels: {
            color: '#334155',
            font: {
              size: 11,
              weight: 600,
            },
          },
        },
      },
      plugins: {
        legend: {
          position: 'bottom',
        },
        tooltip: {
          callbacks: {
            title(context) {
              const index = context[0]?.dataIndex ?? 0
              return data?.items[index]?.wsos ?? ''
            },
            label(context) {
              const item = data?.items[context.dataIndex]

              if (!item) {
                return ''
              }

              return [
                `Pontuação: ${formatPoints(item.score)} / ${formatPoints(item.maxPoints)}`,
                `Percentual: ${formatPercentage(item.percentage)}`,
              ]
            },
          },
        },
      },
    }),
    [data],
  )

  return (
    <section className="mb-5 w-full min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div>
          <h2 className="text-base font-semibold text-slate-950">
            Gráfico de Desempenho por WSOS
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Visualize o desempenho do competidor nas seções do WSOS da Skill 17.
          </p>
        </div>
        <button
          type="button"
          disabled={!canDownload}
          onClick={onDownload}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={16} />
          Baixar Gráfico como PNG
        </button>
      </div>

      <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Competidor</span>
          <select
            value={selectedCompetitorId}
            disabled={!selectedCompetitionId || competitors.length <= 1 || loading}
            onChange={(event) => onCompetitorChange(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            {!selectedCompetitionId && <option value="">Selecione uma competição</option>}
            {hasNoCompetitors && <option value="">Nenhum competidor cadastrado</option>}
            {hasMultipleCompetitors && <option value="">Selecione um competidor</option>}
            {competitors.map((competitor) => (
              <option key={competitor.id} value={competitor.id}>
                {competitor.workstation ? `${competitor.workstation} - ` : ''}
                {competitor.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!canGenerate}
          onClick={onGenerate}
          className="self-end rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Gerando...' : 'Gerar Gráfico'}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!selectedCompetitionId && (
        <p className="mt-4 text-sm text-slate-500">
          Selecione uma competição acima para escolher o competidor.
        </p>
      )}

      {selectedCompetitionId && competitors.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">
          Esta competição ainda não possui competidores cadastrados.
        </p>
      )}

      {hasSingleCompetitor && (
        <p className="mt-4 text-sm text-blue-700">
          Competidor selecionado automaticamente, pois esta competição possui apenas um competidor.
        </p>
      )}

      {hasMultipleCompetitors && !selectedCompetitorId && (
        <p className="mt-4 text-sm text-slate-500">
          Selecione um competidor para gerar o gráfico.
        </p>
      )}

      {loading && <Loading />}

      {!loading && data && data.items.length === 0 && (
        <EmptyState
          title="Nenhum WSOS encontrado para esta competição"
          description="A estrutura importada não possui aspectos com WSOS para compor o gráfico."
        />
      )}

      {!loading && data && data.items.length > 0 && (
        <div className="mt-5 min-w-0">
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Os dados podem mudar até o fechamento da competição.
          </div>
          <div className="w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 text-center">
              <h3 className="text-xl font-semibold text-slate-950">
                Gráfico de Desempenho
              </h3>
              <p className="text-sm text-slate-600">
                {data.competitor.name}
                {data.competitor.workstation ? ` - ${data.competitor.workstation}` : ''}
              </p>
            </div>
            <div className="mx-auto h-[320px] w-full max-w-full min-w-0 sm:h-[360px] lg:h-[420px] lg:max-w-3xl">
              <Radar ref={chartRef} data={chartData} options={chartOptions} />
            </div>
          </div>

          <div className="mt-4 w-full min-w-0 rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-950">
              Barras de desempenho por WSOS
            </h3>
            <div className="mt-4 space-y-3">
              {data.items.map((item) => {
                const percentage = clampPercentage(item.percentage)

                return (
                  <div key={item.wsos} className="min-w-0">
                    <div className="mb-1 flex min-w-0 items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-medium text-slate-700">
                        {item.wsos}
                      </span>
                      <span className="shrink-0 font-semibold text-slate-950">
                        {formatPercentage(percentage)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full bg-blue-600"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-4 w-full min-w-0 overflow-hidden rounded-lg border border-slate-200">
            <div className="w-full min-w-0 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">WSOS</th>
                  <th className="px-4 py-3">Pontuação Obtida</th>
                  <th className="px-4 py-3">Pontuação Máxima</th>
                  <th className="px-4 py-3">Desempenho</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {data.items.map((item) => (
                  <tr key={item.wsos}>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.wsos}</td>
                    <td className="px-4 py-3 text-slate-700">{formatPoints(item.score)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatPoints(item.maxPoints)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-950">
                      {formatPercentage(clampPercentage(item.percentage))}
                    </td>
                  </tr>
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

function ResultsRow({
  result,
  expanded,
  onToggle,
}: {
  result: RankingResult
  expanded: boolean
  onToggle: () => void
}) {
  const missingAspects = result.modules.flatMap((moduleResult) =>
    moduleResult.criteria.flatMap((criterion) =>
      criterion.subCriteria.flatMap((subCriterion) =>
        subCriterion.aspects
          .filter((aspect) => !aspect.isMarked)
          .map((aspect) => ({
            moduleCode: moduleResult.module.code,
            subCriterionCode: subCriterion.code,
            aspectCode: aspect.code,
            description: aspect.description,
          })),
      ),
    ),
  )
  const reviewAspects = result.modules.flatMap((moduleResult) =>
    moduleResult.criteria.flatMap((criterion) =>
      criterion.subCriteria.flatMap((subCriterion) =>
        subCriterion.aspects
          .filter((aspect) => aspect.needsReview)
          .map((aspect) => ({
            moduleCode: moduleResult.module.code,
            subCriterionCode: subCriterion.code,
            aspect,
          })),
      ),
    ),
  )

  return (
    <>
      <tr>
        <td className="px-4 py-3 font-semibold text-slate-950">
          {result.position}º
        </td>
        <td className="px-4 py-3 font-medium text-slate-900">
          {result.competitor.name}
        </td>
        <td className="px-4 py-3 text-slate-600">
          {result.competitor.state ?? '-'}
        </td>
        <td className="px-4 py-3 text-slate-600">
          {result.competitor.workstation ?? '-'}
        </td>
        <td className="px-4 py-3 font-semibold text-slate-950">
          {formatPoints(result.score)}/{formatPoints(result.maxPoints)}
        </td>
        <td className="px-4 py-3 text-slate-700">
          {formatPercentage(result.percentage)}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {result.modules.map((moduleResult) => (
              <span
                key={moduleResult.module.id}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700"
              >
                {moduleResult.module.code}: {formatPoints(moduleResult.score)}/
                {formatPoints(moduleResult.maxPoints)}
              </span>
            ))}
          </div>
        </td>
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={onToggle}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-700"
          >
            {expanded ? 'Ocultar' : 'Ver detalhes'}
          </button>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={8} className="bg-slate-50 px-4 py-4">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-950">
                  Resultado por módulo e subcritério
                </h3>
                <div className="space-y-4">
                  {result.modules.map((moduleResult) => (
                    <div key={moduleResult.module.id}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <strong className="text-sm text-slate-900">
                          {moduleResult.module.code} - {moduleResult.module.name}
                        </strong>
                        <span className="text-sm font-semibold text-slate-700">
                          {formatPoints(moduleResult.score)}/
                          {formatPoints(moduleResult.maxPoints)}
                        </span>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {moduleResult.criteria.flatMap((criterion) =>
                          criterion.subCriteria.map((subCriterion) => (
                            <div
                              key={subCriterion.id}
                              className="rounded-md border border-slate-100 px-3 py-2 text-xs text-slate-700"
                            >
                              <span className="font-semibold">
                                {subCriterion.code}
                              </span>{' '}
                              {subCriterion.name}
                              <strong className="mt-1 block text-slate-950">
                                {formatPoints(subCriterion.score)}/
                                {formatPoints(subCriterion.maxPoints)}
                              </strong>
                            </div>
                          )),
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Panel title="Aspectos com revisão">
                  {reviewAspects.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Nenhum julgamento com diferença maior que 1.
                    </p>
                  ) : (
                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                      {reviewAspects.map(({ moduleCode, subCriterionCode, aspect }) => (
                        <div
                          key={`${moduleCode}-${subCriterionCode}-${aspect.id}`}
                          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900"
                        >
                          <strong>
                            {moduleCode} / {subCriterionCode} / {aspect.code}
                          </strong>
                          <p className="mt-1">
                            Média {formatPoints(aspect.judgementAverage ?? 0)} |
                            Diferença {formatPoints(aspect.judgementDifference ?? 0)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel title="Aspectos não avaliados">
                  {missingAspects.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Todos os aspectos têm pelo menos uma nota.
                    </p>
                  ) : (
                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                      {missingAspects.map((aspect) => (
                        <div
                          key={`${aspect.moduleCode}-${aspect.subCriterionCode}-${aspect.aspectCode}`}
                          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                        >
                          <strong>
                            {aspect.moduleCode} / {aspect.subCriterionCode} /{' '}
                            {aspect.aspectCode}
                          </strong>
                          <p className="mt-1 text-amber-800">
                            {aspect.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
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
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-950">{title}</h3>
      {children}
    </div>
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

function roundScore(value: number) {
  return Math.round(value * 100) / 100
}

function formatPoints(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPercentage(value: number) {
  return `${formatPoints(value)}%`
}

function clampPercentage(value: number) {
  return Math.min(100, Math.max(0, value))
}

function truncateLabel(value: string) {
  return value.length > 30 ? `${value.slice(0, 27)}...` : value
}

function sanitizeFilename(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}
