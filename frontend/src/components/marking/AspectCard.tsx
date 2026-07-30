import { Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
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
  const isMeasurement = aspect.type === 'MEASUREMENT'
  const isReduction =
    isMeasurement &&
    selectedValue !== null &&
    selectedValue > 0 &&
    selectedValue < maxPoints
  const [showReductionInput, setShowReductionInput] = useState(false)
  const [reductionValue, setReductionValue] = useState('')
  const [reductionError, setReductionError] = useState('')

  useEffect(() => {
    if (isReduction) {
      setReductionValue(String(selectedValue).replace('.', ','))
    }
  }, [isReduction, selectedValue])

  function saveReduction() {
    const normalizedValue = reductionValue.trim().replace(',', '.')

    if (!normalizedValue) {
      setReductionError('Informe a pontuação obtida.')
      return
    }

    const numericValue = Number(normalizedValue)

    if (!Number.isFinite(numericValue)) {
      setReductionError('Informe a pontuação obtida.')
      return
    }

    if (numericValue < 0) {
      setReductionError('A pontuação não pode ser menor que zero.')
      return
    }

    if (numericValue > maxPoints) {
      setReductionError('A pontuação não pode ser maior que a pontuação máxima do aspecto.')
      return
    }

    setReductionError('')
    setShowReductionInput(false)
    onValueChange(numericValue)
  }

  function openReductionInput() {
    if (locked) {
      return
    }

    setReductionError('')
    setReductionValue(
      selectedValue !== null && selectedValue > 0 && selectedValue < maxPoints
        ? String(selectedValue).replace('.', ',')
        : '',
    )
    setShowReductionInput(true)
  }

  function cancelReduction() {
    setReductionError('')
    setShowReductionInput(false)
    setReductionValue(isReduction ? String(selectedValue).replace('.', ',') : '')
  }

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

          {isReduction && (
            <p className="mt-2 text-xs font-semibold text-amber-700">
              Obtido {formatPoints(selectedValue)} de {formatPoints(maxPoints)}
            </p>
          )}

          {mark && (
            <p className="mt-3 text-xs text-slate-500">
              Valor Salvo: {formatPoints(Number(mark.value))}
              {mark.observation ? ` | Observação: ${mark.observation}` : ''}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            {isMeasurement ? (
              <MeasurementButtons
                aspectId={aspect.id}
                selectedValue={selectedValue}
                maxPoints={maxPoints}
                locked={locked}
                isReduction={isReduction}
                onZero={() => {
                  setShowReductionInput(false)
                  onValueChange(0)
                }}
                onReduction={openReductionInput}
                onFull={() => {
                  setShowReductionInput(false)
                  onValueChange(maxPoints)
                }}
              />
            ) : (
              <div className="grid w-full gap-2">
                {getJudgementOptions(aspect).map((option) => {
                  const value = option.value
                  const selected = Number(selectedValue) === value

                  return (
                    <button
                      key={`${aspect.id}-${value}`}
                      type="button"
                      disabled={locked}
                      onClick={() => onValueChange(value)}
                      className={[
                        'min-h-11 rounded-md border px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-60',
                        selected
                          ? 'border-blue-700 bg-blue-50 text-blue-950 ring-2 ring-blue-100'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      <span className="flex items-start gap-2">
                        <span className={[
                          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                          selected
                            ? 'border-blue-700 bg-blue-700 text-white'
                            : 'border-slate-300 bg-slate-50 text-slate-700',
                        ].join(' ')}>
                          {selected ? '✓' : value}
                        </span>
                        <span>
                          <strong className="block font-semibold">
                            {value} — {option.label}
                          </strong>
                          {option.description && (
                            <span className="mt-0.5 block text-xs leading-5 text-slate-600">
                              {option.description}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
            <SaveStatus status={status} />
          </div>

          {isMeasurement && showReductionInput && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-amber-900">
                  Pontuação obtida
                </span>
                <input
                  value={reductionValue}
                  disabled={locked}
                  inputMode="decimal"
                  placeholder={`0 até ${formatPoints(maxPoints)}`}
                  onChange={(event) => setReductionValue(event.target.value)}
                  className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </label>
              <p className="mt-1 text-xs text-amber-800">
                Informe um valor entre 0 e {formatPoints(maxPoints)}.
              </p>
              {reductionError && (
                <p className="mt-2 text-xs font-semibold text-red-700">{reductionError}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={locked}
                  onClick={saveReduction}
                  className="rounded-md bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Salvar valor parcial
                </button>
                <button
                  type="button"
                  disabled={locked}
                  onClick={cancelReduction}
                  className="rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

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

function MeasurementButtons({
  aspectId,
  selectedValue,
  maxPoints,
  locked,
  isReduction,
  onZero,
  onReduction,
  onFull,
}: {
  aspectId: number
  selectedValue: number | null
  maxPoints: number
  locked: boolean
  isReduction: boolean
  onZero: () => void
  onReduction: () => void
  onFull: () => void
}) {
  const zeroSelected = selectedValue === 0
  const fullSelected = selectedValue === maxPoints

  return (
    <div className="flex flex-wrap gap-2">
      <button
        key={`${aspectId}-zero`}
        type="button"
        disabled={locked}
        onClick={onZero}
        className={[
          'rounded-md border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
          zeroSelected
            ? 'border-red-600 bg-red-600 text-white'
            : 'border-red-200 bg-white text-red-700 hover:bg-red-50',
        ].join(' ')}
      >
        Não Atende · 0
      </button>
      <button
        key={`${aspectId}-reduction`}
        type="button"
        disabled={locked}
        onClick={onReduction}
        className={[
          'rounded-md border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
          isReduction
            ? 'border-amber-600 bg-amber-600 text-white'
            : 'border-amber-300 bg-white text-amber-700 hover:bg-amber-50',
        ].join(' ')}
      >
        Atende parcialmente
      </button>
      <button
        key={`${aspectId}-full`}
        type="button"
        disabled={locked}
        onClick={onFull}
        className={[
          'rounded-md border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
          fullSelected
            ? 'border-blue-700 bg-blue-700 text-white'
            : 'border-blue-200 bg-white text-blue-700 hover:bg-blue-50',
        ].join(' ')}
      >
        Atende · {formatPoints(maxPoints)}
      </button>
    </div>
  )
}

function getJudgementOptions(aspect: Aspect) {
  return [
    {
      value: 0,
      label: 'Não atende ao padrão',
      description: aspect.descriptor0,
    },
    {
      value: 1,
      label: 'Atende parcialmente',
      description: aspect.descriptor1,
    },
    {
      value: 2,
      label: 'Atende ao padrão',
      description: aspect.descriptor2,
    },
    {
      value: 3,
      label: 'Supera o padrão',
      description: aspect.descriptor3,
    },
  ]
}
