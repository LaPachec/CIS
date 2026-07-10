import { useEffect, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { api, unwrapData } from '../lib/api'
import type { Competitor } from '../types'

const initialForm = {
  competitionId: '',
  name: '',
  state: '',
  workstation: '',
}

export function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')

  async function loadCompetitors() {
    const response = await api.get<Competitor[]>('/competitors')
    setCompetitors(unwrapData(response))
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCompetitors().catch(() => setError('Erro ao carregar competidores.'))
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    try {
      await api.post('/competitors', {
        ...form,
        competitionId: Number(form.competitionId),
      })
      setForm(initialForm)
      await loadCompetitors()
    } catch {
      setError('Erro ao cadastrar competidor.')
    }
  }

  return (
    <section>
      <PageHeader
        title="Competidores"
        description="Cadastre competidores e postos de trabalho para lançamento de notas."
      />
      {error && <ErrorMessage message={error} />}
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="mb-4 text-sm font-semibold text-slate-950">
            Novo competidor
          </h2>
          <Field
            label="competitionId"
            value={form.competitionId}
            onChange={(competitionId) =>
              setForm((state) => ({ ...state, competitionId }))
            }
            required
          />
          <Field
            label="Nome"
            value={form.name}
            onChange={(name) => setForm((state) => ({ ...state, name }))}
            required
          />
          <Field
            label="Estado"
            value={form.state}
            onChange={(state) => setForm((data) => ({ ...data, state }))}
          />
          <Field
            label="Posto"
            value={form.workstation}
            onChange={(workstation) =>
              setForm((state) => ({ ...state, workstation }))
            }
          />
          <button className="mt-2 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Cadastrar competidor
          </button>
        </form>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          {competitors.length === 0 ? (
            <EmptyState title="Nenhum competidor cadastrado" />
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Posto</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {competitors.map((competitor) => (
                  <tr key={competitor.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {competitor.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {competitor.state ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {competitor.workstation ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-400">Em breve</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
  required,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  return (
    <label className="mb-3 block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <input
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
