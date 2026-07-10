import { Lock } from 'lucide-react'
import type { Aspect, Mark } from '../../types'
import { AutoSaveTextarea } from './AutoSaveTextarea'
import { SaveStatus } from './SaveStatus'
import type { SaveStatusValue } from './marking-utils'

type AspectCardProps = {
  aspect: Aspect
  mark?: Mark
  optimisticValue: number | null
  status: SaveStatusValue
  onValueChange: (value: number) => void
  onObservationChange: (observation: string) => void
}

export function AspectCard({
  aspect,
  mark,
  optimisticValue,
  status,
  onValueChange,
  onObservationChange,
}: AspectCardProps) {
  const maxPoints = Number(aspect.maxPoints)
  const selectedValue = optimisticValue ?? (mark ? Number(mark.value) : null)
  const locked = Boolean(mark?.locked)
  const options =
    aspect.type === 'MEASUREMENT'
      ? [
          { label: 'Não atende', value: 0 },
          { label: 'Atende', value: maxPoints },
        ]
      : [0, 1, 2, 3].map((value) => ({ label: String(value), value }))

  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <strong className="text-sm text-slate-950">{aspect.code}</strong>
            <span className="rounded bg-white px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
              {aspect.type}
            </span>
            <span className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
              {aspect.maxPoints} pts
            </span>
            {aspect.wsos && (
              <span className="rounded bg-slate-200 px-2 py-1 text-xs text-slate-700">
                WSOS {aspect.wsos}
              </span>
            )}
            {locked && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                <Lock size={12} />
                Nota bloqueada para edição.
              </span>
            )}
          </div>

          <p className="text-sm text-slate-800">{aspect.description}</p>

          {aspect.extraDescription && (
            <div className="mt-3 rounded-md bg-white p-3 text-sm text-slate-700 ring-1 ring-slate-200">
              <strong className="mb-1 block text-xs uppercase text-slate-500">
                Descrição de avaliação
              </strong>
              {aspect.extraDescription}
            </div>
          )}

          {aspect.type === 'MEASUREMENT' && aspect.requirement && (
            <p className="mt-2 text-xs font-medium text-slate-600">
              Requisito objetivo: {aspect.requirement}
            </p>
          )}

          {aspect.type === 'JUDGEMENT' && <DescriptorList aspect={aspect} />}

          {mark && (
            <p className="mt-3 text-xs text-slate-500">
              Valor salvo: {mark.value}
              {mark.observation ? ` | Obs: ${mark.observation}` : ''}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {options.map((option) => {
                const selected = Number(selectedValue) === Number(option.value)

                return (
                  <button
                    key={`${aspect.id}-${option.label}`}
                    type="button"
                    disabled={locked}
                    onClick={() => onValueChange(option.value)}
                    className={[
                      'rounded-md border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
                      selected
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100',
                    ].join(' ')}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
            <SaveStatus status={status} />
          </div>

          <AutoSaveTextarea
            value={mark?.observation ?? ''}
            disabled={locked}
            onAutoSave={onObservationChange}
          />
        </div>
      </div>
    </article>
  )
}

function DescriptorList({ aspect }: { aspect: Aspect }) {
  const descriptors = [
    ['0', aspect.descriptor0],
    ['1', aspect.descriptor1],
    ['2', aspect.descriptor2],
    ['3', aspect.descriptor3],
  ].filter(([, description]) => Boolean(description))

  if (descriptors.length === 0) {
    return null
  }

  return (
    <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
      {descriptors.map(([score, description]) => (
        <div key={score} className="rounded-md bg-white p-2 ring-1 ring-slate-200">
          <strong className="mr-1 text-slate-900">{score}:</strong>
          {description}
        </div>
      ))}
    </div>
  )
}
