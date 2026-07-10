import { Award, FolderTree, UserCheck, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Loading } from '../components/Loading'
import { PageHeader } from '../components/PageHeader'
import { api, unwrapData } from '../lib/api'
import type { Competition, Competitor, Expert, Module } from '../types'

type Stats = {
  competitions: number
  competitors: number
  experts: number
  modules: number
}

const cards = [
  { key: 'competitions', label: 'Competições', icon: Award },
  { key: 'competitors', label: 'Competidores', icon: Users },
  { key: 'experts', label: 'Avaliadores', icon: UserCheck },
  { key: 'modules', label: 'Módulos', icon: FolderTree },
] as const

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadStats() {
      try {
        const [competitions, competitors, experts, modules] =
          await Promise.all([
            api.get<Competition[]>('/competitions'),
            api.get<Competitor[]>('/competitors'),
            api.get<Expert[]>('/experts'),
            api.get<Module[]>('/modules'),
          ])

        setStats({
          competitions: unwrapData(competitions).length,
          competitors: unwrapData(competitors).length,
          experts: unwrapData(experts).length,
          modules: unwrapData(modules).length,
        })
      } catch {
        setError('Erro ao carregar dados do dashboard.')
      }
    }

    loadStats()
  }, [])

  return (
    <section>
      <PageHeader
        title="Dashboard"
        description="Visão geral do ambiente local de simulação e correção."
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!stats ? (
        <Loading />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.key}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                  <Icon size={20} />
                </div>
                <p className="text-sm text-slate-500">{card.label}</p>
                <strong className="mt-1 block text-3xl font-semibold text-slate-950">
                  {stats[card.key]}
                </strong>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
