import { useEffect, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { api, unwrapData } from '../lib/api'
import {
  getCachedCompetitions,
  setCachedCompetitions,
} from '../lib/competitions-cache'
import type { Competition } from '../types'

const initialForm = {
  name: '',
  location: '',
  startDate: '',
  endDate: '',
}

export function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')

  async function loadCompetitions() {
    const loadedCompetitions = await getCachedCompetitions({ force: true })

    setCompetitions(loadedCompetitions)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCompetitions().catch(() => setError('Erro ao carregar competições.'))
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    try {
      await api.post('/competitions', form)
      setForm(initialForm)
      const response = await api.get<Competition[]>('/competitions')
      const loadedCompetitions = unwrapData(response)

      setCachedCompetitions(loadedCompetitions)
      setCompetitions(loadedCompetitions)
    } catch {
      setError('Erro ao cadastrar competição.')
    }
  }

  return (
    <section>
      <PageHeader
        title="Competições"
        description="Cadastre e acompanhe os simulados disponíveis no ambiente local."
      />

      {error && <ErrorMessage message={error} />}

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="mb-4 text-sm font-semibold text-slate-950">
            Nova competição
          </h2>
          <Field
            label="Nome"
            value={form.name}
            onChange={(name) => setForm((state) => ({ ...state, name }))}
            required
          />
          <Field
            label="Local"
            value={form.location}
            onChange={(location) =>
              setForm((state) => ({ ...state, location }))
            }
          />
          <Field
            label="Data inicial"
            type="date"
            value={form.startDate}
            onChange={(startDate) =>
              setForm((state) => ({ ...state, startDate }))
            }
            required
          />
          <Field
            label="Data final"
            type="date"
            value={form.endDate}
            onChange={(endDate) =>
              setForm((state) => ({ ...state, endDate }))
            }
            required
          />
          <button className="mt-2 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Cadastrar competição
          </button>
        </form>

        <div className="w-full min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {competitions.length === 0 ? (
            <EmptyState title="Nenhuma competição cadastrada" />
          ) : (
            <div className="w-full min-w-0 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Local</th>
                  <th className="px-4 py-3">Período</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {competitions.map((competition) => (
                  <tr key={competition.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {competition.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {competition.location ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(competition.startDate)} até{' '}
                      {formatDate(competition.endDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <label className="mb-3 block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  )
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value))
}
