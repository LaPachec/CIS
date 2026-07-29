import { ChevronDown, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { api, unwrapData } from '../lib/api'
import type { AssessmentModule, Module } from '../types'

export function ModulesPage() {
  const [modules, setModules] = useState<Module[]>([])
  const [structure, setStructure] = useState<AssessmentModule | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get<Module[]>('/modules')
      .then((response) => setModules(unwrapData(response)))
      .catch(() => setError('Erro ao carregar módulos.'))
  }, [])

  async function loadStructure(moduleId: number) {
    setError('')
    try {
      const response = await api.get<AssessmentModule>(
        `/modules/${moduleId}/assessment-structure`,
      )
      setStructure(unwrapData(response))
      setExpanded({})
    } catch {
      setError('Erro ao carregar estrutura do módulo.')
    }
  }

  return (
    <section>
      <PageHeader
        title="Módulos"
        description="Consulte a estrutura importada da ficha CIS: critérios, subcritérios e aspectos."
      />
      {error && <ErrorMessage message={error} />}
      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          {modules.length === 0 ? (
            <EmptyState title="Nenhum módulo cadastrado" />
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Pontuação</th>
                  <th className="px-4 py-3">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {modules.map((module) => (
                  <tr key={module.id}>
                    <td className="px-4 py-3 font-semibold text-slate-950">
                      {module.code}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {module.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatPoints(module.totalPoints)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => loadStructure(module.id)}
                        className="rounded-md border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        Ver estrutura
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          {!structure ? (
            <EmptyState
              title="Selecione um módulo"
              description="A estrutura aparecerá aqui em formato hierárquico."
            />
          ) : (
            <div>
              <div className="mb-4 border-b border-slate-200 pb-4">
                <p className="text-xs font-semibold uppercase text-blue-700">
                  Módulo {structure.code}
                </p>
                <h2 className="text-lg font-semibold text-slate-950">
                  {structure.name}
                </h2>
              </div>
              <div className="space-y-3">
                {structure.criteria.map((criterion) => (
                  <div
                    key={criterion.id}
                    className="rounded-md border border-slate-200"
                  >
                    <button
                      onClick={() =>
                        setExpanded((state) => ({
                          ...state,
                          [criterion.code]: !state[criterion.code],
                        }))
                      }
                      className="flex w-full items-center justify-between px-4 py-3 text-left"
                    >
                      <span className="text-sm font-semibold text-slate-900">
                        {criterion.code} - {criterion.name}
                      </span>
                      {expanded[criterion.code] ? (
                        <ChevronDown size={18} />
                      ) : (
                        <ChevronRight size={18} />
                      )}
                    </button>
                    {expanded[criterion.code] && (
                      <div className="space-y-3 border-t border-slate-100 p-4">
                        {criterion.subCriteria?.map((subCriterion) => (
                          <div key={subCriterion.id}>
                            <h3 className="text-sm font-semibold text-slate-800">
                              {subCriterion.code} - {subCriterion.name}
                            </h3>
                            <div className="mt-2 space-y-2">
                              {subCriterion.aspects?.map((aspect) => (
                                <div
                                  key={aspect.id}
                                  className="rounded-md bg-slate-50 px-3 py-2 text-sm"
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <strong>{aspect.code}</strong>
                                    <span className="rounded bg-white px-2 py-0.5 text-xs text-slate-600">
                                      {aspect.type}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      {formatPoints(aspect.maxPoints)} pts
                                    </span>
                                  </div>
                                  <p className="mt-1 text-slate-700">
                                    {aspect.description}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function formatPoints(value: number | string) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return '0,00'
  }

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue)
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  )
}
