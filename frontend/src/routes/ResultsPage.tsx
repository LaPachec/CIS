import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { Loading } from '../components/Loading'
import { PageHeader } from '../components/PageHeader'
import { api, unwrapData } from '../lib/api'
import type { Competition, RankingResult } from '../types'

export function ResultsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [selectedCompetitionId, setSelectedCompetitionId] = useState('')
  const [ranking, setRanking] = useState<RankingResult[]>([])
  const [expandedCompetitorId, setExpandedCompetitorId] = useState<number | null>(null)
  const [loadingFilters, setLoadingFilters] = useState(false)
  const [loadingRanking, setLoadingRanking] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadFilters() {
      setLoadingFilters(true)
      setError('')

      try {
        const response = await api.get<Competition[]>('/competitions')

        setCompetitions(unwrapData(response))
      } catch {
        setError('Erro ao carregar competições.')
      } finally {
        setLoadingFilters(false)
      }
    }

    loadFilters()
  }, [])

  useEffect(() => {
    if (!selectedCompetitionId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRanking([])
      setExpandedCompetitorId(null)
      return
    }

    async function loadRanking() {
      setLoadingRanking(true)
      setError('')

      try {
        const response = await api.get<RankingResult[]>('/results/ranking', {
          params: {
            competitionId: selectedCompetitionId,
          },
        })

        setRanking(unwrapData(response))
        setExpandedCompetitorId(null)
      } catch {
        setError('Erro ao calcular ranking. Verifique a competição selecionada.')
        setRanking([])
      } finally {
        setLoadingRanking(false)
      }
    }

    loadRanking()
  }, [selectedCompetitionId])

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

  return (
    <section>
      <PageHeader
        title="Resultados"
        description="Acompanhe o ranking consolidado e os totais por módulo."
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

      {loadingFilters && <Loading />}

      {!loadingFilters && (
        <div className="mb-5 grid gap-4 md:grid-cols-4">
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
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
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
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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

function roundScore(value: number) {
  return Math.round(value * 100) / 100
}

function formatPoints(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPercentage(value: number) {
  return `${formatPoints(value)}%`
}
