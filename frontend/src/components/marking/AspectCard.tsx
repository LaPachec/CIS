import { Lock } from 'lucide-react'
import { translateAspectType } from '../../lib/labels'
import type { Aspect, Mark } from '../../types'
import { Badge } from '../ui/Badge'
import { AutoSaveTextarea } from './AutoSaveTextarea'
import { SaveStatus } from './SaveStatus'
import { formatPoints, type SaveStatusValue } from './marking-utils'

type AspectCardProps = {
  aspect: Aspect
  mark?: Mark
  optimisticValue: number | null
  status: SaveStatusValue
  highlighted?: boolean
  onValueChange: (value: number) => void
  onObservationChange: (observation: string) => void
}

export function AspectCard({
  aspect,
  mark,
  optimisticValue,
  status,
  highlighted = false,
  onValueChange,
  onObservationChange,
}: AspectCardProps) {
  const maxPoints = Number(aspect.maxPoints)
  const selectedValue = optimisticValue ?? (mark ? Number(mark.value) : null)
  const locked = Boolean(mark?.locked)
  const options =
    aspect.type === 'MEASUREMENT'
      ? [
          { label: 'Não Atende', value: 0 },
          { label: 'Atende', value: maxPoints },
        ]
      : [0, 1, 2, 3].map((value) => ({ label: String(value), value }))

  return (
    <article
      id={`aspect-${aspect.id}`}
      className={[
        'rounded-lg border bg-white p-4',
        highlighted
          ? 'border-blue-300 ring-2 ring-blue-100'
          : 'border-slate-200',
      ].join(' ')}
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <strong className="text-sm text-slate-950">{aspect.code}</strong>
            <Badge variant={aspect.type === 'MEASUREMENT' ? 'objective' : 'judgement'}>
              {translateAspectType(aspect.type)}
            </Badge>
            <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
              {formatPoints(Number(aspect.maxPoints))} pts
            </span>
            {aspect.wsos && (
              <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                WSOS {aspect.wsos}
              </span>
            )}
            {locked && (
              <Badge variant="warning">
                <Lock size={12} />
                Nota Bloqueada para Edição
              </Badge>
            )}
          </div>

          <div>
            <strong className="mb-1 block text-xs uppercase text-slate-500">
              Descrição de Avaliação
            </strong>
            <p className="text-sm leading-6 text-slate-800">{aspect.description}</p>
          </div>

          {aspect.extraDescription && (
            <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200">
              <strong className="mb-1 block text-xs uppercase text-slate-500">
                Complemento de Avaliação
              </strong>
              {aspect.extraDescription}
            </div>
          )}

          {aspect.type === 'MEASUREMENT' && aspect.requirement && (
            <p className="mt-2 text-xs font-medium text-slate-600">
              Requisito Objetivo: {aspect.requirement}
            </p>
          )}

          {aspect.type === 'JUDGEMENT' && <DescriptorList aspect={aspect} />}

          {mark && (
            <p className="mt-3 text-xs text-slate-500">
              Valor Salvo: {formatPoints(Number(mark.value))}
              {mark.observation ? ` | Observação: ${mark.observation}` : ''}
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
                        ? 'border-blue-700 bg-blue-700 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
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
            key={`${mark?.id ?? aspect.id}-${mark?.observation ?? ''}`}
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
        <div key={score} className="rounded-md bg-slate-50 p-2 ring-1 ring-slate-200">
          <strong className="mr-1 text-slate-900">{score}:</strong>
          {description}
        </div>
      ))}
    </div>
  )
}
